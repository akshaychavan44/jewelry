import { BadgeCheck, Camera } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Stars } from "@/components/ui/display";
import { formatDate } from "@/lib/format";
import { countryName } from "@/lib/regions";
import type { ProductDetail } from "@/server/services/product";

export function ReviewsSection({ detail }: { detail: ProductDetail }) {
  const { rating, reviews, photoReviews } = detail;
  const total = Math.max(1, rating.count);
  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="scroll-mt-28">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">Verified buyers</p>
          <h2 id="reviews-heading" className="display-md text-ink">
            Reviews
          </h2>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
        <div>
          {rating.count > 0 ? (
            <>
              <p className="font-display text-[48px] leading-none text-ink">{rating.average.toFixed(1)}</p>
              <Stars rating={rating.average} size={16} className="mt-2" />
              <p className="mt-2 text-[13px] text-muted">{rating.count} verified reviews</p>
              <ul className="mt-5 space-y-1.5">
                {rating.distribution.map((d) => (
                  <li key={d.stars} className="grid grid-cols-[2rem_1fr_2rem] items-center gap-3 text-[12.5px] text-ink-soft">
                    <span>{d.stars}★</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                      <span className="block h-full rounded-full bg-gold" style={{ width: `${(d.count / total) * 100}%` }} />
                    </span>
                    <span className="text-right text-muted">{d.count}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-[14px] text-ink-soft">No reviews for this piece yet. Reviews on Loupe can only be left by buyers who received the piece.</p>
          )}

          {photoReviews.length > 0 && (
            <div className="mt-8">
              <p className="caps mb-3 flex items-center gap-2 text-ink">
                <Camera className="size-3.5" /> From buyers of this jeweler
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {photoReviews.slice(0, 8).map((r) => (
                  <Link key={r.id} href={`/product/${r.product.slug}#reviews`} className="relative aspect-square overflow-hidden bg-sand" title={r.title ?? r.product.title}>
                    <Image src={r.photoUrls[0]} alt={`Buyer photo · ${r.product.title}`} fill sizes="70px" className="object-cover" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <ul className="divide-y divide-line border-t border-line">
          {reviews.map((r) => (
            <li key={r.id} className="py-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Stars rating={r.rating} size={13} />
                <span className="text-[12.5px] text-muted">{formatDate(r.createdAt)}</span>
              </div>
              {r.title && <h3 className="mt-2.5 text-[15px] font-medium text-ink">{r.title}</h3>}
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-soft">{r.body}</p>
              {r.photoUrls.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {r.photoUrls.map((url) => (
                    <div key={url} className="relative size-20 overflow-hidden bg-sand">
                      <Image src={url} alt="Buyer photo" fill sizes="80px" className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
                <span className="text-ink">{r.author.name?.split(" ")[0] ?? "Buyer"}</span>
                {r.author.country && <span>{countryName(r.author.country)}</span>}
                {r.isVerifiedPurchase && (
                  <span className="inline-flex items-center gap-1 text-sage-deep">
                    <BadgeCheck className="size-3.5" /> Verified purchase
                  </span>
                )}
                {r.orderItem?.variantTitle && <span>· {r.orderItem.variantTitle}</span>}
              </p>
              {r.sellerReply && (
                <div className="mt-4 border-l-2 border-gold/50 bg-parchment/60 px-4 py-3">
                  <p className="caps text-[10px] text-gold-deep">Reply from the jeweler</p>
                  <p className="mt-1 text-[13.5px] text-ink-soft">{r.sellerReply}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
