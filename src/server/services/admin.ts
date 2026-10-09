import "server-only";

import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { DisputePriority, KycDocumentType, type Role, type VerificationStatus } from "@/generated/prisma/enums";
import { convertMinor, type FxRates, isCurrency, toMinor } from "@/lib/money";
import { num } from "@/lib/utils";
import { db } from "@/server/db";
import { publicProductWhere } from "./catalog";
import { refreshProductFacets } from "./listings";
import { getFxRates } from "./market";
import { notify, postMessage } from "./messaging";

export class AdminError extends Error {}

const DAY = 86_400_000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const PAID = ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"] as const;

/** Order-currency minor units → USD cents, at the order's FX snapshot when it has one. */
function toUsd(minor: bigint | number, currency: string, snapshot: unknown, fallback: FxRates) {
  if (currency === "USD") return num(minor);
  const rates = (snapshot as { rates?: FxRates } | null)?.rates;
  const table = rates?.[currency] ? { USD: 1, ...rates } : fallback;
  return table[currency] ? convertMinor(num(minor), currency, "USD", table, "exact") : 0;
}

const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : null);

function zeroSeries(rangeDays: number, now: number) {
  const m = new Map<string, number>();
  for (let i = rangeDays - 1; i >= 0; i--) m.set(dayKey(new Date(now - i * DAY)), 0);
  return m;
}
const toPoints = (m: Map<string, number>) => [...m.entries()].map(([date, value]) => ({ date, value }));

// ── Platform analytics ────────────────────────────────────────────────────────

/**
 * GMV is merchandise value (item subtotals, excluding tax, duties and
 * shipping) of paid seller orders that weren't cancelled before dispatch.
 * Everything is reported in USD at each order's FX snapshot.
 */
export async function getPlatformAnalytics(rangeDays: number) {
  const now = Date.now();
  const since = new Date(now - rangeDays * DAY);
  const prevSince = new Date(now - 2 * rangeDays * DAY);
  const fx = await getFxRates();

  const [orders, ledger, traffic, listings, units, storeStatus, activeStores, newStores, stages, queues] = await Promise.all([
    db.order.findMany({
      where: { placedAt: { gte: prevSince }, paymentStatus: { in: [...PAID] } },
      select: {
        placedAt: true,
        currency: true,
        fxSnapshot: true,
        sellerOrders: { select: { sellerId: true, status: true, subtotalMinor: true, commissionMinor: true } },
        items: { select: { totalMinor: true, sellerOrder: { select: { status: true } }, product: { select: { category: { select: { name: true, parent: { select: { name: true } } } } } } } },
      },
    }),
    db.ledgerEntry.findMany({
      where: { occurredAt: { gte: prevSince }, type: { in: ["COMMISSION_REVERSAL", "LISTING_FEE", "SUBSCRIPTION_FEE", "REFUND"] } },
      select: { type: true, amountUsdMinor: true, occurredAt: true },
    }),
    db.$queryRaw<{ day: Date; sessions: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(DISTINCT "sessionId")::bigint AS sessions
      FROM "AnalyticsEvent"
      WHERE "createdAt" >= ${prevSince} AND "sessionId" IS NOT NULL
      GROUP BY 1 ORDER BY 1`,
    db.product.count({ where: publicProductWhere }),
    db.productVariant.aggregate({ where: { isActive: true, product: publicProductWhere }, _sum: { stockQuantity: true } }),
    db.sellerProfile.groupBy({ by: ["verificationStatus"], _count: { _all: true } }),
    db.sellerProfile.count({ where: { verificationStatus: "APPROVED", products: { some: { status: "ACTIVE", deletedAt: null } } } }),
    db.sellerProfile.count({ where: { approvedAt: { gte: since } } }),
    db.sellerOrder.groupBy({ by: ["status"], where: { createdAt: { gte: since }, order: { paymentStatus: { in: [...PAID] } } }, _count: { _all: true } }),
    getAdminQueues(),
  ]);

  const gmvSeries = zeroSeries(rangeDays, now);
  const commissionSeries = zeroSeries(rangeDays, now);
  const bySeller = new Map<string, { gmv: number; commission: number; orders: number }>();
  const byCategory = new Map<string, number>();
  let gmv = 0, prevGmv = 0, commission = 0, prevCommission = 0, orderCount = 0, prevOrderCount = 0;

  for (const o of orders) {
    const current = o.placedAt! >= since;
    const live = o.sellerOrders.filter((so) => so.status !== "CANCELLED");
    if (!live.length) continue;
    const g = live.reduce((n, so) => n + toUsd(so.subtotalMinor, o.currency, o.fxSnapshot, fx), 0);
    const c = live.reduce((n, so) => n + toUsd(so.commissionMinor, o.currency, o.fxSnapshot, fx), 0);
    if (!current) {
      prevGmv += g;
      prevCommission += c;
      prevOrderCount++;
      continue;
    }
    gmv += g;
    commission += c;
    orderCount++;
    const k = dayKey(o.placedAt!);
    if (gmvSeries.has(k)) {
      gmvSeries.set(k, gmvSeries.get(k)! + g);
      commissionSeries.set(k, commissionSeries.get(k)! + c);
    }
    for (const so of live) {
      const row = bySeller.get(so.sellerId) ?? { gmv: 0, commission: 0, orders: 0 };
      row.gmv += toUsd(so.subtotalMinor, o.currency, o.fxSnapshot, fx);
      row.commission += toUsd(so.commissionMinor, o.currency, o.fxSnapshot, fx);
      row.orders++;
      bySeller.set(so.sellerId, row);
    }
    for (const item of o.items) {
      if (item.sellerOrder.status === "CANCELLED") continue;
      const cat = item.product?.category;
      const root = cat?.parent?.name ?? cat?.name ?? "Other";
      byCategory.set(root, (byCategory.get(root) ?? 0) + toUsd(item.totalMinor, o.currency, o.fxSnapshot, fx));
    }
  }

  const sumLedger = (type: string, from: Date, to = new Date(now + DAY)) =>
    ledger.filter((l) => l.type === type && l.occurredAt >= from && l.occurredAt < to).reduce((n, l) => n + num(l.amountUsdMinor), 0);
  const reversals = sumLedger("COMMISSION_REVERSAL", since);
  const prevReversals = sumLedger("COMMISSION_REVERSAL", prevSince, since);
  const fees = sumLedger("LISTING_FEE", since) + sumLedger("SUBSCRIPTION_FEE", since);
  const refunds = sumLedger("REFUND", since);
  const netCommission = commission - reversals;

  const trafficSeries = zeroSeries(rangeDays, now);
  let sessions = 0, prevSessions = 0;
  for (const t of traffic) {
    const day = new Date(t.day);
    const n = Number(t.sessions);
    if (day >= new Date(dayKey(since))) {
      sessions += n;
      const k = dayKey(day);
      if (trafficSeries.has(k)) trafficSeries.set(k, n);
    } else prevSessions += n;
  }

  const sellerRows = await db.sellerProfile.findMany({
    where: { id: { in: [...bySeller.keys()] } },
    select: { id: true, storeName: true, slug: true, logoUrl: true, country: true, ratingAverage: true },
  });
  const topSellers = sellerRows
    .map((s) => ({ ...s, ...bySeller.get(s.id)! }))
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 8);

  const statusCount = Object.fromEntries(storeStatus.map((s) => [s.verificationStatus, s._count._all])) as Partial<Record<VerificationStatus, number>>;

  return {
    gmv,
    gmvDelta: pct(gmv, prevGmv),
    commission,
    netCommission,
    netCommissionDelta: pct(netCommission, prevCommission - prevReversals),
    reversals,
    takeRate: gmv ? (netCommission / gmv) * 100 : 0,
    fees,
    refunds,
    orders: orderCount,
    ordersDelta: pct(orderCount, prevOrderCount),
    aov: orderCount ? Math.round(gmv / orderCount) : 0,
    listings,
    units: units._sum.stockQuantity ?? 0,
    stores: { active: activeStores, approved: statusCount.APPROVED ?? 0, pending: statusCount.PENDING ?? 0, suspended: statusCount.SUSPENDED ?? 0, newInRange: newStores },
    sessions,
    sessionsDelta: pct(sessions, prevSessions),
    conversion: sessions ? (orderCount / sessions) * 100 : 0,
    gmvSeries: toPoints(gmvSeries),
    commissionSeries: toPoints(commissionSeries),
    trafficSeries: toPoints(trafficSeries),
    stages: Object.fromEntries(stages.map((s) => [s.status, s._count._all])) as Record<string, number>,
    categories: [...byCategory.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    topSellers,
    queues,
  };
}

/** Work waiting on the admin team — drives nav badges and the overview. */
export async function getAdminQueues() {
  const [kyc, disputes, urgent, certificates, heldPayouts] = await Promise.all([
    db.sellerProfile.count({ where: { verificationStatus: "PENDING" } }),
    db.dispute.count({ where: { status: { notIn: ["RESOLVED", "CLOSED"] } } }),
    db.dispute.count({ where: { status: { notIn: ["RESOLVED", "CLOSED"] }, priority: { in: ["HIGH", "URGENT"] } } }),
    db.certificate.count({ where: { status: "PENDING_REVIEW", product: { deletedAt: null } } }),
    db.payout.count({ where: { status: "ON_HOLD" } }),
  ]);
  return { kyc, disputes, urgent, certificates, heldPayouts };
}

// ── Jeweler verification (KYC) ────────────────────────────────────────────────

export async function getKycCounts() {
  const rows = await db.sellerProfile.groupBy({ by: ["verificationStatus"], _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.verificationStatus, r._count._all])) as Partial<Record<VerificationStatus, number>>;
}

export async function listKycApplications(status: VerificationStatus | "ALL") {
  return db.sellerProfile.findMany({
    where: status === "ALL" ? { verificationStatus: { not: "NOT_SUBMITTED" } } : { verificationStatus: status },
    orderBy: status === "PENDING" ? { submittedAt: "asc" } : { updatedAt: "desc" },
    take: 200,
    include: {
      user: { select: { email: true, name: true } },
      kycSubmissions: { orderBy: { submittedAt: "desc" }, take: 1, include: { reviewer: { select: { name: true } }, _count: { select: { documents: true } } } },
    },
  });
}

const fileSelect = { select: { id: true, fileName: true, mimeType: true, sizeBytes: true } } as const;

export async function getKycReview(sellerId: string) {
  const [seller, settings] = await Promise.all([
    db.sellerProfile.findUnique({
      where: { id: sellerId },
      include: {
        user: { select: { id: true, email: true, name: true, createdAt: true, lastLoginAt: true, status: true, emailVerified: true } },
        returnAddress: true,
        locations: true,
        kycSubmissions: {
          orderBy: { submittedAt: "desc" },
          include: { reviewer: { select: { name: true } }, documents: { orderBy: { createdAt: "asc" }, include: { file: fileSelect } } },
        },
        subscription: { include: { plan: { select: { name: true } } } },
        _count: { select: { products: true, sellerOrders: true, disputes: true, reviews: true } },
      },
    }),
    db.platformSettings.findUniqueOrThrow({ where: { id: "platform" } }),
  ]);
  if (!seller) return null;

  const [duplicates, audit, openDisputes, gmv] = await Promise.all([
    seller.registrationNumber
      ? db.sellerProfile.findMany({ where: { id: { not: seller.id }, registrationNumber: seller.registrationNumber, country: seller.country }, select: { id: true, storeName: true } })
      : Promise.resolve([]),
    db.auditLog.findMany({ where: { entityType: "SellerProfile", entityId: seller.id }, orderBy: { createdAt: "desc" }, take: 25, include: { actor: { select: { name: true, email: true } } } }),
    db.dispute.count({ where: { sellerId: seller.id, status: { notIn: ["RESOLVED", "CLOSED"] } } }),
    db.ledgerEntry.aggregate({ where: { sellerId: seller.id, type: "COMMISSION" }, _sum: { amountUsdMinor: true }, _count: { _all: true } }),
  ]);

  const latest = seller.kycSubmissions[0] ?? null;
  const docs = latest?.documents ?? [];
  const rawReqDocs = settings.requiredKycDocuments;
  const requiredDocs: KycDocumentType[] = Array.isArray(rawReqDocs)
    ? rawReqDocs
    : typeof rawReqDocs === "string"
      ? ((rawReqDocs as string).replace(/[{}"']/g, "").split(",").map((s) => s.trim()).filter(Boolean) as KycDocumentType[])
      : ["TAX_REGISTRATION", "BUSINESS_LICENSE", "GOVERNMENT_ID"];
  const missing = requiredDocs.filter((t) => !docs.some((d) => d.type === t));
  const payoutReady = seller.payoutMethod === "STRIPE_CONNECT" ? seller.stripeDetailsSubmitted : !!seller.bankAccountLast4;

  const checks = [
    { label: "Required documents", ok: missing.length === 0, detail: missing.length ? `Missing ${missing.map((m) => m.toLowerCase().replace(/_/g, " ")).join(", ")}` : `${docs.length} uploaded` },
    { label: "Legal entity", ok: !!(seller.legalBusinessName && seller.registrationNumber), detail: seller.legalBusinessName ?? "Not provided" },
    { label: "Tax ID on file", ok: !!seller.taxIdLast4, detail: seller.taxIdLast4 ? `Ending ${seller.taxIdLast4} · stored encrypted` : "Not provided" },
    {
      label: "Payout account",
      ok: payoutReady,
      detail:
        seller.payoutMethod === "STRIPE_CONNECT"
          ? `Stripe ${seller.stripeAccountId ?? "—"} · ${seller.stripeDetailsSubmitted ? "details submitted" : "onboarding incomplete"}`
          : seller.bankAccountLast4
            ? `${seller.bankName ?? "Bank"} ••••${seller.bankAccountLast4}`
            : "Not set up",
    },
    { label: "Return address", ok: !!seller.returnAddress, detail: seller.returnAddress ? `${seller.returnAddress.city}, ${seller.returnAddress.country}` : "Missing" },
    { label: "Unique registration", ok: duplicates.length === 0, detail: duplicates.length ? `Also used by ${duplicates.map((d) => d.storeName).join(", ")}` : "Not used by any other store" },
  ];

  return { seller, settings, latest, checks, audit, openDisputes, commissionUsd: num(gmv._sum.amountUsdMinor), commissionOrders: gmv._count._all };
}

export const kycDecisionSchema = z.object({
  sellerId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  feedback: z.string().trim().max(2000),
  internalNotes: z.string().trim().max(4000).optional(),
  documents: z.array(z.object({ id: z.string(), status: z.enum(["ACCEPTED", "REJECTED"]), reason: z.string().trim().max(300).optional() })).default([]),
});

export async function reviewKyc(adminId: string, input: z.infer<typeof kycDecisionSchema>) {
  const seller = await db.sellerProfile.findUnique({ where: { id: input.sellerId }, include: { kycSubmissions: { orderBy: { submittedAt: "desc" }, take: 1, include: { documents: true } } } });
  if (!seller) throw new AdminError("Jeweler not found.");
  if (seller.verificationStatus !== "PENDING") throw new AdminError("Only applications awaiting review can be decided.");
  const submission = seller.kycSubmissions[0];
  if (!submission) throw new AdminError("There's no submission to review.");
  const approve = input.decision === "APPROVE";
  if (!approve && input.feedback.length < 10) throw new AdminError("Tell the jeweler what to fix — at least a sentence.");
  if (approve && input.documents.some((d) => d.status === "REJECTED")) throw new AdminError("Accept every document before approving, or reject the application.");
  if (input.documents.some((d) => d.status === "REJECTED" && !d.reason)) throw new AdminError("Give a reason for each rejected document.");

  const now = new Date();
  await db.$transaction(async (tx) => {
    for (const d of input.documents) {
      if (!submission.documents.some((x) => x.id === d.id)) continue;
      await tx.kycDocument.update({ where: { id: d.id }, data: { status: d.status, rejectionReason: d.status === "REJECTED" ? d.reason : null } });
    }
    if (approve) {
      await tx.kycDocument.updateMany({ where: { submissionId: submission.id, status: "PENDING" }, data: { status: "ACCEPTED" } });
    } else {
      // Documents that passed carry over to the jeweler's next submission, so
      // they only replace what was rejected.
      await tx.kycDocument.updateMany({ where: { submissionId: submission.id, status: { not: "REJECTED" } }, data: { submissionId: null, status: "ACCEPTED" } });
    }
    await tx.kycSubmission.update({
      where: { id: submission.id },
      data: { status: approve ? "APPROVED" : "REJECTED", reviewedAt: now, reviewerId: adminId, reviewerNotes: input.feedback || null, internalNotes: input.internalNotes || null },
    });
    await tx.sellerProfile.update({ where: { id: seller.id }, data: approve ? { verificationStatus: "APPROVED", approvedAt: now, onboardingStep: 4 } : { verificationStatus: "REJECTED" } });
    await tx.auditLog.create({ data: { actorId: adminId, action: approve ? "kyc.approve" : "kyc.reject", entityType: "SellerProfile", entityId: seller.id, metadata: { submissionId: submission.id, rejectedDocuments: input.documents.filter((d) => d.status === "REJECTED").length } } });
    await notify(
      tx,
      seller.userId,
      "KYC",
      approve ? `${seller.storeName} is approved` : "Your application needs changes",
      approve ? "Your seller studio is unlocked — publish your first piece." : input.feedback.slice(0, 160),
      approve ? "/seller" : "/seller/onboarding",
    );
  });
}

export async function suspendSeller(adminId: string, sellerId: string, reason: string) {
  const seller = await db.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller) throw new AdminError("Jeweler not found.");
  if (seller.verificationStatus !== "APPROVED") throw new AdminError("Only live stores can be suspended.");
  if (reason.trim().length < 10) throw new AdminError("Record why the store is being suspended.");
  await db.$transaction(async (tx) => {
    await tx.sellerProfile.update({ where: { id: sellerId }, data: { verificationStatus: "SUSPENDED", suspendedAt: new Date(), suspensionReason: reason.trim() } });
    // Hold undisbursed funds while the store is under review.
    await tx.payout.updateMany({ where: { sellerId, status: "PENDING" }, data: { status: "ON_HOLD", holdReason: "Store suspended" } });
    await tx.auditLog.create({ data: { actorId: adminId, action: "seller.suspend", entityType: "SellerProfile", entityId: sellerId, metadata: { reason: reason.trim() } } });
    await notify(tx, seller.userId, "KYC", "Your store has been suspended", reason.trim().slice(0, 160), "/seller/onboarding");
  });
}

export async function reinstateSeller(adminId: string, sellerId: string) {
  const seller = await db.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller || seller.verificationStatus !== "SUSPENDED") throw new AdminError("Only suspended stores can be reinstated.");
  await db.$transaction(async (tx) => {
    await tx.sellerProfile.update({ where: { id: sellerId }, data: { verificationStatus: "APPROVED", suspendedAt: null, suspensionReason: null } });
    await tx.payout.updateMany({ where: { sellerId, status: "ON_HOLD", holdReason: "Store suspended" }, data: { status: "PENDING", holdReason: null } });
    await tx.auditLog.create({ data: { actorId: adminId, action: "seller.reinstate", entityType: "SellerProfile", entityId: sellerId } });
    await notify(tx, seller.userId, "KYC", "Your store is live again", "Thanks for your patience — listings are visible to buyers.", "/seller");
  });
}

export async function updateSellerTerms(adminId: string, sellerId: string, patch: { commissionPercent: number | null; isFeatured: boolean; isTopRated: boolean }) {
  if (patch.commissionPercent !== null && (patch.commissionPercent < 0 || patch.commissionPercent > 50)) throw new AdminError("Commission must be between 0% and 50%.");
  const bps = patch.commissionPercent === null ? null : Math.round(patch.commissionPercent * 100);
  const before = await db.sellerProfile.findUnique({ where: { id: sellerId }, select: { commissionRateBps: true, isFeatured: true, isTopRated: true } });
  if (!before) throw new AdminError("Jeweler not found.");
  await db.$transaction([
    db.sellerProfile.update({ where: { id: sellerId }, data: { commissionRateBps: bps, isFeatured: patch.isFeatured, isTopRated: patch.isTopRated } }),
    db.auditLog.create({ data: { actorId: adminId, action: "seller.terms", entityType: "SellerProfile", entityId: sellerId, metadata: { before, after: { commissionRateBps: bps, isFeatured: patch.isFeatured, isTopRated: patch.isTopRated } } } }),
  ]);
}

// ── Certificates ──────────────────────────────────────────────────────────────

export async function listCertificates(status: "PENDING_REVIEW" | "VERIFIED" | "REJECTED") {
  return db.certificate.findMany({
    where: { status, product: { deletedAt: null } },
    orderBy: { createdAt: status === "PENDING_REVIEW" ? "asc" : "desc" },
    take: 100,
    include: {
      file: { select: { id: true, fileName: true } },
      variant: { select: { sku: true } },
      product: { select: { id: true, title: true, slug: true, status: true, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } }, seller: { select: { id: true, storeName: true } } } },
    },
  });
}

export async function reviewCertificate(adminId: string, certificateId: string, decision: "VERIFY" | "REJECT", note?: string) {
  const cert = await db.certificate.findUnique({ where: { id: certificateId }, include: { product: { select: { id: true, title: true, seller: { select: { userId: true } } } } } });
  if (!cert) throw new AdminError("Certificate not found.");
  if (decision === "REJECT" && (note?.trim().length ?? 0) < 5) throw new AdminError("Explain why the certificate was rejected.");
  await db.$transaction(async (tx) => {
    await tx.certificate.update({
      where: { id: cert.id },
      data: decision === "VERIFY" ? { status: "VERIFIED", verifiedAt: new Date(), notes: note?.trim() || null } : { status: "REJECTED", verifiedAt: null, notes: note!.trim() },
    });
    await refreshProductFacets(tx, cert.productId);
    await tx.auditLog.create({ data: { actorId: adminId, action: decision === "VERIFY" ? "certificate.verify" : "certificate.reject", entityType: "Certificate", entityId: cert.id, metadata: { lab: cert.lab, reportNumber: cert.reportNumber } } });
    await notify(
      tx,
      cert.product.seller.userId,
      "SYSTEM",
      decision === "VERIFY" ? "Certificate verified" : "Certificate not accepted",
      `${cert.lab.replace(/_/g, " ")} ${cert.reportNumber} · ${cert.product.title}${decision === "REJECT" ? ` — ${note!.trim()}` : ""}`,
      `/seller/products/${cert.productId}`,
    );
  });
}

// ── Disputes ──────────────────────────────────────────────────────────────────

export const DISPUTE_VIEWS = {
  open: { label: "Needs action", where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } },
  waiting: { label: "Waiting on a party", where: { status: { in: ["AWAITING_SELLER", "AWAITING_BUYER"] } } },
  resolved: { label: "Resolved", where: { status: { in: ["RESOLVED", "CLOSED"] } } },
  all: { label: "All cases", where: {} },
} satisfies Record<string, { label: string; where: Prisma.DisputeWhereInput }>;
export type DisputeView = keyof typeof DISPUTE_VIEWS;

export async function listDisputes(view: DisputeView) {
  const [rows, counts] = await Promise.all([
    db.dispute.findMany({
      where: DISPUTE_VIEWS[view].where,
      orderBy: view === "resolved" ? [{ resolvedAt: "desc" }] : [{ createdAt: "asc" }],
      take: 200,
      include: {
        seller: { select: { storeName: true } },
        openedBy: { select: { name: true, email: true } },
        assignedAdmin: { select: { name: true } },
        sellerOrder: { select: { reference: true } },
      },
    }),
    Promise.all((Object.keys(DISPUTE_VIEWS) as DisputeView[]).map(async (k) => [k, await db.dispute.count({ where: DISPUTE_VIEWS[k].where })] as const)),
  ]);
  const priorityRank = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
  if (view !== "resolved") rows.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.createdAt.getTime() - b.createdAt.getTime());
  return { rows, counts: Object.fromEntries(counts) as Record<DisputeView, number> };
}

export async function getDisputeCase(id: string) {
  return db.dispute.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, storeName: true, slug: true, logoUrl: true, userId: true, returnWindowDays: true, ratingAverage: true, ratingCount: true, user: { select: { email: true } } } },
      openedBy: { select: { id: true, name: true, email: true, createdAt: true } },
      assignedAdmin: { select: { id: true, name: true } },
      order: { select: { orderNumber: true, placedAt: true, currency: true, totalMinor: true } },
      sellerOrder: {
        include: {
          items: true,
          shipments: { orderBy: { createdAt: "asc" }, include: { events: { orderBy: { occurredAt: "desc" }, take: 1 } } },
          statusEvents: { orderBy: { createdAt: "asc" } },
          payout: true,
          refunds: { select: { amountMinor: true, status: true } },
          returnRequests: { orderBy: { createdAt: "desc" } },
        },
      },
      refunds: { orderBy: { createdAt: "asc" } },
      conversation: {
        include: {
          messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { id: true, name: true, role: true } } } },
        },
      },
    },
  });
}

export const disputeUpdateSchema = z.object({
  disputeId: z.string().min(1),
  status: z.enum(["OPEN", "AWAITING_SELLER", "AWAITING_BUYER", "UNDER_REVIEW"]).optional(),
  priority: z.enum(DisputePriority).optional(),
  assignToMe: z.boolean().optional(),
  internalNotes: z.string().trim().max(4000).optional(),
});

const STATUS_NOTES = {
  OPEN: "This case has been reopened.",
  AWAITING_SELLER: "Loupe has asked the jeweler to respond within 72 hours.",
  AWAITING_BUYER: "Loupe has asked the buyer for more information within 72 hours.",
  UNDER_REVIEW: "A Loupe specialist is now reviewing the evidence.",
} as const;

export async function updateDisputeCase(adminId: string, input: z.infer<typeof disputeUpdateSchema>) {
  const dispute = await db.dispute.findUnique({ where: { id: input.disputeId }, include: { conversation: { select: { id: true } }, seller: { select: { userId: true } } } });
  if (!dispute) throw new AdminError("Case not found.");
  if (["RESOLVED", "CLOSED"].includes(dispute.status)) throw new AdminError("This case is closed.");
  const statusChanged = input.status && input.status !== dispute.status;
  await db.$transaction(async (tx) => {
    await tx.dispute.update({
      where: { id: dispute.id },
      data: {
        status: input.status,
        priority: input.priority,
        internalNotes: input.internalNotes,
        ...(input.assignToMe ? { assignedAdminId: adminId } : {}),
        ...(statusChanged && (input.status === "AWAITING_SELLER" || input.status === "AWAITING_BUYER") ? { sellerResponseDueAt: new Date(Date.now() + 72 * 3_600_000) } : {}),
      },
    });
    if (input.assignToMe && dispute.conversation) {
      const joined = await tx.conversationParticipant.findFirst({ where: { conversationId: dispute.conversation.id, userId: adminId } });
      if (!joined) await tx.conversationParticipant.create({ data: { conversationId: dispute.conversation.id, userId: adminId, role: "ADMIN" } });
    }
    if (statusChanged && dispute.conversation) {
      await postMessage(tx, dispute.conversation.id, null, STATUS_NOTES[input.status!], { isSystem: true });
      if (input.status === "AWAITING_SELLER") await notify(tx, dispute.seller.userId, "DISPUTE", "Loupe needs your response", dispute.caseNumber, `/seller/messages/${dispute.conversation.id}`);
      if (input.status === "AWAITING_BUYER") await notify(tx, dispute.openedById, "DISPUTE", "Loupe needs more information", dispute.caseNumber, `/account/messages/${dispute.conversation.id}`);
    }
    await tx.auditLog.create({ data: { actorId: adminId, action: "dispute.update", entityType: "Dispute", entityId: dispute.id, metadata: { status: input.status ?? null, priority: input.priority ?? null, assigned: !!input.assignToMe } } });
  });
}

// ── Monetization ──────────────────────────────────────────────────────────────

export const platformSettingsSchema = z
  .object({
    defaultCommissionPercent: z.coerce.number().min(0, "Commission can't be negative.").max(50, "Commission is capped at 50%."),
    listingFee: z.coerce.number().min(0).max(1000, "Listing fee is capped at 1,000."),
    listingFeeCurrency: z.string().refine((c) => isCurrency(c), "Choose a currency."),
    inspectionWindowDays: z.coerce.number().int().min(0).max(30),
    offerExpiryHours: z.coerce.number().int().min(1).max(336),
    minOfferPercent: z.coerce.number().min(0).max(100),
    reservationMinutes: z.coerce.number().int().min(5).max(120),
    signatureThresholdUsd: z.coerce.number().min(0),
    secureCourierThresholdUsd: z.coerce.number().min(0),
    requiredKycDocuments: z.array(z.enum(KycDocumentType)).min(1, "Require at least one document."),
  })
  .refine((v) => v.secureCourierThresholdUsd >= v.signatureThresholdUsd, { message: "The secure-courier threshold should be at or above the signature threshold.", path: ["secureCourierThresholdUsd"] });

export async function updatePlatformSettings(adminId: string, input: z.infer<typeof platformSettingsSchema>) {
  const before = await db.platformSettings.findUniqueOrThrow({ where: { id: "platform" } });
  const data = {
    defaultCommissionBps: Math.round(input.defaultCommissionPercent * 100),
    listingFeeMinor: toMinor(input.listingFee, input.listingFeeCurrency),
    listingFeeCurrency: input.listingFeeCurrency,
    inspectionWindowDays: input.inspectionWindowDays,
    offerExpiryHours: input.offerExpiryHours,
    minOfferBps: Math.round(input.minOfferPercent * 100),
    reservationMinutes: input.reservationMinutes,
    signatureThresholdUsd: Math.round(input.signatureThresholdUsd * 100),
    secureCourierThresholdUsd: Math.round(input.secureCourierThresholdUsd * 100),
    requiredKycDocuments: input.requiredKycDocuments,
    updatedById: adminId,
  };
  await db.$transaction([
    db.platformSettings.update({ where: { id: "platform" }, data }),
    db.auditLog.create({
      data: {
        actorId: adminId,
        action: "settings.update",
        entityType: "PlatformSettings",
        entityId: "platform",
        metadata: { before: { defaultCommissionBps: before.defaultCommissionBps, listingFeeMinor: num(before.listingFeeMinor), inspectionWindowDays: before.inspectionWindowDays }, after: { defaultCommissionBps: data.defaultCommissionBps, listingFeeMinor: data.listingFeeMinor, inspectionWindowDays: data.inspectionWindowDays } },
      },
    }),
  ]);
}

export const commissionRuleSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(2, "Name the rule."),
    scope: z.enum(["CATEGORY", "SELLER"]),
    categoryId: z.string().optional(),
    sellerId: z.string().optional(),
    ratePercent: z.coerce.number().min(0).max(50, "Commission is capped at 50%."),
    priority: z.coerce.number().int().min(0).max(100),
    isActive: z.boolean(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
  })
  .refine((r) => (r.scope === "CATEGORY" ? !!r.categoryId : !!r.sellerId), { message: "Choose what this rule applies to.", path: ["categoryId"] })
  .refine((r) => !r.startsAt || !r.endsAt || new Date(r.startsAt) < new Date(r.endsAt), { message: "The end date must be after the start date.", path: ["endsAt"] });

export async function saveCommissionRule(adminId: string, input: z.infer<typeof commissionRuleSchema>) {
  const data = {
    name: input.name,
    categoryId: input.scope === "CATEGORY" ? input.categoryId! : null,
    sellerId: input.scope === "SELLER" ? input.sellerId! : null,
    rateBps: Math.round(input.ratePercent * 100),
    priority: input.priority,
    isActive: input.isActive,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
  };
  const rule = input.id ? await db.commissionRule.update({ where: { id: input.id }, data }) : await db.commissionRule.create({ data });
  await db.auditLog.create({ data: { actorId: adminId, action: input.id ? "commission_rule.update" : "commission_rule.create", entityType: "CommissionRule", entityId: rule.id, metadata: { rateBps: data.rateBps, scope: input.scope } } });
}

export async function deleteCommissionRule(adminId: string, id: string) {
  await db.commissionRule.delete({ where: { id } });
  await db.auditLog.create({ data: { actorId: adminId, action: "commission_rule.delete", entityType: "CommissionRule", entityId: id } });
}

export const planSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2),
  description: z.string().trim().max(300).optional(),
  price: z.coerce.number().min(0),
  commissionDiscountPercent: z.coerce.number().min(0).max(10, "Plan discounts are capped at 10 points."),
  featuredSlots: z.coerce.number().int().min(0).max(50),
  homepagePlacement: z.boolean(),
  listingFeeWaived: z.boolean(),
  features: z.array(z.string().trim().min(1)).max(12),
  isActive: z.boolean(),
});

/** Price changes apply from each subscriber's next billing period (a new Stripe Price in production). */
export async function savePlan(adminId: string, input: z.infer<typeof planSchema>) {
  const plan = await db.subscriptionPlan.findUnique({ where: { id: input.id } });
  if (!plan) throw new AdminError("Plan not found.");
  await db.$transaction([
    db.subscriptionPlan.update({
      where: { id: plan.id },
      data: {
        name: input.name,
        description: input.description || null,
        priceMinor: toMinor(input.price, plan.currency),
        commissionDiscountBps: Math.round(input.commissionDiscountPercent * 100),
        featuredSlots: input.featuredSlots,
        homepagePlacement: input.homepagePlacement,
        listingFeeWaived: input.listingFeeWaived,
        features: input.features,
        isActive: input.isActive,
      },
    }),
    db.auditLog.create({ data: { actorId: adminId, action: "plan.update", entityType: "SubscriptionPlan", entityId: plan.id, metadata: { priceBefore: num(plan.priceMinor), priceAfter: toMinor(input.price, plan.currency) } } }),
  ]);
}

export async function getRevenueBreakdown(days = 30) {
  const since = new Date(Date.now() - days * DAY);
  const rows = await db.ledgerEntry.groupBy({ by: ["type"], where: { occurredAt: { gte: since } }, _sum: { amountUsdMinor: true } });
  const get = (t: string) => num(rows.find((r) => r.type === t)?._sum.amountUsdMinor);
  return {
    commission: get("COMMISSION") - get("COMMISSION_REVERSAL"),
    listingFees: get("LISTING_FEE"),
    subscriptions: get("SUBSCRIPTION_FEE"),
    taxCollected: get("TAX_COLLECTED"),
    dutiesCollected: get("DUTIES_COLLECTED"),
  };
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function listUsers(args: { q?: string; role?: Role; status?: "ACTIVE" | "SUSPENDED" | "DEACTIVATED"; page: number; perPage?: number }) {
  const perPage = args.perPage ?? 30;
  const where: Prisma.UserWhereInput = {
    ...(args.role ? { role: args.role } : {}),
    ...(args.status ? { status: args.status } : {}),
    ...(args.q ? { OR: [{ email: { contains: args.q, mode: "insensitive" } }, { name: { contains: args.q, mode: "insensitive" } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (args.page - 1) * perPage,
      take: perPage,
      select: { id: true, name: true, email: true, role: true, status: true, country: true, createdAt: true, lastLoginAt: true, sellerProfile: { select: { id: true, storeName: true, verificationStatus: true } }, _count: { select: { orders: true } } },
    }),
    db.user.count({ where }),
  ]);
  return { rows, total, pageCount: Math.max(1, Math.ceil(total / perPage)) };
}

export async function setUserStatus(adminId: string, userId: string, status: "ACTIVE" | "SUSPENDED") {
  if (userId === adminId) throw new AdminError("You can't change your own account status.");
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true, status: true } });
  if (!user) throw new AdminError("User not found.");
  if (user.role === "ADMIN") throw new AdminError("Administrator accounts are managed by the platform owner.");
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { status } }),
    db.auditLog.create({ data: { actorId: adminId, action: status === "SUSPENDED" ? "user.suspend" : "user.reactivate", entityType: "User", entityId: userId, metadata: { from: user.status } } }),
  ]);
}

// ── Orders & audit ────────────────────────────────────────────────────────────

export async function listOrders(args: { q?: string; payment?: string; page: number; perPage?: number }) {
  const perPage = args.perPage ?? 30;
  const where: Prisma.OrderWhereInput = {
    status: { not: "PENDING_PAYMENT" },
    ...(args.payment ? { paymentStatus: args.payment as Prisma.EnumPaymentStatusFilter["equals"] } : {}),
    ...(args.q ? { OR: [{ orderNumber: { contains: args.q.toUpperCase() } }, { email: { contains: args.q, mode: "insensitive" } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (args.page - 1) * perPage,
      take: perPage,
      include: { buyer: { select: { name: true } }, sellerOrders: { select: { id: true, reference: true, status: true, seller: { select: { storeName: true } } } } },
    }),
    db.order.count({ where }),
  ]);
  return { rows, total, pageCount: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getAdminOrder(orderNumber: string) {
  return db.order.findUnique({
    where: { orderNumber },
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      payments: { orderBy: { createdAt: "asc" } },
      refunds: { orderBy: { createdAt: "asc" } },
      disputes: { select: { id: true, caseNumber: true, status: true } },
      sellerOrders: {
        orderBy: { reference: "asc" },
        include: {
          seller: { select: { id: true, storeName: true } },
          items: true,
          payout: true,
          shipments: { where: { direction: "OUTBOUND" }, select: { carrier: true, trackingNumber: true, status: true, deliveredAt: true } },
          statusEvents: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
}

export async function listAudit(args: { entity?: string; page: number; perPage?: number }) {
  const perPage = args.perPage ?? 40;
  const where: Prisma.AuditLogWhereInput = args.entity ? { entityType: args.entity } : {};
  const [rows, total, entities] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (args.page - 1) * perPage, take: perPage, include: { actor: { select: { name: true, email: true, role: true } } } }),
    db.auditLog.count({ where }),
    db.auditLog.groupBy({ by: ["entityType"], _count: { _all: true }, orderBy: { entityType: "asc" } }),
  ]);
  return { rows, total, pageCount: Math.max(1, Math.ceil(total / perPage)), entities: entities.map((e) => ({ entity: e.entityType, count: e._count._all })) };
}

// ── Payouts (escrow) ──────────────────────────────────────────────────────────

export const PAYOUT_VIEWS = {
  held: { label: "In inspection window", where: { status: "PENDING" } },
  hold: { label: "On hold", where: { status: "ON_HOLD" } },
  released: { label: "Paid out", where: { status: "RELEASED" } },
  reversed: { label: "Reversed & cancelled", where: { status: { in: ["REVERSED", "CANCELLED"] } } },
} satisfies Record<string, { label: string; where: Prisma.PayoutWhereInput }>;
export type PayoutView = keyof typeof PAYOUT_VIEWS;

export async function listPayouts(view: PayoutView) {
  const fx = await getFxRates();
  const [rows, counts, sums] = await Promise.all([
    db.payout.findMany({
      where: PAYOUT_VIEWS[view].where,
      orderBy: view === "released" ? { releasedAt: "desc" } : { createdAt: "asc" },
      take: 150,
      include: {
        seller: { select: { id: true, storeName: true } },
        sellerOrder: { select: { reference: true, status: true, deliveredAt: true, order: { select: { orderNumber: true } } } },
      },
    }),
    Promise.all((Object.keys(PAYOUT_VIEWS) as PayoutView[]).map(async (k) => [k, await db.payout.count({ where: PAYOUT_VIEWS[k].where })] as const)),
    db.payout.groupBy({ by: ["status", "currency"], _sum: { amountMinor: true } }),
  ]);
  // Approximate USD totals at today's rates — payouts settle in each order's currency.
  const usdTotal = (statuses: string[]) =>
    sums.filter((s) => statuses.includes(s.status)).reduce((n, s) => n + (fx[s.currency] ? convertMinor(num(s._sum.amountMinor), s.currency, "USD", fx, "exact") : 0), 0);
  return {
    rows,
    counts: Object.fromEntries(counts) as Record<PayoutView, number>,
    totals: { held: usdTotal(["PENDING"]), hold: usdTotal(["ON_HOLD"]), released: usdTotal(["RELEASED"]) },
  };
}
