import "server-only";

import type { ActorType, Carrier, CustomRequestStatus, DisputeReason, DisputeResolution, ReturnReason, ServiceStatus, ServiceType } from "@/generated/prisma/enums";
import { formatMoney } from "@/lib/money";
import type { AddressSnapshot } from "@/lib/order-math";
import { num, randomCode } from "@/lib/utils";
import { db, type Tx } from "@/server/db";
import { notify, openConversation, postMessage } from "./messaging";
import { refundPayment, stripe } from "./payments";

export class AfterSalesError extends Error {}

const RETURNABLE_WHEN_PERSONALISED: ReturnReason[] = ["DAMAGED", "NOT_AS_DESCRIBED", "AUTHENTICITY_CONCERN"];

async function adminIds(client: Tx | typeof db = db) {
  return (await client.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } })).map((a) => a.id);
}

// ── Refunds ───────────────────────────────────────────────────────────────────

export async function createRefund(args: {
  orderId: string;
  sellerOrderId: string;
  amountMinor: number;
  reason: string;
  initiatedBy: ActorType;
  initiatedById?: string | null;
  isForced?: boolean;
  /** Seller at fault → commission is reversed and the vendor's share clawed back. */
  sellerAtFault?: boolean;
  disputeId?: string;
  returnRequestId?: string;
}) {
  const so = await db.sellerOrder.findUnique({ where: { id: args.sellerOrderId }, include: { order: { include: { payments: true, refunds: true } }, payout: true } });
  if (!so || so.orderId !== args.orderId) throw new AfterSalesError("Order not found.");
  const alreadyRefunded = so.order.refunds.filter((r) => r.sellerOrderId === so.id && r.status !== "FAILED").reduce((n, r) => n + num(r.amountMinor), 0);
  if (args.amountMinor <= 0 || alreadyRefunded + args.amountMinor > num(so.totalMinor)) throw new AfterSalesError("Refund exceeds what was paid for this part of the order.");

  const payment = so.order.payments.find((p) => p.status === "SUCCEEDED" || p.status === "PARTIALLY_REFUNDED");
  const refund = await db.refund.create({
    data: {
      orderId: args.orderId,
      sellerOrderId: so.id,
      disputeId: args.disputeId,
      returnRequestId: args.returnRequestId,
      amountMinor: args.amountMinor,
      currency: so.currency,
      reason: args.reason,
      status: "PENDING",
      initiatedBy: args.initiatedBy,
      initiatedById: args.initiatedById,
      isForced: !!args.isForced,
      reverseTransfer: args.sellerAtFault ?? true,
    },
  });
  const provider = await refundPayment({ paymentIntentId: payment?.providerRef ?? null, amountMinor: args.amountMinor, refundId: refund.id });

  const rates = ((so.order.fxSnapshot as { rates?: Record<string, number> } | null)?.rates ?? { USD: 1 }) as Record<string, number>;
  const usd = (m: number) => Math.round((m / (rates[so.currency] ?? 1)) * (rates.USD ?? 1));
  const full = alreadyRefunded + args.amountMinor >= num(so.totalMinor);
  const commissionBack = args.sellerAtFault === false ? 0 : Math.round(num(so.commissionMinor) * (args.amountMinor / num(so.totalMinor)));

  await db.$transaction(async (tx) => {
    await tx.refund.update({ where: { id: refund.id }, data: { status: "SUCCEEDED", providerRefundId: provider.id } });
    await tx.ledgerEntry.create({ data: { type: "REFUND", amountMinor: args.amountMinor, currency: so.currency, amountUsdMinor: usd(args.amountMinor), sellerId: so.sellerId, orderId: so.orderId, sellerOrderId: so.id, reference: refund.id } });
    if (commissionBack > 0) {
      await tx.ledgerEntry.create({ data: { type: "COMMISSION_REVERSAL", amountMinor: commissionBack, currency: so.currency, amountUsdMinor: usd(commissionBack), sellerId: so.sellerId, orderId: so.orderId, sellerOrderId: so.id, reference: refund.id } });
    }
    const totalRefunded = so.order.refunds.filter((r) => r.status !== "FAILED").reduce((n, r) => n + num(r.amountMinor), 0) + args.amountMinor;
    await tx.order.update({ where: { id: so.orderId }, data: { paymentStatus: totalRefunded >= num(so.order.totalMinor) ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
    if (full) await tx.sellerOrder.update({ where: { id: so.id }, data: { status: "REFUNDED", refundedAt: new Date() } });
    await tx.orderStatusEvent.create({ data: { sellerOrderId: so.id, status: full ? "REFUNDED" : so.status, note: `Refund of ${formatMoney(args.amountMinor, so.currency, { exact: true })} issued — ${args.reason}.`, actorType: args.initiatedBy, actorId: args.initiatedById } });

    // Adjust the vendor's escrowed payout.
    if (so.payout && args.sellerAtFault !== false) {
      const vendorShare = args.amountMinor - commissionBack;
      if (so.payout.status === "RELEASED") {
        await tx.payout.update({ where: { id: so.payout.id }, data: { status: full ? "REVERSED" : "RELEASED", holdReason: `Reversal of ${vendorShare} minor units requested` } });
      } else {
        const remaining = Math.max(0, num(so.payout.amountMinor) - vendorShare);
        await tx.payout.update({ where: { id: so.payout.id }, data: { amountMinor: remaining, status: remaining === 0 ? "CANCELLED" : "PENDING", holdReason: null } });
      }
    }
    const buyerOrder = await tx.order.findUniqueOrThrow({ where: { id: so.orderId }, select: { buyerId: true, orderNumber: true } });
    await notify(tx, buyerOrder.buyerId, "RETURN", "Refund issued", `${buyerOrder.orderNumber} · allow 5–10 days to appear on your statement`, `/account/orders/${buyerOrder.orderNumber}`);
  });

  // Claw back from a connected account when funds were already transferred.
  if (so.payout?.status === "RELEASED" && so.payout.providerTransferId && args.sellerAtFault !== false && stripe() && !so.payout.providerTransferId.startsWith("tr_demo")) {
    await stripe()!.transfers.createReversal(so.payout.providerTransferId, { amount: args.amountMinor - commissionBack }).catch((e) => console.error("[refund] transfer reversal failed", e));
  }
  return refund;
}

// ── Returns ───────────────────────────────────────────────────────────────────

export async function requestReturn(args: { buyerId: string; sellerOrderId: string; itemIds: string[]; reason: ReturnReason; details?: string }) {
  const so = await db.sellerOrder.findUnique({
    where: { id: args.sellerOrderId },
    include: { order: true, items: { include: { product: { select: { returnWindowDays: true } } } }, seller: { include: { returnAddress: true } }, returnRequests: { where: { status: { notIn: ["REJECTED", "CANCELLED"] } }, include: { items: true } } },
  });
  if (!so || so.order.buyerId !== args.buyerId) throw new AfterSalesError("Order not found.");
  if (so.status !== "DELIVERED" || !so.deliveredAt) throw new AfterSalesError("Returns open once your piece has been delivered.");
  const items = so.items.filter((i) => args.itemIds.includes(i.id));
  if (!items.length) throw new AfterSalesError("Choose at least one piece to return.");

  const windowDays = Math.max(...items.map((i) => i.product?.returnWindowDays ?? so.seller.returnWindowDays));
  if (Date.now() - so.deliveredAt.getTime() > windowDays * 86_400_000) throw new AfterSalesError(`The ${windowDays}-day return window for this order has closed. You can still contact the jeweler or open a dispute.`);
  if (items.some((i) => (i.engravingText || i.ringSize) && !RETURNABLE_WHEN_PERSONALISED.includes(args.reason))) {
    throw new AfterSalesError("Engraved and made-to-measure pieces can only be returned if they are faulty or not as described.");
  }
  const pending = new Set(so.returnRequests.flatMap((r) => r.items.map((i) => i.orderItemId)));
  if (items.some((i) => pending.has(i.id))) throw new AfterSalesError("A return is already open for one of these pieces.");

  const address = so.seller.returnAddress;
  const returnTo: AddressSnapshot = address
    ? { fullName: so.seller.storeName, line1: address.line1, line2: address.line2, city: address.city, region: address.region, postalCode: address.postalCode, country: address.country, phone: address.phone }
    : { fullName: so.seller.storeName, line1: "Address on file", city: so.seller.city ?? "", postalCode: "", country: so.seller.country };

  const refundAmount = items.reduce((n, i) => n + num(i.totalMinor), 0);
  return db.$transaction(async (tx) => {
    const rma = await tx.returnRequest.create({
      data: {
        rmaNumber: `RMA-${randomCode(6)}`,
        sellerOrderId: so.id,
        buyerId: args.buyerId,
        sellerId: so.sellerId,
        reason: args.reason,
        details: args.details,
        returnToAddress: returnTo,
        refundAmountMinor: refundAmount,
        items: { create: items.map((i) => ({ orderItemId: i.id, quantity: i.quantity })) },
      },
    });
    await tx.payout.updateMany({ where: { sellerOrderId: so.id, status: "PENDING" }, data: { status: "ON_HOLD", holdReason: `Return ${rma.rmaNumber} open` } });
    await notify(tx, so.seller.userId, "RETURN", "Return requested", `${rma.rmaNumber} · ${so.reference}`, `/seller/returns`);
    return rma;
  });
}

const RETURN_CARRIER: Record<string, Carrier> = { US: "FEDEX", GB: "ROYAL_MAIL", IN: "BLUE_DART" };

export async function approveReturn(sellerId: string, returnId: string, message?: string) {
  const rma = await db.returnRequest.findUnique({ where: { id: returnId }, include: { sellerOrder: { include: { order: true } } } });
  if (!rma || rma.sellerId !== sellerId) throw new AfterSalesError("Return not found.");
  if (rma.status !== "REQUESTED") throw new AfterSalesError("This return has already been handled.");
  const from = rma.sellerOrder.order.shippingAddress as AddressSnapshot;
  const to = rma.returnToAddress as AddressSnapshot;
  const carrier = RETURN_CARRIER[to.country] ?? "DHL";
  return db.$transaction(async (tx) => {
    await tx.returnRequest.update({ where: { id: rma.id }, data: { status: "LABEL_ISSUED", approvedAt: new Date(), sellerResponse: message ?? "Approved — a prepaid, insured label is ready." } });
    // The label is always addressed to the vendor's own return address.
    const shipment = await tx.shipment.create({
      data: {
        returnRequestId: rma.id,
        direction: "RETURN",
        carrier,
        service: "Return · insured",
        trackingNumber: `${carrier === "ROYAL_MAIL" ? "SD" : "RT"}${randomCode(10, "0123456789")}`,
        status: "LABEL_CREATED",
        fromAddress: from,
        toAddress: to,
        insuredValueMinor: rma.refundAmountMinor,
        currency: rma.sellerOrder.currency,
        signatureRequired: true,
        events: { create: [{ status: "LABEL_CREATED", description: `Return label issued — routed to ${to.fullName}, ${to.city}`, location: from.city, occurredAt: new Date() }] },
      },
    });
    await notify(tx, rma.buyerId, "RETURN", "Return approved — print your label", `${rma.rmaNumber} · prepaid & insured`, `/account/orders/${rma.sellerOrder.order.orderNumber}`);
    return shipment;
  });
}

export async function rejectReturn(sellerId: string, returnId: string, message: string) {
  const rma = await db.returnRequest.findUnique({ where: { id: returnId }, include: { sellerOrder: { include: { order: true } } } });
  if (!rma || rma.sellerId !== sellerId) throw new AfterSalesError("Return not found.");
  if (rma.status !== "REQUESTED") throw new AfterSalesError("This return has already been handled.");
  await db.$transaction(async (tx) => {
    await tx.returnRequest.update({ where: { id: rma.id }, data: { status: "REJECTED", rejectedAt: new Date(), sellerResponse: message } });
    await tx.payout.updateMany({ where: { sellerOrderId: rma.sellerOrderId, status: "ON_HOLD" }, data: { status: "PENDING", holdReason: null } });
    await notify(tx, rma.buyerId, "RETURN", "Return declined", `${rma.rmaNumber} — you can escalate to Loupe from your order page.`, `/account/orders/${rma.sellerOrder.order.orderNumber}`);
  });
}

export async function receiveReturn(sellerId: string, returnId: string) {
  const rma = await db.returnRequest.findUnique({ where: { id: returnId }, include: { sellerOrder: true, shipment: true } });
  if (!rma || rma.sellerId !== sellerId) throw new AfterSalesError("Return not found.");
  if (!["LABEL_ISSUED", "IN_TRANSIT", "APPROVED"].includes(rma.status)) throw new AfterSalesError("This return can't be received yet.");
  await db.returnRequest.update({ where: { id: rma.id }, data: { status: "RECEIVED", receivedAt: new Date() } });
  if (rma.shipment) await db.shipment.update({ where: { id: rma.shipment.id }, data: { status: "DELIVERED", deliveredAt: new Date(), events: { create: { status: "DELIVERED", description: "Received by the jeweler", occurredAt: new Date() } } } });
  const amount = num(rma.refundAmountMinor) - num(rma.restockingFeeMinor);
  if (amount > 0) {
    await createRefund({ orderId: rma.sellerOrder.orderId, sellerOrderId: rma.sellerOrderId, amountMinor: amount, reason: `Return ${rma.rmaNumber}`, initiatedBy: "SELLER", sellerAtFault: rma.reason !== "CHANGED_MIND", returnRequestId: rma.id });
  }
  await db.returnRequest.update({ where: { id: rma.id }, data: { status: "REFUNDED", refundedAt: new Date() } });
}

// ── Disputes ──────────────────────────────────────────────────────────────────

export async function openDispute(args: { buyerId: string; sellerOrderId: string; reason: DisputeReason; description: string }) {
  const so = await db.sellerOrder.findUnique({ where: { id: args.sellerOrderId }, include: { order: true, seller: true, disputes: { where: { status: { notIn: ["RESOLVED", "CLOSED"] } } }, returnRequests: { where: { status: "REJECTED" }, take: 1 } } });
  if (!so || so.order.buyerId !== args.buyerId) throw new AfterSalesError("Order not found.");
  if (!["SHIPPED", "DELIVERED"].includes(so.status)) throw new AfterSalesError("Disputes can be opened once an order has shipped.");
  if (so.disputes.length) throw new AfterSalesError("There's already an open case for this order.");
  if (args.description.trim().length < 20) throw new AfterSalesError("Describe what happened in a little more detail (at least 20 characters).");

  const admins = await adminIds();
  return db.$transaction(async (tx) => {
    const dispute = await tx.dispute.create({
      data: {
        caseNumber: `DSP-${randomCode(6)}`,
        orderId: so.orderId,
        sellerOrderId: so.id,
        sellerId: so.sellerId,
        openedById: args.buyerId,
        returnRequestId: so.returnRequests[0]?.id,
        reason: args.reason,
        description: args.description.trim(),
        status: "AWAITING_SELLER",
        priority: args.reason === "AUTHENTICITY" || num(so.totalMinor) > 2_500_000 ? "HIGH" : "NORMAL",
        claimAmountMinor: so.totalMinor,
        currency: so.currency,
        sellerResponseDueAt: new Date(Date.now() + 72 * 3_600_000),
      },
    });
    await tx.payout.updateMany({ where: { sellerOrderId: so.id, status: { in: ["PENDING", "ON_HOLD"] } }, data: { status: "ON_HOLD", holdReason: `Dispute ${dispute.caseNumber} open` } });
    const convo = await tx.conversation.create({
      data: {
        type: "DISPUTE",
        subject: `Dispute ${dispute.caseNumber}`,
        sellerId: so.sellerId,
        sellerOrderId: so.id,
        disputeId: dispute.id,
        participants: {
          create: [
            { userId: args.buyerId, role: "BUYER", lastReadAt: new Date() },
            { userId: so.seller.userId, role: "SELLER" },
            ...(admins[0] ? [{ userId: admins[0], role: "ADMIN" as const }] : []),
          ],
        },
      },
    });
    await postMessage(tx, convo.id, null, `Case opened: ${args.reason.replace(/_/g, " ").toLowerCase()}. ${so.seller.storeName} has 72 hours to respond. Funds for this order are on hold.`, { isSystem: true });
    await postMessage(tx, convo.id, args.buyerId, args.description.trim());
    await notify(tx, so.seller.userId, "DISPUTE", "A buyer opened a dispute", `${dispute.caseNumber} · respond within 72 hours`, `/seller/messages/${convo.id}`);
    for (const id of admins) await notify(tx, id, "DISPUTE", "New dispute opened", `${dispute.caseNumber} · ${so.reference}`, `/admin/disputes/${dispute.id}`);
    return dispute;
  });
}

export async function resolveDispute(args: { adminId: string; disputeId: string; resolution: DisputeResolution; refundAmountMinor?: number; notes: string }) {
  const dispute = await db.dispute.findUnique({ where: { id: args.disputeId }, include: { sellerOrder: true, conversation: true, seller: { select: { userId: true } } } });
  if (!dispute) throw new AfterSalesError("Case not found.");
  if (["RESOLVED", "CLOSED"].includes(dispute.status)) throw new AfterSalesError("This case is already closed.");

  const refundFor: Partial<Record<DisputeResolution, number>> = {
    FULL_REFUND: num(dispute.sellerOrder.totalMinor),
    RETURN_AND_REFUND: num(dispute.sellerOrder.totalMinor),
    PARTIAL_REFUND: args.refundAmountMinor ?? 0,
  };
  const amount = refundFor[args.resolution] ?? 0;
  if (args.resolution === "PARTIAL_REFUND" && amount <= 0) throw new AfterSalesError("Enter the partial refund amount.");

  if (amount > 0) {
    await createRefund({
      orderId: dispute.orderId,
      sellerOrderId: dispute.sellerOrderId,
      amountMinor: amount,
      reason: `Dispute ${dispute.caseNumber} — ${args.resolution.replace(/_/g, " ").toLowerCase()}`,
      initiatedBy: "ADMIN",
      initiatedById: args.adminId,
      isForced: true,
      sellerAtFault: true,
      disputeId: dispute.id,
    });
  }

  await db.$transaction(async (tx) => {
    await tx.dispute.update({ where: { id: dispute.id }, data: { status: "RESOLVED", resolution: args.resolution, resolutionNotes: args.notes, refundAmountMinor: amount || null, resolvedAt: new Date(), assignedAdminId: dispute.assignedAdminId ?? args.adminId } });
    if (amount === 0) {
      await tx.payout.updateMany({ where: { sellerOrderId: dispute.sellerOrderId, status: "ON_HOLD" }, data: { status: "PENDING", holdReason: null } });
    }
    if (dispute.conversation) await postMessage(tx, dispute.conversation.id, null, `Case resolved by Loupe: ${args.resolution.replace(/_/g, " ").toLowerCase()}. ${args.notes}`, { isSystem: true });
    await tx.auditLog.create({ data: { actorId: args.adminId, action: amount ? "dispute.force_refund" : "dispute.resolve", entityType: "Dispute", entityId: dispute.id, metadata: { resolution: args.resolution, refundAmountMinor: amount } } });
    await notify(tx, dispute.openedById, "DISPUTE", "Your case has been resolved", dispute.caseNumber, `/account/messages`);
    await notify(tx, dispute.seller.userId, "DISPUTE", "Dispute resolved", dispute.caseNumber, `/seller/orders/${dispute.sellerOrderId}`);
  });
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export async function refreshRatings(client: Tx | typeof db, productId: string, sellerId: string) {
  const [p, s] = await Promise.all([
    client.review.aggregate({ where: { productId, status: "PUBLISHED" }, _avg: { rating: true }, _count: { _all: true } }),
    client.review.aggregate({ where: { sellerId, status: "PUBLISHED" }, _avg: { rating: true }, _count: { _all: true } }),
  ]);
  await client.product.update({ where: { id: productId }, data: { ratingAverage: p._avg.rating ?? 0, ratingCount: p._count._all } });
  await client.sellerProfile.update({
    where: { id: sellerId },
    data: { ratingAverage: s._avg.rating ?? 0, ratingCount: s._count._all, isTopRated: (s._avg.rating ?? 0) >= 4.6 && s._count._all >= 5 },
  });
}

export async function createReview(args: { authorId: string; orderItemId: string; rating: number; title?: string; body: string; photoUrls?: string[] }) {
  const item = await db.orderItem.findUnique({ where: { id: args.orderItemId }, include: { order: true, sellerOrder: true, review: true } });
  if (!item || item.order.buyerId !== args.authorId) throw new AfterSalesError("Order item not found.");
  if (item.sellerOrder.status !== "DELIVERED") throw new AfterSalesError("You can review a piece once it has been delivered.");
  if (item.review) throw new AfterSalesError("You've already reviewed this piece.");
  if (!item.productId) throw new AfterSalesError("This listing no longer exists.");
  if (args.rating < 1 || args.rating > 5) throw new AfterSalesError("Choose a rating from 1 to 5.");
  if (args.body.trim().length < 20) throw new AfterSalesError("Write at least a couple of sentences (20+ characters).");
  return db.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: { productId: item.productId!, sellerId: item.sellerOrder.sellerId, authorId: args.authorId, orderItemId: item.id, rating: args.rating, title: args.title?.trim() || null, body: args.body.trim(), photoUrls: args.photoUrls ?? [], isVerifiedPurchase: true },
    });
    await refreshRatings(tx, item.productId!, item.sellerOrder.sellerId);
    const seller = await tx.sellerProfile.findUniqueOrThrow({ where: { id: item.sellerOrder.sellerId }, select: { userId: true } });
    await notify(tx, seller.userId, "REVIEW", `New ${args.rating}★ review`, item.title, `/seller/reviews`);
    return review;
  });
}

// ── Warranty & service ────────────────────────────────────────────────────────

const WARRANTY_COVERED: ServiceType[] = ["REPAIR", "STONE_TIGHTENING", "RESTRINGING", "RHODIUM_PLATING"];

export async function createServiceRequest(args: { buyerId: string; orderItemId: string; type: ServiceType; description: string }) {
  const item = await db.orderItem.findUnique({ where: { id: args.orderItemId }, include: { order: true, sellerOrder: { include: { seller: { select: { userId: true } } } }, warranty: true } });
  if (!item || item.order.buyerId !== args.buyerId) throw new AfterSalesError("Piece not found.");
  if (item.sellerOrder.status !== "DELIVERED") throw new AfterSalesError("Service requests open once a piece is delivered.");
  if (args.description.trim().length < 10) throw new AfterSalesError("Tell the jeweler what needs attention.");
  const covered = !!item.warranty && item.warranty.endsAt > new Date() && (WARRANTY_COVERED.includes(args.type) || args.type === "RESIZING");
  return db.$transaction(async (tx) => {
    const ticket = await tx.serviceRequest.create({
      data: {
        ticketNumber: `SR-${randomCode(6)}`,
        buyerId: args.buyerId,
        sellerId: item.sellerOrder.sellerId,
        orderItemId: item.id,
        warrantyId: item.warranty?.id,
        type: args.type,
        description: args.description.trim(),
        coveredByWarranty: covered,
        events: { create: { status: "REQUESTED", note: covered ? "Requested under warranty." : "Requested — the jeweler will quote before any work.", actorType: "BUYER" } },
      },
    });
    await notify(tx, item.sellerOrder.seller.userId, "SERVICE", "New service request", `${ticket.ticketNumber} · ${item.title}`, `/seller/orders`);
    return ticket;
  });
}

export async function updateServiceRequest(sellerId: string, id: string, status: ServiceStatus, note?: string, quoteMinor?: number) {
  const ticket = await db.serviceRequest.findUnique({ where: { id } });
  if (!ticket || ticket.sellerId !== sellerId) throw new AfterSalesError("Service request not found.");
  await db.$transaction(async (tx) => {
    await tx.serviceRequest.update({ where: { id }, data: { status, quoteMinor: quoteMinor ?? undefined } });
    await tx.serviceEvent.create({ data: { serviceRequestId: id, status, note, actorType: "SELLER" } });
    await notify(tx, ticket.buyerId, "SERVICE", "Update on your service request", `${ticket.ticketNumber} · ${status.replace(/_/g, " ").toLowerCase()}`, "/account/warranty");
  });
}

// ── Bespoke commissions ───────────────────────────────────────────────────────

export async function acceptQuote(buyerId: string, quoteId: string) {
  const quote = await db.customRequestQuote.findUnique({ where: { id: quoteId }, include: { customRequest: true, seller: { select: { userId: true, id: true, storeName: true } } } });
  if (!quote || quote.customRequest.buyerId !== buyerId) throw new AfterSalesError("Quote not found.");
  if (!["OPEN", "QUOTED"].includes(quote.customRequest.status) || quote.status !== "PENDING") throw new AfterSalesError("This quote can no longer be accepted.");
  await db.$transaction(async (tx) => {
    await tx.customRequestQuote.update({ where: { id: quote.id }, data: { status: "ACCEPTED" } });
    await tx.customRequestQuote.updateMany({ where: { customRequestId: quote.customRequestId, id: { not: quote.id }, status: "PENDING" }, data: { status: "DECLINED" } });
    await tx.customRequest.update({ where: { id: quote.customRequestId }, data: { status: "ACCEPTED", acceptedQuoteId: quote.id, sellerId: quote.sellerId } });
    const convo = await openConversation(tx, { type: "CUSTOM_REQUEST", subject: `Commission · ${quote.customRequest.title}`, buyerId, sellerId: quote.seller.id, sellerUserId: quote.seller.userId, customRequestId: quote.customRequestId });
    await postMessage(tx, convo.id, null, `Quote accepted. ${quote.seller.storeName} will confirm materials and send a secure deposit request (${quote.depositPercent}%).`, { isSystem: true });
    await notify(tx, quote.seller.userId, "CUSTOM_REQUEST", "Your quote was accepted", quote.customRequest.title, `/seller/custom-requests`);
  });
}

export async function declineQuote(buyerId: string, quoteId: string) {
  const quote = await db.customRequestQuote.findUnique({ where: { id: quoteId }, include: { customRequest: true } });
  if (!quote || quote.customRequest.buyerId !== buyerId || quote.status !== "PENDING") throw new AfterSalesError("Quote not found.");
  await db.customRequestQuote.update({ where: { id: quote.id }, data: { status: "DECLINED" } });
}

export async function submitQuote(args: { sellerId: string; requestId: string; amountMinor: number; currency: string; leadTimeDays: number; depositPercent: number; message: string }) {
  const request = await db.customRequest.findUnique({ where: { id: args.requestId } });
  if (!request || !["OPEN", "QUOTED"].includes(request.status)) throw new AfterSalesError("This request is no longer open.");
  if (request.sellerId && request.sellerId !== args.sellerId) throw new AfterSalesError("This request was sent to another jeweler.");
  const seller = await db.sellerProfile.findUniqueOrThrow({ where: { id: args.sellerId }, select: { userId: true, storeName: true } });
  await db.$transaction(async (tx) => {
    await tx.customRequestQuote.upsert({
      where: { customRequestId_sellerId: { customRequestId: request.id, sellerId: args.sellerId } },
      update: { amountMinor: args.amountMinor, currency: args.currency, leadTimeDays: args.leadTimeDays, depositPercent: args.depositPercent, message: args.message, status: "PENDING" },
      create: { customRequestId: request.id, sellerId: args.sellerId, amountMinor: args.amountMinor, currency: args.currency, leadTimeDays: args.leadTimeDays, depositPercent: args.depositPercent, message: args.message, validUntil: new Date(Date.now() + 14 * 86_400_000) },
    });
    await tx.customRequest.update({ where: { id: request.id }, data: { status: "QUOTED" } });
    const convo = await openConversation(tx, { type: "CUSTOM_REQUEST", subject: `Commission · ${request.title}`, buyerId: request.buyerId, sellerId: args.sellerId, sellerUserId: seller.userId, customRequestId: request.id });
    await postMessage(tx, convo.id, seller.userId, args.message);
    await notify(tx, request.buyerId, "CUSTOM_REQUEST", `New quote from ${seller.storeName}`, request.title, "/account/custom-requests");
  });
}

export async function setCustomRequestStatus(sellerId: string, requestId: string, status: Extract<CustomRequestStatus, "IN_PRODUCTION" | "COMPLETED" | "DECLINED">) {
  const request = await db.customRequest.findUnique({ where: { id: requestId }, include: { acceptedQuote: true } });
  if (!request) throw new AfterSalesError("Request not found.");
  const mine = request.sellerId === sellerId || request.acceptedQuote?.sellerId === sellerId;
  if (!mine) throw new AfterSalesError("This commission belongs to another jeweler.");
  await db.customRequest.update({ where: { id: requestId }, data: { status } });
  await notify(db, request.buyerId, "CUSTOM_REQUEST", `Commission update: ${status.replace(/_/g, " ").toLowerCase()}`, request.title, "/account/custom-requests");
}
