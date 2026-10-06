import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { cardSelect, publicProductWhere, toCard } from "./catalog";
import type { PriceContext } from "./currency";

export const DIRECTORY_SORTS = {
  rating: "Highest rated",
  reviews: "Most reviewed",
  newest: "Newest on Loupe",
  name: "A–Z",
} as const;
export type DirectorySort = keyof typeof DIRECTORY_SORTS;

export async function listJewelers(opts: { q?: string; country?: string; sort?: DirectorySort; category?: string }) {
  let categorySellerIds: string[] | undefined;
  if (opts.category && opts.category !== "custom-orders") {
    const category = await db.category.findUnique({
      where: { slug: opts.category },
      select: { id: true, children: { select: { id: true } } },
    });
    const products = category ? await db.product.findMany({
      where: { status: "ACTIVE", deletedAt: null, categoryId: { in: [category.id, ...category.children.map((child) => child.id)] } },
      select: { sellerId: true },
    }) : [];
    categorySellerIds = [...new Set(products.map((product) => product.sellerId))];
  }
  const where: Prisma.SellerProfileWhereInput = {
    verificationStatus: "APPROVED",
    ...(opts.country ? { country: opts.country } : {}),
    ...(opts.category === "custom-orders"
      ? { acceptsCustomOrders: true }
      : categorySellerIds
        ? { id: { in: categorySellerIds } }
        : {}),
    ...(opts.q
      ? {
          OR: [
            { storeName: { contains: opts.q, mode: "insensitive" } },
            { tagline: { contains: opts.q, mode: "insensitive" } },
            { city: { contains: opts.q, mode: "insensitive" } },
            { specialties: { has: opts.q } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.SellerProfileOrderByWithRelationInput[] =
    opts.sort === "reviews"
      ? [{ ratingCount: "desc" }]
      : opts.sort === "newest"
        ? [{ approvedAt: "desc" }]
        : opts.sort === "name"
          ? [{ storeName: "asc" }]
          : [{ isTopRated: "desc" }, { ratingAverage: "desc" }, { ratingCount: "desc" }];

  const [sellers, countries] = await Promise.all([
    db.sellerProfile.findMany({
      where,
      orderBy,
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
        specialties: true,
        isTopRated: true,
        ratingAverage: true,
        ratingCount: true,
        salesCount: true,
        responseTimeMinutes: true,
        activeListingCount: true,
        locations: { select: { city: true, appointmentOnly: true } },
      },
    }),
    db.sellerProfile.groupBy({ by: ["country"], where: { verificationStatus: "APPROVED" }, _count: { _all: true } }),
  ]);
  // The database adapter applies nested `take` across all parents. Fetch each
  // store's preview separately so every card receives its own four pieces.
  const directorySellers = await Promise.all(sellers.map(async (seller) => ({
    ...seller,
    products: await db.product.findMany({
      where: { sellerId: seller.id, status: "ACTIVE", deletedAt: null },
      orderBy: [{ isFeatured: "desc" }, { ratingCount: "desc" }],
      take: 4,
      select: { slug: true, title: true, images: { orderBy: { position: "asc" }, select: { url: true } } },
    }),
  })));
  return { sellers: directorySellers, countries: countries.map((c) => ({ code: c.country, count: c._count._all })) };
}

export async function getStorefront(slug: string, ctx: PriceContext, categorySlug?: string) {
  const seller = await db.sellerProfile.findUnique({
    where: { slug },
    include: {
      locations: true,
      shippingRates: { where: { isActive: true }, select: { zone: true } },
    },
  });
  if (!seller || seller.verificationStatus !== "APPROVED") return null;

  const categoryFilter = categorySlug ? { category: { OR: [{ slug: categorySlug }, { parent: { slug: categorySlug } }] } } : {};
  const [listings, sold, reviews, categories] = await Promise.all([
    db.product.findMany({
      where: { ...publicProductWhere, sellerId: seller.id, ...categoryFilter },
      orderBy: [{ isFeatured: "desc" }, { featuredRank: { sort: "asc", nulls: "last" } }, { publishedAt: "desc" }],
      select: cardSelect,
    }),
    db.product.findMany({ where: { sellerId: seller.id, status: "SOLD", deletedAt: null }, orderBy: { updatedAt: "desc" }, take: 4, select: cardSelect }),
    db.review.findMany({
      where: { sellerId: seller.id, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { author: { select: { name: true, country: true } }, product: { select: { title: true, slug: true } } },
    }),
    db.category.findMany({
      where: { products: { some: { ...publicProductWhere, sellerId: seller.id } } },
      select: { slug: true, name: true, parent: { select: { slug: true, name: true } } },
    }),
  ]);

  // Collapse sub-categories into their top-level parents for the filter chips.
  const topLevel = new Map<string, string>();
  for (const c of categories) topLevel.set(c.parent?.slug ?? c.slug, c.parent?.name ?? c.name);

  return {
    seller,
    listings: listings.map((p) => toCard(p, ctx)),
    sold: sold.map((p) => toCard(p, ctx)),
    reviews,
    categories: [...topLevel.entries()].map(([slug, name]) => ({ slug, name })),
  };
}
