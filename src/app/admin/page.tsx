import { ArrowRight, FileCheck2, Landmark, Scale, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/account/page-header";
import { ColumnChart, StatTile, TimeSeriesChart } from "@/components/charts/charts";
import { parseRange, RangeFilter } from "@/components/seller/range-filter";
import { Card, CardHeader, Monogram, Table, Td, Th } from "@/components/ui/display";
import { SERIES } from "@/lib/chart-palette";
import { formatMoney } from "@/lib/money";
import { countryName } from "@/lib/regions";
import { FULFILLMENT_STATUS } from "@/lib/status";
import { cn, firstParam, pluralize, type SearchParams } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/session";
import { getPlatformAnalytics } from "@/server/services/admin";

export default async function AdminOverview({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const range = parseRange(firstParam((await searchParams).range));
  const d = await getPlatformAnalytics(range);
  const usd = (m: number) => formatMoney(m, "USD", { compact: m >= 1_000_000_00 });
  const vs = `vs previous ${range} days`;
  const topGmv = d.topSellers[0]?.gmv ?? 1;

  const queues = [
    { href: "/admin/kyc", icon: FileCheck2, count: d.queues.kyc, label: pluralize(d.queues.kyc, "application") + " awaiting review" },
    { href: "/admin/disputes", icon: Scale, count: d.queues.disputes, label: `${pluralize(d.queues.disputes, "open dispute")}${d.queues.urgent ? ` · ${d.queues.urgent} high priority` : ""}` },
    { href: "/admin/certificates", icon: ShieldCheck, count: d.queues.certificates, label: pluralize(d.queues.certificates, "certificate") + " to verify" },
    { href: "/admin/payouts?view=hold", icon: Landmark, count: d.queues.heldPayouts, label: pluralize(d.queues.heldPayouts, "payout") + " on hold" },
  ];

  return (
    <>
      <PageHeader eyebrow="Admin console" title="Platform overview" description="Marketplace health across every jeweler. Amounts in USD at each order's exchange rate." />

      <section aria-label="Work queues" className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {queues.map(({ href, icon: Icon, count, label }) => (
          <Link key={href} href={href} className={cn("group flex items-center gap-3 rounded-[3px] border px-4 py-3.5 transition-colors", count ? "border-gold/40 bg-gold-mist/40 hover:border-gold" : "border-line bg-porcelain hover:border-line-strong")}>
            <Icon className={cn("size-5 shrink-0", count ? "text-gold" : "text-muted")} strokeWidth={1.5} />
            <span className="min-w-0 flex-1 text-[13.5px] text-ink">{count ? label : label.replace(/^\d+/, "No")}</span>
            <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </section>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <RangeFilter basePath="/admin" value={range} />
        <p className="text-[12.5px] text-muted">GMV = item value of paid orders, excluding tax, duties and shipping.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile label="Gross merchandise value" value={usd(d.gmv)} delta={d.gmvDelta} deltaLabel={vs} trend={d.gmvSeries.slice(-14).map((p) => p.value)} />
        <StatTile label="Net commission" value={usd(d.netCommission)} delta={d.netCommissionDelta} deltaLabel={`${d.takeRate.toFixed(1)}% take rate`} />
        <StatTile label="Active inventory" value={d.listings.toLocaleString("en-US")} hint={`${d.units.toLocaleString("en-US")} pieces in stock`} />
        <StatTile label="Active stores" value={d.stores.active.toLocaleString("en-US")} hint={`${d.stores.newInRange} newly approved · ${d.stores.pending} pending`} />
        <StatTile label="Orders" value={d.orders.toLocaleString("en-US")} delta={d.ordersDelta} deltaLabel={vs} />
        <StatTile label="Average order value" value={usd(d.aov)} hint="Item value per order" />
        <StatTile label="Sessions" value={d.sessions.toLocaleString("en-US")} delta={d.sessionsDelta} deltaLabel={vs} trend={d.trafficSeries.slice(-14).map((p) => p.value)} />
        <StatTile label="Conversion" value={`${d.conversion.toFixed(2)}%`} hint={`${usd(d.refunds)} refunded · ${usd(d.fees)} in fees`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Gross merchandise value by day" description={`Last ${range} days`} />
          <div className="px-5 pt-4 pb-3">
            <TimeSeriesChart series={[{ name: "GMV", points: d.gmvSeries }]} format={{ type: "money", currency: "USD" }} caption={`Daily gross merchandise value, last ${range} days`} colors={[SERIES[0]]} height={220} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Commission earned by day" description={`Before refunds · ${usd(d.reversals)} reversed this period`} />
          <div className="px-5 pt-4 pb-3">
            <TimeSeriesChart series={[{ name: "Commission", points: d.commissionSeries }]} format={{ type: "money", currency: "USD" }} caption={`Daily commission earned, last ${range} days`} colors={[SERIES[1]]} height={220} />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Sessions by day" description="Unique visits, cookie-less and anonymised" />
          <div className="px-5 pt-4 pb-3">
            <TimeSeriesChart series={[{ name: "Sessions", points: d.trafficSeries }]} format={{ type: "number" }} caption={`Daily sessions, last ${range} days`} height={220} />
          </div>
        </Card>
        <Card>
          <CardHeader title="GMV by category" description={`Last ${range} days`} />
          <div className="px-5 pt-8 pb-3">
            <ColumnChart data={d.categories.slice(0, 6)} format={{ type: "money", currency: "USD" }} caption="Gross merchandise value by category" />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Top jewelers" description={`By GMV, last ${range} days`} action={<Link href="/admin/kyc?status=APPROVED" className="text-[13px] text-ink underline underline-offset-4">All jewelers</Link>} />
          <Table>
            <thead>
              <tr>
                <Th>Jeweler</Th>
                <Th className="text-right">GMV</Th>
                <Th className="text-right">Commission</Th>
                <Th className="text-right">Orders</Th>
              </tr>
            </thead>
            <tbody>
              {d.topSellers.length === 0 && (
                <tr>
                  <Td colSpan={4} className="py-8 text-center text-muted">
                    No sales in this period.
                  </Td>
                </tr>
              )}
              {d.topSellers.map((s) => (
                <tr key={s.id}>
                  <Td>
                    <Link href={`/admin/kyc/${s.id}`} className="flex items-center gap-3 hover:underline">
                      <Monogram name={s.storeName} src={s.logoUrl} size={30} />
                      <span className="min-w-0">
                        <span className="block truncate text-[14px]">{s.storeName}</span>
                        <span className="block text-[12px] text-muted">{countryName(s.country)}</span>
                      </span>
                    </Link>
                  </Td>
                  <Td className="text-right">
                    <span className="tabular font-medium">{usd(s.gmv)}</span>
                    <span className="mt-1.5 ml-auto block h-1 w-24 rounded-full bg-sand/70" aria-hidden>
                      <span className="block h-1 rounded-full" style={{ width: `${Math.max(4, (s.gmv / topGmv) * 100)}%`, background: SERIES[0] }} />
                    </span>
                  </Td>
                  <Td className="text-right tabular text-ink-soft">{usd(s.commission)}</Td>
                  <Td className="text-right tabular text-ink-soft">{s.orders}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="Seller orders by stage" description={`Placed in the last ${range} days`} />
          <div className="px-5 pt-8 pb-3">
            <ColumnChart
              caption="Seller orders by fulfilment stage"
              format={{ type: "number" }}
              data={(["PENDING", "PROCESSING", "IN_PRODUCTION", "SHIPPED", "DELIVERED", "REFUNDED"] as const).map((s) => ({ label: FULFILLMENT_STATUS[s].label, value: d.stages[s] ?? 0 }))}
            />
          </div>
        </Card>
      </div>
    </>
  );
}
