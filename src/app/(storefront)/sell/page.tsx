import { BadgeCheck, CircleDollarSign, FileBadge2, Gauge, Globe2, RefreshCw } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { imagery } from "@/config/site";
import { bpsToPercent, formatMoney } from "@/lib/money";
import { cn, num } from "@/lib/utils";
import { becomeSellerAction } from "@/server/actions/auth";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Sell on Loupe", description: "A marketplace built for fine jewelers: verified buyers, certified listings, payments held in escrow." };

const BENEFITS = [
  { icon: Globe2, title: "Collectors in 60 countries", body: "Multi-currency pricing, duties calculated at checkout and insured shipping built in." },
  { icon: FileBadge2, title: "Certificates front and centre", body: "Attach GIA, IGI or hallmark reports to each SKU — buyers see them before they buy." },
  { icon: Gauge, title: "Live metal pricing", body: "Price plain gold by weight, today's spot rate and your making charge. Updated automatically." },
  { icon: RefreshCw, title: "Your POS stays in sync", body: "Shopify, Square or your own system — stock updates both ways, so unique pieces never double-sell." },
  { icon: CircleDollarSign, title: "Paid promptly, safely", body: "Stripe Connect payouts released three days after delivery. No chargeback surprises." },
  { icon: BadgeCheck, title: "Verified-only marketplace", body: "Every seller passes business and identity checks. Your neighbours are peers, not dropshippers." },
];

const STEPS = [
  { title: "Your store", body: "Name, story, logo, banner, currency and return address." },
  { title: "Business verification", body: "Tax ID, business licence and an identity document for the owner." },
  { title: "Payouts", body: "Connect Stripe or a business bank account in your currency." },
  { title: "Review", body: "Our team reviews applications within two working days." },
];

export default async function SellPage() {
  const [user, plans, settings] = await Promise.all([
    getCurrentUser(),
    db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
    db.platformSettings.findUnique({ where: { id: "platform" } }),
  ]);
  const commission = settings?.defaultCommissionBps ?? 1200;

  const cta =
    user?.role === "SELLER" ? (
      <Link href="/seller" className={buttonVariants({ size: "lg" })}>
        Go to your dashboard
      </Link>
    ) : user?.role === "BUYER" ? (
      <form action={becomeSellerAction}>
        <SubmitButton size="lg" pendingLabel="Opening your store…">
          Open your store
        </SubmitButton>
      </form>
    ) : user?.role === "ADMIN" ? null : (
      <Link href="/register?intent=seller" className={buttonVariants({ size: "lg" })}>
        Apply to sell
      </Link>
    );

  return (
    <>
      <section className="shell grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="eyebrow mb-5">For independent jewelers</p>
          <h1 className="display-xl text-ink">Your work, in front of people who can tell the difference</h1>
          <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-ink-soft">
            Loupe is a verified-only marketplace for fine, high and vintage jewelry. We handle payments, duties, insured logistics and disputes — you keep making.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            {cta}
            <span className="text-[14px] text-muted">From {bpsToPercent(commission - 300)} commission · no setup fee</span>
          </div>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden bg-sand md:aspect-[5/6]">
          <Image src={imagery.sellCta} alt="A jeweler working at the bench" fill priority sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" />
        </div>
      </section>

      <section className="bg-parchment/60 py-20">
        <div className="shell">
          <h2 className="display-lg mb-12 max-w-xl text-ink">Built for fine jewelry, not general merchandise</h2>
          <div className="grid gap-x-10 gap-y-12 md:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <Icon className="size-7 text-gold-deep" strokeWidth={1.1} aria-hidden />
                <h3 className="mt-4 font-display text-[21px] text-ink">{title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="shell py-20">
        <h2 className="display-lg mb-3 text-ink">Plans</h2>
        <p className="mb-10 max-w-2xl text-[15px] text-ink-soft">
          Commission is charged on the item price only — never on shipping, insurance or taxes. High jewelry sells at a reduced rate of 8%.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan, i) => (
            <div key={plan.id} className={cn("flex flex-col rounded-[3px] border bg-porcelain p-7", i === 1 ? "border-sage shadow-soft" : "border-line")}>
              <p className="caps text-ink">{plan.name}</p>
              <p className="mt-4 font-display text-[36px] leading-none text-ink">
                {num(plan.priceMinor) === 0 ? "Free" : formatMoney(num(plan.priceMinor), plan.currency)}
                {num(plan.priceMinor) > 0 && <span className="text-[15px] text-muted"> / month</span>}
              </p>
              <p className="mt-2 text-[14px] text-sage-deep">{bpsToPercent(commission - plan.commissionDiscountBps)} commission</p>
              <p className="mt-3 text-[14px] text-ink-soft">{plan.description}</p>
              <ul className="mt-6 flex-1 space-y-2.5 border-t border-line pt-6 text-[14px] text-ink-soft">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-gold" aria-hidden>
                      ✦
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-greige py-20">
        <div className="shell grid gap-12 md:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="display-lg text-ink">How approval works</h2>
            <p className="mt-4 text-[15px] text-ink-soft">Your dashboard unlocks the moment you&rsquo;re approved. Until then you can prepare listings as drafts.</p>
            <div className="mt-8">{cta}</div>
          </div>
          <ol className="grid gap-6 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <li key={s.title} className="border-t border-ink/20 pt-4">
                <span className="font-mono text-[12px] text-gold-deep">Step {i + 1}</span>
                <h3 className="mt-1 font-display text-[21px] text-ink">{s.title}</h3>
                <p className="mt-1.5 text-[14px] text-ink-soft">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
