import { Download, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/account/page-header";
import { ReturnActions } from "@/components/seller/return-actions";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, StatusBadge } from "@/components/ui/display";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import type { AddressSnapshot } from "@/lib/order-math";
import { countryName } from "@/lib/regions";
import { RETURN_STATUS } from "@/lib/status";
import { humanize, num } from "@/lib/utils";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";

export default async function SellerReturns() {
  const { seller } = await requireSeller();
  const returns = await db.returnRequest.findMany({
    where: { sellerId: seller.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { buyer: { select: { name: true } }, items: { include: { orderItem: { select: { title: true, engravingText: true } } } }, sellerOrder: { select: { reference: true, currency: true } }, shipment: true },
  });
  return (
    <>
      <PageHeader title="Returns" description="Every return comes straight back to your own return address on a prepaid, insured label." />
      {returns.length === 0 ? (
        <EmptyState icon={<RotateCcw />} title="No returns" />
      ) : (
        <ul className="space-y-4">
          {returns.map((r) => {
            const to = r.returnToAddress as AddressSnapshot | null;
            return (
              <li key={r.id} className="rounded-[3px] border border-line bg-porcelain">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                  <div>
                    <p className="text-[14.5px] text-ink">
                      <span className="font-mono">{r.rmaNumber}</span> · {r.items.map((i) => i.orderItem.title).join(", ")}
                    </p>
                    <p className="text-[12.5px] text-muted">
                      {r.buyer.name} · order {r.sellerOrder.reference} · requested {formatDate(r.createdAt)} · {humanize(r.reason)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} map={RETURN_STATUS} />
                </div>
                <div className="grid gap-4 px-5 py-4 text-[13.5px] md:grid-cols-[1fr_auto]">
                  <div className="space-y-1.5 text-ink-soft">
                    {r.details && <p>“{r.details}”</p>}
                    <p>
                      Refund on receipt: <span className="text-ink">{formatMoney(num(r.refundAmountMinor), r.sellerOrder.currency)}</span>
                    </p>
                    {to && (
                      <p>
                        Returns to: {to.fullName}, {to.line1}, {to.city} {to.postalCode}, {countryName(to.country)}
                      </p>
                    )}
                    {r.sellerResponse && <p className="text-muted">Your reply: {r.sellerResponse}</p>}
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <ReturnActions returnId={r.id} status={r.status} />
                    {r.shipment && (
                      <a href={`/api/documents/shipping-label/${r.shipment.id}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                        <Download /> Return label · {r.shipment.trackingNumber}
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
