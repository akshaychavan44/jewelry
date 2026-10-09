import { PageHeader } from "@/components/account/page-header";
import { StoreProfileForm } from "@/components/seller/onboarding-forms";
import { PlanPicker, PoliciesForm, RateCardEditor } from "@/components/seller/settings-forms";
import { PublicContactForm } from "@/components/seller/public-contact-form";
import { Card, CardHeader } from "@/components/ui/display";
import { bpsToPercent, formatMoney, toMajor } from "@/lib/money";
import { num } from "@/lib/utils";
import { updateStoreProfileAction } from "@/server/actions/onboarding";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";

export default async function SellerSettings() {
  const { seller } = await requireSeller();
  const [full, rates, plans, settings] = await Promise.all([
    db.sellerProfile.findUniqueOrThrow({ where: { id: seller.id }, include: { locations: { orderBy: { id: "asc" } }, returnAddress: true, subscription: { include: { plan: true } } } }),
    db.shippingRate.findMany({ where: { sellerId: seller.id }, orderBy: [{ zone: "asc" }, { method: "asc" }] }),
    db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
    db.platformSettings.findUniqueOrThrow({ where: { id: "platform" } }),
  ]);

  return (
    <>
      <PageHeader title="Store settings" description="How your atelier profile, showcase policies and listing subscription appear." />
      <div className="space-y-6">
        <Card>
          <CardHeader title="Store profile" description="Shown on your atelier profile, product showcases and the jeweler directory." />
          <div className="p-5">
            <StoreProfileForm store={{ ...full, returnAddress: full.returnAddress }} action={updateStoreProfileAction} submitLabel="Save profile" />
          </div>
        </Card>
        <Card>
          <CardHeader title="Public contact & showroom" description="Help customers call, WhatsApp or visit your business directly." />
          <div className="p-5">
            <PublicContactForm key={full.locations[0]?.id ?? "new"} initial={{
              id: full.locations[0]?.id,
              name: full.locations[0]?.name ?? full.storeName,
              line1: full.locations[0]?.line1 ?? "",
              city: full.locations[0]?.city ?? full.city ?? "",
              phone: full.locations[0]?.phone ?? "",
              hours: full.locations[0]?.hours ?? "",
              appointmentOnly: full.locations[0]?.appointmentOnly ?? false,
            }} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Policies" description="Direct communication, commission lead handling and workshop policies." />
          <div className="p-5">
            <PoliciesForm initial={{ returnWindowDays: full.returnWindowDays, handlingDays: full.handlingDays, acceptsOffers: full.acceptsOffers, acceptsCustomOrders: full.acceptsCustomOrders }} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Fulfillment & Dispatch Information" description={`Displayed on your piece showcases. Domestic means within ${seller.country}.`} />
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
          <CardHeader title="Listing Subscription Plan" description="Choose your directory listing subscription plan. 0% sales commission across all plans." />
          <div className="p-5">
            <PlanPicker
              current={full.subscription?.status === "ACTIVE" ? full.subscription.plan.code : "atelier"}
              plans={plans.map((p) => ({
                code: p.code,
                name: p.name,
                price: num(p.priceMinor) === 0 ? "Free" : `${formatMoney(num(p.priceMinor), p.currency)}/mo`,
                commission: "0%",
                features: p.features,
              }))}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="Listing & Membership Status" />
          <p className="px-5 py-4 text-[14px] text-ink-soft">
            Verification status: <span className="font-medium text-ink">{full.verificationStatus}</span> · Listing plan: <span className="font-medium text-ink">{full.subscription?.plan.name ?? "Atelier"}</span>
            <span className="mt-1 block text-[12.5px] text-muted">All customer inquiries, consultations, sales, payments, and fulfillment are handled directly and independently by your atelier.</span>
          </p>
        </Card>
      </div>
    </>
  );
}

