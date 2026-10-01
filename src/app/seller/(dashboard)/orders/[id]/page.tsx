import { Download, MessageSquare } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LineItemOptions } from "@/components/orders/line-item-options";
import { TrackingTimeline } from "@/components/orders/tracking";
import { OrderWorkflow } from "@/components/seller/order-workflow";
import { ServiceTicketActions } from "@/components/seller/service-ticket-actions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, StatusBadge } from "@/components/ui/display";
import type { Carrier } from "@/generated/prisma/enums";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import type { AddressSnapshot } from "@/lib/order-math";
import { countryName, zoneFor } from "@/lib/regions";
import { METHOD_LABELS } from "@/lib/shipping";
import { FULFILLMENT_STATUS, PAYOUT_STATUS, SERVICE_STATUS } from "@/lib/status";
import { bpsToPercent } from "@/lib/money";
import { humanize, num } from "@/lib/utils";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";

export default async function SellerOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { seller } = await requireSeller();
  const so = await db.sellerOrder.findFirst({
    where: { id, sellerId: seller.id },
    include: {
      order: { select: { orderNumber: true, shippingAddress: true, email: true, placedAt: true, dutiesMode: true, buyer: { select: { name: true } } } },
      items: { include: { serviceRequests: { include: { events: { orderBy: { createdAt: "desc" }, take: 1 } } } } },
      statusEvents: { orderBy: { createdAt: "asc" } },
      shipments: { include: { events: { orderBy: { occurredAt: "desc" } } } },
      payout: true,
      conversations: { select: { id: true, type: true } },
      disputes: { select: { id: true, caseNumber: true, status: true } },
      returnRequests: { select: { rmaNumber: true, status: true } },
    },
  });
  if (!so) notFound();
  const to = so.order.shippingAddress as AddressSnapshot;
  const outbound = so.shipments.find((s) => s.direction === "OUTBOUND");
  const zone = zoneFor(seller.country, to.country);
  const rate = await db.shippingRate.findFirst({ where: { sellerId: seller.id, zone, method: so.shippingMethod }, select: { carrier: true } });
  const money = (m: bigint | number) => formatMoney(num(m), so.currency);
  const needsProduction = so.items.some((i) => i.engravingText || i.ringSize) || so.status === "IN_PRODUCTION";
  const convo = so.conversations.find((c) => c.type === "ORDER");

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <Link href="/seller/orders" className="text-[13px] text-muted hover:text-ink">
            ← Orders
          </Link>
          <h1 className="display-md mt-2 text-ink">
            <span className="font-mono text-[0.75em]">{so.reference}</span>
          </h1>
          <p className="mt-1 text-[14px] text-ink-soft">
            Placed {formatDate(so.order.placedAt ?? so.createdAt, "long")} by {so.order.buyer.name} · {METHOD_LABELS[so.shippingMethod].label}
            {so.signatureRequired && " · signature required"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={so.status} map={FULFILLMENT_STATUS} />
          <a href={`/api/documents/packing-slip/${so.id}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "subtle", size: "sm" })}>
            <Download /> Packing slip
          </a>
          {outbound && (
            <a href={`/api/documents/shipping-label/${outbound.id}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "subtle", size: "sm" })}>
              <Download /> Shipping label
            </a>
          )}
        </div>
      </div>

      {so.disputes.length > 0 && (
        <p className="mb-6 rounded-[3px] border border-amber/30 bg-amber-mist px-4 py-3 text-[14px] text-amber">
          Case {so.disputes[0].caseNumber} ({humanize(so.disputes[0].status).toLowerCase()}) — payout is on hold until Loupe resolves it.{" "}
          <Link href="/seller/messages" className="underline">Respond in messages</Link>
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Fulfilment" description="Buyers see every step you take here." action={<OrderWorkflow sellerOrderId={so.id} status={so.status} defaultCarrier={(rate?.carrier ?? "DHL") as Carrier} needsProduction={needsProduction} />} />
            <div className="p-5">
              <TrackingTimeline status={so.status} events={so.statusEvents} shipment={outbound} needsProduction={needsProduction} estimate={{ from: so.estimatedDeliveryFrom, to: so.estimatedDeliveryTo }} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Pieces" />
            <ul className="divide-y divide-line">
              {so.items.map((item) => (
                <li key={item.id} className="px-5 py-4">
                  <div className="flex gap-4">
                    <div className="relative size-20 shrink-0 overflow-hidden bg-sand">{item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="80px" className="object-cover" />}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-4">
                        <p className="text-[14.5px] text-ink">{item.title}</p>
                        <p className="text-[14px] text-ink">{money(item.totalMinor)}</p>
                      </div>
                      <LineItemOptions item={item} showSku />
                      {item.listCurrency !== so.currency && <p className="mt-1 text-[12px] text-muted">Listed at {formatMoney(num(item.listPriceMinor), item.listCurrency)}</p>}
                    </div>
                  </div>
                  {item.serviceRequests.map((t) => (
                    <div key={t.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[3px] border border-line bg-ivory px-4 py-3 text-[13px]">
                      <span>
                        <span className="font-mono">{t.ticketNumber}</span> · {humanize(t.type)} · <StatusBadge status={t.status} map={SERVICE_STATUS} />
                        {t.coveredByWarranty && <span className="ml-2 text-moss">warranty</span>}
                        <span className="mt-1 block text-ink-soft">{t.description}</span>
                      </span>
                      <ServiceTicketActions ticketId={t.id} status={t.status} />
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Ship to" />
            <div className="px-5 py-4 text-[14px] leading-relaxed text-ink-soft">
              <p className="text-ink">{to.fullName}</p>
              {to.company && <p>{to.company}</p>}
              <p>
                {to.line1}
                {to.line2 && `, ${to.line2}`}
              </p>
              <p>
                {to.city}
                {to.region && `, ${to.region}`} {to.postalCode}
              </p>
              <p>{countryName(to.country)}</p>
              {to.phone && <p className="mt-1">{to.phone}</p>}
              {zone !== "DOMESTIC" && <p className="mt-3 text-[12.5px] text-muted">International · duties {so.order.dutiesMode === "DAP" ? "paid by the buyer on arrival (DAP)" : "prepaid by Loupe (DDP) — mark the parcel DDP"}.</p>}
            </div>
            {convo && (
              <div className="border-t border-line px-5 py-3">
                <Link href={`/seller/messages/${convo.id}`} className="inline-flex items-center gap-2 text-[13px] text-ink underline underline-offset-4">
                  <MessageSquare className="size-4" /> Conversation with the buyer
                </Link>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Money" description={`Commission ${bpsToPercent(so.commissionRateBps, 1)} on items only`} />
            <dl className="space-y-2 px-5 py-4 text-[13.5px]">
              {[
                ["Items", so.subtotalMinor],
                ["Shipping (yours)", so.shippingMinor],
                ["Insurance", so.insuranceMinor],
                ["Loupe commission", -num(so.commissionMinor)],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between">
                  <dt className="text-ink-soft">{label}</dt>
                  <dd className="text-ink">{money(value as number)}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-line pt-2 text-[15px]">
                <dt className="text-ink">Your payout</dt>
                <dd className="font-semibold text-ink">{money(so.sellerNetMinor)}</dd>
              </div>
              <p className="pt-1 text-[12px] text-muted">Tax ({money(so.taxMinor)}) and duties ({money(so.dutiesMinor)}) are collected and remitted by Loupe.</p>
            </dl>
            {so.payout && (
              <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[13px]">
                <StatusBadge status={so.payout.status} map={PAYOUT_STATUS} />
                <span className="text-muted">{so.payout.releaseAfter ? `Releases ${formatDate(so.payout.releaseAfter)}` : "Releases 3 days after delivery"}</span>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
