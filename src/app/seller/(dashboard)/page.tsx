import { AlertTriangle, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ColumnChart, StatTile, TimeSeriesChart } from "@/components/charts/charts";
import { PageHeader } from "@/components/account/page-header";
import { parseRange, RangeFilter } from "@/components/seller/range-filter";
import { Card, CardHeader, Stars, StatusBadge } from "@/components/ui/display";
import { timeAgo } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { FULFILLMENT_STATUS } from "@/lib/status";
import { firstParam, type SearchParams } from "@/lib/utils";
import { requireSeller } from "@/server/auth/session";
import { getSellerDashboard } from "@/server/services/seller-dashboard";

export const metadata: Metadata = { title: "Seller studio" };

export default async function SellerOverview({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { seller } = await requireSeller();
  const range = parseRange(firstParam((await searchParams).range));
  const d = await getSellerDashboard(seller.id, seller.defaultCurrency, range);
  const money = (m: number, compact = false) => formatMoney(m, seller.defaultCurrency, { compact });
  const vs = `vs previous ${range} days`;

  return (
    <>
      <PageHeader eyebrow="Seller studio" title={`Good day, ${seller.storeName}`} description={`Figures in ${seller.defaultCurrency}, converted at each order's exchange rate.`} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <RangeFilter basePath="/seller" value={range} />
        <p className="text-[12.5px] text-muted">Updated just now</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile label="Revenue" value={money(d.revenue, d.revenue >= 1_000_000_00)} delta={d.revenueDelta} deltaLabel={vs} trend={d.revenueSeries.slice(-12).map((p) => p.value)} />
        <StatTile label="Units sold" value={d.units.toLocaleString("en-US")} delta={d.unitsDelta} deltaLabel={vs} />
        <StatTile label="Average order" value={money(d.aov)} hint={`${d.orders} orders`} />
        <StatTile label="Store & listing views" value={d.views.toLocaleString("en-US")} delta={d.viewsDelta} deltaLabel={`${d.conversion.toFixed(1)}% converted`} trend={d.trafficSeries.slice(-12)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Revenue by day" description={`Item sales, last ${range} days`} />
          <div className="px-5 pt-4 pb-3">
            <TimeSeriesChart series={[{ name: "Revenue", points: d.revenueSeries }]} format={{ type: "money", currency: seller.defaultCurrency }} caption={`Daily revenue for the last ${range} days`} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Fulfilment queue" description="Paid orders by stage" action={<Link href="/seller/orders" className="text-[13px] text-ink underline underline-offset-4">Open orders</Link>} />
          <div className="px-5 pt-8 pb-3">
            <ColumnChart
              caption="Orders by fulfilment stage"
              format={{ type: "number" }}
              data={(["PENDING", "PROCESSING", "IN_PRODUCTION", "SHIPPED", "DELIVERED"] as const).map((s) => ({ label: FULFILLMENT_STATUS[s].label, value: d.queue[s] ?? 0 }))}
            />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Needs your attention" description="Oldest first" />
          <ul className="divide-y divide-line">
            {d.recentOrders.length === 0 && <li className="px-5 py-8 text-center text-[14px] text-muted">All caught up — nothing waiting.</li>}
            {d.recentOrders.map((so) => (
              <li key={so.id}>
                <Link href={`/seller/orders/${so.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-parchment/40">
                  <div className="relative size-12 shrink-0 overflow-hidden bg-sand">{so.items[0]?.imageUrl && <Image src={so.items[0].imageUrl} alt="" fill sizes="48px" className="object-cover" />}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] text-ink">{so.items.map((i) => i.title).join(", ")}</p>
                    <p className="text-[12.5px] text-muted">
                      <span className="font-mono">{so.reference}</span> · {timeAgo(so.createdAt)}
                      {so.items.some((i) => i.engravingText) && " · engraving"}
                      {so.items.some((i) => i.ringSize) && " · sizing"}
                    </p>
                  </div>
                  <StatusBadge status={so.status} map={FULFILLMENT_STATUS} />
                  <ArrowRight className="size-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Payouts" description="Escrow releases 3 days after delivery" action={<Link href="/seller/payouts" className="text-[13px] text-ink underline underline-offset-4">Details</Link>} />
            <dl className="grid grid-cols-3 gap-2 px-5 py-4 text-[12.5px]">
              {[
                ["Held", d.payouts.PENDING ?? 0],
                ["On hold", d.payouts.ON_HOLD ?? 0],
                ["Paid out", d.payouts.RELEASED ?? 0],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-muted">{label}</dt>
                  <dd className="mt-1 text-[15px] font-semibold text-ink">{money(value as number, (value as number) >= 1_000_000_00)}</dd>
                </div>
              ))}
            </dl>
            <p className="border-t border-line px-5 py-3 text-[12px] text-muted">Payout amounts are in each order&rsquo;s currency and settle to your account in {seller.defaultCurrency}.</p>
          </Card>
          <Card>
            <CardHeader title="Store rating" />
            <div className="flex items-center gap-4 px-5 py-4">
              <p className="text-[32px] leading-none font-semibold text-ink">{d.rating.ratingCount ? d.rating.ratingAverage.toFixed(1) : "—"}</p>
              <div>
                <Stars rating={d.rating.ratingAverage} size={13} />
                <p className="mt-1 text-[12.5px] text-muted">{d.rating.ratingCount} reviews · replies in ~{d.rating.responseTimeMinutes ?? "—"} min</p>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Low inventory" description="At or below your alert level" />
            {d.lowStock.length === 0 ? (
              <p className="px-5 py-4 text-[13.5px] text-muted">Stock levels look healthy.</p>
            ) : (
              <ul className="divide-y divide-line">
                {d.lowStock.map((v) => (
                  <li key={v.id} className="flex items-center gap-3 px-5 py-2.5 text-[13px]">
                    <AlertTriangle className={v.stockQuantity === 0 ? "size-4 text-rosewood" : "size-4 text-amber"} />
                    <Link href={`/seller/products/${v.product.id}`} className="min-w-0 flex-1 truncate text-ink hover:underline">
                      {v.product.title} <span className="text-muted">· {v.title}</span>
                    </Link>
                    <span className="font-mono text-[12px] text-ink-soft">{v.stockQuantity} left</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
