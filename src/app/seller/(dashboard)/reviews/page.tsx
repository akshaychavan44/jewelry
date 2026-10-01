import { Star } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/account/page-header";
import { ReviewReply } from "@/components/seller/review-reply";
import { EmptyState, Stars } from "@/components/ui/display";
import { formatDate } from "@/lib/format";
import { countryName } from "@/lib/regions";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";

export default async function SellerReviews() {
  const { seller } = await requireSeller();
  const reviews = await db.review.findMany({
    where: { sellerId: seller.id },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { author: { select: { name: true, country: true } }, product: { select: { title: true, slug: true } } },
  });
  return (
    <>
      <PageHeader title="Reviews" description={`${seller.ratingCount} verified reviews · ${seller.ratingAverage.toFixed(2)} average. A thoughtful public reply matters as much as the rating.`} />
      {reviews.length === 0 ? (
        <EmptyState icon={<Star />} title="No reviews yet" />
      ) : (
        <ul className="divide-y divide-line rounded-[3px] border border-line bg-porcelain">
          {reviews.map((r) => (
            <li key={r.id} className="px-5 py-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Stars rating={r.rating} size={13} />
                <span className="text-[12.5px] text-muted">
                  {r.author.name} · {countryName(r.author.country)} · {formatDate(r.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-[12.5px] text-muted">
                on{" "}
                <Link href={`/product/${r.product.slug}`} className="underline underline-offset-2 hover:text-ink">
                  {r.product.title}
                </Link>
              </p>
              {r.title && <p className="mt-1.5 text-[15px] font-medium text-ink">{r.title}</p>}
              <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{r.body}</p>
              {r.sellerReply && <p className="mt-3 border-l-2 border-gold/50 bg-parchment/60 px-4 py-2.5 text-[13.5px] text-ink-soft">{r.sellerReply}</p>}
              <div className="mt-3">
                <ReviewReply reviewId={r.id} existing={r.sellerReply} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
