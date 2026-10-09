import { BadgeCheck, CircleDollarSign, FileBadge2, Gauge, Globe2, MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { imagery, siteConfig } from "@/config/site";
import { formatMoney } from "@/lib/money";
import { cn, num } from "@/lib/utils";
import { becomeSellerAction } from "@/server/actions/auth";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";

export const metadata: Metadata = {
  title: "List Your Jewelry Business | Loupe",
  description: "Join the verified directory of independent fine jewelers. Showcase your pieces, receive direct customer inquiries, and pay 0% sales commission.",
};

const BENEFITS = [
  {
    icon: Globe2,
    title: "Direct client relationships",
    body: "Customers discover your showcase and contact you directly via phone, email, website, showroom visit, or Loupe messaging.",
  },
  {
    icon: CircleDollarSign,
    title: "0% Sales Commission",
    body: "You keep 100% of every sale. You arrange payments, custom quotes, invoices, and delivery directly with your clients.",
  },
  {
    icon: BadgeCheck,
    title: "Verified Jeweler Badge",
    body: "Every jeweler passes business registration and identity verification, giving luxury collectors immediate confidence in your atelier.",
  },
  {
    icon: FileBadge2,
    title: "Showcase & Lab Reports",
    body: "Display high jewelry, bespoke commissions, and vintage pieces with attached GIA, IGI, or hallmark authenticity certificates.",
  },
  {
    icon: Gauge,
    title: "Live metal pricing tool",
    body: "Optionally link plain gold jewelry to real-time spot rates with your making charges calculated automatically.",
  },
  {
    icon: MessageSquare,
    title: "Bespoke commission leads",
    body: "Receive custom brief inquiries from clients looking for bespoke rings, heirloom redesigns, and custom jewelry.",
  },
];

const STEPS = [
  { title: "Register your atelier", body: "Set up your business name, bio, showroom address, contact channels, and portfolio." },
  { title: "Business verification", body: "Submit business registration and identity documents to earn the Verified Jeweler badge." },
  { title: "Select listing plan", body: "Choose a transparent monthly or annual listing plan to host your digital showcase." },
  { title: "Publish & connect", body: "Publish your pieces to the directory and begin receiving direct client inquiries." },
];

export default async function SellPage() {
  const [user, plans] = await Promise.all([
    getCurrentUser(),
    db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
  ]);

  const cta =
    user?.role === "SELLER" ? (
      <Link href="/seller" className={buttonVariants({ size: "lg" })}>
        Go to your jeweler dashboard
      </Link>
    ) : user?.role === "BUYER" ? (
      <form action={becomeSellerAction}>
        <SubmitButton size="lg" pendingLabel="Setting up your jeweler account…">
          Register your jewelry business
        </SubmitButton>
      </form>
    ) : user?.role === "ADMIN" ? (
      <Link href="/admin" className={buttonVariants({ size: "lg" })}>
        Admin console
      </Link>
    ) : (
      <Link href="/register?intent=seller" className={buttonVariants({ size: "lg" })}>
        Apply to list your business
      </Link>
    );

  return (
    <>
      <section className="shell grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="eyebrow mb-5">For independent jewelers &amp; ateliers</p>
          <h1 className="display-xl text-ink">Your craftsmanship, directly connected to fine jewelry collectors</h1>
          <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-ink-soft">
            {siteConfig.name} is a dedicated software platform and directory for verified independent jewelers. Showcase your collection, receive direct client leads, and keep 100% of your earnings with zero transaction fees.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            {cta}
            <span className="text-[14px] text-muted">Transparent subscription pricing · 0% transaction fees</span>
          </div>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden bg-sand md:aspect-[5/6]">
          <Image src={imagery.sellCta} alt="A jeweler working at the bench" fill priority sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" />
        </div>
      </section>

      <section className="bg-parchment/60 py-20">
        <div className="shell">
          <h2 className="display-lg mb-12 max-w-xl text-ink">Built specifically for fine jewelry ateliers</h2>
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
        <h2 className="display-lg mb-3 text-ink">Listing Membership Plans</h2>
        <p className="mb-10 max-w-2xl text-[15px] text-ink-soft">
          Simple, transparent listing software subscriptions. Never pay sales commissions or per-transaction fees. All customer inquiries and payments are 100% direct.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan, i) => (
            <div key={plan.id} className={cn("flex flex-col rounded-[3px] border bg-porcelain p-7", i === 1 ? "border-sage shadow-soft" : "border-line")}>
              <p className="caps text-ink">{plan.name}</p>
              <p className="mt-4 font-display text-[36px] leading-none text-ink">
                {num(plan.priceMinor) === 0 ? "Starter" : formatMoney(num(plan.priceMinor), plan.currency)}
                {num(plan.priceMinor) > 0 && <span className="text-[15px] text-muted"> / month</span>}
              </p>
              <p className="mt-2 text-[14px] text-sage-deep">0% sales commission · Direct client payments</p>
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
              <div className="mt-8">
                {cta}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-greige py-20">
        <div className="shell grid gap-12 md:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="display-lg text-ink">How registration works</h2>
            <p className="mt-4 text-[15px] text-ink-soft">
              Register your business, upload your verification documents, and start preparing your showcase pieces.
            </p>
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
