import "server-only";
import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { db, type Tx } from "@/server/db";
import { getPausedSellerIds } from "./jeweler-directory";

export type Visibility = { productId: string; showOnProfile: boolean; showOnWebsite: boolean };
export const jewelryVisibility = cache(async () => db.$queryRaw<Visibility[]>`SELECT * FROM "JewelryVisibility"`);

export const discoveryWhere = cache(async (surface: "profile" | "website" | "either" = "website"): Promise<Prisma.ProductWhereInput> => {
  const [settings, paused] = await Promise.all([jewelryVisibility(), getPausedSellerIds()]);
  return visibilityWhere(surface, settings, paused);
});

export function visibilityWhere(surface: "profile" | "website" | "either", settings: Visibility[], paused: string[]): Prisma.ProductWhereInput {
  const hidden = settings.filter((s) => surface === "profile" ? !s.showOnProfile : surface === "website" ? !s.showOnWebsite : !s.showOnProfile && !s.showOnWebsite).map((s) => s.productId);
  // Keep restrictions inside AND so a caller's id/seller filter cannot override them.
  return { status: "ACTIVE", deletedAt: null, AND: [{ id: { notIn: hidden } }, { sellerId: { notIn: paused } }, { seller: { verificationStatus: "APPROVED" } }] };
}

export type JewelerReview = { id: string; sellerId: string; authorId: string; rating: number; body: string; sellerReply: string; reportedReason: string; status: string; createdAt: Date; updatedAt: Date; authorName: string; storeName: string; slug: string };
export async function jewelerReviews(sellerId: string) {
  return db.$queryRaw<JewelerReview[]>`SELECT r.*, u."name" AS "authorName", s."storeName", s."slug" FROM "JewelerReview" r JOIN "User" u ON u."id" = r."authorId" JOIN "SellerProfile" s ON s."id" = r."sellerId" WHERE r."sellerId" = ${sellerId} AND r."status" = 'PUBLISHED' ORDER BY r."createdAt" DESC`;
}
export async function myReviews(authorId: string) {
  return db.$queryRaw<JewelerReview[]>`SELECT r.*, u."name" AS "authorName", s."storeName", s."slug" FROM "JewelerReview" r JOIN "User" u ON u."id" = r."authorId" JOIN "SellerProfile" s ON s."id" = r."sellerId" WHERE r."authorId" = ${authorId} ORDER BY r."createdAt" DESC`;
}
export async function refreshJewelerRating(tx: Pick<Tx, "$executeRaw">, sellerId: string) {
  await tx.$executeRaw`UPDATE "SellerProfile" SET "ratingCount" = stats.n, "ratingAverage" = COALESCE(stats.avg, 0) FROM (SELECT COUNT(*)::integer AS n, AVG(rating) AS avg FROM (SELECT "rating" FROM "JewelerReview" WHERE "sellerId" = ${sellerId} AND "status" = 'PUBLISHED' UNION ALL SELECT "rating" FROM "Review" WHERE "sellerId" = ${sellerId} AND "status" = 'PUBLISHED') all_reviews) stats WHERE "id" = ${sellerId}`;
}
