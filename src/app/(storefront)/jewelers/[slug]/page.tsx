import { Clock, MapPin, Phone, RotateCcw, Truck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/catalog/product-card";
import { FollowStoreButton } from "@/components/catalog/save-buttons";
import { TopRated, VerifiedJeweler } from "@/components/brand/trust";
import { EmptyState, Monogram, Stars } from "@/components/ui/display";
import { formatDate, formatResponseTime } from "@/lib/format";
import { countryName, REGION_LABELS, regionForCountry } from "@/lib/regions";
import { cn, firstParam, pluralize, type SearchParams } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { track } from "@/server/services/analytics";
import { getWishlistProductIds } from "@/server/services/catalog";
import { getPriceContext } from "@/server/services/currency";
import { getStorefront } from "@/server/services/sellers";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const seller = await db.sellerProfile.findUnique({ where: { slug: (await params).slug }, select: { storeName: true, tagline: true, bannerUrl: true } });
  if (!seller) return {};
  return { title: seller.storeName, description: seller.tagline ?? undefined, openGraph: { images: seller.bannerUrl ? [seller.bannerUrl] : [] } };
}

export default async function StorefrontPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = firstParam((await searchParams).category);
  const [ctx, user] = await Promise.all([getPriceContext(), getCurrentUser()]);
  const data = await getStorefront(slug, ctx, category);
  if (!data) notFound();
  const { seller, listings, sold, reviews, categories } = data;
  const [saved, following] = await Promise.all([
    getWishlistProductIds(user?.id),
    user ? db.favoriteStore.findUnique({ where: { userId_sellerId: { userId: user.id, sellerId: seller.id } } }) : null,
  ]);
  await track("STORE_VIEW", { userId: user?.id, sellerId: seller.id, path: `/jewelers/${slug}` });

  const regions = [...new Set(seller.shippingRates.map((r) => (r.zone === "DOMESTIC" ? regionForCountry(seller.country) : r.zone)))];

  return (
    <div className="pb-20">
      <div className="relative h-[240px] bg-sand md:h-[340px]">
        {seller.bannerUrl && <Image src={seller.bannerUrl} alt="" fill priority sizes="100vw" className="object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/35 to-transparent" />
      </div>

      <div className="shell">
        <div className="relative -mt-14 flex flex-col gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-5">
            <Monogram name={seller.storeName} src={seller.logoUrl} size={112} className="border-4 border-ivory bg-ivory shadow-soft" />
            <div className="pb-1">
              <h1 className="display-lg text-ink">{seller.storeName}</h1>
              <p className="mt-1 text-[14px] text-ink-soft">
                {seller.city}, {countryName(seller.country)}
                {seller.foundedYear && ` · Est. ${seller.foundedYear}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                <VerifiedJeweler />
                {seller.isTopRated && <TopRated />}
              </div>
            </div>
          </div>
          <FollowStoreButton sellerId={seller.id} following={!!following} className="self-start md:self-auto" />
        </div>

        <dl className="grid grid-cols-2 gap-6 border-b border-line py-7 md:grid-cols-5">
          {[
            ["Rating", seller.ratingCount ? <span className="flex items-center gap-1.5"><Stars rating={seller.ratingAverage} size={12} label={false} />{seller.ratingAverage.toFixed(1)}</span> : "New"],
            ["Reviews", seller.ratingCount],
            ["Sales", seller.salesCount],
            ["Replies", formatResponseTime(seller.responseTimeMinutes)],
            ["On Loupe since", formatDate(seller.approvedAt, "monthYear")],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-[11px] tracking-[0.1em] text-muted uppercase">{label}</dt>
              <dd className="mt-1 text-[15px] text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-12 py-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="eyebrow mb-3">About the atelier</p>
            <p className="font-display text-[24px] leading-snug text-ink">{seller.tagline}</p>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{seller.bio}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {seller.specialties.map((s) => (
                <span key={s} className="rounded-full border border-line bg-porcelain px-3 py-1 text-[12.5px] text-ink-soft">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-5">
            {seller.locations.map((l) => (
              <div key={l.id} className="rounded-[3px] border border-line bg-porcelain p-5">
                <p className="caps text-ink">{l.name}</p>
                <p className="mt-3 flex items-start gap-2 text-[14px] text-ink-soft">
                  <MapPin className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
                  {l.line1}, {l.city}
                  {l.postalCode && ` ${l.postalCode}`}
                </p>
                {l.hours && (
                  <p className="mt-2 flex items-center gap-2 text-[14px] text-ink-soft">
                    <Clock className="size-4 shrink-0" strokeWidth={1.5} /> {l.hours}
                    {l.appointmentOnly && <span className="text-muted">· by appointment</span>}
                  </p>
                )}
                {l.phone && (
                  <p className="mt-2 flex items-center gap-2 text-[14px] text-ink-soft">
                    <Phone className="size-4 shrink-0" strokeWidth={1.5} /> {l.phone}
                  </p>
                )}
              </div>
            ))}
            <div className="space-y-3 text-[14px] text-ink-soft">
              <p className="flex items-start gap-2">
                <Truck className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} /> Ships insured to {regions.map((r) => REGION_LABELS[r]).join(", ")}
              </p>
              <p className="flex items-start gap-2">
                <RotateCcw className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} /> {seller.returnWindowDays}-day returns, sent straight back to {seller.city}
              </p>
            </div>
          </div>
        </div>

        <section aria-labelledby="collection-heading" className="border-t border-line pt-12">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 id="collection-heading" className="display-md text-ink">
              The collection <span className="text-[18px] text-muted">({pluralize(listings.length, "piece")})</span>
            </h2>
            {categories.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <Link href={`/jewelers/${slug}`} className={cn("rounded-full border px-3.5 py-1 text-[13px]", !category ? "border-ink bg-ink text-ivory" : "border-line text-ink-soft hover:border-ink/40")}>
                  All
                </Link>
                {categories.map((c) => (
                  <Link key={c.slug} href={`/jewelers/${slug}?category=${c.slug}`} className={cn("rounded-full border px-3.5 py-1 text-[13px]", category === c.slug ? "border-ink bg-ink text-ivory" : "border-line text-ink-soft hover:border-ink/40")}>
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {listings.length ? <ProductGrid products={listings} savedIds={saved} /> : <EmptyState title="Nothing in this category right now" />}
        </section>

        {sold.length > 0 && (
          <section aria-labelledby="sold-heading" className="mt-20">
            <p className="eyebrow mb-3">Found new homes</p>
            <h2 id="sold-heading" className="display-md mb-8 text-ink">
              Recently sold
            </h2>
            <ProductGrid products={sold} />
          </section>
        )}

        {reviews.length > 0 && (
          <section aria-labelledby="store-reviews" className="mt-20 border-t border-line pt-12">
            <h2 id="store-reviews" className="display-md mb-8 text-ink">
              What buyers say
            </h2>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((r) => (
                <figure key={r.id} className="rounded-[3px] border border-line bg-porcelain p-5">
                  <Stars rating={r.rating} size={12} />
                  {r.title && <p className="mt-2 text-[14.5px] font-medium text-ink">{r.title}</p>}
                  <blockquote className="mt-1.5 line-clamp-4 text-[14px] leading-relaxed text-ink-soft">{r.body}</blockquote>
                  <figcaption className="mt-3 text-[12.5px] text-muted">
                    {r.author.name?.split(" ")[0]} · on{" "}
                    <Link href={`/product/${r.product.slug}`} className="underline underline-offset-2 hover:text-ink">
                      {r.product.title}
                    </Link>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
