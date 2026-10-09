import { HandCoins } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/account/page-header";
import { OfferActions } from "@/components/offers/offer-actions";
import { EmptyState, StatusBadge } from "@/components/ui/display";
import { formatDate, timeAgo } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { OFFER_STATUS } from "@/lib/status";
import { humanize, num } from "@/lib/utils";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";

export default async function BuyerOffersPage() {
  const user = await requireUser("/account/offers");
  const offers = await db.offer.findMany({
    where: { buyerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      product: { select: { title: true, slug: true, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } } },
      seller: { select: { storeName: true } },
      events: { orderBy: { createdAt: "asc" } },
      cartItem: { select: { id: true } },
    },
  });

  return (
    <>
      <PageHeader title="Price Inquiries" description="Your price proposals with independent jewelers. Once accepted, message the jeweler directly to arrange payment and delivery." />
      {offers.length === 0 ? (
        <EmptyState icon={<HandCoins />} title="No price inquiries yet">
          Look for &ldquo;Propose an offer&rdquo; on pieces whose jewelers welcome direct pricing discussions.
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {offers.map((o) => {
            const awaitingMe = o.status === "COUNTERED" && o.lastActor === "SELLER";
            return (
              <li key={o.id} className="rounded-[3px] border border-line bg-porcelain">
                <div className="flex flex-wrap gap-4 px-5 py-4">
                  <Link href={`/product/${o.product.slug}`} className="relative size-20 shrink-0 overflow-hidden bg-sand">
                    {o.product.images[0] && <Image src={o.product.images[0].url} alt="" fill sizes="80px" className="object-cover" />}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link href={`/product/${o.product.slug}`} className="text-[15px] text-ink hover:underline">
                          {o.product.title}
                        </Link>
                        <p className="text-[12.5px] text-muted">
                          {o.seller.storeName} · listed at {formatMoney(num(o.listPriceMinor), o.currency)}
                        </p>
                      </div>
                      <StatusBadge status={o.status} map={OFFER_STATUS} />
                    </div>
                    <p className="mt-2 font-display text-[22px] text-ink">
                      {formatMoney(num(o.acceptedAmountMinor ?? o.currentAmountMinor), o.currency)}
                      <span className="ml-2 font-sans text-[12.5px] text-muted">{awaitingMe ? "their counter-offer" : o.status === "ACCEPTED" ? "agreed price" : "latest proposal"}</span>
                    </p>
                    {o.status === "ACCEPTED" && <p className="text-[13px] text-sage-deep">Price agreed! Contact the jeweler directly to finalize payment and delivery.</p>}
                    <div className="mt-3">
                      <OfferActions
                        offerId={o.id}
                        as="BUYER"
                        canRespond={awaitingMe}
                        canWithdraw={o.status === "PENDING"}
                        canCheckout={o.status === "ACCEPTED"}
                        currency={o.currency}
                        currentMinor={num(o.currentAmountMinor)}
                        listMinor={num(o.listPriceMinor)}
                      />
                    </div>
                  </div>
                </div>

                <ol className="border-t border-line px-5 py-3 text-[12.5px] text-ink-soft">
                  {o.events.map((e) => (
                    <li key={e.id} className="flex flex-wrap gap-x-2 py-0.5">
                      <span className="w-24 text-muted">{timeAgo(e.createdAt)}</span>
                      <span className="text-ink">{e.actor === "BUYER" ? "You" : e.actor === "SELLER" ? o.seller.storeName : "Loupe"}</span>
                      <span>{humanize(e.action).toLowerCase()}</span>
                      {e.amountMinor !== null && <span className="tabular">{formatMoney(num(e.amountMinor), o.currency)}</span>}
                      {e.message && <span className="text-muted">— “{e.message}”</span>}
                    </li>
                  ))}
                </ol>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
