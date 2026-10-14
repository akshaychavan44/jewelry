import assert from "node:assert/strict";
import { test } from "node:test";
import { documentResponse } from "./document-response";

const bytes = new TextEncoder().encode("0123456789");

test("private document previews and downloads keep safe headers", async () => {
  const response = documentResponse(bytes, "application/pdf", 'proof"\r\n.pdf', false, null);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "0123456789");
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Content-Type"), "application/pdf");
  assert.equal(response.headers.get("Content-Length"), "10");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.headers.get("Content-Disposition"), 'inline; filename="proof_.pdf"');
  assert.match(documentResponse(bytes, "application/pdf", "proof.pdf", true, null).headers.get("Content-Disposition")!, /^attachment/);
});

test("PDF range requests return exactly the requested bytes", async () => {
  for (const [range, body, contentRange] of [
    ["bytes=2-5", "2345", "bytes 2-5/10"],
    ["bytes=7-", "789", "bytes 7-9/10"],
    ["bytes=-3", "789", "bytes 7-9/10"],
    ["bytes=8-100", "89", "bytes 8-9/10"],
    ["bytes=-100", "0123456789", "bytes 0-9/10"],
  ]) {
    const response = documentResponse(bytes, "application/pdf", "proof.pdf", false, range);
    assert.equal(response.status, 206);
    assert.equal(await response.text(), body);
    assert.equal(response.headers.get("Content-Range"), contentRange);
    assert.equal(response.headers.get("Content-Length"), String(body.length));
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  }
});

test("invalid and unsatisfiable ranges do not disclose the document body", async () => {
  for (const range of ["bytes=10-", "bytes=4-2", "bytes=-0", "bytes=-", "bytes=abc", "bytes=1-2,4-5", "bytes=9007199254740992-"]) {
    const response = documentResponse(bytes, "application/pdf", "proof.pdf", false, range);
    assert.equal(response.status, 416, range);
    assert.equal(await response.text(), "");
    assert.equal(response.headers.get("Content-Range"), "bytes */10");
  }
});
