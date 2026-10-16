import assert from "node:assert/strict";
import { mock, test } from "node:test";

const writes: { referenceImageUrls: string[] }[] = [];
const assets = [
  { id: "own-reference", purpose: "CUSTOM_REQUEST_REFERENCE", visibility: "PRIVATE", uploadedById: "buyer", sizeBytes: 3 * 1024 * 1024, mimeType: "image/png" },
  { id: "foreign-reference", purpose: "CUSTOM_REQUEST_REFERENCE", visibility: "PRIVATE", uploadedById: "someone-else", sizeBytes: 100, mimeType: "image/png" },
  { id: "wrong-purpose", purpose: "KYC_DOCUMENT", visibility: "PRIVATE", uploadedById: "buyer", sizeBytes: 100, mimeType: "image/png" },
];
mock.module("server-only", { defaultExport: {} });
mock.module("next/server", { namedExports: { after: () => {} } });
mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });
mock.module("@/server/auth/session", { namedExports: { assertUser: async () => ({ id: "buyer", role: "BUYER" }), getSellerForUser: async () => null } });
mock.module("@/server/services/jeweler-directory", { namedExports: { getDirectorySettings: async () => ({ isPaused: false }) } });
mock.module("@/server/services/inquiry-notifications", { namedExports: { sendInquiryEmail: async () => {} } });
mock.module("@/server/services/messaging", { namedExports: { notify: async () => {}, postMessage: async () => {} } });
const unusedAction = async () => {};
mock.module("@/server/services/after-sales", { namedExports: {
  acceptQuote: unusedAction, createRefund: unusedAction, createReview: unusedAction,
  createServiceRequest: unusedAction, declineQuote: unusedAction, openDispute: unusedAction,
  requestReturn: unusedAction, AfterSalesError: class extends Error {},
} });
mock.module("@/server/db", { namedExports: { db: {
  sellerProfile: { findUnique: async () => ({ id: "store", userId: "jeweler", storeName: "Fixture Store", acceptsCustomOrders: true, verificationStatus: "APPROVED", user: { email: "fixture@example.com" } }) },
  fileAsset: { findFirst: async ({ where }: { where: Record<string, string> }) => assets.find(asset => Object.entries(where).every(([key, value]) => asset[key as keyof typeof asset] === value)) ?? null },
  $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({
    customRequest: { create: async ({ data }: { data: { referenceImageUrls: string[] } }) => { writes.push(data); return { id: "fixture-request", ...data }; } },
    $executeRaw: async () => 1,
  }),
} } });
const { createCustomRequestAction } = await import("./account");

function request(ids: string[]) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ title: "A custom jewelry piece", description: "A custom gold ring inspired by these reference images, with a sapphire centerpiece.", sellerSlug: "fixture", contactPhone: "+12025550123", budgetMax: "500", currency: "USD" })) form.set(key, value);
  for (const id of ids) form.append("references_fileId", id);
  return form;
}

test("custom request attaches owned direct uploads as authorized file routes", async () => {
  const result = await createCustomRequestAction({}, request(["own-reference"]));
  assert.equal(result.ok, true);
  assert.deepEqual(writes.at(-1)?.referenceImageUrls, ["/api/files/own-reference"]);
});

test("foreign, wrong-purpose, duplicate and excessive upload references cannot be attached", async () => {
  const before = writes.length;
  for (const ids of [["foreign-reference"], ["wrong-purpose"], ["missing"], ["own-reference", "own-reference"], ["a", "b", "c", "d"]]) {
    const result = await createCustomRequestAction({}, request(ids));
    assert.notEqual(result.ok, true);
    assert.ok(result.message);
  }
  assert.equal(writes.length, before);
});

test("an enquiry without reference images still works", async () => {
  const result = await createCustomRequestAction({}, request([]));
  assert.equal(result.ok, true);
  assert.deepEqual(writes.at(-1)?.referenceImageUrls, []);
});
