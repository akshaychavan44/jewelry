import { ArrowRight, FileCheck2, ShieldCheck, Users, Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/account/page-header";
import { ColumnChart, StatTile, TimeSeriesChart } from "@/components/charts/charts";
import { parseRange, RangeFilter } from "@/components/seller/range-filter";
import { Card, CardHeader, Monogram, Table, Td, Th } from "@/components/ui/display";
import { SERIES } from "@/lib/chart-palette";
import { countryName } from "@/lib/regions";
import { cn, firstParam, pluralize, type SearchParams } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";
import { getPlatformAnalytics } from "@/server/services/admin";

export const metadata: Metadata = { title: "Platform Overview" };

export default async function AdminOverview({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const range = parseRange(firstParam((await searchParams).range));
  const [d, topJewelers] = await Promise.all([
    getPlatformAnalytics(range),
    db.sellerProfile.findMany({
      where: { verificationStatus: "APPROVED" },
      take: 10,
      orderBy: { products: { _count: "desc" } },
      select: {
        id: true, storeName: true, logoUrl: true, country: true,
        _count: { select: { products: { where: { status: "ACTIVE", deletedAt: null } }, offers: true, customRequests: true } },
      },
    }),
  ]);
  const vs = `vs previous ${range} days`;

  const queues = [
    { href: "/admin/kyc", icon: FileCheck2, count: d.queues.kyc, label: pluralize(d.queues.kyc, "application") + " awaiting review" },
    { href: "/admin/certificates", icon: ShieldCheck, count: d.queues.certificates, label: pluralize(d.queues.certificates, "certificate") + " to verify" },
    { href: "/admin/verification-settings", icon: Settings, count: 0, label: "Manage verification settings" },
    { href: "/admin/users", icon: Users, count: 0, label: "Manage platform users" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Admin console"
        title="Directory & Platform Overview"
        description="Directory operations, jeweler verification queues, and customer enquiries."
      />

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
        <p className="text-[12.5px] text-muted">Free jeweler directory</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile label="Active showcase listings" value={d.listings.toLocaleString("en-US")} hint="Published jewelry showcase pieces" />
        <StatTile label="Verified ateliers" value={d.stores.active.toLocaleString("en-US")} hint={`${d.stores.newInRange} approved in range · ${d.stores.pending} pending`} />
        <StatTile label="Custom enquiries" value={d.enquiries.toLocaleString("en-US")} hint={`Received in the last ${range} days`} />
        <StatTile label="Customer directory sessions" value={d.sessions.toLocaleString("en-US")} delta={d.sessionsDelta} deltaLabel={vs} trend={d.trafficSeries.slice(-14).map((p) => p.value)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Directory traffic & visits by day" description="Unique browsing sessions, cookie-less and anonymised" />
          <div className="px-5 pt-4 pb-3">
            <TimeSeriesChart series={[{ name: "Sessions", points: d.trafficSeries }]} format={{ type: "number" }} caption={`Daily sessions, last ${range} days`} colors={[SERIES[0]]} height={220} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Showcase listings by category" description="Active jewelry showcases in directory" />
          <div className="px-5 pt-8 pb-3">
            <ColumnChart data={d.categories.slice(0, 6)} format={{ type: "number" }} caption="Listings by category" />
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader title="Featured & Verified Ateliers" description="Top jeweler listings on Jewelrex" action={<Link href="/admin/kyc?status=APPROVED" className="text-[13px] text-ink underline underline-offset-4">All jewelers</Link>} />
          <Table>
            <thead>
              <tr>
                <Th>Jeweler</Th>
                <Th className="text-right">Active Showcase Pieces</Th>
                <Th className="text-right">Price Inquiries</Th>
                <Th className="text-right">Custom Enquiries</Th>
              </tr>
            </thead>
            <tbody>
              {topJewelers.length === 0 && (
                <tr>
                  <Td colSpan={4} className="py-8 text-center text-muted">
                    No jewelers registered yet.
                  </Td>
                </tr>
              )}
              {topJewelers.map((s) => (
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
                  <Td className="text-right font-medium tabular">{s._count.products}</Td>
                  <Td className="text-right tabular text-ink-soft">{s._count.offers}</Td>
                  <Td className="text-right tabular text-ink-soft">{s._count.customRequests}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}

