import { Download } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader, StatusBadge } from "@/components/ui/display";
import { formatDate } from "@/lib/format";
import { bpsToPercent, formatMoney } from "@/lib/money";
import type { AddressSnapshot } from "@/lib/order-math";
import { countryName } from "@/lib/regions";
import { CARRIERS, METHOD_LABELS } from "@/lib/shipping";
import { DISPUTE_STATUS, FULFILLMENT_STATUS, PAYMENT_STATUS, PAYOUT_STATUS } from "@/lib/status";
import { humanize } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/session";
import { getAdminOrder } from "@/server/services/admin";

export const metadata: Metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  await requireAdmin();
  const { orderNumber } = await params;
  const o = await getAdminOrder(orderNumber);
  if (!o) notFound();
  const money = (m: bigint | number) => formatMoney(m, o.currency, { exact: true });
  const ship = o.shippingAddress as unknown as AddressSnapshot;

  return (
    <>
      <nav className="mb-4 text-[13px] text-muted">
        <Link href="/admin/orders" className="hover:text-ink">
          Orders
        </Link>{" "}
        / {o.orderNumber}
      </nav>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="eyebrow mb-2">Placed {formatDate(o.placedAt ?? o.createdAt, "dateTime")}</p>
          <h1 className="display-md font-mono text-ink">{o.orderNumber}</h1>
          <p className="mt-1.5 text-[14px] text-ink-soft">
            {o.buyer.name} · {o.email} · ships to {ship?.city}, {ship?.country ? countryName(ship.country) : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={o.paymentStatus} map={PAYMENT_STATUS} />
          <a href={`/api/documents/invoice/${o.orderNumber}`} className="inline-flex items-center gap-1.5 text-[13px] text-ink underline underline-offset-4">
            <Download className="size-3.5" /> Invoice
          </a>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-6">
          {o.sellerOrders.map((so) => (
            <Card key={so.id}>
              <CardHeader
                title={
                  <span>
                    <Link href={`/admin/kyc/${so.seller.id}`} className="hover:underline">
                      {so.seller.storeName}
                    </Link>{" "}
                    <span className="font-mono text-[13px] text-muted">{so.reference}</span>
                  </span>
                }
                description={`${METHOD_LABELS[so.shippingMethod].label}${so.signatureRequired ? " · signature on delivery" : ""}`}
                action={<StatusBadge status={so.status} map={FULFILLMENT_STATUS} />}
              />
              <ul className="divide-y divide-line">
                {so.items.map((i) => (
                  <li key={i.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="relative size-12 shrink-0 overflow-hidden bg-sand">{i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="48px" className="object-cover" />}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] text-ink">{i.title}</p>
                      <p className="text-[12.5px] text-muted">
                        {i.variantTitle ?? i.sku} · qty {i.quantity}
                        {i.ringSize && ` · size ${i.ringSize}`}
                        {i.engravingText && ` · engraved "${i.engravingText}"`}
                      </p>
                    </div>
                    <p className="text-[14px] tabular">{money(i.totalMinor)}</p>
                  </li>
                ))}
              </ul>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-line px-5 py-4 text-[13px] sm:grid-cols-4">
                {[
                  ["Items", money(so.subtotalMinor)],
                  ["Shipping & insurance", money(Number(so.shippingMinor) + Number(so.insuranceMinor))],
                  [`Commission (${bpsToPercent(so.commissionRateBps, 1)})`, money(so.commissionMinor)],
                  ["Jeweler net", money(so.sellerNetMinor)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[12px] text-muted">{k}</dt>
                    <dd className="tabular text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line px-5 py-3 text-[12.5px] text-ink-soft">
                <span>
                  Payout: {so.payout ? <StatusBadge status={so.payout.status} map={PAYOUT_STATUS} /> : "—"}
                  {so.payout?.holdReason && <span className="ml-1.5 text-muted">{so.payout.holdReason}</span>}
                </span>
                {so.shipments.map((s) => (
                  <span key={s.trackingNumber ?? s.carrier}>
                    {CARRIERS[s.carrier].label} <span className="font-mono">{s.trackingNumber ?? "—"}</span> · {humanize(s.status)}
                    {s.deliveredAt && ` ${formatDate(s.deliveredAt)}`}
                  </span>
                ))}
                <a href={`/api/documents/packing-slip/${so.id}`} className="underline underline-offset-2">
                  Packing slip
                </a>
              </div>
            </Card>
          ))}
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Totals" description={`Charged in ${o.currency}`} />
            <dl className="space-y-2 px-5 py-4 text-[13.5px]">
              {[
                ["Items", o.subtotalMinor],
                ["Shipping", o.shippingMinor],
                ["Insurance", o.insuranceMinor],
                [`Tax${o.taxProvider ? ` (${o.taxProvider})` : ""}`, o.taxMinor],
                [`Duties${o.dutiesMode ? ` · ${o.dutiesMode}` : ""}`, o.dutiesMinor],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-4">
                  <dt className="text-ink-soft">{k as string}</dt>
                  <dd className="tabular">{money(v as bigint)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 border-t border-line pt-2 font-medium">
                <dt>Total</dt>
                <dd className="tabular">{money(o.totalMinor)}</dd>
              </div>
              <div className="flex justify-between gap-4 text-ink-soft">
                <dt>Platform commission</dt>
                <dd className="tabular">{money(o.platformFeeMinor)}</dd>
              </div>
            </dl>
          </Card>
          <Card>
            <CardHeader title="Payments & refunds" />
            <ul className="divide-y divide-line text-[13.5px]">
              {o.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span>
                    {money(p.amountMinor)} · {p.provider === "DEMO" ? "Demo payment" : "Stripe"}
                    <span className="block text-[12px] text-muted">
                      {p.methodSummary ?? "—"} · <span className="font-mono">{p.providerRef ?? "—"}</span>
                    </span>
                  </span>
                  <StatusBadge status={p.status} map={PAYMENT_STATUS} />
                </li>
              ))}
              {o.refunds.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span>
                    −{money(r.amountMinor)} refund
                    <span className="block text-[12px] text-muted">
                      {r.reason} · {r.isForced ? "forced by Loupe" : humanize(r.initiatedBy)} · {formatDate(r.createdAt)}
                    </span>
                  </span>
                  <span className="text-[12.5px] text-ink-soft">{humanize(r.status)}</span>
                </li>
              ))}
            </ul>
          </Card>
          {o.disputes.length > 0 && (
            <Card>
              <CardHeader title="Disputes" />
              <ul className="divide-y divide-line">
                {o.disputes.map((d) => (
                  <li key={d.id} className="flex items-center justify-between px-5 py-3">
                    <Link href={`/admin/disputes/${d.id}`} className="font-mono text-[13px] hover:underline">
                      {d.caseNumber}
                    </Link>
                    <StatusBadge status={d.status} map={DISPUTE_STATUS} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
