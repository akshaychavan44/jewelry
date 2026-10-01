import { Download, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LineItemOptions } from "@/components/orders/line-item-options";
import { ReviewDialog, SellerOrderActions, ServiceDialog } from "@/components/orders/order-actions";
import { TrackingTimeline } from "@/components/orders/tracking";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/display";
import { addDays, formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import type { AddressSnapshot } from "@/lib/order-math";
import { countryName } from "@/lib/regions";
import { METHOD_LABELS } from "@/lib/shipping";
import { FULFILLMENT_STATUS, PAYMENT_STATUS, RETURN_STATUS } from "@/lib/status";
import { num } from "@/lib/utils";
import { requireUser } from "@/server/auth/session";
import { getBuyerOrderDetail } from "@/server/services/account";

export default async function OrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const user = await requireUser(`/account/orders/${orderNumber}`);
  const order = await getBuyerOrderDetail(user.id, orderNumber);
  if (!order) notFound();
  const money = (m: bigint | number) => formatMoney(num(m), order.currency);
  const ship = order.shippingAddress as AddressSnapshot;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <Link href="/account/orders" className="text-[13px] text-muted hover:text-ink">
            ← All orders
          </Link>
          <h1 className="display-md mt-2 text-ink">
            Order <span className="font-mono text-[0.8em]">{order.orderNumber}</span>
          </h1>
          <p className="mt-1 text-[14px] text-ink-soft">
            Placed {formatDate(order.placedAt ?? order.createdAt, "long")} · {money(order.totalMinor)} · <StatusBadge status={order.paymentStatus} map={PAYMENT_STATUS} />
          </p>
        </div>
        <a href={`/api/documents/invoice/${order.orderNumber}`} className={buttonVariants({ variant: "subtle", size: "sm" })}>
          <Download /> Invoice (PDF)
        </a>
      </div>

      <div className="space-y-8">
        {order.sellerOrders.map((so) => {
          const outbound = so.shipments.find((s) => s.direction === "OUTBOUND");
          const returnDeadline = so.deliveredAt ? addDays(so.deliveredAt, so.seller.returnWindowDays) : null;
          const openReturn = so.returnRequests.find((r) => !["REJECTED", "CANCELLED", "REFUNDED"].includes(r.status));
          const openDispute = so.disputes.find((d) => !["RESOLVED", "CLOSED"].includes(d.status));
          const needsProduction = so.items.some((i) => i.engravingText || i.ringSize) || !!so.productionStartedAt;
          return (
            <section key={so.id} className="rounded-[3px] border border-line bg-porcelain" aria-label={`From ${so.seller.storeName}`}>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                <div>
                  <p className="text-[15px] text-ink">
                    <Link href={`/jewelers/${so.seller.slug}`} className="hover:underline">
                      {so.seller.storeName}
                    </Link>{" "}
                    <span className="font-mono text-[12px] text-muted">{so.reference}</span>
                  </p>
                  <p className="text-[12.5px] text-muted">
                    {METHOD_LABELS[so.shippingMethod].label} from {so.seller.city}, {countryName(so.seller.country)}
                    {so.signatureRequired && " · signature required"}
                  </p>
                </div>
                <StatusBadge status={so.status} map={FULFILLMENT_STATUS} />
              </header>

              <div className="px-5 py-6">
                <TrackingTimeline status={so.status} events={so.statusEvents} shipment={outbound} needsProduction={needsProduction} estimate={{ from: so.estimatedDeliveryFrom, to: so.estimatedDeliveryTo }} />
              </div>

              <ul className="divide-y divide-line border-t border-line">
                {so.items.map((item) => (
                  <li key={item.id} className="flex gap-4 px-5 py-4">
                    <div className="relative size-20 shrink-0 overflow-hidden bg-sand">{item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="80px" className="object-cover" />}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-4">
                        <div>
                          {item.product ? (
                            <Link href={`/product/${item.product.slug}`} className="text-[14.5px] text-ink hover:underline">
                              {item.title}
                            </Link>
                          ) : (
                            <p className="text-[14.5px] text-ink">{item.title}</p>
                          )}
                          <LineItemOptions item={item} />
                        </div>
                        <p className="tabular text-[14px] text-ink">{money(item.totalMinor)}</p>
                      </div>
                      {so.status === "DELIVERED" && (
                        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
                          {item.review ? <span className="text-[13px] text-sage-deep">✓ Reviewed ({item.review.rating}★)</span> : <ReviewDialog orderItemId={item.id} title={item.title} />}
                          <ServiceDialog orderItemId={item.id} title={item.title} />
                          {item.warranty && (
                            <span className="inline-flex items-center gap-1 text-[12.5px] text-muted">
                              <ShieldCheck className="size-3.5" /> Warranty {item.warranty.warrantyNumber} · until {formatDate(item.warranty.endsAt)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {so.returnRequests.length > 0 && (
                <div className="border-t border-line bg-parchment/40 px-5 py-4 text-[13.5px]">
                  {so.returnRequests.map((r) => (
                    <div key={r.id} className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-ink-soft">
                        Return <span className="font-mono">{r.rmaNumber}</span> · <StatusBadge status={r.status} map={RETURN_STATUS} />
                        {r.sellerResponse && <span className="mt-1 block text-[12.5px] text-muted">“{r.sellerResponse}”</span>}
                      </p>
                      {r.shipment && (
                        <a href={`/api/documents/shipping-label/${r.shipment.id}`} className={buttonVariants({ variant: "subtle", size: "sm" })}>
                          <Download /> Return label
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-4">
                <dl className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-ink-soft">
                  <div>
                    Items <span className="tabular text-ink">{money(so.subtotalMinor)}</span>
                  </div>
                  <div>
                    Shipping <span className="tabular text-ink">{num(so.shippingMinor) ? money(so.shippingMinor) : "Free"}</span>
                  </div>
                  <div>
                    Tax <span className="tabular text-ink">{money(so.taxMinor)}</span>
                  </div>
                  {num(so.dutiesMinor) > 0 && (
                    <div>
                      Duties <span className="tabular text-ink">{money(so.dutiesMinor)}</span>
                    </div>
                  )}
                  <div>
                    Total <span className="tabular text-ink">{money(so.totalMinor)}</span>
                  </div>
                </dl>
                <SellerOrderActions
                  sellerOrderId={so.id}
                  status={so.status}
                  canReturn={so.status === "DELIVERED" && !openReturn && !!returnDeadline && returnDeadline > new Date()}
                  returnDeadline={returnDeadline ? formatDate(returnDeadline) : null}
                  canDispute={["SHIPPED", "DELIVERED"].includes(so.status) && !openDispute}
                  items={so.items.map((i) => ({ id: i.id, title: i.title, reviewed: !!i.review, personalised: !!(i.engravingText || i.ringSize) }))}
                />
              </footer>
              {openDispute && (
                <p className="border-t border-line bg-amber-mist px-5 py-3 text-[13px] text-amber">
                  Case {openDispute.caseNumber} is open — Loupe is holding the jeweler&rsquo;s payment while we mediate.{" "}
                  <Link href="/account/messages" className="underline underline-offset-2">
                    View case
                  </Link>
                </p>
              )}
            </section>
          );
        })}
      </div>

      <section className="mt-8 grid gap-6 rounded-[3px] border border-line bg-porcelain p-5 text-[13.5px] md:grid-cols-3">
        <div>
          <p className="caps mb-2 text-ink">Delivering to</p>
          <p className="text-ink-soft">
            {ship.fullName}
            <br />
            {ship.line1}
            {ship.line2 && `, ${ship.line2}`}
            <br />
            {ship.city} {ship.postalCode}, {countryName(ship.country)}
          </p>
        </div>
        <div>
          <p className="caps mb-2 text-ink">Payment</p>
          <p className="text-ink-soft">{order.payments[0]?.methodSummary ?? "Card"}</p>
          {order.refunds.length > 0 && <p className="mt-1 text-ink-soft">Refunded {money(order.refunds.reduce((n, r) => n + num(r.amountMinor), 0))}</p>}
        </div>
        <div>
          <p className="caps mb-2 text-ink">Buyer protection</p>
          <p className="text-ink-soft">Each jeweler is paid three days after delivery, once you&rsquo;ve had time to inspect your piece.</p>
        </div>
      </section>
    </>
  );
}
