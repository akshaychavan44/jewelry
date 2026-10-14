import "server-only";

import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { db } from "@/server/db";
import { testimonials } from "@/config/site";

export type TestimonialStory = {
  quote: string;
  name: string;
  detail: string;
  rating?: number;
};

/**
 * Fetches top 5-star published customer reviews from the database.
 * If fewer than 3 reviews exist, gracefully falls back to the curated editorial stories.
 */
export const getFeaturedStories = cache(async (): Promise<TestimonialStory[]> => {
  try {
    const reviews = await db.review.findMany({
      where: {
        status: "PUBLISHED",
        rating: 5,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        author: { select: { name: true } },
        product: { select: { title: true } },
        seller: { select: { storeName: true, city: true } },
      },
    });

    const valid = reviews.filter((r) => r.body && r.body.trim().length >= 25);

    if (valid.length >= 3) {
      return valid.map((r) => {
        let authorName = r.author?.name?.trim() || "Verified Buyer";
        const parts = authorName.split(/\s+/);
        if (parts.length > 1) {
          authorName = `${parts[0]} ${parts[parts.length - 1][0]}.`;
        }

        const piece = r.title || r.product?.title || "Fine Jewelry";
        const sellerParts = [r.seller?.storeName, r.seller?.city].filter(Boolean);
        const detail = sellerParts.length > 0 ? `${piece} · ${sellerParts.join(", ")}` : piece;

        return {
          quote: r.body.trim(),
          name: authorName,
          detail,
          rating: r.rating,
        };
      });
    }
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to fetch customer reviews for homepage:", error);
  }

  // Fallback to existing curated brand stories
  return testimonials.map((t) => ({
    quote: t.quote,
    name: t.name,
    detail: t.detail,
    rating: 5,
  }));
});
