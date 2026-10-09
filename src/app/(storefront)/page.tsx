import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CollectionInvitation } from "@/components/home/landing-collections";
import { StaticHero } from "@/components/home/static-hero";
import { LandingExperience } from "@/components/home/landing-experience";
import { CollectionShowcase } from "@/components/home/collection-showcase";
import styles from "@/components/home/landing.module.css";
import { ProductGrid } from "@/components/catalog/product-card";
import {
  CategoryRow,
  CustomOrderBand,
  KindWords,
  StorySection,
  ValueStrip,
} from "@/components/home/sections";
import { buttonVariants } from "@/components/ui/button";
import { mainCategories } from "@/config/site";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import {
  getCategoryTree,
  getFeaturedProducts,
  getMarketplaceStats,
  getTrendingProducts,
  getWishlistProductIds,
  publicProductWhere,
} from "@/server/services/catalog";
import { getPriceContext } from "@/server/services/currency";

export default async function HomePage() {
  const [ctx, user] = await Promise.all([getPriceContext(), getCurrentUser()]);
  const [featured, stats, tree, saved, counts] = await Promise.all([
    getFeaturedProducts(ctx, 6),
    getMarketplaceStats(),
    getCategoryTree(),
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

  return (
    <LandingExperience>
      <StaticHero />
      <CollectionShowcase />
      <StorySection stats={stats} />
      <CategoryRow categories={categories} />

      <section className={`${styles.section} ${styles.featured}`} aria-labelledby="featured-heading">
        <div className={`${styles.sectionHeading} ${styles.featuredHeading}`}>
          <div><p className="eyebrow">Considered, collected, cherished</p><h2 id="featured-heading">Pieces to fall for.</h2></div>
          <Link href="/shop">Explore all jewelry <ArrowUpRight size={16} aria-hidden /></Link>
        </div>
        <CollectionInvitation />
        <div className={styles.collectionAction}>
          <Link href="/shop" className={`${buttonVariants({ size: "lg" })} ${styles.collectionButton}`}>
            View full collection
          </Link>
        </div>
      </section>

      <ValueStrip />

      {trending.length > 0 && <section className="border-t border-line bg-porcelain/50 py-20 md:py-24" aria-labelledby="trending-heading">
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
      </section>}

      <CustomOrderBand />
      <KindWords />
    </LandingExperience>
  );
}
