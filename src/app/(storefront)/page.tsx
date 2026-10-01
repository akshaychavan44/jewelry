import Link from "next/link";
import { ProductGrid } from "@/components/catalog/product-card";
import { ClarityGuide, GoldPurityChart } from "@/components/home/education";
import {
  CategoryRow,
  CustomOrderBand,
  Hero,
  KindWords,
  SellerShowcase,
  StorySection,
  StyledGallery,
  ValueStrip,
} from "@/components/home/sections";
import { buttonVariants } from "@/components/ui/button";
import { mainCategories } from "@/config/site";
import { formatDate } from "@/lib/format";
import { convertMinor } from "@/lib/money";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import {
  getCategoryTree,
  getFeaturedProducts,
  getMarketplaceStats,
  getShowcaseSellers,
  getTrendingProducts,
  getWishlistProductIds,
  publicProductWhere,
} from "@/server/services/catalog";
import { getPriceContext } from "@/server/services/currency";
import { getSpotQuotes } from "@/server/services/market";

export default async function HomePage() {
  const [ctx, user] = await Promise.all([getPriceContext(), getCurrentUser()]);
  const [featured, stats, sellers, tree, quotes, saved, counts] = await Promise.all([
    getFeaturedProducts(ctx, 6),
    getMarketplaceStats(),
    getShowcaseSellers(4),
    getCategoryTree(),
    getSpotQuotes(),
    getWishlistProductIds(user?.id),
    db.product.groupBy({ by: ["categoryId"], where: publicProductWhere, _count: { _all: true } }),
  ]);
  const trending = await getTrendingProducts(ctx, 8, featured.map((p) => p.id));

  const countFor = (slug: string) => {
    const node = tree.find((t) => t.slug === slug);
    const ids = new Set([node?.id, ...(node?.children.map((c) => c.id) ?? [])]);
    return counts.filter((c) => ids.has(c.categoryId)).reduce((n, c) => n + c._count._all, 0);
  };
  const categories = mainCategories.map((c) => ({ slug: c.slug, name: c.name, imageUrl: tree.find((t) => t.slug === c.slug)?.imageUrl ?? null, count: countFor(c.slug) }));

  const gold = quotes.find((q) => q.metal === "GOLD");
  const pureGoldPerGram = convertMinor((gold?.usdPerGram ?? 0) * 100, "USD", ctx.currency, ctx.rates, "exact");

  return (
    <>
      <Hero stats={stats} />
      <StorySection stats={stats} />
      <CategoryRow categories={categories} />

      <section className="shell pb-20 md:pb-24" aria-labelledby="featured-heading">
        <h2 id="featured-heading" className="caps mb-10 text-center text-ink">
          Featured pieces
        </h2>
        <ProductGrid products={featured} savedIds={saved} columns="six" />
        <div className="mt-12 flex justify-center">
          <Link href="/shop" className={buttonVariants({ size: "lg" })}>
            View full collection
          </Link>
        </div>
      </section>

      <ValueStrip />
      <SellerShowcase sellers={sellers} />

      <section className="border-t border-line bg-porcelain/50 py-20 md:py-24" aria-labelledby="trending-heading">
        <div className="shell">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-3">Most viewed this fortnight</p>
              <h2 id="trending-heading" className="display-lg text-ink">
                Trending now
              </h2>
            </div>
            <Link href="/shop?sort=popular" className="link-quiet text-[14px] text-ink">
              See what&rsquo;s popular
            </Link>
          </div>
          <ProductGrid products={trending} savedIds={saved} />
        </div>
      </section>

      <section className="shell py-20 md:py-28" aria-labelledby="learn-heading">
        <div className="mb-10 max-w-2xl">
          <p className="eyebrow mb-3">Buy with knowledge</p>
          <h2 id="learn-heading" className="display-lg text-ink">
            Know what you&rsquo;re looking at
          </h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <GoldPurityChart pureGoldPerGram={pureGoldPerGram} currency={ctx.currency} updatedLabel={gold ? `Spot · ${formatDate(gold.fetchedAt, "dayMonth")}` : ""} />
          <ClarityGuide />
        </div>
      </section>

      <StyledGallery />
      <CustomOrderBand />
      <KindWords />
    </>
  );
}
