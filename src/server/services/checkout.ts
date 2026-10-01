import "server-only";

import type { Address } from "@/generated/prisma/client";
import type { DutiesMode } from "@/generated/prisma/enums";
import { resolveCommissionBps } from "@/lib/commission";
import { convertMinor } from "@/lib/money";
import {
  type AddressSnapshot,
  computeSellerGroupTotals,
  formatOrderNumber,
  type SellerGroupTotals,
  sellerOrderReference,
  sumTotals,
} from "@/lib/order-math";
import { randomCode, num } from "@/lib/utils";
import { db, type Tx } from "@/server/db";
import { buildCartView, type CartLine, type CartView, loadCart, type ShippingOption } from "./cart";
import type { PriceContext } from "./currency";
import { notify } from "./messaging";
import { createPaymentIntent, paymentsLive } from "./payments";
import { calculateTax, dutyRateFor } from "./tax";

export class CheckoutError extends Error {}

export type CheckoutSelections = {
  shipping: Record<string, string>;
  signature: Record<string, boolean>;
  dutiesMode: DutiesMode;
};

export type QuoteGroup = {
  sellerId: string;
  sellerName: string;
  sellerCity: string | null;
  sellerCountry: string;
  lines: CartLine[];
  options: ShippingOption[];
  option: ShippingOption;
  signatureRequired: boolean;
  signatureForced: boolean;
  international: boolean;
  taxLabel: string;
  taxProvider: string;
  taxReference?: string;
  totals: SellerGroupTotals;
};

export type CheckoutQuote = {
  currency: string;
  destination: AddressSnapshot;
  dutiesMode: DutiesMode;
  hasInternational: boolean;
  groups: QuoteGroup[];
  totals: ReturnType<typeof sumTotals>;
};

export function addressSnapshot(a: Address): AddressSnapshot {
  return { fullName: a.fullName, company: a.company, line1: a.line1, line2: a.line2, city: a.city, region: a.region, postalCode: a.postalCode, country: a.country, phone: a.phone };
}

export async function getPlatformSettings() {
  return db.platformSettings.findUniqueOrThrow({ where: { id: "platform" } });
}

/** Server-authoritative quote. The client only ever displays what this returns. */
export async function buildQuote(args: { userId: string; destination: AddressSnapshot; selections: CheckoutSelections; ctx: PriceContext }): Promise<{ view: CartView; quote: CheckoutQuote }> {
  const settings = await getPlatformSettings();
  const cart = await loadCart(args.userId);
  const view = await buildCartView(cart, args.ctx, args.destination.country, num(settings.secureCourierThresholdUsd));
  if (!view.groups.length) throw new CheckoutError("Your cart is empty.");

  const sellerIds = view.groups.map((g) => g.seller.id);
  const lineCategoryIds = [...new Set(view.groups.flatMap((g) => g.lines.map((l) => l.categoryId)))];
  const [sellers, rules, categories] = await Promise.all([
    db.sellerProfile.findMany({ where: { id: { in: sellerIds } }, include: { subscription: { include: { plan: true } }, returnAddress: true } }),
    db.commissionRule.findMany({ where: { isActive: true } }),
    db.category.findMany({ where: { id: { in: lineCategoryIds } }, select: { id: true, parentId: true } }),
  ]);
  const parentOf = new Map(categories.map((c) => [c.id, c.parentId]));

  const groups: QuoteGroup[] = [];
  for (const g of view.groups) {
    const lines = g.lines.filter((l) => l.available);
    if (!lines.length) continue;
    const seller = sellers.find((s) => s.id === g.seller.id)!;
    if (!g.options.length) throw new CheckoutError(`${g.seller.name} doesn't ship to ${args.destination.country}. Remove their pieces or choose another address.`);
    const option = g.options.find((o) => o.key === args.selections.shipping[g.seller.id]) ?? g.options[0];

    // Commission is resolved per line (categories can differ) and blended.
    const planDiscount = seller.subscription?.status === "ACTIVE" ? seller.subscription.plan.commissionDiscountBps : 0;
    let commissionMinor = 0;
    for (const l of lines) {
      const bps = resolveCommissionBps({
        sellerId: seller.id,
        categoryIds: [l.categoryId, parentOf.get(l.categoryId)].filter(Boolean) as string[],
        sellerOverrideBps: seller.commissionRateBps,
        planDiscountBps: planDiscount,
        defaultBps: settings.defaultCommissionBps,
        rules,
      });
      commissionMinor += Math.round((l.lineTotal.amountMinor * bps) / 10_000);
    }
    const itemsMinor = lines.reduce((n, l) => n + l.lineTotal.amountMinor, 0);
    const effectiveBps = itemsMinor ? Math.round((commissionMinor * 10_000) / itemsMinor) : settings.defaultCommissionBps;

    const international = seller.country !== args.destination.country;
    const tax = await calculateTax({
      amountMinor: itemsMinor + option.price.amountMinor + option.insurance.amountMinor,
      currency: args.ctx.currency,
      shipTo: args.destination,
      shipFrom: { country: seller.country, city: seller.returnAddress?.city ?? seller.city, postalCode: seller.returnAddress?.postalCode, line1: seller.returnAddress?.line1 },
      reference: seller.id,
    });
    const totals = computeSellerGroupTotals({
      itemsMinor,
      shippingMinor: option.price.amountMinor,
      insuranceMinor: option.insurance.amountMinor,
      taxRate: tax.rate,
      dutyRate: international ? dutyRateFor(seller.country, args.destination.country) : 0,
      dutiesMode: international ? args.selections.dutiesMode : "DDP",
      commissionBps: effectiveBps,
    });
    const signatureForced = g.declaredUsdMinor >= num(settings.signatureThresholdUsd) || option.method === "SECURE_COURIER";

    groups.push({
      sellerId: seller.id,
      sellerName: seller.storeName,
      sellerCity: seller.city,
      sellerCountry: seller.country,
      lines,
      options: g.options,
      option,
      signatureForced,
      signatureRequired: signatureForced || (args.selections.signature[seller.id] ?? true),
      international,
      taxLabel: tax.label,
      taxProvider: tax.provider,
      taxReference: tax.reference,
      totals,
    });
  }

  return {
    view,
    quote: {
      currency: args.ctx.currency,
      destination: args.destination,
      dutiesMode: args.selections.dutiesMode,
      hasInternational: groups.some((g) => g.international),
      groups,
      totals: sumTotals(groups.map((g) => g.totals)),
    },
  };
}

// ── Placement ─────────────────────────────────────────────────────────────────

export type PlacementResult =
  | { status: "paid"; orderNumber: string }
  | { status: "requires_payment"; orderNumber: string; clientSecret: string };

export async function placeOrder(args: {
  userId: string;
  shippingAddressId: string;
  billingAddressId?: string | null;
  selections: CheckoutSelections;
  ctx: PriceContext;
  demoPaymentMethodId?: string | null;
  note?: string | null;
}): Promise<PlacementResult> {
  const user = await db.user.findUniqueOrThrow({ where: { id: args.userId } });
  const shipping = await db.address.findFirst({ where: { id: args.shippingAddressId, userId: user.id } });
  if (!shipping) throw new CheckoutError("Choose a delivery address.");
  const billing = args.billingAddressId ? await db.address.findFirst({ where: { id: args.billingAddressId, userId: user.id } }) : shipping;
  const destination = addressSnapshot(shipping);

  const { quote } = await buildQuote({ userId: user.id, destination, selections: args.selections, ctx: args.ctx });
  if (!quote.groups.length) throw new CheckoutError("Nothing in your cart can be ordered right now.");
  const settings = await getPlatformSettings();
  const orderNumber = formatOrderNumber(randomCode(6));
  const transferGroup = `tg_${orderNumber}`;
  const reservationExpires = new Date(Date.now() + settings.reservationMinutes * 60_000);
  const cartItemIds = quote.groups.flatMap((g) => g.lines.map((l) => l.id));

  const order = await db.$transaction(async (tx) => {
    // 1 · Reserve stock atomically — a conditional decrement cannot oversell.
    const variants = await tx.productVariant.findMany({ where: { id: { in: quote.groups.flatMap((g) => g.lines.map((l) => l.variantId)) } } });
    for (const g of quote.groups) {
      for (const l of g.lines) {
        const v = variants.find((x) => x.id === l.variantId)!;
        if (!v.trackInventory || v.allowBackorder) continue;
        const res = await tx.productVariant.updateMany({ where: { id: v.id, stockQuantity: { gte: l.quantity } }, data: { stockQuantity: { decrement: l.quantity } } });
        if (res.count === 0) throw new CheckoutError(`${l.title} has just sold out. It has been left in your cart.`);
      }
    }

    // 2 · Order, per-vendor sub-orders and immutable line snapshots.
    const order = await tx.order.create({
      data: {
        orderNumber,
        buyerId: user.id,
        status: "PENDING_PAYMENT",
        paymentStatus: "PENDING",
        currency: quote.currency,
        subtotalMinor: quote.totals.subtotalMinor,
        shippingMinor: quote.totals.shippingMinor,
        insuranceMinor: quote.totals.insuranceMinor,
        taxMinor: quote.totals.taxMinor,
        dutiesMinor: quote.totals.dutiesMinor,
        totalMinor: quote.totals.totalMinor,
        platformFeeMinor: quote.totals.platformFeeMinor,
        email: user.email,
        shippingAddress: destination,
        billingAddress: billing ? addressSnapshot(billing) : destination,
        taxProvider: quote.groups[0]?.taxProvider,
        taxCalculationRef: quote.groups.map((g) => g.taxReference).filter(Boolean).join(",") || null,
        dutiesMode: quote.hasInternational ? quote.dutiesMode : null,
        transferGroup,
        fxSnapshot: { base: "USD", rates: args.ctx.rates },
        notes: args.note ?? null,
      },
    });

    for (const [index, g] of quote.groups.entries()) {
      const leadDays = Math.max(...g.lines.map((l) => l.productionDays)) ;
      const so = await tx.sellerOrder.create({
        data: {
          orderId: order.id,
          sellerId: g.sellerId,
          reference: sellerOrderReference(orderNumber, index),
          status: "PENDING",
          currency: quote.currency,
          subtotalMinor: g.totals.subtotalMinor,
          shippingMinor: g.totals.shippingMinor,
          insuranceMinor: g.totals.insuranceMinor,
          taxMinor: g.totals.taxMinor,
          dutiesMinor: g.totals.dutiesMinor,
          totalMinor: g.totals.totalMinor,
          commissionRateBps: g.totals.commissionRateBps,
          commissionMinor: g.totals.commissionMinor,
          sellerNetMinor: g.totals.sellerNetMinor,
          shippingMethod: g.option.method,
          signatureRequired: g.signatureRequired,
          insured: true,
          declaredValueMinor: g.totals.subtotalMinor,
          estimatedDeliveryFrom: g.option.window.from,
          estimatedDeliveryTo: g.option.window.to,
          buyerNote: leadDays > 0 ? `Includes made-to-order work (${leadDays} days).` : null,
        },
      });
      await tx.orderItem.createMany({
        data: g.lines.map((l) => {
          const v = variants.find((x) => x.id === l.variantId)!;
          return {
            orderId: order.id,
            sellerOrderId: so.id,
            productId: l.productId,
            variantId: l.variantId,
            offerId: l.offer?.id ?? null,
            title: l.title,
            variantTitle: l.variantTitle,
            sku: l.sku,
            imageUrl: l.image.url,
            metalType: v.metalType,
            quantity: l.quantity,
            unitPriceMinor: l.unit.amountMinor,
            listPriceMinor: l.listUnitMinor,
            listCurrency: l.listCurrency,
            engravingFeeMinor: l.fees.amountMinor,
            totalMinor: l.lineTotal.amountMinor,
            ringSize: l.ringSize,
            chainLengthMm: l.chainLengthMm,
            engravingText: l.engravingText,
            engravingStyle: l.engravingStyle,
          };
        }),
      });
      await tx.orderStatusEvent.create({ data: { sellerOrderId: so.id, status: "PENDING", note: "Order placed — awaiting payment confirmation.", actorType: "SYSTEM" } });
    }

    await tx.inventoryReservation.createMany({
      data: quote.groups.flatMap((g) => g.lines.map((l) => ({ variantId: l.variantId, orderId: order.id, quantity: l.quantity, expiresAt: reservationExpires }))),
    });
    // The cart has become an order; lines return to stock if payment never completes.
    await tx.cartItem.deleteMany({ where: { id: { in: cartItemIds } } });
    return order;
  });

  if (paymentsLive()) {
    const intent = await createPaymentIntent({
      amountMinor: quote.totals.totalMinor,
      currency: quote.currency,
      orderId: order.id,
      orderNumber,
      transferGroup,
      customerId: user.stripeCustomerId,
      email: user.email,
    });
    await db.payment.create({ data: { orderId: order.id, provider: "STRIPE", providerRef: intent.id, status: "PENDING", amountMinor: quote.totals.totalMinor, currency: quote.currency } });
    return { status: "requires_payment", orderNumber, clientSecret: intent.client_secret! };
  }

  // Demo mode: simulate an authorised card payment.
  const card = args.demoPaymentMethodId ? await db.paymentMethod.findFirst({ where: { id: args.demoPaymentMethodId, userId: user.id } }) : null;
  const ref = `pi_demo_${randomCode(14, "abcdefghijklmnopqrstuvwxyz0123456789")}`;
  await db.payment.create({
    data: {
      orderId: order.id,
      provider: "DEMO",
      providerRef: ref,
      chargeId: `ch_demo_${randomCode(14, "abcdefghijklmnopqrstuvwxyz0123456789")}`,
      status: "PENDING",
      amountMinor: quote.totals.totalMinor,
      currency: quote.currency,
      methodSummary: card ? `${card.brand?.toUpperCase()} •••• ${card.last4}` : "Demo payment",
    },
  });
  await markOrderPaid(order.id, { providerRef: ref });
  return { status: "paid", orderNumber };
}

async function refreshAvailability(tx: Tx, productIds: string[]) {
  const products = await tx.product.findMany({ where: { id: { in: productIds } }, include: { variants: { where: { isActive: true } } } });
  for (const p of products) {
    const inStock = p.variants.some((v) => v.allowBackorder || !v.trackInventory || v.stockQuantity > 0);
    await tx.product.update({
      where: { id: p.id },
      data: { inStock, ...(p.isOneOfAKind && !inStock ? { status: "SOLD" } : {}) },
    });
  }
}

/** Idempotent: called by the demo flow and by the Stripe webhook. */
export async function markOrderPaid(orderId: string, payment: { providerRef?: string; chargeId?: string | null; methodSummary?: string | null }) {
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { sellerOrders: { include: { items: true, seller: { select: { userId: true, storeName: true } } } } },
    });
    if (!order || order.paymentStatus === "SUCCEEDED") return;
    const now = new Date();
    const rates = ((order.fxSnapshot as { rates?: Record<string, number> } | null)?.rates ?? { USD: 1 }) as Record<string, number>;
    const usd = (minor: bigint | number) => convertMinor(num(minor), order.currency, "USD", rates, "exact");

    await tx.order.update({ where: { id: order.id }, data: { status: "PLACED", paymentStatus: "SUCCEEDED", placedAt: now } });
    if (payment.providerRef) {
      await tx.payment.updateMany({
        where: { orderId: order.id, providerRef: payment.providerRef },
        data: { status: "SUCCEEDED", chargeId: payment.chargeId ?? undefined, methodSummary: payment.methodSummary ?? undefined },
      });
    }
    await tx.inventoryReservation.updateMany({ where: { orderId: order.id, status: "ACTIVE" }, data: { status: "COMMITTED" } });

    await tx.ledgerEntry.createMany({
      data: [
        { type: "SALE", amountMinor: order.subtotalMinor, currency: order.currency, amountUsdMinor: usd(order.subtotalMinor), orderId: order.id, reference: order.orderNumber },
        { type: "TAX_COLLECTED", amountMinor: order.taxMinor, currency: order.currency, amountUsdMinor: usd(order.taxMinor), orderId: order.id, reference: order.orderNumber },
        ...(num(order.dutiesMinor) > 0 ? [{ type: "DUTIES_COLLECTED" as const, amountMinor: order.dutiesMinor, currency: order.currency, amountUsdMinor: usd(order.dutiesMinor), orderId: order.id, reference: order.orderNumber }] : []),
        ...order.sellerOrders.map((so) => ({ type: "COMMISSION" as const, amountMinor: so.commissionMinor, currency: order.currency, amountUsdMinor: usd(so.commissionMinor), sellerId: so.sellerId, orderId: order.id, sellerOrderId: so.id, reference: so.reference })),
      ],
    });

    for (const so of order.sellerOrders) {
      await tx.payout.create({ data: { sellerId: so.sellerId, sellerOrderId: so.id, amountMinor: so.sellerNetMinor, currency: order.currency, status: "PENDING" } });
      await tx.orderStatusEvent.create({ data: { sellerOrderId: so.id, status: "PENDING", note: "Payment confirmed. Order sent to the jeweler.", actorType: "SYSTEM" } });
      await notify(tx, so.seller.userId, "ORDER", "New order to fulfil", `${so.reference} · ${so.items.map((i) => i.title).join(", ")}`, `/seller/orders/${so.id}`);
    }

    const offerIds = order.sellerOrders.flatMap((so) => so.items.map((i) => i.offerId)).filter(Boolean) as string[];
    if (offerIds.length) await tx.offer.updateMany({ where: { id: { in: offerIds } }, data: { status: "PURCHASED" } });

    await refreshAvailability(tx, order.sellerOrders.flatMap((so) => so.items.map((i) => i.productId)).filter(Boolean) as string[]);
    await tx.product.updateMany({ where: { id: { in: order.sellerOrders.flatMap((so) => so.items.map((i) => i.productId!)) } }, data: { salesCount: { increment: 1 } } });
    await notify(tx, order.buyerId, "ORDER", "Order confirmed", `${order.orderNumber} — we'll let you know as each jeweler ships.`, `/account/orders/${order.orderNumber}`);
    await tx.analyticsEvent.create({ data: { type: "ORDER_PLACED", userId: order.buyerId, metadata: { orderNumber: order.orderNumber, totalUsdMinor: usd(order.totalMinor) } } });
  });
}

export async function markPaymentFailed(providerRef: string, reason?: string | null) {
  await db.payment.updateMany({ where: { providerRef }, data: { status: "FAILED", failureReason: reason ?? null } });
}

/** Cron: cancel unpaid orders whose reservation lapsed and return stock. */
export async function releaseExpiredReservations(graceMinutes = 45) {
  const cutoff = new Date(Date.now() - graceMinutes * 60_000);
  const stale = await db.order.findMany({
    where: { status: "PENDING_PAYMENT", createdAt: { lt: cutoff } },
    include: { reservations: { where: { status: "ACTIVE" } }, sellerOrders: { include: { items: true } } },
  });
  for (const order of stale) {
    await db.$transaction(async (tx) => {
      for (const r of order.reservations) {
        const v = await tx.productVariant.findUnique({ where: { id: r.variantId } });
        if (v?.trackInventory && !v.allowBackorder) await tx.productVariant.update({ where: { id: v.id }, data: { stockQuantity: { increment: r.quantity } } });
      }
      await tx.inventoryReservation.updateMany({ where: { orderId: order.id, status: "ACTIVE" }, data: { status: "EXPIRED" } });
      await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", paymentStatus: "CANCELLED", cancelledAt: new Date() } });
      await tx.sellerOrder.updateMany({ where: { orderId: order.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
      await refreshAvailability(tx, order.sellerOrders.flatMap((so) => so.items.map((i) => i.productId)).filter(Boolean) as string[]);
    });
  }
  return stale.length;
}
