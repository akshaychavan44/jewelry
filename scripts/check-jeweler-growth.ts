import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { coordinates, distanceKm, nearestDistance } from "../src/lib/jeweler-location";
import { directoryProfileSchema } from "../src/lib/jeweler-profile";

for (const file of [".env.local", ".env"]) { try { process.loadEnvFile(file); } catch {} }
const { db } = await import("../src/server/db");
const { getJewelerAnalytics } = await import("../src/server/services/jeweler-analytics");
const { markInquiryNotificationsRead, sendInquiryEmail } = await import("../src/server/services/inquiry-notifications");

assert.equal(coordinates("", ""), null);
assert.equal(coordinates("91", "10"), null);
assert.equal(coordinates("0", "Infinity"), null);
assert.deepEqual(coordinates("0", "0"), { latitude: 0, longitude: 0 });
assert.ok(Math.abs(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }) - 111.195) < 0.01);
assert.equal(nearestDistance({ latitude: 0, longitude: 0 }, [{ latitude: null, longitude: null }]), null);
assert.equal(nearestDistance({ latitude: 0, longitude: 0 }, [{ latitude: 20, longitude: 20 }, { latitude: 0, longitude: 0 }]), 0);
assert.equal(directoryProfileSchema.shape.latitude.safeParse("91").success, false);
assert.equal(directoryProfileSchema.shape.longitude.safeParse("-181").success, false);
console.log("PASS: coordinate validation, missing locations and nearest-boutique distance");

const envKeys = ["RESEND_API_KEY", "AUTH_EMAIL_FROM", "NEXT_PUBLIC_APP_URL"] as const;
const saved = envKeys.map(key => process.env[key]);
try {
  delete process.env.RESEND_API_KEY;
  let calls = 0;
  const input = { to: "fixture@test.invalid", subject: "Test enquiry", text: "Test", href: "/seller/custom-requests", key: "test-key" };
  const mock: typeof fetch = async (_, init) => { calls++; const body = JSON.parse(String(init?.body)); assert.deepEqual(body.to, [input.to]); assert.ok(body.text.includes("https://loupe.test/seller/custom-requests")); assert.equal(new Headers(init?.headers).get("Idempotency-Key"), "test-key"); return new Response("{}", { status: 200 }); };
  assert.equal(await sendInquiryEmail(input, mock), "unconfigured"); assert.equal(calls, 0);
  process.env.RESEND_API_KEY = "test-only"; process.env.AUTH_EMAIL_FROM = "test@loupe.test"; process.env.NEXT_PUBLIC_APP_URL = "https://loupe.test";
  assert.equal(await sendInquiryEmail(input, mock), "sent"); assert.equal(calls, 1);
  assert.equal(await sendInquiryEmail(input, async () => new Response("{}", { status: 503 })), "failed");
  assert.equal(await sendInquiryEmail(input, async () => { throw new Error("offline"); }), "failed");
} finally { envKeys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; }); }
console.log("PASS: email configuration, recipient, dashboard link, idempotency and delivery failures (mocked; no emails sent)");

const rollback = new Error("ROLLBACK_GROWTH_FIXTURES");
try {
  await db.$transaction(async tx => {
    const tag = randomUUID();
    const owner = await tx.user.create({ data: { email: `growth-owner-${tag}@test.invalid`, role: "SELLER" } });
    const other = await tx.user.create({ data: { email: `growth-other-${tag}@test.invalid`, role: "BUYER" } });
    const seller = await tx.sellerProfile.create({ data: { userId: owner.id, storeName: "Growth fixture", slug: `growth-${tag}`, country: "IN", verificationStatus: "APPROVED", specialties: [] } });
    const now = new Date("2026-10-12T12:00:00Z"), yesterday = new Date("2026-10-11T12:00:00Z"), old = new Date("2026-09-01T12:00:00Z"), future = new Date("2026-10-13T00:00:00Z");
    const category = await tx.category.findFirst({ where: { isActive: true } }); assert.ok(category);
    const product = await tx.product.create({ data: { sellerId: seller.id, categoryId: category.id, title: "Growth jewelry", slug: `growth-piece-${tag}`, description: "Temporary fixture", status: "ACTIVE", primaryMetal: "GOLD_18K", currency: "USD", basePriceMinor: 100, normalizedPriceUsd: 100, shipsFromCountry: "IN", shipsTo: [], tags: [], certificationLabs: [] } });
    for (const data of [
      { type: "STORE_VIEW" as const, sellerId: seller.id, createdAt: now },
      { type: "PRODUCT_VIEW" as const, sellerId: seller.id, productId: product.id, createdAt: yesterday },
      { type: "PAGE_VIEW" as const, sellerId: seller.id, metadata: { event: "contact_click", channel: "whatsapp" }, createdAt: now },
      { type: "PAGE_VIEW" as const, sellerId: seller.id, metadata: { event: "unrelated" }, createdAt: now },
      { type: "STORE_VIEW" as const, sellerId: "other-seller", createdAt: now },
      { type: "STORE_VIEW" as const, sellerId: seller.id, createdAt: old },
      { type: "STORE_VIEW" as const, sellerId: seller.id, createdAt: future },
    ]) await tx.analyticsEvent.create({ data });
    const request = await tx.customRequest.create({ data: { buyerId: other.id, sellerId: seller.id, reference: `GROWTH-${tag}`, title: "Growth enquiry", description: "Test", currency: "USD", referenceImageUrls: [], createdAt: now } });
    const stats = await getJewelerAnalytics(seller.id, 7, tx, now);
    assert.equal(stats.profileViews, 1); assert.equal(stats.jewelryViews, 1); assert.equal(stats.contactClicks, 1); assert.equal(stats.enquiries, 1);
    assert.deepEqual(stats.channels, [{ channel: "whatsapp", count: 1 }]); assert.equal(stats.products[0].id, product.id);
    assert.equal(stats.daily.length, 7); assert.equal(stats.daily[6].views, 1); assert.equal(stats.daily[5].views, 1); assert.equal(stats.daily[0].views, 0);
    const empty = await getJewelerAnalytics("other-empty-seller", 123, tx, now); assert.equal(empty.range, 30); assert.equal(empty.profileViews, 0); assert.equal(empty.daily.length, 30);
    console.log("PASS: analytics seller isolation, date boundaries, contact classification, top jewelry and empty periods");
    const unread = await tx.notification.create({ data: { userId: owner.id, type: "CUSTOM_REQUEST", title: "New", createdAt: yesterday } });
    const otherUnread = await tx.notification.create({ data: { userId: other.id, type: "CUSTOM_REQUEST", title: "Other", createdAt: yesterday } });
    const later = await tx.notification.create({ data: { userId: owner.id, type: "CUSTOM_REQUEST", title: "Later", createdAt: future } });
    const unrelated = await tx.notification.create({ data: { userId: owner.id, type: "SYSTEM", title: "Other type", createdAt: yesterday } });
    await markInquiryNotificationsRead(owner.id, now, tx);
    assert.ok((await tx.notification.findUniqueOrThrow({ where: { id: unread.id } })).readAt);
    for (const id of [otherUnread.id, later.id, unrelated.id]) assert.equal((await tx.notification.findUniqueOrThrow({ where: { id } })).readAt, null);
    const status = await tx.$queryRaw<{ inquiryStatus: string }[]>`SELECT "inquiryStatus" FROM "CustomRequest" WHERE id = ${request.id}`; assert.equal(status[0].inquiryStatus, "NEW");
    console.log("PASS: notification ownership, type and time boundaries; marking read preserves enquiry status");
    throw rollback;
  });
} catch (error) { if (error !== rollback) throw error; }
await db.$disconnect();
console.log("Jeweler growth checks passed; database fixtures rolled back.");
