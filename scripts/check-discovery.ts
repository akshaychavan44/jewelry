import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
for (const file of [".env.local", ".env"]) { try { process.loadEnvFile(file); } catch {} }
const { db } = await import("../src/server/db");
const { visibilityWhere, refreshJewelerRating } = await import("../src/server/services/discovery");
const { setInquiryStatus, cancelInquiry, sellerCanReadReference } = await import("../src/server/services/jeweler-directory");
const { consumeResetToken } = await import("../src/server/services/password-recovery");
const { sha256 } = await import("../src/server/crypto");
const rollback = new Error("ROLLBACK_DISCOVERY_FIXTURES");
try {
  await db.$transaction(async tx => {
    const tag = randomUUID();
    const buyer = await tx.user.create({ data: { email: `discovery-buyer-${tag}@test.invalid`, role: "BUYER" } });
    const owner = await tx.user.create({ data: { email: `discovery-owner-${tag}@test.invalid`, role: "SELLER" } });
    const seller = await tx.sellerProfile.create({ data: { userId: owner.id, storeName: "Discovery test", slug: `discovery-${tag}`, country: "IN", verificationStatus: "APPROVED", specialties: [] } });
    const category = await tx.category.findFirst({ where: { isActive: true } });
    assert.ok(category);
    const product = await tx.product.create({ data: { sellerId: seller.id, categoryId: category.id, title: "Visibility test", slug: `visibility-${tag}`, description: "Temporary test, rolled back", status: "ACTIVE", primaryMetal: "GOLD_18K", currency: "USD", basePriceMinor: 100, normalizedPriceUsd: 100, shipsFromCountry: "IN", shipsTo: [], tags: [], certificationLabs: [] } });
    for (const showOnProfile of [false, true]) for (const showOnWebsite of [false, true]) {
      await tx.$executeRaw`INSERT INTO "JewelryVisibility" ("productId", "showOnProfile", "showOnWebsite") VALUES (${product.id}, ${showOnProfile}, ${showOnWebsite}) ON CONFLICT ("productId") DO UPDATE SET "showOnProfile" = EXCLUDED."showOnProfile", "showOnWebsite" = EXCLUDED."showOnWebsite"`;
      const settings = await tx.$queryRaw<{ productId: string; showOnProfile: boolean; showOnWebsite: boolean }[]>`SELECT * FROM "JewelryVisibility" WHERE "productId" = ${product.id}`;
      for (const [surface, expected] of [["profile", showOnProfile], ["website", showOnWebsite], ["either", showOnProfile || showOnWebsite]] as const) {
        assert.equal(await tx.product.count({ where: { ...visibilityWhere(surface, settings, []), id: product.id } }), expected ? 1 : 0);
        assert.equal(await tx.product.count({ where: { ...visibilityWhere(surface, settings, [seller.id]), id: product.id } }), 0);
      }
    }
    await tx.product.update({ where: { id: product.id }, data: { status: "DRAFT" } });
    assert.equal(await tx.product.count({ where: { ...visibilityWhere("either", [], []), id: product.id } }), 0);
    console.log("PASS: four independent visibility combinations, direct URL eligibility, paused business and draft protection");
    const request = await tx.customRequest.create({ data: { buyerId: buyer.id, sellerId: seller.id, reference: `TEST-${tag}`, title: "Test request", description: "Private request", currency: "USD", referenceImageUrls: [] } });
    assert.equal(await setInquiryStatus("other-seller", request.id, "CONTACTED", tx), false);
    assert.equal(await setInquiryStatus(seller.id, request.id, "CONTACTED", tx), true);
    assert.equal((await cancelInquiry(owner.id, request.id, tx)).length, 0);
    const file = await tx.fileAsset.create({ data: { key: `test-${tag}`, purpose: "CUSTOM_REQUEST_REFERENCE", visibility: "PRIVATE", uploadedById: buyer.id, fileName: "reference.jpg", mimeType: "image/jpeg", sizeBytes: 100 } });
    await tx.customRequest.update({ where: { id: request.id }, data: { referenceImageUrls: [`/api/files/${file.id}`] } });
    assert.equal(await sellerCanReadReference(seller.id, file.id, tx), true);
    assert.equal(await sellerCanReadReference("other-seller", file.id, tx), false);
    assert.equal((await cancelInquiry(buyer.id, request.id, tx)).length, 1);
    assert.equal(await setInquiryStatus(seller.id, request.id, "NEW", tx), false);
    console.log("PASS: selected-jeweler ownership, customer cancellation, private reference permissions");
    const id = randomUUID();
    await tx.$executeRaw`INSERT INTO "JewelerReview" ("id", "sellerId", "authorId", "rating", "body") VALUES (${id}, ${seller.id}, ${buyer.id}, 4, 'Review of a direct interaction')`;
    await refreshJewelerRating(tx, seller.id);
    let rated = await tx.sellerProfile.findUniqueOrThrow({ where: { id: seller.id } });
    assert.equal(rated.ratingCount, 1); assert.equal(rated.ratingAverage, 4);
    await tx.$executeRaw`UPDATE "JewelerReview" SET "rating" = 5 WHERE "id" = ${id}`;
    await refreshJewelerRating(tx, seller.id);
    rated = await tx.sellerProfile.findUniqueOrThrow({ where: { id: seller.id } });
    assert.equal(rated.ratingCount, 1); assert.equal(rated.ratingAverage, 5);
    await tx.$executeRaw`UPDATE "JewelerReview" SET "status" = 'HIDDEN' WHERE "id" = ${id}`;
    await refreshJewelerRating(tx, seller.id);
    rated = await tx.sellerProfile.findUniqueOrThrow({ where: { id: seller.id } });
    assert.equal(rated.ratingCount, 0); assert.equal(rated.ratingAverage, 0);
    console.log("PASS: reviews without purchases, rating updates and moderation exclusions");
    await tx.user.update({ where: { id: buyer.id }, data: { passwordHash: "old-fixture-hash" } });
    const token = sha256(`reset-${tag}`);
    await tx.verificationToken.create({ data: { identifier: `password-reset:${buyer.email}`, token, expires: new Date(Date.now() + 60000) } });
    assert.equal(await consumeResetToken(tx, token, "new-fixture-hash"), true);
    assert.equal(await consumeResetToken(tx, token, "replay-hash"), false);
    assert.equal((await tx.user.findUniqueOrThrow({ where: { id: buyer.id } })).passwordHash, "new-fixture-hash");
    const markers = await tx.$queryRaw<{ expires: Date }[]>`SELECT "expires" FROM "VerificationToken" WHERE "token" = ${`password-version:${buyer.id}`}`;
    assert.ok(markers[0]?.expires);
    const expired = sha256(`expired-${tag}`);
    await tx.verificationToken.create({ data: { identifier: `password-reset:${buyer.email}`, token: expired, expires: new Date(Date.now() - 60000) } });
    assert.equal(await consumeResetToken(tx, expired, "expired-hash"), false);
    console.log("PASS: single-use recovery tokens, expired-token rejection and session revocation marker");
    throw rollback;
  });
} catch (error) { if (error !== rollback) throw error; }
finally { await db.$disconnect(); }
console.log("Discovery checks passed; all fixtures rolled back.");
