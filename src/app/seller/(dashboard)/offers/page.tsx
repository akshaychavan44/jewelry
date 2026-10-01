import { HandCoins } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/account/page-header";
import { OfferActions } from "@/components/offers/offer-actions";
import { EmptyState, StatusBadge } from "@/components/ui/display";
import { timeAgo } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { OFFER_STATUS } from "@/lib/status";
import { humanize, num } from "@/lib/utils";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";

export default async function SellerOffers() {
  const { seller } = await requireSeller();
  const offers = await db.offer.findMany({
    where: { sellerId: seller.id, status: { not: "DECLINED" }, OR: [{ lastActor: { not: "SYSTEM" } }] },
    orderBy: [{ updatedAt: "desc" }],
    take: 60,
    include: {
      product: { select: { title: true, slug: true, offerFloorMinor: true, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } } },
      buyer: { select: { name: true, country: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  return (
    <>
      <PageHeader title="Offers" description="Accept, counter or decline. Offers below your private floor are declined automatically." />
      {offers.length === 0 ? (
        <EmptyState icon={<HandCoins />} title="No offers yet">Turn on “Accept offers” for a listing to start receiving them.</EmptyState>
      ) : (
        <ul className="space-y-4">
          {offers.map((o) => {
            const awaitingMe = ["PENDING", "COUNTERED"].includes(o.status) && o.lastActor === "BUYER";
            const pct = Math.round((num(o.currentAmountMinor) / num(o.listPriceMinor)) * 100);
            return (
              <li key={o.id} className="rounded-[3px] border border-line bg-porcelain">
                <div className="flex flex-wrap gap-4 px-5 py-4">
                  <Link href={`/product/${o.product.slug}`} className="relative size-16 shrink-0 overflow-hidden bg-sand">
                    {o.product.images[0] && <Image src={o.product.images[0].url} alt="" fill sizes="64px" className="object-cover" />}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[14.5px] text-ink">{o.product.title}</p>
                        <p className="text-[12.5px] text-muted">
                          {o.buyer.name} · listed {formatMoney(num(o.listPriceMinor), o.currency)}
                          {o.product.offerFloorMinor && ` · your floor ${formatMoney(num(o.product.offerFloorMinor), o.currency)}`}
                        </p>
                      </div>
                      <StatusBadge status={o.status} map={OFFER_STATUS} />
                    </div>
                    <p className="mt-2 text-[22px] font-semibold text-ink">
                      {formatMoney(num(o.currentAmountMinor), o.currency)} <span className="text-[13px] font-normal text-muted">{pct}% of list · {o.lastActor === "BUYER" ? "their offer" : "your counter"}</span>
                    </p>
                    {awaitingMe && (
                      <div className="mt-3">
                        <OfferActions offerId={o.id} as="SELLER" canRespond canWithdraw={false} canCheckout={false} currency={o.currency} currentMinor={num(o.currentAmountMinor)} listMinor={num(o.listPriceMinor)} />
                      </div>
                    )}
                  </div>
                </div>
                <ol className="border-t border-line px-5 py-3 text-[12.5px] text-ink-soft">
                  {o.events.map((e) => (
                    <li key={e.id} className="flex flex-wrap gap-x-2 py-0.5">
                      <span className="w-24 text-muted">{timeAgo(e.createdAt)}</span>
                      <span className="text-ink">{e.actor === "SELLER" ? "You" : e.actor === "BUYER" ? o.buyer.name?.split(" ")[0] : "Loupe"}</span>
                      <span>{humanize(e.action).toLowerCase()}</span>
                      {e.amountMinor !== null && <span>{formatMoney(num(e.amountMinor), o.currency)}</span>}
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
