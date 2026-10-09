import { ArrowRight, MessageSquare, Sparkles, Gem, HandCoins } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { StatTile, TimeSeriesChart } from "@/components/charts/charts";
import { PageHeader } from "@/components/account/page-header";
import { parseRange, RangeFilter } from "@/components/seller/range-filter";
import { Card, CardHeader, Stars } from "@/components/ui/display";
import { timeAgo } from "@/lib/format";
import { firstParam, type SearchParams } from "@/lib/utils";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";
import { getSellerDashboard } from "@/server/services/seller-dashboard";

export const metadata: Metadata = { title: "Seller studio" };

export default async function SellerOverview({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { seller, user } = await requireSeller();
  const range = parseRange(firstParam((await searchParams).range));
  const [d, activeListings, pendingOffers, activeCommissions, recentInquiries, subscription] = await Promise.all([
    getSellerDashboard(seller.id, seller.defaultCurrency, range),
    db.product.count({ where: { sellerId: seller.id, status: "ACTIVE", deletedAt: null } }),
    db.offer.count({ where: { sellerId: seller.id, status: { in: ["PENDING", "COUNTERED"] } } }),
    db.customRequest.count({ where: { sellerId: seller.id, status: { notIn: ["COMPLETED", "DECLINED"] } } }),
    db.conversation.findMany({
      where: { participants: { some: { userId: user.id } } },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        participants: { include: { user: { select: { id: true, name: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        product: { select: { title: true, images: { take: 1, select: { url: true } } } },
      },
    }),
    db.sellerSubscription.findUnique({ where: { sellerId: seller.id }, include: { plan: true } }),
  ]);
  const vs = `vs previous ${range} days`;

  return (
    <>
      <PageHeader
        eyebrow="Jeweler studio"
        title={`Good day, ${seller.storeName}`}
        description="Monitor showcase engagement, respond to client inquiries, and manage bespoke commissions."
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <RangeFilter basePath="/seller" value={range} />
        <p className="text-[12.5px] text-muted">Direct atelier transactions · 0% commission</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile label="Showcase & profile views" value={d.views.toLocaleString("en-US")} delta={d.viewsDelta} deltaLabel={vs} trend={d.trafficSeries.slice(-12)} />
        <StatTile label="Active showcase pieces" value={activeListings.toLocaleString("en-US")} hint="Published in directory" />
        <StatTile label="Price proposals" value={pendingOffers.toLocaleString("en-US")} hint="Awaiting response or discussion" />
        <StatTile label="Bespoke commissions" value={activeCommissions.toLocaleString("en-US")} hint="Active client design briefs" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Showcase traffic & engagement" description={`Atelier views, last ${range} days`} />
          <div className="px-5 pt-4 pb-3">
            <TimeSeriesChart
              series={[{ name: "Showcase Views", points: d.revenueSeries.map((p, i) => ({ date: p.date, value: d.trafficSeries[i] ?? 0 })) }]}
              format={{ type: "number" }}
              caption={`Daily profile and piece showcase views for the last ${range} days`}
            />
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Listing subscription"
            description="Directory visibility plan"
            action={
              <Link href="/seller/settings" className="text-[13px] text-ink underline underline-offset-4">
                Manage plan
              </Link>
            }
          />
          <div className="space-y-4 px-5 pt-5 pb-5">
            <div className="rounded-[3px] border border-line bg-ivory p-4">
              <p className="caps text-[11px] text-muted">Current plan</p>
              <p className="mt-1 font-display text-[20px] text-ink">{subscription?.plan.name ?? "Atelier Listing"}</p>
              <p className="mt-1 text-[13px] text-moss font-medium">● 0% commission on direct client sales</p>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link href="/seller/products/new" className="inline-flex items-center gap-1.5 rounded-[2px] bg-ink px-3 py-2 text-[13px] text-ivory hover:bg-ink-soft">
                <Gem className="size-3.5" /> Add showcase piece
              </Link>
              <Link href="/seller/pricing" className="inline-flex items-center gap-1.5 rounded-[2px] border border-line bg-porcelain px-3 py-2 text-[13px] text-ink hover:bg-parchment">
                <Sparkles className="size-3.5" /> Live metal rates
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent client inquiries & messages"
            description="Customers inquiring directly about your pieces"
            action={
              <Link href="/seller/messages" className="text-[13px] text-ink underline underline-offset-4">
                View all messages
              </Link>
            }
          />
          <ul className="divide-y divide-line">
            {recentInquiries.length === 0 && <li className="px-5 py-8 text-center text-[14px] text-muted">No client inquiries yet. Active showcases will generate direct inquiries here.</li>}
            {recentInquiries.map((convo) => {
              const other = convo.participants.find((p) => p.user.id !== user.id)?.user;
              const last = convo.messages[0];
              return (
                <li key={convo.id}>
                  <Link href={`/seller/messages/${convo.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-parchment/40">
                    <div className="relative size-12 shrink-0 overflow-hidden bg-sand">
                      {convo.product?.images[0]?.url ? (
                        <Image src={convo.product.images[0].url} alt="" fill sizes="48px" className="object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-muted">
                          <MessageSquare className="size-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-ink">{other?.name ?? "Direct Inquirer"}</p>
                      <p className="truncate text-[13px] text-ink-soft">{last?.body ?? (convo.product ? `Inquiry about ${convo.product.title}` : "Direct inquiry")}</p>
                      <p className="text-[12px] text-muted">{timeAgo(convo.updatedAt)}</p>
                    </div>
                    <ArrowRight className="size-4 text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Atelier reputation & reviews" />
            <div className="flex items-center gap-4 px-5 py-4">
              <p className="text-[32px] leading-none font-semibold text-ink">{d.rating.ratingCount ? d.rating.ratingAverage.toFixed(1) : "—"}</p>
              <div>
                <Stars rating={d.rating.ratingAverage} size={13} />
                <p className="mt-1 text-[12.5px] text-muted">{d.rating.ratingCount} client reviews · verified credentials</p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Direct atelier workflow" />
            <div className="space-y-3 px-5 py-4 text-[13px] text-ink-soft">
              <div className="flex items-start gap-2.5">
                <HandCoins className="mt-0.5 size-4 shrink-0 text-sage" />
                <p>
                  <strong className="font-medium text-ink">Direct arrangements:</strong> Payment, dispatch, bespoke sizing, and warranties are handled directly with your customer.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-sage" />
                <p>
                  <strong className="font-medium text-ink">No transaction cut:</strong> Keep 100% of your sale value without marketplace transaction fees.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

