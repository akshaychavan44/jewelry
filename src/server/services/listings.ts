import "server-only";

import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import {
  CertificateLab,
  ClarityGrade,
  ConditionGrade,
  CutGrade,
  Gemstone,
  MakingChargeType,
  MetalColor,
  MetalType,
  PricingMode,
  ProductCondition,
  ShippingRegion,
  SizingMode,
  StoneShape,
} from "@/generated/prisma/enums";
import { toMinor, toUsdMinor } from "@/lib/money";
import { computeSpotPrice } from "@/lib/pricing";
import { num, slugify } from "@/lib/utils";
import { db, type Tx } from "@/server/db";
import { getFxRates, getSpotRates } from "./market";
import { saveUpload } from "./storage";

export class ListingError extends Error {}

const optNum = z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : Number(v)), z.number().nonnegative().optional());

export const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(2, "Every SKU needs a code.").max(40),
  title: z.string().trim().max(120).optional(),
  metalType: z.enum(MetalType),
  metalColor: z.enum(MetalColor).nullable().optional(),
  gemstone: z.enum(Gemstone).nullable().optional(),
  caratWeight: optNum,
  stoneQuality: z.string().trim().max(40).optional(),
  ringSize: optNum,
  chainLengthMm: optNum,
  price: optNum,
  compareAt: optNum,
  stock: z.coerce.number().int().min(0).max(100_000),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000).default(1),
  allowBackorder: z.boolean().default(false),
  isActive: z.boolean().default(true),
  metalWeightGrams: optNum,
  makingChargeType: z.enum(MakingChargeType).nullable().optional(),
  makingChargeValue: optNum,
  stonePrice: optNum,
});

export const listingSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(4, "Give the piece a title.").max(120),
  categoryId: z.string().min(1, "Choose a category."),
  shortDescription: z.string().trim().max(200).optional(),
  description: z.string().trim().min(20, "Describe the piece (at least 20 characters)."),
  condition: z.enum(ProductCondition),
  conditionGrade: z.enum(ConditionGrade).nullable().optional(),
  conditionNotes: z.string().trim().max(500).optional(),
  era: z.string().trim().max(80).optional(),
  isHandcrafted: z.boolean(),
  isOneOfAKind: z.boolean(),
  isMadeToOrder: z.boolean(),
  productionDays: z.coerce.number().int().min(0).max(180),
  primaryMetal: z.enum(MetalType),
  metalColor: z.enum(MetalColor).nullable().optional(),
  primaryGemstone: z.enum(Gemstone),
  totalCaratWeight: optNum,
  stoneShape: z.enum(StoneShape).nullable().optional(),
  widthMm: optNum,
  heightMm: optNum,
  depthMm: optNum,
  weightGrams: optNum,
  pricingMode: z.enum(PricingMode),
  acceptsOffers: z.boolean(),
  offerFloor: optNum,
  sizingMode: z.enum(SizingMode),
  ringSizeMin: optNum,
  ringSizeMax: optNum,
  resizingFee: optNum,
  engravingEnabled: z.boolean(),
  engravingMaxChars: optNum,
  engravingFee: optNum,
  shipsTo: z.array(z.enum(ShippingRegion)).min(1, "Choose at least one region you ship to."),
  returnWindowDays: optNum,
  warrantyMonths: z.coerce.number().int().min(0).max(120),
  tags: z.array(z.string().trim().toLowerCase()).max(12),
  images: z.array(z.object({ url: z.string().min(1), alt: z.string().trim().max(160).optional(), angle: z.string().trim().max(40).optional() })).max(12),
  variants: z.array(variantSchema).min(1, "Add at least one SKU."),
});

export type ListingInput = z.infer<typeof listingSchema>;

async function uniqueProductSlug(title: string, excludeId?: string) {
  const base = slugify(title) || "piece";
  for (let i = 0; i < 50; i++) {
    const s = i === 0 ? base : `${base}-${i + 1}`;
    const hit = await db.product.findFirst({ where: { slug: s, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } });
    if (!hit) return s;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Recomputes the denormalised catalogue facets for one product. */
export async function refreshProductFacets(client: Tx | typeof db, productId: string) {
  const [product, fx] = await Promise.all([
    client.product.findUniqueOrThrow({ where: { id: productId }, include: { variants: { where: { isActive: true } }, certificates: { where: { status: "VERIFIED" } } } }),
    getFxRates(),
  ]);
  const sellable = product.variants.filter((v) => v.allowBackorder || !v.trackInventory || v.stockQuantity > 0);
  const priced = (sellable.length ? sellable : product.variants).map((v) => num(v.priceMinor)).filter((p) => p > 0);
  const base = priced.length ? Math.min(...priced) : 0;
  await client.product.update({
    where: { id: productId },
    data: {
      basePriceMinor: base,
      normalizedPriceUsd: base ? toUsdMinor(base, product.currency, fx) : 0,
      inStock: sellable.length > 0,
      certificationLabs: [...new Set(product.certificates.map((c) => c.lab))],
      ...(product.status === "SOLD" && sellable.length > 0 ? { status: "ACTIVE" } : {}),
    },
  });
}

export async function saveListing(sellerId: string, input: ListingInput) {
  const seller = await db.sellerProfile.findUniqueOrThrow({ where: { id: sellerId } });
  const currency = seller.defaultCurrency;
  const existing = input.id ? await db.product.findFirst({ where: { id: input.id, sellerId, deletedAt: null } }) : null;
  if (input.id && !existing) throw new ListingError("Listing not found.");

  const skus = input.variants.map((v) => v.sku.toUpperCase());
  if (new Set(skus).size !== skus.length) throw new ListingError("SKUs must be unique within a listing.");
  const clash = await db.productVariant.findFirst({ where: { sellerId, sku: { in: skus }, ...(existing ? { productId: { not: existing.id } } : {}) }, select: { sku: true } });
  if (clash) throw new ListingError(`SKU ${clash.sku} is already used on another of your listings.`);

  const [spot, fx] = await Promise.all([getSpotRates(), getFxRates()]);
  const priceFor = (v: z.infer<typeof variantSchema>) => {
    if (input.pricingMode === "METAL_SPOT") {
      if (!v.metalWeightGrams || !v.makingChargeType) throw new ListingError(`SKU ${v.sku}: live-priced SKUs need a metal weight and a making charge.`);
      const b = computeSpotPrice(
        {
          metalType: v.metalType,
          metalWeightGrams: v.metalWeightGrams,
          makingChargeType: v.makingChargeType,
          makingChargeValue: v.makingChargeType === "PERCENT" ? (v.makingChargeValue ?? 0) : toMinor(v.makingChargeValue ?? 0, currency),
          stonePriceMinor: v.stonePrice ? toMinor(v.stonePrice, currency) : 0,
          currency,
        },
        spot,
        fx,
      );
      if (!b) throw new ListingError(`SKU ${v.sku}: live pricing isn't available for ${v.metalType.toLowerCase().replace(/_/g, " ")}.`);
      return b.totalMinor;
    }
    if (!v.price) throw new ListingError(`SKU ${v.sku}: enter a price.`);
    return toMinor(v.price, currency);
  };

  const productData = {
    title: input.title,
    categoryId: input.categoryId,
    shortDescription: input.shortDescription || null,
    description: input.description,
    condition: input.condition,
    conditionGrade: input.conditionGrade ?? null,
    conditionNotes: input.conditionNotes || null,
    era: input.era || null,
    isHandcrafted: input.isHandcrafted,
    isOneOfAKind: input.isOneOfAKind,
    isMadeToOrder: input.isMadeToOrder,
    productionDays: input.productionDays,
    primaryMetal: input.primaryMetal,
    metalColor: input.metalColor ?? null,
    primaryGemstone: input.primaryGemstone,
    totalCaratWeight: input.totalCaratWeight ?? null,
    stoneShape: input.stoneShape ?? null,
    widthMm: input.widthMm ?? null,
    heightMm: input.heightMm ?? null,
    depthMm: input.depthMm ?? null,
    weightGrams: input.weightGrams ?? null,
    currency,
    pricingMode: input.pricingMode,
    acceptsOffers: input.acceptsOffers,
    offerFloorMinor: input.acceptsOffers && input.offerFloor ? toMinor(input.offerFloor, currency) : null,
    sizingMode: input.sizingMode,
    ringSizeMin: input.sizingMode === "MADE_TO_SIZE" ? (input.ringSizeMin ?? 4) : null,
    ringSizeMax: input.sizingMode === "MADE_TO_SIZE" ? (input.ringSizeMax ?? 10) : null,
    resizingFeeMinor: input.resizingFee ? toMinor(input.resizingFee, currency) : null,
    engravingEnabled: input.engravingEnabled,
    engravingMaxChars: input.engravingEnabled ? (input.engravingMaxChars ?? 20) : null,
    engravingFeeMinor: input.engravingEnabled && input.engravingFee ? toMinor(input.engravingFee, currency) : null,
    shipsFromCountry: seller.country,
    shipsTo: input.shipsTo,
    returnWindowDays: input.returnWindowDays ?? null,
    warrantyMonths: input.warrantyMonths,
    tags: input.tags,
  } satisfies Omit<Prisma.ProductUncheckedCreateInput, "sellerId" | "slug" | "basePriceMinor" | "normalizedPriceUsd">;

  const variantRows = input.variants.map((v, i) => ({
    ...v,
    sku: v.sku.toUpperCase(),
    priceMinor: priceFor(v),
    position: i,
  }));

  return db.$transaction(async (tx) => {
    const product = existing
      ? await tx.product.update({ where: { id: existing.id }, data: productData })
      : await tx.product.create({ data: { ...productData, sellerId, slug: await uniqueProductSlug(input.title), status: "DRAFT", basePriceMinor: 0, normalizedPriceUsd: 0 } });

    await tx.productImage.deleteMany({ where: { productId: product.id } });
    if (input.images.length) {
      await tx.productImage.createMany({ data: input.images.map((im, i) => ({ productId: product.id, url: im.url, alt: im.alt || input.title, angle: im.angle || null, position: i })) });
    }

    const keep = variantRows.filter((v) => v.id).map((v) => v.id!);
    await tx.productVariant.deleteMany({ where: { productId: product.id, id: { notIn: keep } } });
    for (const v of variantRows) {
      const data = {
        sku: v.sku,
        title: v.title || [v.metalType, v.caratWeight ? `${v.caratWeight} ct` : null, v.ringSize ? `Size ${v.ringSize}` : null].filter(Boolean).join(" · "),
        metalType: v.metalType,
        metalColor: v.metalColor ?? null,
        gemstone: v.gemstone ?? null,
        caratWeight: v.caratWeight ?? null,
        stoneQuality: v.stoneQuality || null,
        ringSize: v.ringSize ?? null,
        chainLengthMm: v.chainLengthMm ?? null,
        priceMinor: v.priceMinor,
        compareAtPriceMinor: v.compareAt ? toMinor(v.compareAt, currency) : null,
        metalWeightGrams: v.metalWeightGrams ?? null,
        makingChargeType: v.makingChargeType ?? null,
        makingChargeValue: v.makingChargeValue === undefined ? null : v.makingChargeType === "PERCENT" ? v.makingChargeValue : toMinor(v.makingChargeValue, currency),
        stonePriceMinor: v.stonePrice ? toMinor(v.stonePrice, currency) : null,
        priceComputedAt: input.pricingMode === "METAL_SPOT" ? new Date() : null,
        stockQuantity: v.stock,
        lowStockThreshold: v.lowStockThreshold,
        allowBackorder: v.allowBackorder,
        isActive: v.isActive,
        isDefault: v.position === 0,
        position: v.position,
      };
      if (v.id) await tx.productVariant.update({ where: { id: v.id }, data });
      else await tx.productVariant.create({ data: { ...data, productId: product.id, sellerId } });
    }
    await refreshProductFacets(tx, product.id);
    return product;
  });
}

/** Moves a draft live after quality gates; charges the listing fee if due. */
export async function publishListing(sellerId: string, productId: string) {
  const product = await db.product.findFirst({ where: { id: productId, sellerId, deletedAt: null }, include: { images: true, variants: { where: { isActive: true } }, seller: { include: { subscription: { include: { plan: true } } } } } });
  if (!product) throw new ListingError("Listing not found.");
  if (product.seller.verificationStatus !== "APPROVED") throw new ListingError("Your store must be approved before listings can go live.");
  if (!product.images.length) throw new ListingError("Add at least one photograph before publishing.");
  if (!product.variants.some((v) => num(v.priceMinor) > 0)) throw new ListingError("Add a priced SKU before publishing.");
  if (product.status === "ACTIVE") return product;

  const settings = await db.platformSettings.findUniqueOrThrow({ where: { id: "platform" } });
  const waived = product.seller.subscription?.status === "ACTIVE" && product.seller.subscription.plan.listingFeeWaived;
  const firstPublish = !product.publishedAt;
  return db.$transaction(async (tx) => {
    const updated = await tx.product.update({ where: { id: product.id }, data: { status: "ACTIVE", publishedAt: product.publishedAt ?? new Date() } });
    if (firstPublish && !waived && num(settings.listingFeeMinor) > 0) {
      await tx.ledgerEntry.create({
        data: { type: "LISTING_FEE", amountMinor: settings.listingFeeMinor, currency: settings.listingFeeCurrency, amountUsdMinor: settings.listingFeeMinor, sellerId, reference: product.id, description: `Listing fee · ${product.title}` },
      });
    }
    await tx.sellerProfile.update({ where: { id: sellerId }, data: { activeListingCount: { increment: 1 } } });
    return updated;
  });
}

export async function setListingStatus(sellerId: string, productId: string, status: "ARCHIVED" | "DRAFT") {
  const product = await db.product.findFirst({ where: { id: productId, sellerId } });
  if (!product) throw new ListingError("Listing not found.");
  await db.product.update({ where: { id: productId }, data: { status } });
  if (product.status === "ACTIVE") await db.sellerProfile.update({ where: { id: sellerId }, data: { activeListingCount: { decrement: 1 } } });
}

// ── Certificates ──────────────────────────────────────────────────────────────

export const certificateSchema = z.object({
  lab: z.enum(CertificateLab),
  reportNumber: z.string().trim().min(3, "Enter the report number or HUID.").max(40),
  variantId: z.string().optional(),
  issuedAt: z.string().optional(),
  gemstone: z.enum(Gemstone).optional(),
  shape: z.enum(StoneShape).optional(),
  caratWeight: optNum,
  colorGrade: z.string().trim().max(30).optional(),
  clarityGrade: z.enum(ClarityGrade).optional(),
  cutGrade: z.enum(CutGrade).optional(),
  measurements: z.string().trim().max(60).optional(),
  origin: z.string().trim().max(80).optional(),
  hallmarkPurity: z.string().trim().max(30).optional(),
});

export async function addCertificate(sellerId: string, userId: string, productId: string, input: z.infer<typeof certificateSchema>, file: File | null) {
  const product = await db.product.findFirst({ where: { id: productId, sellerId } });
  if (!product) throw new ListingError("Listing not found.");
  if (input.variantId) {
    const v = await db.productVariant.findFirst({ where: { id: input.variantId, productId } });
    if (!v) throw new ListingError("That SKU doesn't belong to this listing.");
  }
  const duplicate = await db.certificate.findUnique({ where: { lab_reportNumber: { lab: input.lab, reportNumber: input.reportNumber } } });
  if (duplicate) throw new ListingError("That report number is already attached to a listing. Each report can back only one piece.");
  const asset = file?.size ? await saveUpload(file, "CERTIFICATE", sellerId, userId) : null;
  // Seller-added reports are reviewed by Loupe before they carry the "checked" mark.
  return db.certificate.create({
    data: {
      productId,
      variantId: input.variantId || null,
      lab: input.lab,
      reportNumber: input.reportNumber,
      issuedAt: input.issuedAt ? new Date(input.issuedAt) : null,
      gemstone: input.gemstone,
      shape: input.shape,
      caratWeight: input.caratWeight,
      colorGrade: input.colorGrade || null,
      clarityGrade: input.clarityGrade,
      cutGrade: input.cutGrade,
      measurements: input.measurements || null,
      origin: input.origin || null,
      hallmarkPurity: input.hallmarkPurity || null,
      fileId: asset?.id,
      status: "PENDING_REVIEW",
    },
  });
}

export async function removeCertificate(sellerId: string, certificateId: string) {
  const cert = await db.certificate.findUnique({ where: { id: certificateId }, include: { product: { select: { sellerId: true, id: true } } } });
  if (!cert || cert.product.sellerId !== sellerId) throw new ListingError("Certificate not found.");
  await db.certificate.delete({ where: { id: cert.id } });
  await refreshProductFacets(db, cert.product.id);
}

// ── Live metal repricing (cron + manual) ──────────────────────────────────────

export async function repriceSpotListings(sellerId?: string) {
  const [spot, fx] = await Promise.all([getSpotRates(), getFxRates()]);
  const variants = await db.productVariant.findMany({
    where: { product: { pricingMode: "METAL_SPOT", deletedAt: null, ...(sellerId ? { sellerId } : {}) }, metalWeightGrams: { not: null }, makingChargeType: { not: null } },
    include: { product: { select: { id: true, currency: true } } },
  });
  const touched = new Set<string>();
  for (const v of variants) {
    const b = computeSpotPrice(
      { metalType: v.metalType, metalWeightGrams: v.metalWeightGrams!, makingChargeType: v.makingChargeType!, makingChargeValue: v.makingChargeValue ?? 0, stonePriceMinor: num(v.stonePriceMinor), currency: v.product.currency },
      spot,
      fx,
    );
    if (!b) continue;
    await db.productVariant.update({ where: { id: v.id }, data: { priceMinor: b.totalMinor, priceComputedAt: new Date() } });
    touched.add(v.product.id);
  }
  for (const id of touched) await refreshProductFacets(db, id);
  return { variants: variants.length, products: touched.size };
}
