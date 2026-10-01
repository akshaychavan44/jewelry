import "server-only";

import { cache } from "react";
import type {
  CertificateLab,
  ClarityGrade,
  CutGrade,
  EngravingStyle,
  Gemstone,
  MetalColor,
  MetalType,
  StoneShape,
} from "@/generated/prisma/enums";
import { convertMinor } from "@/lib/money";
import { zoneFor } from "@/lib/regions";
import { num } from "@/lib/utils";
import { db } from "@/server/db";
import { cardSelect, publicProductWhere, toCard } from "./catalog";
import { type Money, type PriceContext, toDisplay } from "./currency";
import { livePrice } from "./pricing";

export type VariantOption = {
  id: string;
  sku: string;
  title: string;
  metalType: MetalType;
  metalColor: MetalColor | null;
  gemstone: Gemstone | null;
  caratWeight: number | null;
  stoneQuality: string | null;
  ringSize: number | null;
  chainLengthMm: number | null;
  price: Money;
  compareAt: Money | null;
  listPriceMinor: number;
  available: boolean;
  stock: number;
  madeToOrder: boolean;
  breakdown: {
    weightGrams: number;
    perGram: Money;
    metalValue: Money;
    makingCharge: Money;
    stones: Money;
  } | null;
};

export type CertificateView = {
  id: string;
  lab: CertificateLab;
  reportNumber: string;
  issuedAt: Date | null;
  gemstone: Gemstone | null;
  shape: StoneShape | null;
  caratWeight: number | null;
  colorGrade: string | null;
  clarityGrade: ClarityGrade | null;
  cutGrade: CutGrade | null;
  polish: CutGrade | null;
  symmetry: CutGrade | null;
  fluorescence: string | null;
  measurements: string | null;
  origin: string | null;
  hallmarkPurity: string | null;
  assayOffice: string | null;
  notes: string | null;
  verified: boolean;
  variantId: string | null;
};

export const getProductDetail = cache(async (slug: string, ctx: PriceContext, viewerCountry: string) => {
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      category: { include: { parent: true } },
      images: { orderBy: { position: "asc" } },
      variants: { where: { isActive: true }, orderBy: { position: "asc" } },
      certificates: { where: { status: { not: "REJECTED" } }, orderBy: { createdAt: "asc" } },
      seller: {
        include: {
          locations: true,
          shippingRates: { where: { isActive: true } },
          user: { select: { id: true } },
        },
      },
    },
  });
  if (!product || product.deletedAt) return null;
  const visible = (product.status === "ACTIVE" || product.status === "SOLD") && product.seller.verificationStatus === "APPROVED";
  if (!visible) return null;

  const variants: VariantOption[] = await Promise.all(
    product.variants.map(async (v) => {
      const live = await livePrice(product, v);
      const b = live.breakdown;
      return {
        id: v.id,
        sku: v.sku,
        title: v.title,
        metalType: v.metalType,
        metalColor: v.metalColor,
        gemstone: v.gemstone,
        caratWeight: v.caratWeight,
        stoneQuality: v.stoneQuality,
        ringSize: v.ringSize,
        chainLengthMm: v.chainLengthMm,
        price: toDisplay(live.priceMinor, product.currency, ctx),
        compareAt: v.compareAtPriceMinor ? toDisplay(v.compareAtPriceMinor, product.currency, ctx) : null,
        listPriceMinor: live.priceMinor,
        available: product.status === "ACTIVE" && (v.allowBackorder || !v.trackInventory || v.stockQuantity > 0),
        stock: v.stockQuantity,
        madeToOrder: v.allowBackorder && v.stockQuantity <= 0,
        breakdown: b
          ? {
              weightGrams: b.weightGrams,
              perGram: { amountMinor: convertMinor(b.perGramMinor, product.currency, ctx.currency, ctx.rates, "exact"), currency: ctx.currency },
              metalValue: { amountMinor: convertMinor(b.metalValueMinor, product.currency, ctx.currency, ctx.rates, "exact"), currency: ctx.currency },
              makingCharge: { amountMinor: convertMinor(b.makingChargeMinor, product.currency, ctx.currency, ctx.rates, "exact"), currency: ctx.currency },
              stones: { amountMinor: convertMinor(b.stoneMinor, product.currency, ctx.currency, ctx.rates, "exact"), currency: ctx.currency },
            }
          : null,
      };
    }),
  );

  const certificates: CertificateView[] = product.certificates.map((c) => ({
    id: c.id,
    lab: c.lab,
    reportNumber: c.reportNumber,
    issuedAt: c.issuedAt,
    gemstone: c.gemstone,
    shape: c.shape,
    caratWeight: c.caratWeight,
    colorGrade: c.colorGrade,
    clarityGrade: c.clarityGrade,
    cutGrade: c.cutGrade,
    polish: c.polish,
    symmetry: c.symmetry,
    fluorescence: c.fluorescence,
    measurements: c.measurements,
    origin: c.origin,
    hallmarkPurity: c.hallmarkPurity,
    assayOffice: c.assayOffice,
    notes: c.notes,
    verified: c.status === "VERIFIED",
    variantId: c.variantId,
  }));

  // Shipping to the viewer: cheapest eligible method and its window.
  const zone = zoneFor(product.seller.country, viewerCountry);
  const zoneRates = product.seller.shippingRates.filter((r) => r.zone === zone && r.method !== "STORE_PICKUP").sort((a, b) => num(a.priceMinor) - num(b.priceMinor));
  const shipping = zoneRates[0]
    ? {
        method: zoneRates[0].method,
        carrier: zoneRates[0].carrier,
        price: toDisplay(zoneRates[0].priceMinor, zoneRates[0].currency, ctx),
        minDays: zoneRates[0].minDays,
        maxDays: zoneRates[0].maxDays,
        international: zone !== "DOMESTIC",
      }
    : null;

  const [ratingRows, reviews, photoReviews] = await Promise.all([
    db.review.groupBy({ by: ["rating"], where: { productId: product.id, status: "PUBLISHED" }, _count: { _all: true } }),
    db.review.findMany({
      where: { productId: product.id, status: "PUBLISHED" },
      orderBy: [{ helpfulCount: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: { author: { select: { name: true, country: true } }, orderItem: { select: { variantTitle: true } } },
    }),
    // Store-wide photo reviews add context for pieces with few reviews.
    db.review.findMany({
      where: { sellerId: product.sellerId, status: "PUBLISHED", photoUrls: { isEmpty: false } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, photoUrls: true, rating: true, title: true, product: { select: { title: true, slug: true } } },
    }),
  ]);

  const distribution = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: ratingRows.find((r) => r.rating === stars)?._count._all ?? 0 }));

  return {
    product,
    variants,
    certificates,
    shipping,
    rating: { average: product.ratingAverage, count: product.ratingCount, distribution },
    reviews,
    photoReviews,
    engravingFee: product.engravingFeeMinor ? toDisplay(product.engravingFeeMinor, product.currency, ctx) : null,
    resizingFee: product.resizingFeeMinor ? toDisplay(product.resizingFeeMinor, product.currency, ctx) : null,
  };
});

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductDetail>>>;

export async function getRelatedProducts(productId: string, sellerId: string, categoryId: string, ctx: PriceContext) {
  const [fromSeller, similar] = await Promise.all([
    db.product.findMany({ where: { ...publicProductWhere, sellerId, id: { not: productId } }, orderBy: [{ isFeatured: "desc" }, { salesCount: "desc" }], take: 4, select: cardSelect }),
    db.product.findMany({ where: { ...publicProductWhere, categoryId, sellerId: { not: sellerId }, id: { not: productId } }, orderBy: [{ ratingAverage: "desc" }, { salesCount: "desc" }], take: 4, select: cardSelect }),
  ]);
  return { fromSeller: fromSeller.map((p) => toCard(p, ctx)), similar: similar.map((p) => toCard(p, ctx)) };
}

export type EngravingInput = { text: string; style: EngravingStyle };
