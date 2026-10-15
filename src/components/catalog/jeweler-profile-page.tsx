import { ArrowRight, Clock, Globe, MapPin, MessageSquare, Phone } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { jewelerReviews } from "@/server/services/discovery";
import { JewelerReviewForm } from "@/components/account/jeweler-review-form";
import { JewelerSocialLinks } from "@/components/catalog/jeweler-social-links";
import { getDirectorySettings } from "@/server/services/jeweler-directory";
import { ProductGrid } from "@/components/catalog/product-card";
import { FollowStoreButton } from "@/components/catalog/save-buttons";
import { TopRated, VerifiedJeweler } from "@/components/brand/trust";
import { DirectContact } from "@/components/product/direct-contact";
import { EmptyState, Monogram, Stars } from "@/components/ui/display";
import { formatDate, formatResponseTime } from "@/lib/format";
import { countryName } from "@/lib/regions";
import { cn, firstParam, pluralize, type SearchParams } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { track } from "@/server/services/analytics";
import { getWishlistProductIds } from "@/server/services/catalog";
import { getPriceContext } from "@/server/services/currency";
import { getStorefront } from "@/server/services/sellers";

export type JewelerProfileProps = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function jewelerProfileMetadata({ params }: JewelerProfileProps): Promise<Metadata> {
  const seller = await db.sellerProfile.findUnique({ where: { slug: (await params).slug }, select: { storeName: true, tagline: true, bannerUrl: true } });
  if (!seller) return {};
  return { title: seller.storeName, description: seller.tagline ?? undefined, openGraph: { images: seller.bannerUrl ? [seller.bannerUrl] : [] } };
}

export async function JewelerProfilePage({ params, searchParams, details = false }: JewelerProfileProps & { details?: boolean }) {
  const { slug } = await params;
  const category = details ? firstParam((await searchParams).category) : undefined;
  const [ctx, user] = await Promise.all([getPriceContext(), getCurrentUser()]);
  const data = await getStorefront(slug, ctx, category);
  if (!data) notFound();
  const { seller, listings, sold, reviews, categories } = data;
  const feedback = details ? await jewelerReviews(seller.id) : [];
  const settings = details ? await getDirectorySettings(seller.id) : null;
  const [saved, following] = await Promise.all([
    getWishlistProductIds(user?.id),
    details && user ? db.favoriteStore.findUnique({ where: { userId_sellerId: { userId: user.id, sellerId: seller.id } } }) : null,
  ]);
  if (!details && user?.id !== seller.userId) await track("STORE_VIEW", { userId: user?.id, sellerId: seller.id, path: `/jewelers/${slug}` });
  const detailPath = `/jewelers/${slug}/about`;

  return (
    <div className="pb-20">
      <div className="relative h-[220px] bg-sand md:h-[270px]">
        {seller.bannerUrl && <Image src={seller.bannerUrl} alt="" fill priority sizes="100vw" className="object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/35 to-transparent" />
        <div className="shell absolute inset-x-0 bottom-5">
          <h1 className="display-lg ml-[132px] max-w-[calc(100%_-_132px)] break-words text-ivory [text-shadow:0_1px_12px_rgb(0_0_0/55%)]">
            {seller.storeName}
          </h1>
        </div>
      </div>

      <div className="shell">
        <div className="relative -mt-14 flex flex-col gap-6 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-5">
            <Monogram name={seller.storeName} src={seller.logoUrl} size={112} className="border-4 border-ivory bg-ivory shadow-soft" />
            {details && <div className="pb-1">
              <p className="mt-1 text-[14px] text-ink-soft">
                {seller.city}, {countryName(seller.country)}
                {seller.foundedYear && ` · Est. ${seller.foundedYear}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {seller.verificationStatus === "APPROVED" && <VerifiedJeweler />}
                {seller.verificationStatus === "APPROVED" && seller.isTopRated && <TopRated />}
              </div>
            </div>}
          </div>
          {details && <div className="flex flex-wrap items-center gap-3">
            {seller.acceptsCustomOrders && <Link
              href={`/custom-orders?jeweler=${seller.slug}`}
              className="inline-flex h-10 items-center gap-2 rounded-[2px] border border-ink bg-ink px-4 text-[12.5px] font-medium text-ivory transition-colors hover:bg-ink/85"
            >
              <MessageSquare className="size-4" /> Commission piece
            </Link>}
            <FollowStoreButton sellerId={seller.id} following={!!following} />
          </div>}
        </div>

        <dl className={cn("grid gap-6 border-b border-line py-5", details ? "grid-cols-2 md:grid-cols-5" : "grid-cols-3")}>
          {[
            ["Rating", seller.ratingCount ? <span className="flex items-center gap-1.5"><Stars rating={seller.ratingAverage} size={12} label={false} />{seller.ratingAverage.toFixed(1)}</span> : "New"],
            ["Reviews", seller.ratingCount],
            ["Showcase", `${listings.length} pieces`],
            ...(details ? [
              ["Replies", formatResponseTime(seller.responseTimeMinutes)],
              ["On Loupe since", formatDate(seller.submittedAt ?? seller.approvedAt ?? seller.createdAt, "monthYear")],
            ] : []),
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-[11px] tracking-[0.1em] text-muted uppercase">{label}</dt>
              <dd className="mt-1 text-[15px] text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        {!details ? (
          <Link href={detailPath} className="group mt-6 flex items-center justify-between gap-6 rounded-[3px] border border-line bg-porcelain p-6 transition-colors hover:border-ink/40">
            <span>
              <span className="eyebrow block">About the atelier</span>
              <span className="mt-2 block font-display text-[24px] leading-snug text-ink">Discover {seller.storeName}</span>
            </span>
            <ArrowRight className="size-5 shrink-0 text-ink transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        ) : settings && <>
        <Link href={`/jewelers/${slug}`} className="mt-6 inline-block text-sm text-ink-soft underline underline-offset-4">Back to jeweler overview</Link>
        <div className="grid gap-12 pt-6 pb-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="eyebrow mb-3">About the atelier</p>
            <p className="font-display text-[24px] leading-snug text-ink">{seller.tagline}</p>
            <p className="mt-4 max-w-2xl whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink-soft">{seller.bio}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {seller.specialties.map((s) => (
                <span key={s} className="rounded-full border border-line bg-porcelain px-3 py-1 text-[12.5px] text-ink-soft">
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-8">
              <JewelerSocialLinks sellerId={seller.id} settings={settings} website={seller.website} />
            </div>
          </div>
          <div className="space-y-5">
            {seller.locations.slice(0, 1).map((l) => (
              <div key={l.id} className="rounded-[3px] border border-line bg-porcelain p-5">
                <p className="caps text-ink">{l.name}</p>
                <p className="mt-3 flex items-start gap-2 text-[14px] text-ink-soft">
                  <MapPin className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
                  {[l.line1, l.line2 ?? seller.returnAddress?.line2, l.city, l.region ?? seller.returnAddress?.region].filter(Boolean).join(", ")}
                  {l.postalCode && ` ${l.postalCode}`}
                </p>
                {l.hours && (
                  <p className="mt-2 flex items-center gap-2 text-[14px] text-ink-soft">
                    <Clock className="size-4 shrink-0" strokeWidth={1.5} /> {l.hours}
                    {l.appointmentOnly && <span className="text-muted">· by appointment</span>}
                  </p>
                )}
                {l.phone && (
                  <div className="mt-3 space-y-3"><p className="flex items-center gap-2 text-[14px] text-ink-soft">
                    <Phone className="size-4 shrink-0" strokeWidth={1.5} /> {l.phone}
                  </p><DirectContact sellerId={seller.id} whatsapp={settings.whatsapp} phone={l.phone} title={`the collection at ${seller.storeName}`} /></div>
                )}
              </div>
            ))}
            <div className="rounded-[3px] border border-line bg-parchment/60 p-5 space-y-3 text-[14px] text-ink-soft">
              <p className="font-medium text-ink">Direct Atelier Contacts &amp; Policies</p>
              {seller.website && (
                <p className="flex items-center gap-2 truncate">
                  <Globe className="size-4 shrink-0 text-muted" />
                  <a href={seller.website} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">
                    {seller.website.replace(/^https?:\/\//, "")}
                  </a>
                </p>
              )}
              <p className="text-[13px] text-muted">
                All purchases, consultations, payments, delivery, and returns are handled directly with {seller.storeName}.
              </p>
            </div>
          </div>
        </div>

        <section aria-labelledby="collection-heading" className="border-t border-line pt-12">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 id="collection-heading" className="display-md text-ink">
              The showcase <span className="text-[18px] text-muted">({pluralize(listings.length, "piece")})</span>
            </h2>
            {categories.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <Link href={detailPath} className={cn("rounded-full border px-3.5 py-1 text-[13px]", !category ? "border-ink bg-ink text-ivory" : "border-line text-ink-soft hover:border-ink/40")}>
                  All
                </Link>
                {categories.map((c) => (
                  <Link key={c.slug} href={`${detailPath}?category=${c.slug}`} className={cn("rounded-full border px-3.5 py-1 text-[13px]", category === c.slug ? "border-ink bg-ink text-ivory" : "border-line text-ink-soft hover:border-ink/40")}>
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
              Past creations &amp; archives
            </h2>
            <ProductGrid products={sold} />
          </section>
        )}

        <section className="mt-16 border-t border-line pt-10" aria-labelledby="customer-feedback"><h2 id="customer-feedback" className="mb-6 font-display text-3xl">Customer reviews</h2><div className="grid grid-cols-2 gap-5">{feedback.map(r => <article key={r.id} className="rounded border border-line bg-porcelain p-6"><Stars rating={r.rating} /><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{r.body}</p><p className="mt-3 text-xs text-muted">{r.authorName?.split(" ")[0] ?? "Customer"} · Customer experience</p>{r.sellerReply && <div className="mt-4 border-t border-line pt-3 text-sm"><strong>Jeweler’s reply</strong><p className="mt-2 whitespace-pre-wrap">{r.sellerReply}</p></div>}</article>)}</div>{!feedback.length && <p className="mb-5 text-sm text-muted">No customer experience reviews yet.</p>}<div className="mt-6 max-w-xl">{user?.role === "BUYER" ? <JewelerReviewForm sellerId={seller.id} /> : !user ? <Link href={`/login?callbackUrl=${encodeURIComponent(`${detailPath}#customer-feedback`)}`} className="text-sm underline">Sign in to share your experience</Link> : null}</div></section>
        {reviews.length > 0 && (
          <section aria-labelledby="store-reviews" className="mt-20 border-t border-line pt-12">
            <h2 id="store-reviews" className="display-md mb-8 text-ink">
              Client testimonials
            </h2>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((r) => (
                <figure key={r.id} className="rounded-[3px] border border-line bg-porcelain p-5">
                  <Stars rating={r.rating} size={12} />
                  {r.title && <p className="mt-2 text-[14.5px] font-medium text-ink">{r.title}</p>}
                  <blockquote className="mt-1.5 line-clamp-4 text-[14px] leading-relaxed text-ink-soft">{r.body}</blockquote>
                  <figcaption className="mt-3 text-[12.5px] text-muted">
                    {(r.author?.name?.split(" ")[0] ?? "Verified Buyer")} · on{" "}
                    <Link href={`/product/${r.product.slug}`} className="underline underline-offset-2 hover:text-ink">
                      {r.product.title}
                    </Link>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
        </>}
      </div>
    </div>
  );
}
