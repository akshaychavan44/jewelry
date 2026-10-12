// Run: node --conditions=react-server --import tsx scripts/check-jeweler-dashboard.ts
// Database checks run inside a transaction that is always rolled back.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { directoryProfileSchema } from "../src/lib/jeweler-profile";
for (const file of [".env.local", ".env"]) { try { process.loadEnvFile(file); } catch {} }
const { db } = await import("../src/server/db");
const { getDirectorySettings, getPausedSellerIds, setInquiryStatus, cancelInquiry, sellerCanReadReference, applyNameReview } = await import("../src/server/services/jeweler-directory");

const profile = { storeName: "Demo Jeweler", tagline: "", bio: "", city: "Mumbai", specialties: "", address: "123 Demo Street", hours: "", phone: "", whatsapp: "+91 9876543210", publicEmail: "", instagram: "https://www.instagram.com/demo/", facebook: "", youtube: "", website: "", maps: "", acceptsCustomOrders: true };
assert.equal(directoryProfileSchema.safeParse(profile).success, true);
for (const instagram of ["javascript:alert(1)", "https://instagram.com.evil.example/demo", "https://evil.example/demo", "not-a-url"]) {
  assert.equal(directoryProfileSchema.safeParse({ ...profile, instagram }).success, false);
}
assert.equal(directoryProfileSchema.safeParse({ ...profile, instagram: "" }).success, true);
assert.equal(directoryProfileSchema.safeParse({ ...profile, whatsapp: "123" }).success, false);
console.log("PASS: social-link and contact validation");

const { saveUpload, storage, UploadError } = await import("../src/server/services/storage");
await assert.rejects(() => saveUpload(new File(["not an image"], "invalid.png", { type: "image/png" }), "CUSTOM_REQUEST_REFERENCE", "test", "test"), UploadError);
await assert.rejects(() => saveUpload(new File([new Uint8Array(3 * 1024 * 1024 + 1)], "too-large.png", { type: "image/png" }), "CUSTOM_REQUEST_REFERENCE", "test", "test"), UploadError);
console.log("PASS: reference-image type, content and size validation");
const rollback = new Error("ROLLBACK_TEST_FIXTURES");
try {
  await db.$transaction(async (tx) => {
    const tag = randomUUID();
    const buyer = await tx.user.create({ data: { email: `buyer-${tag}@dashboard-test.invalid`, name: "Dashboard Test Buyer", role: "BUYER" } });
    const owner = await tx.user.create({ data: { email: `owner-${tag}@dashboard-test.invalid`, name: "Dashboard Test Owner", role: "SELLER" } });
    const other = await tx.user.create({ data: { email: `other-${tag}@dashboard-test.invalid`, name: "Other Test Owner", role: "SELLER" } });
    const seller = await tx.sellerProfile.create({ data: { userId: owner.id, storeName: "Dashboard Test", slug: `test-${tag}`, country: "IN", specialties: [], verificationStatus: "APPROVED" } });
    const second = await tx.sellerProfile.create({ data: { userId: other.id, storeName: "Other Test", slug: `other-${tag}`, country: "IN", specialties: [], verificationStatus: "APPROVED" } });
    const request = await tx.customRequest.create({ data: { buyerId: buyer.id, sellerId: seller.id, reference: `TEST-${tag}`, title: "Dashboard privacy test", description: "Transactional test fixture; never committed.", currency: "INR", referenceImageUrls: [] } });
    assert.equal(await setInquiryStatus(second.id, request.id, "CLOSED", tx), false);
    assert.equal(await tx.customRequest.count({ where: { sellerId: second.id } }), 0);
    assert.equal(await setInquiryStatus(seller.id, request.id, "CONTACTED", tx), true);
    const rows = await tx.$queryRaw<{ inquiryStatus: string }[]>`SELECT "inquiryStatus" FROM "CustomRequest" WHERE "id" = ${request.id}`;
    assert.equal(rows[0].inquiryStatus, "CONTACTED");
    assert.equal(await setInquiryStatus(seller.id, request.id, "CLOSED", tx), true);
    console.log("PASS: selected-jeweler ownership and request-status updates");
    await tx.$executeRaw`INSERT INTO "JewelerDirectorySettings" ("sellerId", "instagram", "isPaused") VALUES (${seller.id}, ${profile.instagram}, TRUE)`;
    assert.equal((await getDirectorySettings(seller.id, tx)).instagram, profile.instagram);
    assert.equal((await getPausedSellerIds(tx)).includes(seller.id), true);
    await tx.$executeRaw`UPDATE "JewelerDirectorySettings" SET "isPaused" = FALSE, "instagram" = '' WHERE "sellerId" = ${seller.id}`;
    assert.equal((await getDirectorySettings(seller.id, tx)).instagram, "");
    assert.equal((await getPausedSellerIds(tx)).includes(seller.id), false);
    console.log("PASS: social-link removal and pause/resume persistence");
    // Customer ownership, final cancellation and private reference access.
    assert.equal((await cancelInquiry(other.id, request.id, tx)).length, 0);
    assert.equal((await cancelInquiry(buyer.id, request.id, tx)).length, 0); // Closed inquiries stay final.
    await setInquiryStatus(seller.id, request.id, "NEW", tx);
    const asset = await tx.fileAsset.create({ data: { key: `test-reference-${tag}`, visibility: "PRIVATE", purpose: "CUSTOM_REQUEST_REFERENCE", fileName: "reference.png", mimeType: "image/png", sizeBytes: 10, uploadedById: buyer.id } });
    await tx.customRequest.update({ where: { id: request.id }, data: { referenceImageUrls: [`/api/files/${asset.id}`] } });
    assert.equal(await sellerCanReadReference(seller.id, asset.id, tx), true);
    assert.equal(await sellerCanReadReference(second.id, asset.id, tx), false);
    assert.equal((await cancelInquiry(buyer.id, request.id, tx)).length, 1);
    assert.equal((await cancelInquiry(buyer.id, request.id, tx)).length, 0);
    assert.equal(await setInquiryStatus(seller.id, request.id, "NEW", tx), false);
    console.log("PASS: private reference access and customer cancellation ownership");
    const admin = await tx.user.create({ data: { email: `admin-${tag}@dashboard-test.invalid`, role: "ADMIN" } });
    const nameId = randomUUID();
    await tx.$executeRaw`INSERT INTO "BusinessNameChange" ("id", "sellerId", "previousName", "requestedName", "reason") VALUES (${nameId}, ${seller.id}, ${seller.storeName}, 'New Test Name', 'Updating business identity')`;
    const duplicate = await tx.$queryRaw<{ id: string }[]>`INSERT INTO "BusinessNameChange" ("id", "sellerId", "previousName", "requestedName", "reason") VALUES (${randomUUID()}, ${seller.id}, ${seller.storeName}, 'Other Name', 'Duplicate pending request') ON CONFLICT DO NOTHING RETURNING "id"`;
    assert.equal(duplicate.length, 0);
    assert.equal(await applyNameReview(tx, admin.id, { id: nameId, decision: "APPROVED", notes: "Verified" }), seller.slug);
    const renamed = await tx.sellerProfile.findUniqueOrThrow({ where: { id: seller.id } });
    assert.equal(renamed.storeName, "New Test Name");
    assert.equal(renamed.slug, seller.slug);
    assert.equal(await applyNameReview(tx, admin.id, { id: nameId, decision: "REJECTED", notes: "Replay" }), null);
    const rejectedId = randomUUID();
    await tx.$executeRaw`INSERT INTO "BusinessNameChange" ("id", "sellerId", "previousName", "requestedName", "reason") VALUES (${rejectedId}, ${seller.id}, 'New Test Name', 'Rejected Name', 'Testing rejection')`;
    await applyNameReview(tx, admin.id, { id: rejectedId, decision: "REJECTED", notes: "Please provide matching verification details" });
    assert.equal((await tx.sellerProfile.findUniqueOrThrow({ where: { id: seller.id } })).storeName, "New Test Name");
    assert.equal(await tx.auditLog.count({ where: { actorId: admin.id, action: "business_name.review" } }), 2);
    assert.equal(await tx.notification.count({ where: { userId: owner.id, type: "SYSTEM" } }), 2);
    console.log("PASS: name review approval/rejection, audit, notification and duplicate prevention");
    throw rollback;
  });
} catch (error) { if (error !== rollback) throw error; }
finally { await db.$disconnect(); }
console.log("All checks passed; test records rolled back.");
