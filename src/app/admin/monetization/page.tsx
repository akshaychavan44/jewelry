import type { Metadata } from "next";
import { PageHeader } from "@/components/account/page-header";
import { CommissionRules, PlanEditor, PlatformSettingsForm } from "@/components/admin/monetization-forms";
import { StatTile } from "@/components/charts/charts";
import { Card, CardHeader } from "@/components/ui/display";
import { formatDate } from "@/lib/format";
import { bpsToPercent, formatMoney, toMajor } from "@/lib/money";
import { num } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";
import { getRevenueBreakdown } from "@/server/services/admin";

export const metadata: Metadata = { title: "Monetization" };

const isoDay = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function MonetizationPage() {
  await requireAdmin();
  const [settings, rules, categories, sellers, plans, subscriberCounts, revenue] = await Promise.all([
    db.platformSettings.findUniqueOrThrow({ where: { id: "platform" } }),
    db.commissionRule.findMany({ orderBy: [{ isActive: "desc" }, { priority: "desc" }, { createdAt: "asc" }], include: { category: { select: { name: true, parent: { select: { name: true } } } }, seller: { select: { storeName: true } } } }),
    db.category.findMany({ where: { isActive: true }, include: { parent: { select: { name: true } } }, orderBy: [{ parentId: "asc" }, { position: "asc" }] }),
    db.sellerProfile.findMany({ where: { verificationStatus: { in: ["APPROVED", "SUSPENDED"] } }, select: { id: true, storeName: true }, orderBy: { storeName: "asc" } }),
    db.subscriptionPlan.findMany({ orderBy: { position: "asc" } }),
    db.sellerSubscription.groupBy({ by: ["planId"], where: { status: "ACTIVE" }, _count: { _all: true } }),
    getRevenueBreakdown(30),
  ]);
  const usd = (m: number) => formatMoney(m, "USD");

  return (
    <>
      <PageHeader eyebrow="Business" title="Listing Plans & Subscriptions" description="Directory membership plans and subscription billing for jewelers on Loupe. Jewelers manage direct client transactions with 0% sales commission." />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile label="Plan subscriptions · 30 days" value={usd(revenue.subscriptions)} hint={`${subscriberCounts.reduce((n, s) => n + s._count._all, 0)} active paying jewelers`} />
        <StatTile label="Active subscribers" value={subscriberCounts.reduce((n, s) => n + s._count._all, 0).toLocaleString("en-US")} hint="Jewelers on active listing plans" />
        <StatTile label="Listing tiers" value={plans.length.toLocaleString("en-US")} hint="Active subscription tiers" />
        <StatTile label="Platform fee model" value="0% Commission" hint="Direct jeweler-client sales" />
      </div>

      <Card className="mt-6">
        <CardHeader title="Platform settings" description={`Last changed ${formatDate(settings.updatedAt, "dateTime")}`} />
        <div className="p-5">
          <PlatformSettingsForm
            initial={{
              defaultCommissionPercent: String(settings.defaultCommissionBps / 100),
              listingFee: String(toMajor(num(settings.listingFeeMinor), settings.listingFeeCurrency)),
              listingFeeCurrency: settings.listingFeeCurrency,
              inspectionWindowDays: String(settings.inspectionWindowDays),
              offerExpiryHours: String(settings.offerExpiryHours),
              minOfferPercent: String(settings.minOfferBps / 100),
              reservationMinutes: String(settings.reservationMinutes),
              signatureThresholdUsd: String(num(settings.signatureThresholdUsd) / 100),
              secureCourierThresholdUsd: String(num(settings.secureCourierThresholdUsd) / 100),
              requiredKycDocuments: settings.requiredKycDocuments,
            }}
          />
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Commission rules"
          description={`Resolution order: a jeweler's own override, then the highest-priority jeweler rule, then category rule, then the ${bpsToPercent(settings.defaultCommissionBps)} default. Plan discounts apply to rules and the default.`}
        />
        <div className="p-5">
          <CommissionRules
            categories={categories.map((c) => ({ id: c.id, label: c.parent ? `${c.parent.name} › ${c.name}` : c.name })).sort((a, b) => a.label.localeCompare(b.label))}
            sellers={sellers.map((s) => ({ id: s.id, label: s.storeName }))}
            rules={rules.map((r) => ({
              id: r.id,
              name: r.name,
              scope: r.sellerId ? "SELLER" : "CATEGORY",
              categoryId: r.categoryId ?? "",
              sellerId: r.sellerId ?? "",
              target: r.seller?.storeName ?? (r.category ? (r.category.parent ? `${r.category.parent.name} › ${r.category.name}` : r.category.name) : "—"),
              ratePercent: String(r.rateBps / 100),
              priority: String(r.priority),
              isActive: r.isActive,
              startsAt: isoDay(r.startsAt),
              endsAt: isoDay(r.endsAt),
              window: r.startsAt || r.endsAt ? `${r.startsAt ? formatDate(r.startsAt) : "Now"} – ${r.endsAt ? formatDate(r.endsAt) : "ongoing"}` : "Always",
            }))}
          />
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Featured-store plans" description="Subscriptions bill monthly through Stripe. Price changes apply from each subscriber's next billing period." />
        <div className="p-5">
          <PlanEditor
            plans={plans.map((p) => ({
              id: p.id,
              code: p.code,
              name: p.name,
              description: p.description ?? "",
              price: String(toMajor(num(p.priceMinor), p.currency)),
              currency: p.currency,
              commissionDiscountPercent: String(p.commissionDiscountBps / 100),
              featuredSlots: String(p.featuredSlots),
              homepagePlacement: p.homepagePlacement,
              listingFeeWaived: p.listingFeeWaived,
              features: p.features.join("\n"),
              isActive: p.isActive,
              subscribers: subscriberCounts.find((s) => s.planId === p.id)?._count._all ?? 0,
              effectiveCommission: bpsToPercent(Math.max(0, settings.defaultCommissionBps - p.commissionDiscountBps)),
            }))}
          />
        </div>
      </Card>
    </>
  );
}
