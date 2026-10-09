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
import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth/session";

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
      className="inline-flex h-[46px] items-center justify-center gap-2 rounded-[2px] bg-[#9a672f] px-6 text-[12px] font-semibold tracking-[0.08em] text-white uppercase shadow-sm transition-all hover:bg-[#835523] hover:shadow-md"
    >
      List Your Business <ArrowRight className="size-3.5" />
    </Link>
  );

  return (
    <>
      {/* ── 1. Hero Section ── */}
      <section className="relative flex min-h-[85vh] items-start overflow-hidden bg-[#faf6f0] lg:min-h-[calc(100vh-5rem)]">
        {/* Right side workbench photography with soft blur & gradient mask */}
        <div className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[56%] lg:block" aria-hidden="true">
          <div className="relative h-full w-full">
            <Image
              src="/media/for-jewelers-hero.jpg"
              alt=""
              fill
              priority
              sizes="60vw"
              className="object-cover object-[65%_center]"
            />
            {/* Soft blended gradient wash matching luxury background */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, #faf6f0 0%, #faf6f0f2 15%, #faf6f0c0 32%, #faf6f030 55%, transparent 75%)",
              }}
            />
          </div>
        </div>

        <div className="shell relative z-10 w-full pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
          <div className="max-w-2xl lg:max-w-[56%]">
            <p className="text-[11.5px] font-semibold tracking-[0.22em] text-[#9e6932] uppercase">
              For Independent Jewelers
            </p>

            <h1 className="mt-5 font-display text-5xl leading-[1.04] tracking-[-0.03em] text-[#1e1913] sm:text-6xl md:text-7xl lg:text-[76px] xl:text-[84px]">
              Your Craft Deserves<br />
              to Be <span className="font-serif italic font-normal text-[#9c692e]">Discovered.</span>
            </h1>

            <p className="mt-7 max-w-xl text-[16px] leading-relaxed text-[#685e52]">
              List your jewelry atelier for free on Loupe and connect directly with genuine buyers, collectors and jewelry enthusiasts. Grow your brand with no sales commission.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3.5">
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
