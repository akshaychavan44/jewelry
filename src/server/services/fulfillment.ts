import "server-only";

import type { Carrier, FulfillmentStatus } from "@/generated/prisma/enums";
import type { AddressSnapshot } from "@/lib/order-math";
import { trackingUrl } from "@/lib/shipping";
import { num, randomCode } from "@/lib/utils";
import { db } from "@/server/db";
import { createRefund } from "./after-sales";
import { notify } from "./messaging";
import { transferToSeller } from "./payments";

export class FulfillmentError extends Error {}

/** Allowed forward moves in a vendor's fulfilment workflow. */
export const TRANSITIONS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["IN_PRODUCTION", "SHIPPED", "CANCELLED"],
  IN_PRODUCTION: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
};

const TRACKING_FORMAT: Partial<Record<Carrier, () => string>> = {
  FEDEX: () => randomCode(12, "0123456789"),
  UPS: () => `1Z${randomCode(16, "0123456789ABCDEFGHJKLMNPRSTUVWXY")}`,
  DHL: () => randomCode(10, "0123456789"),
  USPS: () => `9400${randomCode(18, "0123456789")}`,
  ROYAL_MAIL: () => `SD${randomCode(9, "0123456789")}GB`,
  BLUE_DART: () => randomCode(11, "0123456789"),
  BRINKS: () => `BGS-${randomCode(8)}`,
  MALCA_AMIT: () => `MA-${randomCode(8)}`,
};

/**
 * Label purchase. Plug a label provider (EasyPost, Shippo, carrier APIs) in
 * here; without credentials a trackable demo label is generated.
 */
async function purchaseLabel(carrier: Carrier) {
  return { trackingNumber: (TRACKING_FORMAT[carrier] ?? (() => `LP${randomCode(10, "0123456789")}`))(), providerShipmentId: null as string | null };
}

export async function advanceSellerOrder(args: {
  sellerId: string;
  actorId: string;
  sellerOrderId: string;
  to: FulfillmentStatus;
  note?: string;
  carrier?: Carrier;
  trackingNumber?: string;
  service?: string;
}) {
  const so = await db.sellerOrder.findUnique({
    where: { id: args.sellerOrderId },
    include: { order: true, seller: { include: { returnAddress: true } }, items: true, shipments: true, disputes: { where: { status: { notIn: ["RESOLVED", "CLOSED"] } } } },
  });
  if (!so || so.sellerId !== args.sellerId) throw new FulfillmentError("Order not found.");
  if (so.order.paymentStatus !== "SUCCEEDED" && so.order.paymentStatus !== "PARTIALLY_REFUNDED") throw new FulfillmentError("This order hasn't been paid yet.");
  if (!TRANSITIONS[so.status].includes(args.to)) throw new FulfillmentError(`Can't move an order from ${so.status.toLowerCase()} to ${args.to.toLowerCase()}.`);

  if (args.to === "CANCELLED") {
    await createRefund({ orderId: so.orderId, sellerOrderId: so.id, amountMinor: num(so.totalMinor), reason: args.note || "Cancelled by the jeweler", initiatedBy: "SELLER", initiatedById: args.actorId, sellerAtFault: true });
    await db.$transaction(async (tx) => {
      for (const item of so.items) {
        if (!item.variantId) continue;
        const v = await tx.productVariant.findUnique({ where: { id: item.variantId } });
        if (v?.trackInventory && !v.allowBackorder) await tx.productVariant.update({ where: { id: v.id }, data: { stockQuantity: { increment: item.quantity } } });
        if (item.productId) await tx.product.update({ where: { id: item.productId }, data: { inStock: true, status: "ACTIVE" } }).catch(() => undefined);
      }
      await tx.sellerOrder.update({ where: { id: so.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
      await tx.orderStatusEvent.create({ data: { sellerOrderId: so.id, status: "CANCELLED", note: args.note || "Cancelled by the jeweler — refunded in full.", actorType: "SELLER", actorId: args.actorId } });
      await tx.payout.updateMany({ where: { sellerOrderId: so.id }, data: { status: "CANCELLED" } });
      await notify(tx, so.order.buyerId, "ORDER", "Part of your order was cancelled", `${so.reference} — refunded in full`, `/account/orders/${so.order.orderNumber}`);
    });
    return;
  }

  const now = new Date();
  const settings = await db.platformSettings.findUniqueOrThrow({ where: { id: "platform" } });
  await db.$transaction(async (tx) => {
    if (args.to === "SHIPPED") {
      const carrier = args.carrier ?? "DHL";
      const label = args.trackingNumber ? { trackingNumber: args.trackingNumber.trim(), providerShipmentId: null } : await purchaseLabel(carrier);
      const ra = so.seller.returnAddress;
      const from: AddressSnapshot = ra
        ? { fullName: so.seller.storeName, line1: ra.line1, line2: ra.line2, city: ra.city, region: ra.region, postalCode: ra.postalCode, country: ra.country, phone: ra.phone }
        : { fullName: so.seller.storeName, line1: "", city: so.seller.city ?? "", postalCode: "", country: so.seller.country };
      await tx.shipment.create({
        data: {
          sellerOrderId: so.id,
          direction: "OUTBOUND",
          carrier,
          service: args.service ?? (so.shippingMethod === "SECURE_COURIER" ? "Hand-to-hand secure delivery" : so.shippingMethod === "EXPRESS_INSURED" ? "Priority · insured" : "Standard · insured"),
          trackingNumber: label.trackingNumber,
          trackingUrl: trackingUrl(carrier, label.trackingNumber),
          providerShipmentId: label.providerShipmentId,
          status: "IN_TRANSIT",
          fromAddress: from,
          toAddress: so.order.shippingAddress as AddressSnapshot,
          insuredValueMinor: so.declaredValueMinor,
          currency: so.currency,
          signatureRequired: so.signatureRequired,
          estimatedDeliveryAt: so.estimatedDeliveryTo,
          shippedAt: now,
          events: {
            create: [
              { status: "LABEL_CREATED", description: "Shipping label created by the jeweler", location: from.city, occurredAt: now },
              { status: "IN_TRANSIT", description: "Handed to the courier — insured, signature required", location: from.city, occurredAt: now },
            ],
          },
        },
      });
      await notify(tx, so.order.buyerId, "ORDER", `${so.seller.storeName} has shipped your order`, `Tracking ${label.trackingNumber}`, `/account/orders/${so.order.orderNumber}`);
    }
    if (args.to === "DELIVERED") {
      await tx.shipment.updateMany({ where: { sellerOrderId: so.id, direction: "OUTBOUND" }, data: { status: "DELIVERED", deliveredAt: now } });
      const outbound = so.shipments.find((s) => s.direction === "OUTBOUND");
      if (outbound) await tx.shipmentEvent.create({ data: { shipmentId: outbound.id, status: "DELIVERED", description: "Delivered — signed for", occurredAt: now } });
      const releaseAfter = new Date(now.getTime() + settings.inspectionWindowDays * 86_400_000);
      await tx.payout.updateMany({ where: { sellerOrderId: so.id, status: "PENDING" }, data: { releaseAfter } });
      // Warranties start on delivery.
      for (const item of so.items) {
        if (!item.productId) continue;
        const product = await tx.product.findUnique({ where: { id: item.productId }, select: { warrantyMonths: true } });
        const endsAt = new Date(now);
        endsAt.setMonth(endsAt.getMonth() + (product?.warrantyMonths ?? 12));
        await tx.warranty.upsert({
          where: { orderItemId: item.id },
          update: {},
          create: { warrantyNumber: `WR-${randomCode(7)}`, orderItemId: item.id, buyerId: so.order.buyerId, sellerId: so.sellerId, coverage: "Manufacturing defects, including stone settings, clasps and solder joints. Excludes loss, theft and accidental damage.", startsAt: now, endsAt },
        });
      }
      await notify(tx, so.order.buyerId, "ORDER", "Delivered", `${so.reference} — you have ${settings.inspectionWindowDays} days to raise anything before the jeweler is paid.`, `/account/orders/${so.order.orderNumber}`);
    }
    await tx.sellerOrder.update({
      where: { id: so.id },
      data: {
        status: args.to,
        ...(args.to === "PROCESSING" ? { processingAt: now } : {}),
        ...(args.to === "IN_PRODUCTION" ? { productionStartedAt: now } : {}),
        ...(args.to === "SHIPPED" ? { shippedAt: now } : {}),
        ...(args.to === "DELIVERED" ? { deliveredAt: now } : {}),
      },
    });
    await tx.orderStatusEvent.create({ data: { sellerOrderId: so.id, status: args.to, note: args.note || null, actorType: "SELLER", actorId: args.actorId } });
    if (args.to === "PROCESSING") await notify(tx, so.order.buyerId, "ORDER", `${so.seller.storeName} accepted your order`, so.reference, `/account/orders/${so.order.orderNumber}`);
    if (args.to === "IN_PRODUCTION") await notify(tx, so.order.buyerId, "ORDER", "Your piece is in the workshop", so.reference, `/account/orders/${so.order.orderNumber}`);
  });
}

/**
 * Cron: pays vendors whose inspection window has passed with no open return or
 * dispute. Stripe Connect sellers receive a Transfer; bank sellers are batched.
 */
export async function releaseDuePayouts(now = new Date()) {
  const due = await db.payout.findMany({
    where: { status: "PENDING", releaseAfter: { lte: now } },
    include: {
      seller: { select: { stripeAccountId: true, payoutMethod: true, userId: true, storeName: true } },
      sellerOrder: {
        include: {
          order: { include: { payments: true } },
          disputes: { where: { status: { notIn: ["RESOLVED", "CLOSED"] } } },
          returnRequests: { where: { status: { notIn: ["REJECTED", "CANCELLED", "REFUNDED"] } } },
        },
      },
    },
  });
  let released = 0;
  for (const p of due) {
    if (p.sellerOrder.disputes.length || p.sellerOrder.returnRequests.length) {
      await db.payout.update({ where: { id: p.id }, data: { status: "ON_HOLD", holdReason: "Open return or dispute" } });
      continue;
    }
    const charge = p.sellerOrder.order.payments.find((x) => x.status === "SUCCEEDED" || x.status === "PARTIALLY_REFUNDED");
    const transfer =
      p.seller.payoutMethod === "STRIPE_CONNECT" && p.seller.stripeAccountId
        ? await transferToSeller({ amountMinor: num(p.amountMinor), currency: p.currency, destination: p.seller.stripeAccountId, transferGroup: p.sellerOrder.order.transferGroup ?? p.sellerOrder.orderId, sourceTransaction: charge?.chargeId, payoutId: p.id })
        : { id: `bank_batch_${now.toISOString().slice(0, 10)}_${p.id.slice(-6)}` };
    const rates = ((p.sellerOrder.order.fxSnapshot as { rates?: Record<string, number> } | null)?.rates ?? { USD: 1 }) as Record<string, number>;
    await db.$transaction(async (tx) => {
      await tx.payout.update({ where: { id: p.id }, data: { status: "RELEASED", releasedAt: now, providerTransferId: transfer.id, holdReason: null } });
      await tx.ledgerEntry.create({ data: { type: "PAYOUT", amountMinor: p.amountMinor, currency: p.currency, amountUsdMinor: Math.round(num(p.amountMinor) / (rates[p.currency] ?? 1)), sellerId: p.sellerId, orderId: p.sellerOrder.orderId, sellerOrderId: p.sellerOrderId, reference: transfer.id } });
      await notify(tx, p.seller.userId, "PAYOUT", "Payout released", p.sellerOrder.reference, "/seller/payouts");
    });
    released++;
  }
  return released;
}
