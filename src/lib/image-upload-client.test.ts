import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { referenceImagesError, REFERENCE_IMAGE_MAX_BYTES } from "./reference-images";

let failUpload = false;
const uploaded: { endpoint: string; purpose: string }[] = [];
mock.module("uploadthing/client", { namedExports: { genUploader: () => ({
  uploadFiles: async (endpoint: string, options: { input: { purpose: string }; files: File[] }) => {
    if (failUpload) throw new Error("Upload interrupted");
    uploaded.push({ endpoint, purpose: options.input.purpose });
    return [{ serverData: { fileId: `fixture-${uploaded.length}`, url: null } }];
  },
}) } });
const { uploadFormImages } = await import("./image-upload-client");

test("three 3 MB reference images become a small ID-only server-action payload", async context => {
  context.mock.method(globalThis, "fetch", async () => Response.json({ uploadthing: true }));
  const form = new FormData();
  form.set("title", "Custom jewelry reference");
  for (let i = 0; i < 3; i++) form.append("references", new File([new Uint8Array(REFERENCE_IMAGE_MAX_BYTES)], `reference-${i}.png`, { type: "image/png" }));
  await uploadFormImages(form, { references: "CUSTOM_REQUEST_REFERENCE" });
  assert.equal(form.getAll("references").length, 0);
  assert.deepEqual(form.getAll("references_fileId"), ["fixture-1", "fixture-2", "fixture-3"]);
  assert.ok([...form.values()].every(value => typeof value === "string"));
  assert.ok((await new Response(form).arrayBuffer()).byteLength < 4096);
  assert.deepEqual(uploaded, Array.from({ length: 3 }, () => ({ endpoint: "privateImage", purpose: "CUSTOM_REQUEST_REFERENCE" })));
});

test("failed uploads stop submission and preserve the selected images", async context => {
  context.mock.method(globalThis, "fetch", async () => Response.json({ uploadthing: true }));
  failUpload = true;
  try {
    const form = new FormData();
    form.append("references", new File(["fixture"], "reference.png", { type: "image/png" }));
    await assert.rejects(uploadFormImages(form, { references: "CUSTOM_REQUEST_REFERENCE" }), /Upload interrupted/);
    assert.equal(form.getAll("references").length, 1);
    assert.equal(form.getAll("references_fileId").length, 0);
  } finally { failUpload = false; }
});

test("reference limits allow 9 MB across three images but reject excess count, size or type", () => {
  const image = { size: REFERENCE_IMAGE_MAX_BYTES, type: "image/png" };
  assert.equal(referenceImagesError([image, image, image]), undefined);
  assert.equal(referenceImagesError([]), undefined);
  assert.match(referenceImagesError([image, image, image, image])!, /three/);
  assert.match(referenceImagesError([{ ...image, size: image.size + 1 }])!, /3 MB/);
  assert.match(referenceImagesError([{ ...image, size: 0 }])!, /non-empty/);
  assert.match(referenceImagesError([{ ...image, type: "application/pdf" }])!, /JPEG, PNG or WebP/);
});


test("production branding uploads fail clearly when cloud storage is unavailable", async context => {
  context.mock.method(globalThis, "fetch", async () => Response.json({ uploadthing: false }));
  const previous = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "production" });
  try {
    const form = new FormData();
    form.set("logo", new File(["fixture"], "logo.png", { type: "image/png" }));
    await assert.rejects(uploadFormImages(form, { logo: "STORE_BRANDING" }), /uploads are temporarily unavailable/);
    assert.ok(form.get("logo") instanceof File);
    assert.equal(form.get("logo_fileId"), null);
  } finally {
    if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: previous });
  }
});
