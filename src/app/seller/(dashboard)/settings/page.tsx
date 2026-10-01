import { PageHeader } from "@/components/account/page-header";
import { StoreProfileForm } from "@/components/seller/onboarding-forms";
import { PlanPicker, PoliciesForm, RateCardEditor } from "@/components/seller/settings-forms";
import { Card, CardHeader } from "@/components/ui/display";
import { bpsToPercent, formatMoney, toMajor } from "@/lib/money";
import { num } from "@/lib/utils";
import { updateStoreProfileAction } from "@/server/actions/onboarding";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";

export default async function SellerSettings() {
  const { seller } = await requireSeller();
  const [full, rates, plans, settings] = await Promise.all([
    db.sellerProfile.findUniqueOrThrow({ where: { id: seller.id }, include: { returnAddress: true, subscription: { include: { plan: true } } } }),
    db.shippingRate.findMany({ where: { sellerId: seller.id }, orderBy: [{ zone: "asc" }, { method: "asc" }] }),
    db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
    db.platformSettings.findUniqueOrThrow({ where: { id: "platform" } }),
  ]);

  return (
    <>
      <PageHeader title="Store settings" description="How your store appears, ships and gets paid." />
      <div className="space-y-6">
        <Card>
          <CardHeader title="Store profile" description="Shown on your storefront, product pages and the jeweler directory." />
          <div className="p-5">
            <StoreProfileForm store={{ ...full, returnAddress: full.returnAddress }} action={updateStoreProfileAction} submitLabel="Save profile" />
          </div>
        </Card>
        <Card>
          <CardHeader title="Policies" />
          <div className="p-5">
            <PoliciesForm initial={{ returnWindowDays: full.returnWindowDays, handlingDays: full.handlingDays, acceptsOffers: full.acceptsOffers, acceptsCustomOrders: full.acceptsCustomOrders }} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Shipping rate card" description={`Prices in ${seller.defaultCurrency}. Domestic means within ${seller.country}.`} />
          <div className="p-5">
            <RateCardEditor
              currency={seller.defaultCurrency}
              initial={rates.map((r) => ({
                zone: r.zone,
                method: r.method,
                carrier: r.carrier,
                price: String(toMajor(num(r.priceMinor), r.currency)),
                freeOver: r.freeOverMinor === null ? "" : String(toMajor(num(r.freeOverMinor), r.currency)),
                minDays: String(r.minDays),
                maxDays: String(r.maxDays),
                insuranceRateBps: String(r.insuranceRateBps),
                isActive: r.isActive,
              }))}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="Plan" description="Featured-store subscriptions lower your commission and add visibility." />
          <div className="p-5">
            <PlanPicker
              current={full.subscription?.status === "ACTIVE" ? full.subscription.plan.code : "atelier"}
              plans={plans.map((p) => ({
                code: p.code,
                name: p.name,
                price: num(p.priceMinor) === 0 ? "Free" : `${formatMoney(num(p.priceMinor), p.currency)}/mo`,
                commission: bpsToPercent(settings.defaultCommissionBps - p.commissionDiscountBps),
                features: p.features,
              }))}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="Payout account" />
          <p className="px-5 py-4 text-[14px] text-ink-soft">
            {full.payoutMethod === "STRIPE_CONNECT"
              ? `Stripe Connect · ${full.stripeAccountId ?? "—"} · payouts ${full.stripePayoutsEnabled ? "enabled" : "pending verification"}`
              : `Bank transfer · ${full.bankName ?? "—"} ••••${full.bankAccountLast4 ?? "—"} · ${full.payoutCurrency ?? seller.defaultCurrency}`}
            <span className="mt-1 block text-[12.5px] text-muted">For your security, payout accounts are changed with our verification team — email payouts@loupe.example.</span>
          </p>
        </Card>
      </div>
    </>
  );
}
