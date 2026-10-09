import "server-only";

import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import type {
  CertificateLab,
  Gemstone,
  MetalType,
  ProductCondition,
  ShippingRegion,
} from "@/generated/prisma/enums";
import { convertMinor, toMinor } from "@/lib/money";
import { num } from "@/lib/utils";
import { db } from "@/server/db";
import { type Money, type PriceContext, toDisplay } from "./currency";

// ── DTOs ──────────────────────────────────────────────────────────────────────

export type ProductCard = {
  id: string;
  slug: string;
  title: string;
  seller: { name: string; slug: string };
  image: { url: string; alt: string };
  hoverImage: { url: string; alt: string } | null;
  metal: MetalType;
  labs: CertificateLab[];
  price: Money;
  compareAt: Money | null;
  condition: ProductCondition;
  era: string | null;
  isOneOfAKind: boolean;
  acceptsOffers: boolean;
  livePrice: boolean;
  inStock: boolean;
  sold: boolean;
  rating: { average: number; count: number };
};

export const cardSelect = {
  id: true,
  slug: true,
  title: true,
  currency: true,
  basePriceMinor: true,
  compareAtPriceMinor: true,
  primaryMetal: true,
  certificationLabs: true,
  condition: true,
  era: true,
  isOneOfAKind: true,
  acceptsOffers: true,
  pricingMode: true,
  inStock: true,
  status: true,
  ratingAverage: true,
  ratingCount: true,
  seller: { select: { storeName: true, slug: true } },
  // Relations are batched by the adapter; a nested limit would apply to the
  // entire batch. toCard picks the first two images for each product instead.
  images: { orderBy: { position: "asc" }, select: { url: true, alt: true } },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export function toCard(p: CardRow, ctx: PriceContext): ProductCard {
  const images = p.images ?? [];
  const [first, second] = images;
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    seller: { name: p.seller?.storeName ?? "Fine Jeweler", slug: p.seller?.slug ?? "" },
    image: { url: first?.url ?? "", alt: first?.alt ?? p.title },
    hoverImage: second ? { url: second.url, alt: second.alt ?? p.title } : null,
    metal: p.primaryMetal,
    labs: Array.isArray(p.certificationLabs) ? p.certificationLabs : [],
    price: toDisplay(p.basePriceMinor, p.currency, ctx),
    compareAt: p.compareAtPriceMinor ? toDisplay(p.compareAtPriceMinor, p.currency, ctx) : null,
    condition: p.condition,
    era: p.era,
    isOneOfAKind: p.isOneOfAKind,
    acceptsOffers: p.acceptsOffers,
    livePrice: p.pricingMode === "METAL_SPOT",
    inStock: p.inStock,
    sold: p.status === "SOLD",
    rating: { average: p.ratingAverage ?? 0, count: p.ratingCount ?? 0 },
  };
}

/** Listings visible to shoppers: active, not deleted, from an approved store. */
export const publicProductWhere = {
  status: "ACTIVE",
  deletedAt: null,
  seller: { verificationStatus: "APPROVED" },
} satisfies Prisma.ProductWhereInput;

// ── Categories ────────────────────────────────────────────────────────────────

export const getCategoryTree = cache(async () =>
  db.category.findMany({
    where: { parentId: null, isActive: true },
    orderBy: { position: "asc" },
    include: { children: { where: { isActive: true }, orderBy: { position: "asc" } } },
  }),
);

export const getCategoryBySlug = cache(async (slug: string) =>
  db.category.findUnique({
    where: { slug },
    include: {
      parent: true,
      children: { where: { isActive: true }, orderBy: { position: "asc" } },
    },
  }),
);

// ── Product listing (PLP) ─────────────────────────────────────────────────────

export const SORTS = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  rating: "Highest rated",
  popular: "Most popular",
} as const;
export type SortKey = keyof typeof SORTS;

export type ListingFilters = {
  categoryIds?: string[];
  sellerId?: string;
  q?: string;
  metals?: MetalType[];
  gemstones?: Gemstone[];
  labs?: CertificateLab[];
  regions?: ShippingRegion[];
  conditions?: ProductCondition[];
  price?: { min?: number; max?: number };
  carat?: { min?: number; max?: number };
  inStock?: boolean;
  offers?: boolean;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
};

function orderFor(sort: SortKey = "featured"): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ publishedAt: "desc" }];
    case "price-asc":
      return [{ normalizedPriceUsd: "asc" }];
    case "price-desc":
      return [{ normalizedPriceUsd: "desc" }];
    case "rating":
      return [{ ratingAverage: "desc" }, { ratingCount: "desc" }];
    case "popular":
      return [{ salesCount: "desc" }, { viewCount: "desc" }];
    default:
      return [{ isFeatured: "desc" }, { featuredRank: { sort: "asc", nulls: "last" } }, { ratingCount: "desc" }, { publishedAt: "desc" }];
  }
}

export function buildListingWhere(f: ListingFilters, ctx: PriceContext): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [publicProductWhere];
  if (f.categoryIds?.length) and.push({ categoryId: { in: f.categoryIds } });
  if (f.sellerId) and.push({ sellerId: f.sellerId });
  if (f.q) {
    const q = f.q.trim();
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { shortDescription: { contains: q, mode: "insensitive" } },
        { tags: { has: q.toLowerCase() } },
        { era: { contains: q, mode: "insensitive" } },
        { seller: { storeName: { contains: q, mode: "insensitive" } } },
        { category: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  // A listing matches a metal if *any* of its active SKUs is offered in it.
  if (f.metals?.length) and.push({ variants: { some: { isActive: true, metalType: { in: f.metals } } } });
  if (f.gemstones?.length) {
    and.push({ OR: [{ primaryGemstone: { in: f.gemstones } }, { variants: { some: { isActive: true, gemstone: { in: f.gemstones } } } }] });
  }
  if (f.labs?.length) and.push({ certificationLabs: { hasSome: f.labs } });
  if (f.regions?.length) and.push({ shipsTo: { hasSome: f.regions } });
  if (f.conditions?.length) and.push({ condition: { in: f.conditions } });
  if (f.inStock) and.push({ inStock: true });
  if (f.offers) and.push({ acceptsOffers: true });
  if (f.carat?.min !== undefined || f.carat?.max !== undefined) {
    and.push({ totalCaratWeight: { gte: f.carat.min, lte: f.carat.max } });
  }
  if (f.price?.min !== undefined || f.price?.max !== undefined) {
    // Prices are entered in the shopper's currency; filter on the USD index.
    const toUsd = (major: number) => convertMinor(toMinor(major, ctx.currency), ctx.currency, "USD", ctx.rates, "exact");
    and.push({
      normalizedPriceUsd: {
        gte: f.price.min !== undefined ? toUsd(f.price.min) : undefined,
        lte: f.price.max !== undefined ? toUsd(f.price.max) : undefined,
      },
    });
  }
  return { AND: and };
}

export async function listProducts(f: ListingFilters, ctx: PriceContext) {
  const pageSize = f.pageSize ?? 24;
  const page = Math.max(1, f.page ?? 1);
  const where = buildListingWhere(f, ctx);
  const [rows, total] = await Promise.all([
    db.product.findMany({ where, orderBy: orderFor(f.sort), skip: (page - 1) * pageSize, take: pageSize, select: cardSelect }),
    db.product.count({ where }),
  ]);
  return { items: rows.map((r) => toCard(r, ctx)), total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Facet counts within a category (or the whole catalogue). */
export async function getListingFacets(categoryIds?: string[]) {
  const base: Prisma.ProductWhereInput = { AND: [publicProductWhere, ...(categoryIds?.length ? [{ categoryId: { in: categoryIds } }] : [])] };
  const [metals, gems, conditions, priceRange] = await Promise.all([
    db.productVariant.groupBy({ by: ["metalType"], where: { isActive: true, product: base }, _count: { productId: true } }),
    db.product.groupBy({ by: ["primaryGemstone"], where: base, _count: { _all: true } }),
    db.product.groupBy({ by: ["condition"], where: base, _count: { _all: true } }),
    db.product.aggregate({ where: base, _min: { normalizedPriceUsd: true }, _max: { normalizedPriceUsd: true } }),
  ]);
  return {
    metals: metals.map((m) => ({ value: m.metalType, count: m._count.productId })),
    gemstones: gems.filter((g) => g.primaryGemstone !== "NONE").map((g) => ({ value: g.primaryGemstone, count: g._count._all })),
    conditions: conditions.map((c) => ({ value: c.condition, count: c._count._all })),
    priceUsd: { min: num(priceRange._min.normalizedPriceUsd), max: num(priceRange._max.normalizedPriceUsd) },
  };
}

// ── Homepage ──────────────────────────────────────────────────────────────────

export async function getFeaturedProducts(ctx: PriceContext, take = 6) {
  const rows = await db.product.findMany({
    where: { ...publicProductWhere, isFeatured: true },
    orderBy: [{ featuredRank: { sort: "asc", nulls: "last" } }],
    take,
    select: cardSelect,
  });
  return rows.map((r) => toCard(r, ctx));
}

/** Most-viewed listings over the last two weeks, blended with sales. */
export async function getTrendingProducts(ctx: PriceContext, take = 8, excludeIds: string[] = []) {
  const since = new Date(Date.now() - 14 * 86_400_000);
  const views = await db.analyticsEvent.groupBy({
    by: ["productId"],
    where: { type: "PRODUCT_VIEW", createdAt: { gte: since }, productId: { not: null, notIn: excludeIds } },
    _count: { productId: true },
    orderBy: { _count: { productId: "desc" } },
    take: take * 3,
  });
  const ids = views.map((v) => v.productId!).filter(Boolean);
  const rows = await db.product.findMany({ where: { ...publicProductWhere, id: { in: ids } }, select: { ...cardSelect, salesCount: true } });
  const score = new Map(views.map((v) => [v.productId, v._count.productId]));
  return rows
    .sort((a, b) => (score.get(b.id) ?? 0) + b.salesCount * 6 - ((score.get(a.id) ?? 0) + a.salesCount * 6))
    .slice(0, take)
    .map((r) => toCard(r, ctx));
}

export async function getShowcaseSellers(take = 4) {
  const sellers = await db.sellerProfile.findMany({
    where: { verificationStatus: "APPROVED", isFeatured: true },
    orderBy: [{ ratingAverage: "desc" }, { salesCount: "desc" }],
    take,
    select: {
      id: true,
      slug: true,
      storeName: true,
      tagline: true,
      city: true,
      country: true,
      logoUrl: true,
      bannerUrl: true,
      foundedYear: true,
      isTopRated: true,
      ratingAverage: true,
      ratingCount: true,
      responseTimeMinutes: true,
      activeListingCount: true,
      products: {
        where: publicProductWhere,
        orderBy: [{ isFeatured: "desc" }, { ratingCount: "desc" }],
        take: 3,
        select: { slug: true, title: true, images: { orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } } },
      },
    },
  });
  return sellers;
}

export async function getMarketplaceStats() {
  const [jewelers, listings, certified, countries] = await Promise.all([
    db.sellerProfile.count({ where: { verificationStatus: "APPROVED" } }),
    db.product.count({ where: publicProductWhere }),
    db.product.count({ where: { ...publicProductWhere, certificationLabs: { isEmpty: false } } }),
    db.sellerProfile.groupBy({ by: ["country"], where: { verificationStatus: "APPROVED" } }),
  ]);
  return { jewelers, listings, certified, countries: countries.length };
}

export const getWishlistProductIds = cache(async (userId: string | undefined) => {
  if (!userId) return new Set<string>();
  const rows = await db.wishlistItem.findMany({ where: { userId }, select: { productId: true } });
  return new Set(rows.map((r) => r.productId));
});
