import { Gem, Ruler, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { LoupeImage } from "@/components/brand/loupe-image";
import { TopRated, VerifiedJeweler } from "@/components/brand/trust";
import { buttonVariants } from "@/components/ui/button";
import { Monogram, Stars } from "@/components/ui/display";
import { imagery, siteConfig, testimonials } from "@/config/site";
import { formatResponseTime } from "@/lib/format";
import { countryName } from "@/lib/regions";
import { cn } from "@/lib/utils";
import type { getShowcaseSellers } from "@/server/services/catalog";

export function Hero({ stats }: { stats: { jewelers: number; certified: number } }) {
  return (
    <section className="relative">
      <LoupeImage
        src={imagery.hero}
        alt="A diamond ring resting in pale sand beside dried flowers"
        priority
        focus={{ x: 0.648, y: 0.5 }}
        zoom={2.6}
        lensSize={210}
        caption="Under the loupe"
        className="h-[560px] md:h-[640px]"
        imageClassName="object-[72%_center] md:object-center"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ivory/90 via-ivory/65 via-45% to-ivory/10 md:from-ivory/95 md:via-ivory/55 md:via-30% md:to-transparent md:to-58%" />
        <div className="shell pointer-events-none relative flex h-full items-center">
          <div className="pointer-events-auto max-w-[34rem] animate-fade-up">
            <p className="eyebrow mb-5 text-ink-soft">{siteConfig.descriptor}</p>
            <h1 className="display-xl text-ink">
              Fine jewelry,
              <br />
              examined before
              <br />
              it reaches you
            </h1>
            <p className="mt-6 max-w-[26rem] text-[16px] leading-relaxed text-ink-soft">
              Rings, heirlooms and high jewelry from {stats.jewelers} verified independent jewelers — every report and hallmark checked against the piece it describes.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/shop" className={buttonVariants({ size: "lg" })}>
                Shop jewelry
              </Link>
              <Link href="/jewelers" className={buttonVariants({ size: "lg", variant: "outline" })}>
                Meet the jewelers
              </Link>
            </div>
          </div>
        </div>
      </LoupeImage>
    </section>
  );
}

export function StorySection({ stats }: { stats: { jewelers: number; certified: number; countries: number } }) {
  return (
    <section className="shell grid items-center gap-10 py-20 md:grid-cols-2 md:gap-16 md:py-28">
      <div className="relative aspect-[5/4] overflow-hidden bg-sand">
        <Image src={imagery.loupeStory} alt="A jeweler examining a ring through an eye loupe at the bench" fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" />
      </div>
      <div className="max-w-lg">
        <p className="eyebrow mb-4">How {siteConfig.name} works</p>
        <h2 className="display-lg text-ink">Every piece examined, every jeweler known</h2>
        <div className="mt-6 space-y-4 text-[15.5px] leading-relaxed text-ink-soft">
          <p>Before a jeweler lists anything, we verify their business, their identity and where their payouts go. Before a listing goes live, we check its GIA, IGI or hallmark report against the stone it describes.</p>
          <p>When you buy, your payment is held until the piece arrives and you have had three days with it. Only then is the jeweler paid.</p>
        </div>
        <p className="mt-7 font-script text-[34px] leading-none text-gold-deep">Examined with care</p>
        <dl className="mt-9 grid grid-cols-3 gap-4 border-t border-line pt-6">
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
        </dl>
      </div>
    </section>
  );
}

export function CategoryRow({ categories }: { categories: { slug: string; name: string; imageUrl: string | null; count: number }[] }) {
  return (
    <section className="shell pb-20 md:pb-24" aria-labelledby="shop-by-category">
      <h2 id="shop-by-category" className="caps mb-8 text-center text-ink">
        Shop by category
      </h2>
      <ul className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-6 md:gap-5 md:overflow-visible md:px-0">
        {categories.map((c) => (
          <li key={c.slug} className="w-[42%] shrink-0 snap-start md:w-auto">
            <Link href={`/shop/${c.slug}`} className="group block text-center">
              <div className="relative aspect-[3/4] overflow-hidden rounded-t-full bg-sand">
                {c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="(min-width: 768px) 15vw, 42vw" className="object-cover transition-transform duration-700 ease-silk group-hover:scale-[1.04]" />}
              </div>
              <p className="mt-4 font-display text-[19px] text-ink">{c.name}</p>
              <p className="text-[12.5px] text-muted">{c.count} pieces</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const VALUES = [
  { icon: Store, title: "Independent ateliers", body: "Small houses and family workshops — never a factory floor." },
  { icon: Gem, title: "Often one of a kind", body: "Antique, bespoke and single-stone pieces you won't see twice." },
  { icon: Ruler, title: "Made to your measure", body: "Sized, engraved and adjusted by the jeweler who made it." },
];

export function ValueStrip() {
  return (
    <section className="bg-parchment/70">
      <ul className="shell grid gap-8 py-12 md:grid-cols-3 md:divide-x md:divide-line-strong/60 md:py-14">
        {VALUES.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex items-center gap-5 md:justify-center md:px-8">
            <Icon className="size-9 shrink-0 text-ink-soft" strokeWidth={0.9} aria-hidden />
            <div>
              <p className="caps text-ink">{title}</p>
              <p className="mt-1 max-w-[15rem] text-[13.5px] leading-snug text-ink-soft">{body}</p>
            </div>
          </li>
        ))}
      </ul>
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
      <h2 id="styled-heading" className="caps mb-8 text-center text-ink">
        Worn by our collectors
      </h2>
      <div className="shell grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
        {imagery.styled.map((src, i) => (
          <div key={src} className={cn("relative aspect-square overflow-hidden bg-sand", i === 4 && "hidden md:block")}>
            <Image src={src} alt="" fill sizes="(min-width: 768px) 19vw, 50vw" className="object-cover transition-transform duration-700 ease-silk hover:scale-[1.04]" />
          </div>
        ))}
      </div>
      <p className="caps mt-7 text-center text-[10.5px] text-ink-soft">
        Share yours →{" "}
        <a href={siteConfig.social.instagram} className="underline underline-offset-4" target="_blank" rel="noreferrer">
          {siteConfig.instagramHandle}
        </a>
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
          <h2 className="display-lg text-ink">Looking for something only you will own?</h2>
          <p className="mt-5 text-[15.5px] leading-relaxed text-ink-soft">
            Describe the piece you have in mind — a remade heirloom, a stone you already own, a bridal set for a date that matters. Jewelers who take commissions will send you quotes.
          </p>
          <Link href="/custom-orders" className={cn(buttonVariants({ size: "lg" }), "mt-8")}>
            Request a custom piece
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {imagery.customOrder.map((src, i) => (
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
  return (
    <section className="shell py-20 md:py-24" aria-labelledby="kind-words">
      <h2 id="kind-words" className="caps mb-10 text-center text-ink">
        Kind words
      </h2>
      <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
        {testimonials.map((t) => (
          <figure key={t.name} className="flex flex-col items-center border border-line bg-porcelain px-7 py-8 text-center">
            <span className="font-display text-[34px] leading-none text-gold" aria-hidden>
              &ldquo;
            </span>
            <blockquote className="mt-2 flex-1 text-[14.5px] leading-relaxed text-ink-soft">{t.quote}</blockquote>
            <Stars rating={5} size={13} className="mt-5" />
            <figcaption className="mt-3">
              <span className="block text-[13.5px] font-medium text-ink">{t.name}</span>
              <span className="block text-[12.5px] text-muted">{t.detail}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
