"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronRight, Clock, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { guideBySlug, guides, type GuideSlug } from "@/config/guides";
import { cn } from "@/lib/utils";

interface GuideLayoutProps {
  slug: GuideSlug;
  sections: { id: string; label: string }[];
  children: React.ReactNode;
  cta?: { label: string; href: string };
}

/** Editorial shell shared by every buying guide: header, sticky contents, related reading. */
export function GuideLayout({ slug, sections, children, cta }: GuideLayoutProps) {
  const guide = guideBySlug(slug);
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");

  // Active section scroll spy
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 180;
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveId(sections[i].id);
          return;
        }
      }
      if (sections[0]) setActiveId(sections[0].id);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      setActiveId(id);
    }
  };

  return (
    <article className="min-h-screen bg-[#FAF7F2] text-ink selection:bg-gold-mist selection:text-ink">
      {/* ============================================================ */}
      {/* 1. HERO HEADER */}
      {/* ============================================================ */}
      <header className="relative border-b border-[#e6dcce] bg-gradient-to-b from-[#FFFDF8] to-[#FAF5EC] py-10 sm:py-12 md:py-16">
        <div className="mx-auto w-full max-w-[1720px] px-4 sm:px-6 md:px-10 lg:px-14">
          <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
            {/* Left: Breadcrumbs, Reading Badge, Headline & Subtitle */}
            <div className="flex flex-col">
              {/* Breadcrumbs */}
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12.5px] font-medium text-muted">
                <Link href="/" className="transition-colors hover:text-ink">
                  Home
                </Link>
                <ChevronRight className="size-3.5 opacity-50" />
                <Link href="/guides" className="transition-colors hover:text-ink">
                  Guides
                </Link>
                <ChevronRight className="size-3.5 opacity-50" />
                <span className="text-ink-soft">{guide.short}</span>
              </nav>

              {/* Reading Time Pill Badge */}
              <div className="mt-6 flex items-center gap-3">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#d6b579]/60 bg-[#f7eedf] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#86683a] shadow-2xs">
                  <Clock className="size-3.5 stroke-[2]" />
                  <span>Buying Guide · {guide.minutes} min read</span>
                </div>
              </div>

              {/* Main Headline */}
              <h1 className="mt-4 font-display text-[40px] font-normal leading-[1.06] tracking-[-0.03em] text-[#221810] sm:text-[50px] md:text-[58px] lg:text-[64px]">
                {guide.title}
              </h1>

              {/* Description */}
              <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-[#4a3e31] sm:text-[17px]">
                {guide.description}
              </p>

              {/* Curator Byline */}
              <div className="mt-7 flex items-center gap-2 text-[12.5px] text-[#8c6738] font-medium">
                <Sparkles className="size-4 stroke-[1.5]" />
                <span>Curated by Loupe Gemologists & Independent Ateliers</span>
              </div>
            </div>

            {/* Right: Luxury Framed Editorial Image */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[20px] border border-[#d6b47c]/40 bg-[#f8f3ea] shadow-[0_16px_40px_-15px_rgba(47,44,40,0.15)] sm:rounded-[24px]">
              <Image
                src={guide.image}
                alt={guide.title}
                fill
                priority
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover object-center"
              />
              <div className="pointer-events-none absolute inset-0 rounded-[20px] ring-1 ring-inset ring-white/40 sm:rounded-[24px]" />
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. BODY CONTENT + STICKY CHAPTER TOC */}
      {/* ============================================================ */}
      <div className="mx-auto w-full max-w-[1720px] px-4 py-12 sm:px-6 sm:py-16 md:px-10 lg:px-14">
        <div className="grid gap-12 lg:grid-cols-[270px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
          {/* Left Sticky Table of Contents Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 rounded-[20px] border border-[#e8dfd2] bg-[#FFFDF8] p-6 shadow-[0_6px_24px_-10px_rgba(47,44,40,0.06)]">
              <div className="flex items-center gap-2 pb-4 border-b border-[#ece3d4]">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#86683a]">
                  Table of Contents
                </span>
              </div>

              <nav aria-label="In this guide" className="mt-4">
                <ol className="space-y-1.5">
                  {sections.map((s, index) => {
                    const isActive = activeId === s.id;
                    const chapterNum = String(index + 1).padStart(2, "0");
                    return (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          onClick={(e) => scrollToSection(e, s.id)}
                          className={cn(
                            "group flex items-start gap-3 rounded-[12px] p-3 text-left transition-all duration-200",
                            isActive
                              ? "bg-gradient-to-r from-[#f5ecdc] via-[#f7eee2] to-[#FAF7F2] text-[#1c150c] shadow-2xs font-medium"
                              : "text-[#695d4e] hover:bg-[#f6eee0]/60 hover:text-ink"
                          )}
                        >
                          <span
                            className={cn(
                              "font-mono text-[11.5px] font-bold tracking-wider transition-colors mt-0.5",
                              isActive ? "text-[#9b7842]" : "text-[#a89987] group-hover:text-[#9b7842]"
                            )}
                          >
                            {chapterNum}
                          </span>
                          <span className="text-[13.5px] leading-snug">
                            {s.label}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </nav>

              {/* Need help box */}
              <div className="mt-8 rounded-[12px] border border-[#e8decb] bg-[#f8f2e7] p-4 text-[12.5px] leading-relaxed text-[#594d3f]">
                <p className="font-semibold text-ink">Have questions?</p>
                <p className="mt-1 text-[#6b5d4e]">Every piece on Loupe includes direct messaging with verified master jewelers.</p>
              </div>
            </div>
          </aside>

          {/* Right Main Article Column */}
          <main className="w-full min-w-0 max-w-[880px] space-y-16">
            {children}

            {/* Bottom Conversion CTA Banner */}
            {cta && (
              <section className="relative overflow-hidden rounded-[22px] border border-[#d6b579]/60 bg-gradient-to-br from-[#292017] via-[#1f1811] to-[#140f0a] p-8 sm:p-10 text-[#faf3e7] shadow-[0_20px_50px_-15px_rgba(20,14,8,0.45)]">
                <div
                  className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-[#c9a468]/15 blur-3xl"
                  aria-hidden
                />
                <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-[#d6b478] font-mono text-[11px] font-semibold uppercase tracking-[0.2em]">
                      <ShieldCheck className="size-4" />
                      <span>Loupe Guarantee</span>
                    </div>
                    <h3 className="mt-2 font-display text-[26px] font-normal leading-tight text-[#faf3e7] sm:text-[30px]">
                      {cta.label}
                    </h3>
                    <p className="mt-2 text-[14px] text-[#c7b9a5] max-w-md">
                      3-day inspection window on all purchases. Payment is held safely in escrow until you approve the piece.
                    </p>
                  </div>
                  <Link
                    href={cta.href}
                    className="group inline-flex shrink-0 items-center gap-2.5 rounded-full border border-[#d6b579]/60 bg-gradient-to-r from-[#d8b577] via-[#c69e57] to-[#aa8039] px-7 py-3.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[#1c150c] shadow-[0_4px_18px_rgba(175,135,70,0.3)] transition-all duration-300 hover:brightness-105 hover:shadow-[0_6px_24px_rgba(175,135,70,0.45)] active:scale-[0.98]"
                  >
                    Explore pieces
                    <ArrowRight className="size-4 stroke-[2] transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. RELATED GUIDES */}
      {/* ============================================================ */}
      <RelatedGuides current={slug} />
    </article>
  );
}

export function GuideSection({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-32", className)}>
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-[#b8955c]" aria-hidden />
        <h2 id={`${id}-title`} className="font-display text-[28px] font-normal leading-tight text-ink sm:text-[34px] md:text-[38px]">
          {title}
        </h2>
      </div>
      <div className="mt-5 space-y-4 text-[15.5px] sm:text-[16.5px] leading-[1.75] text-[#3e3428]">
        {children}
      </div>
    </section>
  );
}

/** Luxury Quote / Gemologist Takeaway Card */
export function GuideQuote({
  quote,
  author,
  role = "Master Gemologist",
}: {
  quote: string;
  author: string;
  role?: string;
}) {
  return (
    <div className="relative my-8 rounded-[18px] border border-[#e5d7c3] bg-[#fbf6ec] p-6 sm:p-8 shadow-[0_6px_24px_-10px_rgba(47,44,40,0.06)]">
      <span className="font-display text-[60px] leading-none text-[#b89354] select-none block -mb-4">
        &ldquo;
      </span>
      <blockquote className="font-display text-[20px] sm:text-[23px] italic leading-[1.38] text-[#221810]">
        {quote}
      </blockquote>
      <div className="mt-4 flex items-center gap-2 border-t border-[#ebdfcc] pt-3 text-[13px]">
        <span className="font-semibold text-ink">{author}</span>
        <span className="text-[#8c6738]">· {role}</span>
      </div>
    </div>
  );
}

/** Key Takeaway Callout Card */
export function GuideTakeaway({
  title,
  points,
}: {
  title: string;
  points: string[];
}) {
  return (
    <div className="my-7 rounded-[16px] border border-[#d6b579]/50 bg-[#f7eedf]/60 p-6">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#86683a]">
        {title}
      </p>
      <ul className="mt-3 space-y-2.5">
        {points.map((pt, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[14.5px] leading-relaxed text-[#3a3024]">
            <CheckCircle2 className="size-4 shrink-0 text-[#86683a] mt-0.5" />
            <span>{pt}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GuideCard({ slug, className }: { slug: GuideSlug; className?: string }) {
  const g = guideBySlug(slug);
  return (
    <Link
      href={`/guides/${g.slug}`}
      className={cn(
        "group flex flex-col rounded-[18px] border border-[#e8ded0] bg-[#FFFDF8] p-4 transition-all duration-300 hover:shadow-soft hover:border-[#c4a364]/60 hover:-translate-y-1",
        className
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[12px] bg-sand border border-[#ece3d4]">
        <Image
          src={g.image}
          alt={g.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 ease-silk group-hover:scale-105"
        />
      </div>
      <div className="mt-4 flex flex-1 flex-col">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#8c6738]">
          {g.minutes} min read
        </p>
        <h3 className="mt-1.5 font-display text-[20px] font-normal leading-snug text-ink group-hover:text-[#86683a] transition-colors">
          {g.title}
        </h3>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft line-clamp-2">
          {g.description}
        </p>
        <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#86683a] group-hover:translate-x-0.5 transition-transform">
          Read guide →
        </span>
      </div>
    </Link>
  );
}

export function GuideRow({ slug }: { slug: GuideSlug }) {
  const g = guideBySlug(slug);
  return (
    <Link
      href={`/guides/${g.slug}`}
      className="group grid grid-cols-[112px_1fr] items-start gap-5 sm:grid-cols-[160px_1fr]"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[12px] bg-sand border border-[#ece3d4]">
        <Image
          src={g.image}
          alt={g.title}
          fill
          sizes="160px"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      </div>
      <div>
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#8c6738]">
          {g.minutes} min read
        </p>
        <h3 className="mt-1 font-display text-[20px] text-ink group-hover:text-[#86683a] transition-colors">
          {g.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-ink-soft">
          {g.description}
        </p>
      </div>
    </Link>
  );
}

function RelatedGuides({ current }: { current: GuideSlug }) {
  const others = guides.filter((g) => g.slug !== current);
  return (
    <section aria-labelledby="related-guides" className="border-t border-[#e6dcce] bg-[#F6F0E6] py-16">
      <div className="mx-auto w-full max-w-[1720px] px-4 sm:px-6 md:px-10 lg:px-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8c6738]">
              Expand your knowledge
            </span>
            <h2 id="related-guides" className="mt-1.5 font-display text-[32px] text-ink md:text-[38px]">
              Explore other guides
            </h2>
          </div>
          <Link href="/guides" className="caps text-[12px] font-semibold text-[#86683a] hover:text-ink transition-colors">
            All guides →
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((g) => (
            <GuideCard key={g.slug} slug={g.slug} />
          ))}
        </div>
      </div>
    </section>
  );
}
