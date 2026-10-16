import { isListedJeweler, listedJewelerWhere } from "@/lib/jeweler-listing";
import "server-only";

import type { DbQueryTypes } from "@/server/db/query-types";
import { db } from "@/server/db";
import { cardSelect, publicProductWhere, toCard } from "./catalog";
import type { PriceContext } from "./currency";
import { getDirectorySettings, getPausedSellerIds } from "./jeweler-directory";
import { nearestDistance, type Coordinates } from "@/lib/jeweler-location";

export const DIRECTORY_SORTS = {
  rating: "Highest rated",
  reviews: "Most reviewed",
  newest: "Newest on Jewelrex",
  name: "A–Z",
} as const;
export type DirectorySort = keyof typeof DIRECTORY_SORTS;

export async function listJewelers(opts: { q?: string; country?: string; city?: string; specialty?: string; near?: Coordinates; radiusKm?: number; sort?: DirectorySort; category?: string }) {
  let categorySellerIds: string[] | undefined;
  if (opts.category && opts.category !== "custom-orders") {
    const category = await db.category.findUnique({
      where: { slug: opts.category },
      select: { id: true, children: { select: { id: true } } },
    });
    const products = category ? await db.product.findMany({
      where: { ...(await publicProductWhere()), categoryId: { in: [category.id, ...category.children.map((child) => child.id)] } },
      select: { sellerId: true },
    }) : [];
    categorySellerIds = [...new Set(products.map((product) => product.sellerId))];
  }
  const where: DbQueryTypes.SellerProfileWhereInput = {
    ...listedJewelerWhere,
    id: { notIn: await getPausedSellerIds() },
    ...(opts.country ? { country: opts.country } : {}),
    ...(opts.city ? { city: { equals: opts.city, mode: "insensitive" } } : {}),
    ...(opts.specialty ? { specialties: { has: opts.specialty } } : {}),
    ...(opts.category === "custom-orders"
      ? { acceptsCustomOrders: true }
      : categorySellerIds
        ? { id: { in: categorySellerIds, notIn: await getPausedSellerIds() } }
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
  const orderBy: DbQueryTypes.SellerProfileOrderByWithRelationInput[] =
    opts.sort === "reviews"
      ? [{ ratingCount: "desc" }]
      : opts.sort === "newest"
        ? [{ submittedAt: "desc" }, { createdAt: "desc" }]
        : opts.sort === "name"
          ? [{ storeName: "asc" }]
          : [{ isTopRated: "desc" }, { ratingAverage: "desc" }, { ratingCount: "desc" }];

  const [sellers, countries, filterOptions] = await Promise.all([
    db.sellerProfile.findMany({
      where,
      orderBy,
      select: {
        id: true,
        slug: true,
        verificationStatus: true,
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
        locations: { select: { city: true, appointmentOnly: true, latitude: true, longitude: true } },
      },
    }),
    db.sellerProfile.groupBy({ by: ["country"], where: { ...listedJewelerWhere, id: { notIn: await getPausedSellerIds() } }, _count: { _all: true } }),
    db.sellerProfile.findMany({ where: { ...listedJewelerWhere, id: { notIn: await getPausedSellerIds() }, ...(opts.country ? { country: opts.country } : {}) }, select: { city: true, specialties: true } }),
  ]);
  const located = sellers.map(seller => ({ ...seller, distanceKm: opts.near ? nearestDistance(opts.near, seller.locations) : null }))
    .filter(seller => !opts.near || (seller.distanceKm !== null && seller.distanceKm <= (opts.radiusKm ?? 50)));
  if (opts.near) located.sort((a, b) => a.distanceKm! - b.distanceKm!);
  // The database adapter applies nested `take` across all parents. Fetch each
  // store's preview separately so every card receives its own four pieces.
  const directorySellers = await Promise.all(located.map(async (seller) => ({
    ...seller,
    activeListingCount: await db.product.count({ where: { ...(await publicProductWhere()), sellerId: seller.id } }),
    products: await db.product.findMany({
      where: { ...(await publicProductWhere()), sellerId: seller.id },
      orderBy: [{ isFeatured: "desc" }, { ratingCount: "desc" }],
      take: 4,
      select: { slug: true, title: true, images: { orderBy: { position: "asc" }, select: { url: true } } },
    }),
  })));
  return { sellers: directorySellers, countries: countries.map((c) => ({ code: c.country, count: c._count._all })), cities: [...new Set(filterOptions.map(s => s.city).filter((city): city is string => !!city))].sort(), specialties: [...new Set(filterOptions.flatMap(s => s.specialties))].sort() };
}

export async function getStorefront(slug: string, ctx: PriceContext, categorySlug?: string) {
  const seller = await db.sellerProfile.findUnique({
    where: { slug },
    include: {
      locations: { orderBy: { id: "asc" } },
      shippingRates: { where: { isActive: true }, select: { zone: true } },
      returnAddress: true,
    },
  });
  if (!seller || !isListedJeweler(seller.verificationStatus)) return null;
  if ((await getDirectorySettings(seller.id)).isPaused) return null;

  const categoryFilter = categorySlug ? { category: { OR: [{ slug: categorySlug }, { parent: { slug: categorySlug } }] } } : {};
  const [listings, sold, reviews, categories] = await Promise.all([
    db.product.findMany({
      where: { ...(await publicProductWhere("profile")), sellerId: seller.id, ...categoryFilter },
      orderBy: [{ isFeatured: "desc" }, { featuredRank: { sort: "asc", nulls: "last" } }, { publishedAt: "desc" }],
      select: cardSelect,
    }),
    db.product.findMany({ where: { ...(await publicProductWhere("profile")), sellerId: seller.id, status: "SOLD" }, orderBy: { updatedAt: "desc" }, take: 4, select: cardSelect }),
    db.review.findMany({
      where: { sellerId: seller.id, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { author: { select: { name: true, country: true } }, product: { select: { title: true, slug: true } } },
    }),
    db.category.findMany({
      where: { products: { some: { ...(await publicProductWhere("profile")), sellerId: seller.id } } },
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
