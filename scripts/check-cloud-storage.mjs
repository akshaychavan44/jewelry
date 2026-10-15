// No real credentials or network access: S3/database operations use fixtures.
// Run: node --import tsx --test scripts/check-cloud-storage.mjs
import assert from "node:assert/strict";
import { test, mock, afterEach } from "node:test";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export {}", shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { resolveStorageConfig } = await import("../src/server/services/storage-config.ts");
const { S3Client } = await import("@aws-sdk/client-s3");
const cloud = { S3_BUCKET: "fixture-media", S3_PRIVATE_BUCKET: "fixture-private", S3_REGION: "us-east-1", S3_ACCESS_KEY_ID: "fixture-access", S3_SECRET_ACCESS_KEY: "fixture-secret" };
Object.assign(process.env, cloud, { ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64") });
const { storage } = await import("../src/server/services/storage.ts");
const { prepareKycUpload, completeKycUpload } = await import("../src/server/services/kyc-upload.ts");
const { saveBusinessVerification } = await import("../src/server/services/onboarding.ts");
const { encrypt, decrypt } = await import("../src/server/crypto.ts");
const { db } = await import("../src/server/db.ts");
const { uploadKycDocuments } = await import("../src/lib/kyc-upload-client.ts");
afterEach(() => mock.restoreAll());
const pdf = Buffer.from("%PDF-1.7\nfixture document");
const input = { fileName: "business.pdf", mimeType: "application/pdf", sizeBytes: pdf.length };

test("only unconfigured development may use disk; incomplete cloud settings fail", () => {
  assert.equal(resolveStorageConfig({ NODE_ENV: "development" }), null);
  for (const env of [{ NODE_ENV: "production" }, { VERCEL: "1" }, { S3_BUCKET: "media" }]) assert.throws(() => resolveStorageConfig(env), /Missing storage settings/);
  assert.throws(() => resolveStorageConfig({ ...cloud, S3_PRIVATE_BUCKET: cloud.S3_BUCKET }), /must be different/);
  assert.equal(resolveStorageConfig(cloud).privateBucket, "fixture-private");
});

test("R2 requires its own public URL and defaults to the auto region", () => {
  const env = { ...cloud, S3_REGION: "", S3_ENDPOINT: "https://fixture.r2.cloudflarestorage.com" };
  assert.throws(() => resolveStorageConfig(env), /S3_PUBLIC_BASE_URL/);
  const config = resolveStorageConfig({ ...env, S3_PUBLIC_BASE_URL: "https://media.example.com/" });
  assert.equal(config.region, "auto");
  assert.equal(config.publicBaseUrl, "https://media.example.com");
  assert.throws(() => resolveStorageConfig({ ...env, S3_PUBLIC_BASE_URL: "http://media.example.com" }), /HTTPS/);
});

test("private uploads are scoped, expiring and cannot overwrite a confirmed file", async () => {
  const prepared = await prepareKycUpload("user-1", "seller-1", input);
  const url = new URL(prepared.uploadUrl);
  assert.ok(url.hostname.startsWith("fixture-private."));
  assert.equal(url.searchParams.get("X-Amz-Expires"), "600");
  for (const header of ["content-length", "content-type", "if-none-match"]) assert.ok(url.searchParams.get("X-Amz-SignedHeaders").split(";").includes(header));
  assert.equal(prepared.headers["If-None-Match"], "*");
  await assert.rejects(prepareKycUpload("user-1", "seller-1", { ...input, sizeBytes: 13 * 1024 * 1024 }));
  await assert.rejects(prepareKycUpload("user-1", "seller-1", { ...input, mimeType: "text/html" }));
});

test("finalizing checks token ownership, expiry and uploaded bytes before saving a private asset", async () => {
  const prepared = await prepareKycUpload("user-1", "seller-1", input);
  let saved;
  mock.method(db.fileAsset, "findFirst", async () => null);
  mock.method(db.fileAsset, "create", async ({ data }) => { saved = data; return { id: "asset-1", ...data }; });
  mock.method(S3Client.prototype, "send", async command => {
    assert.equal(command.input.Bucket, "fixture-private");
    return { Body: { transformToByteArray: async () => pdf } };
  });
  await assert.rejects(completeKycUpload("other-user", "seller-1", prepared.ticket), /another account/);
  await assert.rejects(completeKycUpload("user-1", "other-seller", prepared.ticket), /another account/);
  await assert.rejects(completeKycUpload("user-1", "seller-1", prepared.ticket + "tamper"), /invalid/);
  const ticket = JSON.parse(decrypt(prepared.ticket));
  await assert.rejects(completeKycUpload("user-1", "seller-1", encrypt(JSON.stringify({ ...ticket, expiresAt: 1 }))), /expired/);
  assert.equal(await completeKycUpload("user-1", "seller-1", prepared.ticket), "asset-1");
  assert.equal(saved.visibility, "PRIVATE");
  assert.equal(saved.purpose, "KYC_DOCUMENT");
  assert.equal(saved.url, null);
  assert.equal(saved.uploadedById, "user-1");
  assert.ok(saved.key.startsWith("kyc-document/seller-1/"));
});

test("incomplete or disguised document objects are never registered", async () => {
  const prepared = await prepareKycUpload("user-1", "seller-1", input);
  let bytes = Buffer.from("bad");
  mock.method(db.fileAsset, "findFirst", async () => null);
  const create = mock.method(db.fileAsset, "create", async () => { throw new Error("Unexpected asset creation"); });
  mock.method(S3Client.prototype, "send", async () => ({ Body: { transformToByteArray: async () => bytes } }));
  await assert.rejects(completeKycUpload("user-1", "seller-1", prepared.ticket), /did not finish/);
  bytes = Buffer.alloc(pdf.length);
  await assert.rejects(completeKycUpload("user-1", "seller-1", prepared.ticket), /does not match/);
  assert.equal(create.mock.callCount(), 0);
});

test("business verification rejects somebody else's uploaded document and attaches owned assets", async () => {
  const seller = { id: "seller-1", verificationStatus: "NOT_SUBMITTED", onboardingStep: 2, kycDocuments: [] };
  mock.method(db.sellerProfile, "findUnique", async () => seller);
  let owner = "seller-2";
  mock.method(db.fileAsset, "findFirst", async query => {
    assert.equal(query.where.uploadedById, "user-1");
    assert.equal(query.where.purpose, "KYC_DOCUMENT");
    assert.equal(query.where.visibility, "PRIVATE");
    return { id: "asset-1", key: `kyc-document/${owner}/test.pdf` };
  });
  const data = { legalBusinessName: "Business", businessType: "COMPANY", registrationNumber: "123", documents: { TAX_REGISTRATION: "asset-1" } };
  await assert.rejects(saveBusinessVerification("user-1", data), /does not belong/);
  owner = "seller-1";
  const attached = [];
  mock.method(db, "$transaction", async fn => fn({ kycDocument: { create: async ({ data }) => attached.push(data) }, sellerProfile: { update: async () => seller } }));
  await saveBusinessVerification("user-1", data);
  assert.deepEqual(attached, [{ sellerId: "seller-1", type: "TAX_REGISTRATION", fileId: "asset-1" }]);
});

test("browser helper sends document bytes to storage and only an asset ID in the form", async () => {
  const form = new FormData();
  const file = new File([pdf], "test.pdf", { type: "application/pdf" });
  form.set("doc_TAX_REGISTRATION", file);
  form.set("legalBusinessName", "Test Business");
  const calls = [];
  mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    if (url === "https://uploads.example.com/private") {
      assert.equal(options.body, file);
      assert.equal(options.credentials, "omit");
      return new Response(null, { status: 200 });
    }
    const data = JSON.parse(options.body);
    return Response.json(data.step === "prepare" ? { direct: true, ticket: "ticket-1", uploadUrl: "https://uploads.example.com/private", headers: { "Content-Type": file.type, "If-None-Match": "*" } } : { fileId: "asset-1" });
  });
  await uploadKycDocuments(form);
  assert.equal(calls.length, 3);
  assert.equal(form.has("doc_TAX_REGISTRATION"), false);
  assert.equal(form.get("doc_TAX_REGISTRATION_fileId"), "asset-1");
  assert.equal(form.get("legalBusinessName"), "Test Business");
});

test("local development retains document files for the existing action", async () => {
  const form = new FormData();
  const file = new File([pdf], "test.pdf", { type: "application/pdf" });
  form.set("doc_TAX_REGISTRATION", file);
  mock.method(globalThis, "fetch", async () => Response.json({ direct: false }));
  await uploadKycDocuments(form);
  assert.equal(form.get("doc_TAX_REGISTRATION"), file);
  assert.equal(form.has("doc_TAX_REGISTRATION_fileId"), false);
});

test("failed direct upload keeps the selected document and stops finalization", async () => {
  const form = new FormData();
  const file = new File([pdf], "test.pdf", { type: "application/pdf" });
  form.set("doc_TAX_REGISTRATION", file);
  const fetch = mock.method(globalThis, "fetch", async url => url === "/api/uploads/kyc"
    ? Response.json({ direct: true, ticket: "ticket-1", uploadUrl: "https://uploads.example.com/private", headers: {} })
    : new Response(null, { status: 403 }));
  await assert.rejects(uploadKycDocuments(form), /upload failed/);
  assert.equal(fetch.mock.callCount(), 2);
  assert.equal(form.get("doc_TAX_REGISTRATION"), file);
});
