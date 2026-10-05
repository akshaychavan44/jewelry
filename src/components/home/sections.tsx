import { Gem, Ruler, Store } from "lucide-react";
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
    <section id="our-story" aria-labelledby="story-heading" className={storyStyles.story}>
      <AtelierVideo />
      <div className={storyStyles.copy}>
        <p className="eyebrow mb-4">The art of choosing well</p>
        <h2 id="story-heading" className="display-lg text-ink">Extraordinary pieces.<br />A more personal story.</h2>
        <div className="mt-6 space-y-4 text-[15.5px] leading-relaxed text-ink-soft">
          <p>Before a jeweler lists anything, we verify their business, their identity and where their payouts go. Before a listing goes live, we check its GIA, IGI or hallmark report against the stone it describes.</p>
          <p>When you buy, your payment is held until the piece arrives and you have had three days with it. Only then is the jeweler paid.</p>
        </div>
        <p className="mt-7 font-script text-[34px] leading-none text-gold-deep">Examined with care</p>
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
    </section>
  );
}

export function CategoryRow({ categories }: { categories: { slug: string; name: string; imageUrl: string | null; count: number }[] }) {
  return <CategoryCarousel categories={categories} />;
}

const VALUES = [
  {
    icon: Store,
    title: "INDEPENDENT ATELIERS",
    body: "Small houses and family workshops — never a factory floor.",
    image: "https://images.unsplash.com/photo-1531995811006-35cb42e1a022?auto=format&fit=crop&w=600&q=85",
    alt: "Jeweler working at an independent atelier bench with loupe",
  },
  {
    icon: Gem,
    title: "OFTEN ONE OF A KIND",
    body: "Antique, bespoke and single-stone pieces you won't see twice.",
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=85",
    alt: "Unique blue sapphire and diamond halo ring on travertine stone",
  },
  {
    icon: Ruler,
    title: "MADE TO YOUR MEASURE",
    body: "Sized, engraved and adjusted by the jeweler who made it.",
    image: "https://images.unsplash.com/photo-1628926379972-9843ad139a8c?auto=format&fit=crop&w=600&q=85",
    alt: "Craftsman hand holding caliper measuring engraved gold ring band",
  },
];

export function ValueStrip() {
  return (
    <section className="bg-[#FAF7F2] py-10 md:py-14">
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 lg:px-14">
        {/* 3 Value Cards fitting screen width */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6 lg:gap-8">
          {VALUES.map(({ icon: Icon, title, body, image, alt }) => (
            <div
              key={title}
              className="group flex items-center gap-4.5 sm:gap-5 lg:gap-6 rounded-[22px] md:rounded-[26px] border border-[#ede3d2]/90 bg-[#fdfbf7] p-4 sm:p-5 lg:p-6 shadow-[0_8px_28px_-10px_rgba(47,44,40,0.06)] transition-all duration-300 hover:border-gold/45 hover:shadow-[0_16px_36px_-10px_rgba(168,134,79,0.14)]"
            >
              <div className="relative size-[100px] sm:size-[115px] md:size-[125px] lg:size-[140px] shrink-0 overflow-hidden rounded-[16px] md:rounded-[20px] bg-sand">
                <Image
                  src={image}
                  alt={alt}
                  fill
                  sizes="(min-width: 1280px) 140px, (min-width: 768px) 125px, 100px"
                  className="object-cover transition-transform duration-500 ease-silk group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col justify-center min-w-0 pr-1">
                <Icon className="size-6 text-[#b58f55] stroke-[1.4] sm:size-7 lg:size-8" aria-hidden />
                <p className="caps mt-2.5 text-[12px] sm:text-[12.5px] lg:text-[13px] font-semibold tracking-wider text-ink">
                  {title}
                </p>
                <p className="mt-1.5 text-[13px] sm:text-[13.5px] lg:text-[14px] leading-relaxed text-ink/80">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SellerShowcase({ sellers }: { sellers: Awaited<ReturnType<typeof getShowcaseSellers>> }) {
  return (
    <section className="shell py-20 md:py-28" aria-labelledby="jewelers-heading">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Certified sellers</p>
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

export function CustomOrderBand() {
  return (
    <section className="bg-greige">
      <div className="shell grid items-center gap-10 py-16 md:grid-cols-[1fr_1.35fr] md:py-20">
        <div className="max-w-md">
          <p className="eyebrow mb-4">Bespoke</p>
          <h2 className="display-lg text-ink">Imagined by you.<br />Made just for you.</h2>
          <p className="mt-5 text-[15.5px] leading-relaxed text-ink-soft">
            Describe the piece you have in mind — a remade heirloom, a stone you already own, a bridal set for a date that matters. Jewelers who take commissions will send you quotes.
          </p>
          <Link href="/custom-orders" className={cn(buttonVariants({ size: "lg" }), "mt-8")}>
            Request a custom piece
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {["/media/necklaces.jpg", "/media/loupe-hero.jpg", "/media/bridal.jpg"].map((src, i) => (
            <div key={src} className={cn("relative overflow-hidden bg-sand", i === 1 ? "aspect-[3/4.4] md:-mt-6" : "aspect-[3/4]")}>
              <Image src={src} alt="" fill sizes="(min-width: 768px) 18vw, 33vw" className="object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function KindWords() {
  return <TestimonialsCarousel />;
}
