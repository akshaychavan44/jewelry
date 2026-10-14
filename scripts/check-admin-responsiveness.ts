import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mock } from "node:test";
import { DatabaseUnavailableError, DATABASE_UNAVAILABLE_MESSAGE } from "../src/lib/database-errors";

// Isolated authentication/document fixture: no live data or credential writes.
const require = createRequire(import.meta.url);
function mockModule(id: string, exports: unknown) {
  const filename = require.resolve(id);
  require.cache[filename] = { id: filename, filename, loaded: true, exports } as any;
}
let signInFailure: unknown;
let signIns = 0;
let storageReads = 0;
mock.module(new URL("../src/server/services/storage.ts", import.meta.url).href, { namedExports: {
  storage: () => ({ signedUrl: async () => null, get: async () => { storageReads++; return new TextEncoder().encode("0123456789"); } }),
  saveUpload: async () => { throw new Error("Unexpected fixture upload"); },
  UploadError: class UploadError extends Error {},
} });
mockModule("next/navigation", { redirect: (path: string) => { throw new Error(`Fixture redirect: ${path}`); } });
mock.module(new URL("../src/server/auth/index.ts", import.meta.url).href, { namedExports: {
  auth: async () => ({ user: { id: "admin" }, signedInAt: 100 }),
  signIn: async () => { signIns++; if (signInFailure) throw signInFailure; return "/admin"; },
  signOut: async () => {}, unstable_update: async () => {},
} });

let userStatus = "ACTIVE";
let userRole = "ADMIN";
let resetAt: Date | undefined;
let unavailable = false;
let extraLoginLookups = 0;
let certificateLookups = 0;
let kycLookups = 0;
let docSellerId = "jeweler";
let referenceAllowed = false;
let fileExists = true;
let auditFailure = false;
let auditWrites = 0;
const file = { id: "document", uploadedById: "uploader", purpose: "KYC_DOCUMENT", visibility: "PRIVATE", key: "fixture", fileName: "proof.pdf", mimeType: "application/pdf" };
const fake = {
  user: {
    findUnique: async () => { if (unavailable) throw new DatabaseUnavailableError(new Error("offline")); return { id: "admin", role: userRole, status: userStatus }; },
    findFirst: async () => { extraLoginLookups++; throw new Error("Unexpected post-login lookup"); },
  },
  $queryRaw: async () => resetAt ? [{ expires: resetAt }] : [],
  fileAsset: { findUnique: async () => fileExists ? file : null },
  sellerProfile: { findUnique: async () => ({ id: "jeweler" }) },
  kycDocument: { findUnique: async () => { kycLookups++; return file.purpose === "KYC_DOCUMENT" ? { sellerId: docSellerId } : null; } },
  certificate: { findUnique: async () => { certificateLookups++; return file.purpose === "CERTIFICATE" ? { product: { sellerId: docSellerId } } : null; } },
  customRequest: { findFirst: async () => referenceAllowed ? { id: "inquiry" } : null },
  auditLog: { create: async () => { auditWrites++; if (auditFailure) throw new Error("Fixture audit unavailable"); return { id: "audit" }; } },
};
(globalThis as any).neonDb = fake;
const { loginAction } = await import("../src/server/actions/auth");
const { getCurrentUser, assertAdmin } = await import("../src/server/auth/session");
const { getDocumentAccess } = await import("../src/server/services/document-access");

const form = new FormData();
form.set("email", "admin@fixture.invalid"); form.set("password", "fixture-password"); form.set("intent", "admin");
await assert.rejects(loginAction({}, form), /Fixture redirect: \/admin$/);
assert.equal(signIns, 1);
assert.equal(extraLoginLookups, 0);
signInFailure = new DatabaseUnavailableError(new Error("offline"));
assert.deepEqual(await loginAction({}, form), { error: DATABASE_UNAVAILABLE_MESSAGE });
console.log("PASS: admin login redirects without legacy cart/extra queries and reports connection failure inline");

assert.equal((await getCurrentUser())?.role, "ADMIN");
userStatus = "SUSPENDED"; assert.equal(await getCurrentUser(), null); userStatus = "ACTIVE";
resetAt = new Date(101); assert.equal(await getCurrentUser(), null); resetAt = undefined;
userRole = "BUYER"; await assert.rejects(assertAdmin()); userRole = "ADMIN";
unavailable = true; await assert.rejects(getCurrentUser(), DatabaseUnavailableError); unavailable = false;
console.log("PASS: suspension, password-reset revocation and admin role checks remain enforced");

const access = await getDocumentAccess({ id: "admin", role: "ADMIN" }, file.id);
assert.equal(access?.auditSellerId, "jeweler");
assert.equal(certificateLookups, 0, "Admin document access should not hydrate certificates/products");
const before = kycLookups;
assert.ok(await getDocumentAccess({ id: "uploader", role: "BUYER" }, file.id));
assert.equal(kycLookups, before, "Uploader access needs no ownership relations");
assert.equal(await getDocumentAccess({ id: "stranger", role: "BUYER" }, file.id), null);
assert.ok(await getDocumentAccess({ id: "owner", role: "SELLER" }, file.id));
docSellerId = "another-jeweler";
assert.equal(await getDocumentAccess({ id: "owner", role: "SELLER" }, file.id), null);
file.purpose = "CERTIFICATE"; docSellerId = "jeweler";
assert.ok(await getDocumentAccess({ id: "owner", role: "SELLER" }, file.id));
file.purpose = "CUSTOM_REQUEST_REFERENCE";
assert.equal(await getDocumentAccess({ id: "owner", role: "SELLER" }, file.id), null);
referenceAllowed = true;
assert.ok(await getDocumentAccess({ id: "owner", role: "SELLER" }, file.id));
fileExists = false;
assert.equal(await getDocumentAccess({ id: "admin", role: "ADMIN" }, file.id), null);
console.log("PASS: faster document lookup preserves admin audits, uploader/jeweler ownership, reference privacy and missing-file behavior");

fileExists = true; file.purpose = "KYC_DOCUMENT"; docSellerId = "jeweler";
const { GET } = await import("../src/app/api/files/[id]/route");
const request = new Request("http://fixture.invalid/api/files/document", { headers: { Range: "bytes=2-5" } });
const params = { params: Promise.resolve({ id: file.id }) };
const preview = await GET(request, params);
assert.equal(preview.status, 206);
assert.equal(await preview.text(), "2345");
assert.equal(auditWrites, 1);
auditFailure = true;
await assert.rejects(GET(request, params), /Fixture audit unavailable/);
auditFailure = false;
const readCount = storageReads;
userRole = "BUYER";
assert.equal((await GET(request, params)).status, 404);
userStatus = "SUSPENDED";
assert.equal((await GET(request, params)).status, 401);
assert.equal(storageReads, readCount, "Unauthorized requests cannot read stored bytes");
userStatus = "ACTIVE"; userRole = "ADMIN"; unavailable = true;
const offline = await GET(request, params);
assert.equal(offline.status, 503);
assert.equal(await offline.text(), DATABASE_UNAVAILABLE_MESSAGE);
assert.equal(storageReads, readCount);
unavailable = false;
console.log("PASS: document route serves audited range previews and fails closed on audit/authorization failures");
