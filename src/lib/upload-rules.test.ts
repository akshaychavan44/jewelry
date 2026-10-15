import assert from "node:assert/strict";
import { test } from "node:test";
import { UPLOAD_RULES, validImageContent } from "./upload-rules";

test("seller documents are image-only and private; product photography is public", () => {
  for (const purpose of ["KYC_DOCUMENT", "CERTIFICATE"] as const) {
    assert.equal(UPLOAD_RULES[purpose].visibility, "PRIVATE");
    assert.deepEqual(UPLOAD_RULES[purpose].types, ["image/jpeg", "image/png", "image/webp"]);
    assert.equal(UPLOAD_RULES[purpose].maxBytes, 12 * 1024 * 1024);
  }
  assert.equal(UPLOAD_RULES.PRODUCT_MEDIA.visibility, "PUBLIC");
  assert.ok(UPLOAD_RULES.PRODUCT_MEDIA.types.includes("image/avif"));
  for (const [purpose, rule] of Object.entries(UPLOAD_RULES)) {
    if (purpose !== "GENERATED_DOCUMENT") assert.ok(rule.types.every(type => type.startsWith("image/")));
  }
});

test("image validation accepts image signatures and rejects spoofed types and PDF bytes", () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(validImageContent(png, "image/png"), true);
  assert.equal(validImageContent(png, "image/jpeg"), false);
  assert.equal(validImageContent(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg"), true);
  assert.equal(validImageContent(Buffer.from("RIFF0000WEBP"), "image/webp"), true);
  assert.equal(validImageContent(Buffer.from("0000ftypavif"), "image/avif"), true);
  for (const type of ["image/jpeg", "image/png", "image/webp", "image/avif"]) {
    assert.equal(validImageContent(Buffer.from("%PDF-1.7"), type), false);
    assert.equal(validImageContent(Buffer.alloc(0), type), false);
  }
});
