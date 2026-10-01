import "server-only";

import { cookies } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import type { Carrier, EngravingStyle, ShippingMethod } from "@/generated/prisma/enums";
import { convertMinor } from "@/lib/money";
import { zoneFor } from "@/lib/regions";
import { deliveryWindow, eligibleRates, METHOD_LABELS, quoteRate, type RateCardLine } from "@/lib/shipping";
import { num } from "@/lib/utils";
import { randomToken } from "@/server/crypto";
import { db } from "@/server/db";
import { CART_COOKIE, cartOwner } from "./cart-summary";
import { type Money, type PriceContext, toDisplay } from "./currency";
import { livePrice } from "./pricing";

export class CartError extends Error {}

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      offer: true,
      variant: true,
      product: {
        include: {
          images: { orderBy: { position: "asc" }, take: 1 },
          seller: {
            select: {
              id: true,
              storeName: true,
              slug: true,
              country: true,
              city: true,
              defaultCurrency: true,
              handlingDays: true,
              verificationStatus: true,
              shippingRates: { where: { isActive: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

export type CartRecord = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export async function loadCart(userId?: string | null): Promise<CartRecord | null> {
  const owner = await cartOwner(userId);
  if (!owner) return null;
  return db.cart.findFirst({ where: owner, include: cartInclude });
}

async function ensureCart(userId?: string | null) {
  if (userId) {
    return db.cart.upsert({ where: { userId }, update: {}, create: { userId } });
  }
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (token) {
    const existing = await db.cart.findUnique({ where: { guestToken: token } });
    if (existing) return existing;
  }
  const guestToken = randomToken(24);
  jar.set(CART_COOKIE, guestToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return db.cart.create({ data: { guestToken } });
}

/** Moves a signed-out shopper's cart into their account after sign-in. */
export async function mergeGuestCart(userId: string) {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (!token) return;
  const guest = await db.cart.findUnique({ where: { guestToken: token }, include: { items: true } });
  if (guest?.items.length) {
    const cart = await ensureCart(userId);
    for (const item of guest.items) {
      const { id: _id, cartId: _cartId, createdAt: _c, updatedAt: _u, ...line } = item;
      await db.cartItem.create({ data: { ...line, cartId: cart.id } }).catch(() => undefined);
    }
  }
  if (guest) await db.cart.delete({ where: { id: guest.id } });
  jar.delete(CART_COOKIE);
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export type AddToCartInput = {
  variantId: string;
  quantity?: number;
  ringSize?: number | null;
  chainLengthMm?: number | null;
  engravingText?: string | null;
  engravingStyle?: EngravingStyle | null;
  offerId?: string | null;
};

export async function addToCart(input: AddToCartInput, userId?: string | null) {
  const variant = await db.productVariant.findUnique({
    where: { id: input.variantId },
    include: { product: { include: { seller: { select: { verificationStatus: true, userId: true } } } } },
  });
  if (!variant || !variant.isActive) throw new CartError("This option is no longer available.");
  const { product } = variant;
  if (product.status !== "ACTIVE" || product.deletedAt || product.seller.verificationStatus !== "APPROVED") {
    throw new CartError("This piece is no longer available.");
  }
  if (userId && product.seller.userId === userId) throw new CartError("You can't buy from your own store.");

  const engraving = input.engravingText?.trim() || null;
  if (engraving) {
    if (!product.engravingEnabled) throw new CartError("Engraving isn't offered on this piece.");
    if (product.engravingMaxChars && engraving.length > product.engravingMaxChars) {
      throw new CartError(`Engraving is limited to ${product.engravingMaxChars} characters.`);
    }
  }
  if (product.sizingMode === "MADE_TO_SIZE") {
    if (!input.ringSize) throw new CartError("Choose a ring size.");
    if ((product.ringSizeMin && input.ringSize < product.ringSizeMin) || (product.ringSizeMax && input.ringSize > product.ringSizeMax)) {
      throw new CartError("That size isn't available for this ring.");
    }
  }

  const cart = await ensureCart(userId);
  const quantity = Math.max(1, Math.min(input.quantity ?? 1, product.isOneOfAKind ? 1 : 10));
  const existing = await db.cartItem.findFirst({
    where: {
      cartId: cart.id,
      variantId: variant.id,
      ringSize: input.ringSize ?? null,
      engravingText: engraving,
      offerId: input.offerId ?? null,
    },
  });
  const nextQty = (existing?.quantity ?? 0) + quantity;
  if (variant.trackInventory && !variant.allowBackorder && nextQty > variant.stockQuantity) {
    throw new CartError(variant.stockQuantity <= 0 ? "This piece has just sold out." : `Only ${variant.stockQuantity} available.`);
  }
  if (product.isOneOfAKind && existing) throw new CartError("This one-of-a-kind piece is already in your cart.");

  if (existing) {
    await db.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQty } });
  } else {
    await db.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        variantId: variant.id,
        quantity,
        ringSize: input.ringSize ?? null,
        chainLengthMm: input.chainLengthMm ?? variant.chainLengthMm,
        engravingText: engraving,
        engravingStyle: engraving ? (input.engravingStyle ?? "SERIF") : null,
        offerId: input.offerId ?? null,
      },
    });
  }
  await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  return { product };
}

async function ownedItem(itemId: string, userId?: string | null) {
  const owner = await cartOwner(userId);
  if (!owner) throw new CartError("Your cart has expired.");
  const item = await db.cartItem.findFirst({ where: { id: itemId, cart: owner }, include: { variant: true, product: true } });
  if (!item) throw new CartError("That item is no longer in your cart.");
  return item;
}

export async function updateCartQuantity(itemId: string, quantity: number, userId?: string | null) {
  const item = await ownedItem(itemId, userId);
  if (quantity <= 0) return db.cartItem.delete({ where: { id: item.id } });
  if (item.product.isOneOfAKind && quantity > 1) throw new CartError("This is a one-of-a-kind piece.");
  if (item.variant.trackInventory && !item.variant.allowBackorder && quantity > item.variant.stockQuantity) {
    throw new CartError(`Only ${item.variant.stockQuantity} available.`);
  }
  return db.cartItem.update({ where: { id: item.id }, data: { quantity: Math.min(quantity, 10) } });
}

export async function removeCartItem(itemId: string, userId?: string | null) {
  const item = await ownedItem(itemId, userId);
  await db.cartItem.delete({ where: { id: item.id } });
}

// ── View model ────────────────────────────────────────────────────────────────

export type ShippingOption = {
  key: string;
  method: ShippingMethod;
  carrier: Carrier | null;
  label: string;
  detail: string;
  price: Money;
  insurance: Money;
  isFree: boolean;
  window: { from: Date; to: Date };
  /** Seller-currency amounts, used when the order is placed. */
  listShippingMinor: number;
  listInsuranceMinor: number;
};

export type CartLine = {
  id: string;
  productId: string;
  slug: string;
  title: string;
  variantId: string;
  variantTitle: string;
  sku: string;
  image: { url: string; alt: string };
  quantity: number;
  maxQuantity: number;
  ringSize: number | null;
  chainLengthMm: number | null;
  engravingText: string | null;
  engravingStyle: EngravingStyle | null;
  listCurrency: string;
  listUnitMinor: number;
  listFeesMinor: number;
  unit: Money;
  fees: Money;
  lineTotal: Money;
  offer: { id: string; deadline: Date | null } | null;
  livePrice: boolean;
  isOneOfAKind: boolean;
  productionDays: number;
  available: boolean;
  issue: string | null;
  categoryId: string;
};

export type CartGroup = {
  seller: { id: string; name: string; slug: string; country: string; city: string | null; currency: string };
  lines: CartLine[];
  subtotal: Money;
  listSubtotalMinor: number;
  declaredUsdMinor: number;
  leadDays: number;
  options: ShippingOption[];
  shipsToDestination: boolean;
};

export type CartView = {
  id: string | null;
  groups: CartGroup[];
  itemCount: number;
  subtotal: Money;
  destinationCountry: string;
  hasIssues: boolean;
};

export async function buildCartView(
  cart: CartRecord | null,
  ctx: PriceContext,
  destinationCountry: string,
  secureThresholdUsdMinor: number,
): Promise<CartView> {
  const empty: CartView = { id: cart?.id ?? null, groups: [], itemCount: 0, subtotal: { amountMinor: 0, currency: ctx.currency }, destinationCountry, hasIssues: false };
  if (!cart?.items.length) return empty;

  const groups = new Map<string, CartGroup>();
  for (const item of cart.items) {
    const { product, variant } = item;
    const seller = product.seller;
    const current = await livePrice(product, variant);
    const offerValid =
      item.offer && item.offer.status === "ACCEPTED" && item.offer.acceptedAmountMinor !== null && (!item.offer.purchaseDeadline || item.offer.purchaseDeadline > new Date());
    const listUnit = offerValid ? num(item.offer!.acceptedAmountMinor) : current.priceMinor;
    const engravingFee = item.engravingText && product.engravingFeeMinor ? num(product.engravingFeeMinor) : 0;
    const resizeFee = item.ringSize && product.resizingFeeMinor ? num(product.resizingFeeMinor) : 0;
    const listFees = engravingFee + resizeFee;

    let issue: string | null = null;
    if (product.status !== "ACTIVE" || product.deletedAt || seller.verificationStatus !== "APPROVED" || !variant.isActive) issue = "No longer available";
    else if (variant.trackInventory && !variant.allowBackorder && variant.stockQuantity < item.quantity) {
      issue = variant.stockQuantity <= 0 ? "Sold out" : `Only ${variant.stockQuantity} left`;
    } else if (item.offer && !offerValid) issue = "Offer expired — list price applies";

    const unit = toDisplay(listUnit, product.currency, ctx);
    const fees = toDisplay(listFees, product.currency, ctx);
    const line: CartLine = {
      id: item.id,
      productId: product.id,
      slug: product.slug,
      title: product.title,
      variantId: variant.id,
      variantTitle: variant.title,
      sku: variant.sku,
      image: { url: product.images[0]?.url ?? "", alt: product.images[0]?.alt ?? product.title },
      quantity: item.quantity,
      maxQuantity: product.isOneOfAKind ? 1 : variant.allowBackorder ? 10 : Math.max(1, Math.min(10, variant.stockQuantity)),
      ringSize: item.ringSize,
      chainLengthMm: item.chainLengthMm,
      engravingText: item.engravingText,
      engravingStyle: item.engravingStyle,
      listCurrency: product.currency,
      listUnitMinor: listUnit,
      listFeesMinor: listFees,
      unit,
      fees,
      lineTotal: { amountMinor: unit.amountMinor * item.quantity + fees.amountMinor, currency: ctx.currency },
      offer: item.offer ? { id: item.offer.id, deadline: item.offer.purchaseDeadline } : null,
      livePrice: product.pricingMode === "METAL_SPOT",
      isOneOfAKind: product.isOneOfAKind,
      productionDays: product.productionDays,
      available: !issue || issue.startsWith("Offer expired"),
      issue,
      categoryId: product.categoryId,
    };

    const group =
      groups.get(seller.id) ??
      ({
        seller: { id: seller.id, name: seller.storeName, slug: seller.slug, country: seller.country, city: seller.city, currency: seller.defaultCurrency },
        lines: [],
        subtotal: { amountMinor: 0, currency: ctx.currency },
        listSubtotalMinor: 0,
        declaredUsdMinor: 0,
        leadDays: seller.handlingDays,
        options: [],
        shipsToDestination: true,
      } satisfies CartGroup);
    group.lines.push(line);
    if (line.available) {
      group.subtotal.amountMinor += line.lineTotal.amountMinor;
      group.listSubtotalMinor += convertMinor(listUnit * item.quantity + listFees, product.currency, seller.defaultCurrency, ctx.rates, "exact");
    }
    group.leadDays = Math.max(group.leadDays, seller.handlingDays + product.productionDays + (item.engravingText ? 2 : 0));
    groups.set(seller.id, group);
  }

  const now = new Date();
  for (const [sellerId, group] of groups) {
    const record = cart.items.find((i) => i.product.seller.id === sellerId)!.product.seller;
    const rates: (RateCardLine & { id: string })[] = record.shippingRates.map((r) => ({ ...r, priceMinor: num(r.priceMinor), freeOverMinor: r.freeOverMinor === null ? null : num(r.freeOverMinor) }));
    group.declaredUsdMinor = convertMinor(group.listSubtotalMinor, group.seller.currency, "USD", ctx.rates, "exact");
    const zone = zoneFor(group.seller.country, destinationCountry);
    const eligible = eligibleRates(rates, zone, group.declaredUsdMinor, secureThresholdUsdMinor).filter((r) => r.method !== "STORE_PICKUP" || zone === "DOMESTIC");
    group.shipsToDestination = eligible.length > 0;
    group.options = eligible
      .map((rate) => {
        const q = quoteRate(rate, group.listSubtotalMinor);
        const window = deliveryWindow(now, group.leadDays, rate);
        return {
          key: rate.id,
          method: rate.method,
          carrier: rate.carrier,
          label: METHOD_LABELS[rate.method].label,
          detail: METHOD_LABELS[rate.method].detail,
          price: toDisplay(q.shippingMinor, group.seller.currency, ctx),
          insurance: toDisplay(q.insuranceMinor, group.seller.currency, ctx),
          isFree: q.isFree || q.shippingMinor === 0,
          window,
          listShippingMinor: q.shippingMinor,
          listInsuranceMinor: q.insuranceMinor,
        } satisfies ShippingOption;
      })
      .sort((a, b) => a.price.amountMinor - b.price.amountMinor);
  }

  const list = [...groups.values()];
  return {
    id: cart.id,
    groups: list,
    itemCount: cart.items.reduce((n, i) => n + i.quantity, 0),
    subtotal: { amountMinor: list.reduce((n, g) => n + g.subtotal.amountMinor, 0), currency: ctx.currency },
    destinationCountry,
    hasIssues: list.some((g) => g.lines.some((l) => !l.available) || !g.shipsToDestination),
  };
}
