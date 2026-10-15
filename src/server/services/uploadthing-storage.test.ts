import assert from "node:assert/strict";
import { test } from "node:test";
import { UploadThingDriver } from "./uploadthing-storage";
import type { UTApi, UTFile } from "uploadthing/server";

test("storage sets explicit public/private ACLs and never exposes private URLs", async () => {
  const calls: { file: UTFile; acl: string }[] = [];
  const api = {
    uploadFiles: async (file: UTFile, options: { acl: string }) => {
      calls.push({ file, acl: options.acl });
      return { data: { ufsUrl: "https://example.ufs.sh/f/test" }, error: null };
    },
  } as unknown as UTApi;
  const driver = new UploadThingDriver(api);
  const bytes = Buffer.from([0xff, 0xd8, 0xff]);
  assert.deepEqual(await driver.put("kyc-document/seller/test.jpg", bytes, "image/jpeg", "PRIVATE"), { url: null });
  assert.deepEqual(await driver.put("product-media/seller/test.jpg", bytes, "image/jpeg", "PUBLIC"), { url: "https://example.ufs.sh/f/test" });
  assert.deepEqual(calls.map(call => call.acl), ["private", "public-read"]);
  assert.equal(calls[0].file.customId, "kyc-document/seller/test.jpg");
  assert.equal(calls[0].file.type, "image/jpeg");
  assert.deepEqual(Buffer.from(await calls[0].file.arrayBuffer()), bytes);
});

test("signing and deletion resolve our logical keys as custom IDs", async () => {
  const key = "kyc-document/seller/test.png";
  const api = {
    getSignedURL: async (actualKey: string, options: unknown) => {
      assert.equal(actualKey, key);
      assert.deepEqual(options, { keyType: "customId", expiresIn: 120 });
      return { ufsUrl: "https://example.ufs.sh/f/test?signature=temporary" };
    },
    deleteFiles: async (actualKey: string, options: unknown) => {
      assert.equal(actualKey, key);
      assert.deepEqual(options, { keyType: "customId" });
      return { success: true };
    },
  } as unknown as UTApi;
  const driver = new UploadThingDriver(api);
  assert.match(await driver.signedUrl(key, "PRIVATE", 120), /signature=temporary/);
  await driver.remove(key, "PRIVATE");
});

test("provider upload failures do not produce a successful file reference", async () => {
  const api = { uploadFiles: async () => ({ data: null, error: { message: "provider unavailable" } }) } as unknown as UTApi;
  await assert.rejects(new UploadThingDriver(api).put("test", Buffer.from("image"), "image/png", "PUBLIC"), /could not save/);
});
