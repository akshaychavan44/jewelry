import Image from "next/image";
import Link from "next/link";
import { CinematicHero } from "@/components/home/cinematic-hero";
import { TopRated, VerifiedJeweler } from "@/components/brand/trust";
import { CategoryCarousel } from "@/components/home/category-carousel";
import { buttonVariants } from "@/components/ui/button";
import { Monogram, Stars } from "@/components/ui/display";
import { siteConfig } from "@/config/site";
import { TestimonialsCarousel } from "./testimonials-carousel";
import { AtelierVideo } from "./atelier-video";
import { StoryEntrance } from "./story-entrance";
import storyStyles from "./story.module.css";
import { formatResponseTime } from "@/lib/format";
import { countryName } from "@/lib/regions";
import { cn } from "@/lib/utils";
import type { getShowcaseSellers } from "@/server/services/catalog";

export function Hero({ stats }: { stats: { jewelers: number; certified: number } }) {
  return <CinematicHero jewelers={stats.jewelers} />;
}

export function StorySection({ stats }: { stats: { jewelers: number; certified: number; countries: number } }) {
  return (
    <StoryEntrance>
      <AtelierVideo />
      <div className={storyStyles.copy}>
        <p className="eyebrow mb-4">The art of choosing well</p>
        <h2 id="story-heading" className="display-lg text-ink">Extraordinary pieces.<br />A more personal story.</h2>
        <div className="mt-6 space-y-4 text-[15.5px] leading-relaxed text-ink-soft">
          <p>Loupe connects discerning collectors with verified independent jewelers and master ateliers. We verify each jeweler&rsquo;s business registration and identity so you can discover authentic talent with complete peace of mind.</p>
          <p>When you discover a piece or commission bespoke work, you connect with the jeweler directly. Discuss specifications, arrange viewings, and complete your purchase directly with the maker.</p>
        </div>
        <p className="mt-7 font-script text-[34px] leading-none text-gold-deep">Crafted with care</p>
        {(stats.jewelers > 0 || stats.certified > 0) && <dl className="mt-9 grid grid-cols-3 gap-4 border-t border-line pt-6">
          {[
            [stats.jewelers, "verified jewelers"],
            [stats.certified, "certified listings"],
            [stats.countries, "countries of origin"],
          ].map(([value, label]) => (
            <div key={label}>
              <dt className="sr-only">{label}</dt>
              <dd>
                <span className="block font-display text-[30px] leading-none text-ink">{value}</span>
                <span className="mt-1.5 block text-[12.5px] text-muted">{label}</span>
              </dd>
            </div>
          ))}
        </dl>}
        <Link href="/jewelers" className="link-quiet mt-8 inline-flex min-h-11 items-center text-sm">Meet the independent jewelers →</Link>
      </div>
    </StoryEntrance>
  );
}

export function CategoryRow({ categories }: { categories: { slug: string; name: string; imageUrl: string | null; count: number }[] }) {
  return <CategoryCarousel categories={categories} />;
}

export { ValueStrip } from "./value-strip";

export function SellerShowcase({ sellers }: { sellers: Awaited<ReturnType<typeof getShowcaseSellers>> }) {
  return (
    <section className="shell pt-8 md:pt-12 pb-16 md:pb-24" aria-labelledby="jewelers-heading">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Independent Ateliers</p>
          <h2 id="jewelers-heading" className="display-lg text-ink">
            Jewelers we&rsquo;re proud to host
          </h2>
        </div>
        <Link href="/jewelers" className="link-quiet text-[14px] text-ink">
          All jewelers
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {sellers.map((s) => (
          <Link key={s.id} href={`/jewelers/${s.slug}`} className="group flex flex-col border border-line bg-porcelain transition-shadow hover:shadow-soft">
            <div className="relative aspect-[16/10] overflow-hidden bg-sand">
              {s.bannerUrl && <Image src={s.bannerUrl} alt="" fill sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 100vw" className="object-cover transition-transform duration-700 ease-silk group-hover:scale-[1.03]" />}
            </div>
            <div className="relative flex flex-1 flex-col px-5 pt-9 pb-5">
              <Monogram name={s.storeName} src={s.logoUrl} size={52} className="absolute -top-[26px] left-5 bg-ivory" />
              <h3 className="font-display text-[21px] leading-tight text-ink">{s.storeName}</h3>
              <p className="mt-1 text-[13px] text-muted">
                {s.city}, {countryName(s.country)} · Est. {s.foundedYear}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                <VerifiedJeweler />
                {s.isTopRated && <TopRated />}
              </div>
              <div className="mt-3 flex items-center gap-2 text-[13px] text-ink-soft">
                {s.ratingCount > 0 ? (
                  <>
                    <Stars rating={s.ratingAverage} size={12} /> {s.ratingAverage.toFixed(1)} ({s.ratingCount})
                  </>
                ) : (
                  <span className="text-muted">New to {siteConfig.name}</span>
                )}
              </div>
              <p className="mt-1 text-[13px] text-muted">Replies {formatResponseTime(s.responseTimeMinutes)}</p>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {s.products.map((p) => (
                  <div key={p.slug} className="relative aspect-square overflow-hidden bg-sand">
                    {p.images[0] && <Image src={p.images[0].url} alt={p.images[0].alt ?? p.title} fill sizes="90px" className="object-cover" />}
                  </div>
                ))}
              </div>
              <p className="caps mt-5 text-[10.5px] text-ink-soft group-hover:text-ink">{s.activeListingCount} pieces · Visit the atelier →</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function StyledGallery() {
  return (
    <section className="py-20 md:py-24" aria-labelledby="styled-heading">
      <h2 id="styled-heading" className="display-md mb-8 text-center text-ink">
        Inside the Loupe world.
      </h2>
      <div className="shell grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
        {["/media/necklaces.jpg", "/media/bridal.jpg", "/media/atelier.jpg"].map((src) => (
          <div key={src} className="relative aspect-[5/4] overflow-hidden bg-sand">
            <Image src={src} alt="" fill sizes="(min-width: 640px) 30vw, 100vw" className="object-cover transition-transform duration-700 ease-silk hover:scale-[1.04]" />
          </div>
        ))}
      </div>
      <p className="caps mt-7 text-center text-[10.5px] text-ink-soft">
        <Link href="/shop" className="underline underline-offset-4">Discover your next piece →</Link>
      </p>
    </section>
  );
}

export { CustomOrderBand } from "./custom-order-band";

export function KindWords() {
  return <TestimonialsCarousel />;
}
