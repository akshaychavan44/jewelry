"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Diamond,
  FileText,
  Lock,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { CustomRequestForm } from "@/components/account/custom-request-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import styles from "./custom-orders.module.css";
import type { CurrentUser } from "@/server/auth/session";

interface Props {
  user: CurrentUser | null;
  currency: string;
  categories: { id: string; name: string }[];
  seller?: { storeName: string; slug: string } | null;
  sellerSlug?: string;
  jewelers?: { id: string; storeName: string; slug: string; city?: string | null }[];
}

const RECENT_PIECES = [
  {
    title: "Emerald Engagement Ring",
    quote:
      "“Exactly what I imagined. The process was smooth and the jeweler was incredible.”",
    author: "— Priya S.",
    image:
      "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=85",
    alt: "Custom emerald cut engagement ring with halo diamonds",
  },
  {
    title: "Heirloom Necklace Redesign",
    quote:
      "“They transformed my grandmother's stone into a modern piece I'll cherish forever.”",
    author: "— Aisha K.",
    image:
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=85",
    alt: "Heirloom gold necklace redesign with diamond pendant",
  },
  {
    title: "Custom Ruby Earrings",
    quote:
      "“Beautiful craftsmanship and attention to every detail.”",
    author: "— Meera T.",
    image:
      "https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=85",
    alt: "Handcrafted ruby drop earrings with diamond pavé",
  },
  {
    title: "Personalized Gold Bangle",
    quote:
      "“A meaningful piece with my children's initials. Truly special.”",
    author: "— Rahul M.",
    image:
      "https://images.unsplash.com/photo-1611652032931-10fc009c980a?auto=format&fit=crop&w=800&q=85",
    alt: "Engraved personalized yellow gold bangle",
  },
];

const HERO_SLIDES = [
  {
    image: "/media/bespoke-hero-necklace.jpg",
    alt: "Handcrafted 18k gold diamond necklace on travertine stone with baby's breath flowers and flowing silk",
  },
  {
    image: "/media/bespoke-step-craft.jpg",
    alt: "Master jeweler at workbench setting diamonds into handcrafted gold piece",
  },
  {
    image: "/media/bespoke-step-finished.jpg",
    alt: "Completed one-of-a-kind fine jewelry piece ready for presentation",
  },
];

export function CustomOrdersView({
  user,
  currency,
  categories,
  seller,
  sellerSlug,
  jewelers,
}: Props) {
  const [heroSlide, setHeroSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const nextHeroSlide = () => setHeroSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  const prevHeroSlide = () => setHeroSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);

  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const amount = carouselRef.current.clientWidth * 0.75;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="bg-[#FAF7F2] text-ink">
      {/* ============================================================ */}
      {/* 1. HERO SECTION (1st Image) */}
      {/* ============================================================ */}
      <section className={styles.hero} aria-label="Custom jewelry commissions">
        <div className={styles.copy}>
          <div className={styles.eyebrow}>CUSTOM COMMISSIONS</div>
          <h1 className={cn("font-display", styles.title)}>
            A piece that<br />begins with <em>you.</em>
          </h1>
          <p className={styles.description}>
            Bring your ideas, inspirations or heirloom stories to life with the
            help of trusted independent jewelers. From a simple sketch to
            a one-of-a-kind creation — made just for you.
          </p>
          <div className={styles.actions}>
            <button type="button" onClick={scrollToForm} className={cn(styles.action, styles.primary)}>
              Start a custom request →
            </button>
            <Link href="/jewelers" className={styles.action}>Explore jewelers</Link>
          </div>
          <div className={styles.assurances}>
            <div className={styles.assurance}><Diamond aria-hidden="true" /><span>Verified<br />jewelers</span></div>
            <div className={styles.assurance}><FileText aria-hidden="true" /><span>Private<br />requests</span></div>
            <div className={styles.assurance}><Sparkles aria-hidden="true" /><span>Personal<br />designs</span></div>
            <div className={styles.assurance}><ShieldCheck aria-hidden="true" /><span>Direct<br />contact</span></div>
          </div>
        </div>
        <div className={styles.showcase}>
          <svg className={styles.arc} viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
            <ellipse cx="1000" cy="330" rx="1000" ry="880" fill="none" stroke="#b38b55" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className={styles.star} aria-hidden="true">✦</span>
          <div className={styles.photo}>
            <Image
              src={HERO_SLIDES[heroSlide].image}
              alt={HERO_SLIDES[heroSlide].alt}
              fill
              preload={heroSlide === 0}
              sizes="(min-width: 1024px) 54vw, 100vw"
            />
          </div>
          <div className={styles.seal} aria-hidden="true"><span>MADE<br />JUST<br />FOR<br />YOU</span></div>
          <div className={styles.counter} aria-label={`Image ${heroSlide + 1} of ${HERO_SLIDES.length}`}>
            <span>0{heroSlide + 1}</span><i aria-hidden="true" /><span>0{HERO_SLIDES.length}</span>
          </div>
          <div className={styles.controls}>
            <button type="button" onClick={prevHeroSlide} aria-label="Previous slide"><ChevronLeft size={16} /></button>
            <button type="button" onClick={nextHeroSlide} aria-label="Next slide"><ChevronRight size={16} /></button>
          </div>
        </div>
      </section>
      {/* ============================================================ */}
      {/* 2. RECENT CUSTOM PIECES (2nd Image Top) */}
      {/* ============================================================ */}
      <section className="pt-8 pb-14 sm:pt-10 sm:pb-16 md:pt-12 md:pb-20 border-b border-[#e6dcce]">
        <div className="mx-auto w-full max-w-[1720px] px-4 sm:px-6 md:px-10 lg:px-14">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="caps text-[11px] font-semibold tracking-[0.24em] text-ink">
                  REAL STORIES
                </span>
                <span className="h-[1px] w-8 bg-[#bfa88c]" />
              </div>
              <h2 className="mt-3 font-display text-[32px] leading-tight text-ink md:text-[44px]">
                Recent custom pieces
              </h2>
              <p className="mt-2 text-[14.5px] text-ink/70 max-w-xl">
                Explore beautiful one-of-a-kind jewelry created by our community of buyers and jewelers.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/shop?sort=popular"
                className="caps text-[11.5px] font-semibold tracking-[0.14em] text-[#876038] hover:text-ink transition-colors"
              >
                View all →
              </Link>

              {/* Prev / Next buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollCarousel("left")}
                  aria-label="Previous pieces"
                  className="grid size-10 place-items-center rounded-full border border-[#d8c7b0] bg-[#FFFDF8] text-ink shadow-sm transition-all hover:bg-ink hover:text-white"
                >
                  <ChevronLeft className="size-4.5 stroke-[1.8]" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCarousel("right")}
                  aria-label="Next pieces"
                  className="grid size-10 place-items-center rounded-full border border-[#d8c7b0] bg-[#FFFDF8] text-ink shadow-sm transition-all hover:bg-ink hover:text-white"
                >
                  <ChevronRight className="size-4.5 stroke-[1.8]" />
                </button>
              </div>
            </div>
          </div>

          {/* 4 Cards Carousel */}
          <div
            ref={carouselRef}
            className="flex gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory"
          >
            {RECENT_PIECES.map((piece) => (
              <div
                key={piece.title}
                className="group flex w-[280px] shrink-0 flex-col sm:w-[320px] md:w-[350px] snap-start"
              >
                {/* Image Container with Rounded Corners */}
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[16px] bg-[#ece2d4] shadow-[0_6px_24px_-10px_rgba(47,44,40,0.08)] border border-[#ede3d2]">
                  <Image
                    src={piece.image}
                    alt={piece.alt}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 90vw"
                    className="object-cover transition-transform duration-700 ease-silk group-hover:scale-105"
                  />
                </div>

                {/* Card Text Content */}
                <div className="mt-4 flex flex-col">
                  <h3 className="font-display text-[20px] font-medium leading-snug text-ink md:text-[22px]">
                    {piece.title}
                  </h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink/75 italic">
                    {piece.quote}
                  </p>
                  <p className="mt-2 text-[12px] font-semibold text-[#8c6738]">
                    {piece.author}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. WORK WITH EXPERTS (2nd Image Bottom Banner) */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-[#1D1915] text-[#FFFDF8] py-16 md:py-20 lg:py-24">
        {/* Subtle warm glow overlay */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse at 80% 50%, rgba(184, 137, 68, 0.15) 0%, transparent 65%)",
          }}
        />

        <div className="mx-auto w-full max-w-[1720px] px-4 sm:px-6 md:px-10 lg:px-14">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1.3fr] lg:gap-14">
            {/* Left Column: Heading & Subtitle */}
            <div className="max-w-xl">
              <div className="flex items-center gap-3">
                <span className="caps text-[11px] font-semibold tracking-[0.24em] text-[#d4af67]">
                  WORK WITH EXPERTS
                </span>
                <span className="h-[1px] w-9 bg-[#d4af67]/60" />
              </div>

              <h2 className="mt-5 font-display text-[38px] leading-[1.08] text-[#FFFDF8] sm:text-[46px] md:text-[54px] lg:text-[60px]">
                Collaborate with the<br />
                world&rsquo;s finest jewelers.
              </h2>

              <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-[#FFFDF8]/75 sm:text-[16px]">
                From independent artisans to renowned ateliers, connect with
                specialists who specialize in custom creations.
              </p>

              <button
                type="button"
                onClick={scrollToForm}
                className="mt-8 inline-flex items-center gap-2 rounded-[3px] btn-gold px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] shadow-sm transition-all duration-300 active:scale-[0.98]"
              >
                Start a custom request →
              </button>
            </div>

            {/* Right Column: Artisan Workbench Macro Photo */}
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[16px] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] border border-[#3d3429]">
              <Image
                src="/media/bespoke-step-craft-circle.jpg"
                alt="Master jeweler working on diamond floral setting at workbench"
                fill
                sizes="(min-width: 1280px) 55vw, 100vw"
                className="object-cover object-center"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. INTERACTIVE CUSTOM REQUEST FORM BRIEF */}
      {/* ============================================================ */}
      <section ref={formRef} id="request-brief" className="scroll-mt-28 py-16 md:py-24 bg-[#FAF7F2]">
        <div className="mx-auto w-full max-w-[1080px] px-4 sm:px-6 md:px-10">
          <div className="rounded-[16px] border border-[#ede3d2] bg-white p-6 md:p-12 shadow-[0_10px_40px_-15px_rgba(47,44,40,0.08)]">
            <div className="mb-8 text-center">
              <span className="caps text-[11px] font-semibold tracking-[0.2em] text-[#8c6738]">
                YOUR DESIGN, YOUR JEWELER
              </span>
              <h2 className="mt-2 font-display text-[32px] text-ink md:text-[42px]">
                Your Custom Brief
              </h2>
              <p className="mt-2 text-[14.5px] text-ink/75 max-w-lg mx-auto">
                Choose a jeweler and describe your idea. Only your selected jeweler receives
                the brief and contacts you separately to discuss it.
              </p>
            </div>

            {user ? (
              <CustomRequestForm
                categories={categories}
                currency={currency}
                sellerSlug={sellerSlug}
                sellerName={seller?.storeName}
                jewelers={jewelers}
              />
            ) : (
              <div className="text-center py-6">
                <p className="text-[15px] text-ink/80 max-w-md mx-auto mb-6">
                  Please sign in or create an account so jewelers can respond to your brief directly and you can track your commission.
                </p>
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(
                    `/custom-orders${sellerSlug ? `?jeweler=${sellerSlug}` : ""}`
                  )}`}
                  className={cn(buttonVariants({ size: "lg", variant: "primary" }), "px-8")}
                >
                  Sign in to start your request
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
