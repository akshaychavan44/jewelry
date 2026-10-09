"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Eye, Gem, Shield } from "lucide-react";
import { CLARITY_SCALE } from "@/lib/jewelry";
import { cn } from "@/lib/utils";

function EditorialDiamond({ gradeIndex }: { gradeIndex: number }) {
  const inclusionCounts = [0, 0, 1, 2, 3, 4, 6, 8, 10, 12, 15];
  const count = inclusionCounts[gradeIndex] ?? 0;

  const spots = [
    { x: 50, y: 38, r: 2.2, glint: true },
    { x: 42, y: 50, r: 1.8, glint: true },
    { x: 62, y: 44, r: 2.0, glint: false },
    { x: 55, y: 64, r: 2.6, glint: true },
    { x: 38, y: 62, r: 1.5, glint: false },
    { x: 68, y: 58, r: 2.0, glint: false },
    { x: 47, y: 52, r: 1.6, glint: false },
    { x: 58, y: 34, r: 1.8, glint: false },
    { x: 32, y: 48, r: 2.2, glint: true },
    { x: 52, y: 76, r: 1.4, glint: false },
    { x: 65, y: 70, r: 1.9, glint: false },
    { x: 44, y: 68, r: 2.4, glint: true },
    { x: 59, y: 52, r: 2.1, glint: false },
    { x: 36, y: 36, r: 1.6, glint: false },
    { x: 50, y: 26, r: 1.5, glint: false },
  ].slice(0, count);

  return (
    <div className="relative flex items-center justify-center p-2">
      <svg
        viewBox="0 0 200 200"
        className="h-auto w-[180px] drop-shadow-[0_0_25px_rgba(214,178,109,0.18)] sm:w-[220px] lg:w-[240px]"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="sparkleGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f7e1b5" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#d4b274" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="facetShine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4a3826" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#2c2016" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1c140d" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="goldLine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5ddaa" />
            <stop offset="50%" stopColor="#d8b473" />
            <stop offset="100%" stopColor="#9e7b41" />
          </linearGradient>
        </defs>

        {/* Ambient subtle orbit circles */}
        <circle cx="100" cy="100" r="82" fill="none" stroke="#ba9558" strokeWidth="0.75" strokeDasharray="3 4" opacity="0.25" />
        <circle cx="100" cy="100" r="92" fill="none" stroke="#ba9558" strokeWidth="0.5" opacity="0.15" />
        <path d="M 18,100 L 45,100 M 155,100 L 182,100" stroke="#ba9558" strokeWidth="0.6" opacity="0.3" />

        {/* Main Diamond Silhouette */}
        <polygon
          points="40,70 70,36 130,36 160,70 100,166"
          fill="url(#facetShine)"
          stroke="url(#goldLine)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Crown Table & Kite Facets */}
        <polygon points="70,36 130,36 115,70 85,70" fill="#f7dfab" fillOpacity="0.06" stroke="url(#goldLine)" strokeWidth="1" />
        <polygon points="40,70 70,36 85,70" fill="#f7dfab" fillOpacity="0.03" stroke="url(#goldLine)" strokeWidth="0.9" />
        <polygon points="160,70 130,36 115,70" fill="#f7dfab" fillOpacity="0.03" stroke="url(#goldLine)" strokeWidth="0.9" />

        {/* Pavilion Lower Facet Lines converging to Culet */}
        <polyline points="40,70 100,166" stroke="url(#goldLine)" strokeWidth="1" opacity="0.85" />
        <polyline points="85,70 100,166" stroke="url(#goldLine)" strokeWidth="0.9" opacity="0.75" />
        <polyline points="115,70 100,166" stroke="url(#goldLine)" strokeWidth="0.9" opacity="0.75" />
        <polyline points="160,70 100,166" stroke="url(#goldLine)" strokeWidth="1" opacity="0.85" />
        <line x1="40" y1="70" x2="160" y2="70" stroke="url(#goldLine)" strokeWidth="1.2" />

        {/* Corner Gleam / Sparkle */}
        <circle cx="40" cy="70" r="4" fill="url(#sparkleGlow)" />
        <circle cx="40" cy="70" r="1.5" fill="#ffffff" />
        <circle cx="160" cy="70" r="3" fill="url(#sparkleGlow)" />
        <circle cx="160" cy="70" r="1" fill="#ffffff" />

        {/* Dynamic Inclusions */}
        {spots.map((spot, i) => {
          const cx = spot.x * 2;
          const cy = spot.y * 2;
          const r = spot.r * 1.5;
          return (
            <g key={i} className="transition-all duration-300">
              <circle cx={cx} cy={cy} r={r * 2.2} fill="#ffdf99" opacity="0.25" />
              <circle cx={cx} cy={cy} r={r} fill="#fff2d1" stroke="#a37835" strokeWidth="0.5" />
              {spot.glint && (
                <>
                  <ellipse cx={cx} cy={cy} rx={r * 2.8} ry={r * 0.5} fill="#ffebbf" opacity="0.85" transform={`rotate(-25 ${cx} ${cy})`} />
                  <ellipse cx={cx} cy={cy} rx={r * 0.5} ry={r * 2.8} fill="#ffebbf" opacity="0.85" transform={`rotate(-25 ${cx} ${cy})`} />
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Featured Diamond Clarity Showcase section matching luxury editorial design */
export function DiamondClarityShowcase() {
  const [index, setIndex] = useState(10); // Default to I3 as shown in design reference
  const grade = CLARITY_SCALE[index];

  return (
    <div className="mx-auto max-w-[1760px] px-4 sm:px-8 lg:px-12">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-10 xl:gap-14">
        {/* Editorial introduction */}
        <div className="flex flex-col lg:py-2">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-[#a78349]" aria-hidden />
            <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-[#94703b]">
              The diamond essentials
            </span>
          </div>

          <h2 id="clarity-guide-heading" className="mt-5 max-w-[640px] font-display text-[42px] font-normal leading-[1.08] tracking-[-0.025em] text-[#28231d] sm:text-[52px] xl:text-[62px]">
            Diamond clarity,<br />made clear.
          </h2>

          <p className="mt-5 font-sans text-[18px] font-medium leading-snug text-[#4d4235] sm:text-[20px]">
            Small details. A more confident choice.
          </p>
          <p className="mt-3 max-w-[620px] text-[16px] leading-[1.7] text-[#62574b] sm:text-[18px]">
            Every diamond has a story. Discover how natural inclusions affect its clarity, beauty and value — and find the right balance for you.
          </p>

          <div className="mt-7 w-full max-w-[560px] divide-y divide-[#b99a6b]/55 border-y border-[#b99a6b]/55">
            {[
              { icon: Gem, title: "Learn the grades", detail: "Understand the clarity scale, from FL to I3." },
              { icon: Eye, title: "Compare the details", detail: "Explore inclusions with the interactive guide." },
              { icon: Shield, title: "Choose with confidence", detail: "Balance beauty, clarity and your budget." },
            ].map(({ icon: Icon, title, detail }) => (
              <div key={title} className="flex items-center gap-4 py-4 sm:gap-5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#efe5d5] text-[#94703b] sm:size-12">
                  <Icon className="size-6 stroke-[1.5]" aria-hidden />
                </div>
                <div>
                  <h3 className="font-display text-[23px] font-normal leading-[1.2] tracking-[-0.02em] text-[#30291f] sm:text-[27px]">{title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#62574b] sm:text-[15px]">{detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-7">
            <Link
              href="/guides/diamond-clarity"
              className="group inline-flex min-h-12 items-center gap-5 rounded-lg bg-[#30271d] px-6 py-3 font-sans text-[14px] font-medium text-[#fff8eb] transition-colors hover:bg-[#4b3c29] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#94703b]"
            >
              Explore the clarity guide
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden />
            </Link>
          </div>
        </div>
        {/* Right Column: Dark Luxury Interactive Clarity Guide Box */}
        <div className="relative w-full overflow-hidden rounded-[24px] border border-[#d4b47c]/30 bg-[#211a14] p-6 text-[#faf3e7] shadow-[0_24px_60px_-15px_rgba(20,14,8,0.5),inset_0_1px_0_rgba(255,235,195,0.1)] sm:rounded-[28px] sm:p-8 lg:p-10">
          {/* Subtle ambient gold radial lighting behind diamond */}
          <div
            className="pointer-events-none absolute -left-16 -top-16 size-80 rounded-full bg-[#c9a468]/12 blur-3xl"
            aria-hidden
          />

          <div className="relative grid min-h-[220px] grid-cols-1 items-center gap-6 sm:grid-cols-[auto_1fr] sm:gap-10">
            {/* Diamond illustration */}
            <EditorialDiamond gradeIndex={index} />

            {/* Clarity Grade Information */}
            <div className="flex flex-col justify-center" aria-live="polite">
              <span className="font-mono text-[13px] font-medium uppercase tracking-[0.2em] text-[#d6b478]">
                {grade.grade}
              </span>
              <h3 className="mt-1.5 font-display text-[32px] font-normal leading-[1.15] text-[#faf3e7] sm:text-[40px]">
                {grade.name}
              </h3>
              <p className="mt-3 max-w-[340px] text-[14.5px] leading-relaxed text-[#c7b9a5] sm:text-[15.5px]">
                {grade.detail}
              </p>
            </div>
          </div>

          {/* Interactive Scale Selector */}
          <div className="mt-8 border-t border-[#46382a]/60 pt-6">
            <div
              className="grid grid-cols-11 overflow-hidden rounded-[12px] border border-[#c4a364]/50 bg-[#18130e]/80 p-0.5"
              role="radiogroup"
              aria-label="Diamond clarity grade selector"
            >
              {CLARITY_SCALE.map((g, i) => {
                const isSelected = i === index;
                return (
                  <button
                    key={g.grade}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => setIndex(i)}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-[9px] font-sans text-[10.5px] font-medium transition-all sm:h-11 sm:text-[12px]",
                      isSelected
                        ? "bg-gradient-to-r from-[#edd397] via-[#dfb971] to-[#c79f58] font-bold text-[#1c150c] shadow-[0_0_16px_rgba(214,178,109,0.45)]"
                        : "text-[#cfc0ae] hover:bg-[#483726]/40 hover:text-[#fff]"
                    )}
                  >
                    {g.grade}
                  </button>
                );
              })}
            </div>

            {/* Scale Legend Range */}
            <div className="mt-4 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.14em] text-[#ab9b86] sm:text-[11px]">
              <span>Flawless</span>
              <span className="mx-3 h-[1px] flex-1 bg-[#634e38]/70 sm:mx-5" aria-hidden />
              <span>Eye-clean to about SI1</span>
              <span className="mx-3 h-[1px] flex-1 bg-[#634e38]/70 sm:mx-5" aria-hidden />
              <span>Included</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
