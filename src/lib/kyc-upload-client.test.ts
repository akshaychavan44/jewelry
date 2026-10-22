import assert from "node:assert/strict";
import { mock, test } from "node:test";
let fail = false;
mock.module("./image-upload-client", { namedExports: {
  uploadImage: async (file: File, purpose: string, progress: (percent: number) => void) => {
    assert.equal(purpose, "KYC_DOCUMENT");
    progress(25); progress(100);
    if (fail) throw new Error("Document verification timed out. Please try again.");
    return { fileId: `asset-${file.name}` };
  },
} });
const { uploadKycDocuments } = await import("./kyc-upload-client");

test("documents report upload and verification progress and submit only file IDs", async () => {
  const form = new FormData();
  form.set("legalBusinessName", "Fixture Atelier");
  for (const type of ["TAX_REGISTRATION", "BUSINESS_LICENSE", "GOVERNMENT_ID"]) {
    form.set(`doc_${type}`, new File(["fixture"], `${type}.png`, { type: "image/png" }));
  }
  form.set("doc_PROOF_OF_ADDRESS", new File([], ""));
  const statuses: string[] = [];
  await uploadKycDocuments(form, status => statuses.push(status));
  assert.ok(statuses.some(s => s.includes("25%")));
  assert.ok(statuses.some(s => s.startsWith("Verifying")));
  assert.equal([...form.values()].filter(v => v instanceof File).length, 0);
  assert.equal(form.get("doc_GOVERNMENT_ID_fileId"), "asset-GOVERNMENT_ID.png");
  assert.equal(form.get("legalBusinessName"), "Fixture Atelier");
});

test("a failed document upload stops submission and preserves fields and the chosen file", async () => {
  const form = new FormData();
  form.set("legalBusinessName", "Fixture Atelier");
  form.set("doc_GOVERNMENT_ID", new File(["fixture"], "id.png", { type: "image/png" }));
  fail = true;
  try {
    await assert.rejects(uploadKycDocuments(form), /verification timed out/);
    assert.ok(form.get("doc_GOVERNMENT_ID") instanceof File);
    assert.equal(form.get("legalBusinessName"), "Fixture Atelier");
    assert.equal(form.get("doc_GOVERNMENT_ID_fileId"), null);
  } finally { fail = false; }
});
