// Run: node --import tsx --test scripts/check-immediate-listing.mjs
// Isolated database fixtures: no network, real documents, emails, or database writes.
import assert from "node:assert/strict";
import { test, mock, afterEach } from "node:test";
import { registerHooks } from "node:module";
// Next.js loads these services with its server runtime. Stub only its build-time
// server-only marker so ordinary React/Next imports work in Node's test runner.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export {}", shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { db } = await import("../src/server/db.ts");
const { submitApplication } = await import("../src/server/services/onboarding.ts");
const { reviewKyc } = await import("../src/server/services/admin.ts");
const { listJewelers, getStorefront } = await import("../src/server/services/sellers.ts");
const { visibilityWhere } = await import("../src/server/services/discovery.ts");
const { isListedJeweler, listedJewelerWhere } = await import("../src/lib/jeweler-listing.ts");

afterEach(() => mock.restoreAll());
const documents = ["TAX_REGISTRATION", "BUSINESS_LICENSE", "GOVERNMENT_ID"].map(type => ({ type }));
const application = () => ({ id: "shop-1", userId: "owner-1", storeName: "Test Jeweler", slug: "test-jeweler", city: "Mumbai", country: "IN", onboardingStep: 3, returnAddressId: "address-1", legalBusinessName: "Test Business", registrationNumber: "REG123", verificationStatus: "NOT_SUBMITTED", kycDocuments: documents });

test("submission lists a completed shop while verification stays pending", async () => {
  const seller = application();
  const submissions = [], notifications = [];
  mock.method(db.sellerProfile, "findUnique", async () => seller);
  mock.method(db.platformSettings, "findUnique", async () => null);
  mock.method(db, "$transaction", async fn => fn({
    kycSubmission: { create: async ({ data }) => { submissions.push(data); return { id: "submission-1" }; } },
    kycDocument: { updateMany: async () => ({ count: 3 }) },
    sellerProfile: { update: async ({ data }) => Object.assign(seller, data) },
    user: { findMany: async () => [{ id: "admin-1" }] },
    notification: { create: async ({ data }) => notifications.push(data) },
  }));
  await submitApplication(seller.userId);
  assert.equal(seller.verificationStatus, "PENDING");
  assert.equal(isListedJeweler(seller.verificationStatus), true);
  assert.equal(seller.approvedAt, undefined);
  assert.ok(seller.submittedAt instanceof Date);
  assert.equal(submissions[0].status, "PENDING");
  assert.equal(notifications[0].userId, "admin-1");
  await assert.rejects(submitApplication(seller.userId), /already been submitted/);
});

test("incomplete profiles and missing documents stay private", async () => {
  const seller = application();
  mock.method(db.sellerProfile, "findUnique", async () => seller);
  mock.method(db.platformSettings, "findUnique", async () => null);
  const transaction = mock.method(db, "$transaction", async () => { throw new Error("Unexpected write"); });
  seller.onboardingStep = 2;
  await assert.rejects(submitApplication(seller.userId), /Complete your store profile/);
  seller.onboardingStep = 3;
  seller.kycDocuments = [];
  await assert.rejects(submitApplication(seller.userId), /Upload the required documents/);
  assert.equal(transaction.mock.callCount(), 0);
  assert.equal(isListedJeweler(seller.verificationStatus), false);
});

test("directory queries include pending shops and exclude paused shops", async () => {
  const queries = [];
  mock.method(db, "$queryRaw", async () => [{ sellerId: "paused-shop" }]);
  mock.method(db.sellerProfile, "findMany", async query => { queries.push(query); return []; });
  mock.method(db.sellerProfile, "groupBy", async query => { queries.push(query); return []; });
  await listJewelers({ sort: "newest" });
  assert.equal(queries.length, 3);
  for (const query of queries) {
    assert.deepEqual(query.where.verificationStatus, listedJewelerWhere.verificationStatus);
    assert.deepEqual(query.where.id.notIn, ["paused-shop"]);
  }
  assert.equal(queries[0].select.verificationStatus, true);
  assert.deepEqual(queries[0].orderBy[0], { submittedAt: "desc" });
});

test("public profile visibility follows submission, approval, rejection, suspension and pause", async () => {
  const seller = application();
  let paused = false;
  mock.method(db.sellerProfile, "findUnique", async () => seller);
  mock.method(db, "$queryRaw", async () => paused ? [{ sellerId: seller.id, isPaused: true }] : []);
  mock.method(db.product, "findMany", async () => []);
  mock.method(db.review, "findMany", async () => []);
  mock.method(db.category, "findMany", async () => []);
  for (const status of ["NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED", "SUSPENDED"]) {
    seller.verificationStatus = status;
    const result = await getStorefront(seller.slug, {});
    assert.equal(result !== null, ["PENDING", "APPROVED"].includes(status), status);
  }
  for (const status of ["PENDING", "APPROVED"]) {
    seller.verificationStatus = status;
    paused = true;
    assert.equal(await getStorefront(seller.slug, {}), null);
  }
});

test("jewelry visibility preserves pause and per-surface restrictions for listed shops", () => {
  const where = visibilityWhere("profile", [{ productId: "hidden-piece", showOnProfile: false, showOnWebsite: true }], ["paused-shop"]);
  assert.equal(where.status, "ACTIVE");
  assert.deepEqual(where.AND, [{ id: { notIn: ["hidden-piece"] } }, { sellerId: { notIn: ["paused-shop"] } }, { seller: listedJewelerWhere }]);
});

for (const decision of ["APPROVE", "REJECT"]) test(`admin ${decision.toLowerCase()} updates verification and public visibility`, async () => {
  const seller = { ...application(), verificationStatus: "PENDING", user: null, kycSubmissions: [{ id: "submission-1", documents: [] }] };
  const notifications = [];
  mock.method(db.sellerProfile, "findUnique", async () => seller);
  mock.method(db, "$transaction", async fn => fn({
    kycDocument: { updateMany: async () => ({ count: 3 }) },
    kycSubmission: { update: async () => ({}) },
    sellerProfile: { update: async ({ data }) => Object.assign(seller, data) },
    auditLog: { create: async () => ({}) },
    notification: { create: async ({ data }) => notifications.push(data) },
  }));
  await reviewKyc("admin-1", { sellerId: seller.id, decision, documents: [], feedback: decision === "REJECT" ? "Please provide a legible business registration." : "", internalNotes: "" });
  assert.equal(seller.verificationStatus, decision === "APPROVE" ? "APPROVED" : "REJECTED");
  assert.equal(isListedJeweler(seller.verificationStatus), decision === "APPROVE");
  assert.equal(seller.slug, "test-jeweler");
  if (decision === "APPROVE") {
    assert.ok(seller.approvedAt instanceof Date);
    assert.match(notifications[0].body, /verified badge/);
  }
});
