import assert from "node:assert/strict";
import { createRequire } from "node:module";

// These service checks never render or navigate. Avoid loading Next's client
// router through transitive authentication imports in the React server runtime.
const require = createRequire(import.meta.url);
const navigationPath = require.resolve("next/navigation");
require.cache[navigationPath] = { id: navigationPath, filename: navigationPath, loaded: true, exports: { redirect: () => { throw new Error("Unexpected fixture navigation"); } } } as any;

// In-memory service fixture: no live database, email, or business record writes.
const writes: { model: string; args: any }[] = [];
let product: any = { id: "piece", title: "Ring", status: "DRAFT", publishedAt: null, images: [{}], variants: [{ priceMinor: 100n }], seller: { verificationStatus: "APPROVED" } };
let seller: any = { id: "jeweler", userId: "owner", verificationStatus: "APPROVED", isFeatured: false, isTopRated: false, commissionRateBps: 1700 };
let settings = { requiredKycDocuments: ["GOVERNMENT_ID"], listingFeeMinor: 999n, defaultCommissionBps: 1700 };
const fake: any = {};
for (const model of ["product", "sellerProfile", "platformSettings", "auditLog", "notification", "kycDocument", "kycSubmission", "user", "certificate", "customRequest"]) {
  fake[model] = {
    findUnique: async () => model === "sellerProfile" ? seller : model === "platformSettings" ? settings : { role: "BUYER", status: "ACTIVE" },
    findUniqueOrThrow: async () => model === "platformSettings" ? settings : seller,
    findFirst: async () => product,
    findMany: async () => [],
    count: async () => 2,
    groupBy: async () => [],
    create: async (args: any) => { writes.push({ model, args }); return { id: "fixture", ...args.data }; },
    updateMany: async (args: any) => { writes.push({ model, args }); return { count: 1 }; },
    update: async (args: any) => {
      writes.push({ model, args });
      if (model === "product") return product = { ...product, ...args.data };
      if (model === "platformSettings") return settings = { ...settings, ...args.data };
      if (model === "sellerProfile") return seller = { ...seller, ...args.data };
      return { id: "fixture", ...args.data };
    },
  };
}
fake.$queryRaw = async () => [];
fake.$transaction = async (task: any) => typeof task === "function" ? task(fake) : Promise.all(task);
(globalThis as any).neonDb = fake;
const { publishListing } = await import("../src/server/services/listings");
const admin = await import("../src/server/services/admin");

await publishListing("jeweler", "piece");
assert.equal(product.status, "ACTIVE");
assert.ok(product.publishedAt instanceof Date);
assert.equal(writes.filter(w => w.model === "product").length, 1);
await publishListing("jeweler", "piece");
assert.equal(writes.filter(w => w.model === "product").length, 1, "Republishing is idempotent");
for (const patch of [{ seller: { verificationStatus: "PENDING" } }, { images: [] }, { variants: [{ priceMinor: 0n }] }]) {
  const original = product;
  product = { ...product, status: "DRAFT", ...patch };
  await assert.rejects(() => publishListing("jeweler", "piece"));
  product = original;
}
console.log("PASS: free publishing, approval/photo/price gates, and idempotence");

await admin.updateVerificationSettings("admin", { requiredKycDocuments: ["BUSINESS_LICENSE"] });
assert.deepEqual(settings.requiredKycDocuments, ["BUSINESS_LICENSE"]);
assert.equal(settings.listingFeeMinor, 999n);
assert.equal(settings.defaultCommissionBps, 1700);
await assert.rejects(() => admin.updateVerificationSettings("admin", { requiredKycDocuments: [] }));
await assert.rejects(() => admin.updateVerificationSettings("admin", { requiredKycDocuments: ["INVALID" as any] }));
assert.ok(writes.some(w => w.model === "auditLog" && w.args.data.action === "verification_settings.update"));
console.log("PASS: required-document validation, persistence, audit, and historical fee preservation");

await admin.updateSellerControls("admin", "jeweler", { isFeatured: true, isTopRated: true, commissionPercent: 3 } as any);
assert.equal(seller.isFeatured, true);
assert.equal(seller.isTopRated, true);
assert.equal(seller.commissionRateBps, 1700);
assert.equal(seller.commissionPercent, undefined);
await admin.suspendSeller("admin", "jeweler", "Fixture suspension reason");
assert.equal(seller.verificationStatus, "SUSPENDED");
await admin.reinstateSeller("admin", "jeweler");
assert.equal(seller.verificationStatus, "APPROVED");
await admin.setUserStatus("admin", "customer", "SUSPENDED");
await assert.rejects(() => admin.setUserStatus("admin", "admin", "SUSPENDED"));
console.log("PASS: badges, suspension/reinstatement, account controls, and unchanged historical commissions");

seller = { ...seller, verificationStatus: "PENDING", user: { email: "" }, kycSubmissions: [{ id: "submission", documents: [{ id: "document" }] }] };
await admin.reviewKyc("admin", { sellerId: "jeweler", decision: "APPROVE", feedback: "", documents: [{ id: "document", status: "ACCEPTED" }] });
assert.equal(seller.verificationStatus, "APPROVED");
assert.ok(writes.some(w => w.model === "kycDocument"));
assert.ok(writes.some(w => w.model === "auditLog" && w.args.data.action === "kyc.approve"));
const analytics = await admin.getPlatformAnalytics(30);
assert.equal(analytics.enquiries, 2);
assert.equal(analytics.trafficSeries.length, 30);
assert.equal("commission" in analytics, false);
assert.equal("orders" in analytics, false);
console.log("PASS: verification approval and directory analytics without commerce delegates");

seller = { ...seller, verificationStatus: "PENDING" };
await admin.reviewKyc("admin", { sellerId: "jeweler", decision: "REJECT", feedback: "Upload a current business licence.", documents: [{ id: "document", status: "REJECTED", reason: "Expired licence" }] });
assert.equal(seller.verificationStatus, "REJECTED");
const { submitApplication } = await import("../src/server/services/onboarding");
seller = { ...seller, legalBusinessName: "Fixture Studio", registrationNumber: "fixture", kycDocuments: [] };
await assert.rejects(() => submitApplication("owner"), /required documents/);
seller.kycDocuments = [{ type: "BUSINESS_LICENSE" }];
await submitApplication("owner");
assert.equal(seller.verificationStatus, "PENDING");
console.log("PASS: rejected verification and onboarding use the saved document requirements");
