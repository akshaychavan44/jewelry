import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  FileBadge2,
  Gauge,
  Globe2,
  MessageSquare,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth/session";
import styles from "./sell-hero.module.css";
import { JewelerHeroVideo } from "./hero-video";

export const metadata: Metadata = {
  title: "For Jewelers · List Your Atelier for Free | Loupe",
  description:
    "List your jewelry atelier for free on Loupe and connect directly with genuine buyers, collectors and jewelry enthusiasts. Grow your brand with 0% sales commission.",
};

const BENEFITS = [
  {
    icon: Globe2,
    title: "Direct client relationships",
    body: "Customers discover your showcase and contact you directly via phone, WhatsApp, email, showroom visits, or private consultations.",
  },
  {
    icon: CircleDollarSign,
    title: "0% Sales Commission",
    body: "Keep 100% of every sale. You arrange payments, custom quotes, invoices, and delivery directly with your clients with zero middleman cuts.",
  },
  {
    icon: BadgeCheck,
    title: "Verified Jeweler Badge",
    body: "Every atelier passes business verification and hallmark validation, giving luxury collectors immediate confidence in your craftsmanship.",
  },
  {
    icon: FileBadge2,
    title: "Showcase & Lab Reports",
    body: "Display high jewelry, bespoke commissions, and vintage pieces with attached GIA, IGI, or hallmark authenticity certificates.",
  },
  {
    icon: MessageSquare,
    title: "Bespoke commission leads",
    body: "Receive structured custom design briefs from clients looking for bespoke engagement rings, heirloom redesigns, and high jewelry.",
  },
  {
    icon: Gauge,
    title: "Live metal pricing tool",
    body: "Optionally link plain gold jewelry to real-time spot rates with your making charges calculated automatically.",
  },
];

export default async function SellPage() {
  const user = await getCurrentUser();

  const primaryCta = (
    <Link
      href={user ? "/seller/onboarding" : "/register?intent=seller"}
      className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-[3px] border border-[#896435] btn-gold px-8 py-3.5 text-[16px] font-medium tracking-[0.03em] shadow-sm transition-all duration-300 hover:shadow-md active:scale-[0.98]"
    >
      List Your Business <ArrowRight className="size-4" />
    </Link>
  );

  return (
    <>
      {/* ── 1. Hero Section ── */}
      <section className={styles.hero} aria-labelledby="jeweler-hero-heading">
        <JewelerHeroVideo />
        <div className={styles.blend} aria-hidden="true" />

        <div className={styles.content}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>
              For Independent Jewelers
            </p>

            <h1 id="jeweler-hero-heading" className={styles.heading}>
              Your Craft Deserves<br />
              to Be <span>Discovered.</span>
            </h1>

            <p className={styles.description}>
              List your jewelry atelier for free on Loupe and connect directly with genuine buyers, collectors and jewelry enthusiasts. Grow your brand with no sales commission.
            </p>

            <div className={styles.action}>
              {primaryCta}
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Benefits Grid ── */}
      <section className="border-b border-line bg-parchment/60 py-20">
        <div className="shell">
          <div className="max-w-2xl">
            <p className="eyebrow mb-2">Built for craftsmanship</p>
            <h2 className="display-lg text-ink">Why independent jewelers choose to list on Loupe</h2>
            <p className="mt-3 text-[15.5px] text-ink-soft">
              Unlike generic marketplaces that take high commissions and hide client information, Loupe connects you directly with serious luxury buyers.
            </p>
          </div>

          <div className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-[4px] border border-line bg-porcelain p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="grid size-11 place-items-center rounded-full bg-gold-mist text-gold-deep">
                  <Icon className="size-5" strokeWidth={1.5} aria-hidden />
                </div>
                <h3 className="mt-5 font-display text-[21px] text-ink">{title}</h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-soft">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 flex justify-center">
            {primaryCta}
          </div>
        </div>
      </section>
    </>
  );
}
