import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { stylingLooks } from "@/config/styling";
import { Monogram } from "@/components/ui/display";
import { VerifiedJeweler } from "@/components/brand/trust";
import { countryName } from "@/lib/regions";
import { db } from "@/server/db";

export function StylingPreview() {
  return (
    <section aria-labelledby="styling-heading" className="border-t border-line pt-12 sm:pt-16">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow mb-3">The Loupe edit</p><h2 id="styling-heading" className="display-md text-ink">A piece for every part of your life.</h2></div>
        <Link href="/styling" className="link-quiet inline-flex min-h-11 items-center gap-3 text-[13px]">Explore styling <ArrowRight className="size-4" aria-hidden /></Link>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {stylingLooks.map((look) => (
          <Link key={look.slug} href={`/styling/${look.slug}`} className="overflow-hidden rounded-lg bg-porcelain focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
            <div className="relative aspect-[4/3] bg-sand"><Image src={look.image} alt={`${look.occasion} jewelry inspiration`} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" /></div>
            <div className="p-5 sm:p-6"><p className="eyebrow text-gold-deep">{look.occasion}</p><h3 className="mt-2 font-display text-[27px] leading-tight text-ink">{look.title}</h3><p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{look.description}</p><span className="mt-5 inline-flex items-center gap-3 text-[12px] font-medium text-gold-deep">Discover the edit <ArrowRight className="size-4" aria-hidden /></span></div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export async function ShopDiscovery() {
  const sellers = await db.sellerProfile.findMany({
    where: { verificationStatus: "APPROVED", isFeatured: true },
    orderBy: [{ ratingAverage: "desc" }, { storeName: "asc" }], take: 3,
    select: { id: true, slug: true, storeName: true, tagline: true, city: true, country: true, logoUrl: true, bannerUrl: true },
  });
  return (
    <div className="mt-16 space-y-16 sm:mt-20 sm:space-y-20">
      {sellers.length > 0 && <section aria-labelledby="makers-heading" className="border-t border-line pt-12 sm:pt-16">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-3">Behind every piece</p><h2 id="makers-heading" className="display-md text-ink">Meet your next jeweler.</h2></div><Link href="/jewelers" className="link-quiet inline-flex min-h-11 items-center gap-3 text-[13px]">All jewelers <ArrowRight className="size-4" aria-hidden /></Link></div>
        <div className="grid gap-6 md:grid-cols-3">{sellers.map((seller) => <Link key={seller.id} href={`/jewelers/${seller.slug}`} className="overflow-hidden rounded-lg border border-line bg-porcelain focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
          <div className="relative aspect-[16/9] bg-sand">{seller.bannerUrl ? <Image src={seller.bannerUrl} alt={`Inside ${seller.storeName}`} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" /> : <div className="flex h-full items-center justify-center"><Monogram name={seller.storeName} size={80} /></div>}</div>
          <div className="p-5 sm:p-6"><VerifiedJeweler /><h3 className="mt-3 font-display text-[27px] leading-tight text-ink">{seller.storeName}</h3><p className="mt-1 text-[12px] text-muted">{[seller.city, countryName(seller.country)].filter(Boolean).join(", ")}</p>{seller.tagline && <p className="mt-3 line-clamp-2 min-h-[3em] text-[14px] leading-relaxed text-ink-soft">{seller.tagline}</p>}<span className="mt-5 inline-flex items-center gap-3 text-[12px] font-medium text-gold-deep">Meet the jeweler <ArrowRight className="size-4" aria-hidden /></span></div>
        </Link>)}</div>
      </section>}
      <StylingPreview />
    </div>
  );
}
