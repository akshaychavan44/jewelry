"use client";

import Link from "next/link";
import { useState } from "react";
import { CLARITY_SCALE, GOLD_PURITY } from "@/lib/jewelry";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Karat → purity bars with today's price per gram at each purity. */
export function GoldPurityChart({ pureGoldPerGram, currency, updatedLabel, guideLink = true }: { pureGoldPerGram: number; currency: string; updatedLabel: string; guideLink?: boolean }) {
  const [active, setActive] = useState<string>("18k");
  const current = GOLD_PURITY.find((k) => k.karat === active)!;
  return (
    <div className="flex h-full flex-col rounded-[3px] border border-line bg-porcelain p-6 md:p-8">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="display-sm text-ink">Gold purity chart</h3>
        <span className="font-mono text-[10.5px] tracking-[0.1em] text-muted uppercase">{updatedLabel}</span>
      </div>
      <p className="mt-2 text-[14px] text-ink-soft">Karat measures how much of a piece is pure gold. The hallmark number is the same thing in parts per thousand.</p>

      <ul className="mt-6 space-y-2.5" role="list">
        {GOLD_PURITY.map((k) => {
          const selected = k.karat === active;
          return (
            <li key={k.karat}>
              <button
                type="button"
                onClick={() => setActive(k.karat)}
                onMouseEnter={() => setActive(k.karat)}
                aria-pressed={selected}
                className={cn("grid w-full grid-cols-[3rem_1fr_auto] items-center gap-4 rounded-[2px] px-2 py-1.5 text-left transition-colors", selected ? "bg-gold-mist/60" : "hover:bg-parchment")}
              >
                <span className="font-display text-[20px] text-ink">{k.karat}</span>
                <span className="relative h-2.5 overflow-hidden rounded-full bg-line" aria-hidden>
                  <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#c9a66b] to-gold" style={{ width: `${k.percent}%` }} />
                </span>
                <span className="w-24 text-right font-mono text-[12px] text-ink-soft">
                  {k.fineness} · {k.percent}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-[1fr_auto]">
        <div>
          <p className="text-[14px] text-ink">{current.note}</p>
          <p className="mt-1 text-[13px] text-muted">Typical use: {current.use}</p>
        </div>
        <div className="sm:text-right">
          <p className="eyebrow">Today, per gram</p>
          <p className="tabular font-display text-[26px] text-ink">{formatMoney(Math.round(pureGoldPerGram * (current.percent / 100)), currency, { exact: true })}</p>
        </div>
      </div>
      {guideLink && (
        <Link href="/guides/gold-purity" className="link-quiet mt-5 self-start text-[14px] text-ink">
          Read the gold guide
        </Link>
      )}
    </div>
  );
}

function DiamondGlyph({ inclusions }: { inclusions: number }) {
  // Deterministic inclusion marks, increasing through the clarity scale.
  const spots = [
    [44, 44], [60, 38], [52, 58], [38, 56], [66, 54], [48, 32], [58, 66], [34, 42], [70, 44], [42, 66], [56, 48], [62, 60],
  ].slice(0, inclusions);
  return (
    <svg viewBox="0 0 100 100" className="size-36 md:size-40" aria-hidden>
      <defs>
        <linearGradient id="facet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e9e4da" />
        </linearGradient>
      </defs>
      <polygon points="20,34 34,18 66,18 80,34 50,86" fill="url(#facet)" stroke="#a8864f" strokeWidth="0.8" />
      <polyline points="20,34 80,34" fill="none" stroke="#a8864f" strokeWidth="0.6" />
      <polyline points="34,18 42,34 50,18 58,34 66,18" fill="none" stroke="#a8864f" strokeWidth="0.5" opacity="0.8" />
      <polyline points="20,34 50,86 42,34 50,86 58,34 50,86 80,34" fill="none" stroke="#a8864f" strokeWidth="0.45" opacity="0.6" />
      {spots.map(([x, y], i) => (
        <g key={i} opacity={0.35 + (i / 12) * 0.5}>
          <circle cx={x} cy={y} r={0.9 + (i % 3) * 0.5} fill="#57524a" />
          {i % 4 === 3 && <line x1={x - 3} y1={y + 1} x2={x + 3} y2={y - 1} stroke="#57524a" strokeWidth="0.6" />}
        </g>
      ))}
    </svg>
  );
}

export function ClarityGuide({ guideLink = true }: { guideLink?: boolean }) {
  const [index, setIndex] = useState(5);
  const grade = CLARITY_SCALE[index];
  return (
    <div className="flex h-full flex-col rounded-[3px] border border-line bg-porcelain p-6 md:p-8">
      <h3 className="display-sm text-ink">Diamond clarity guide</h3>
      <p className="mt-2 text-[14px] text-ink-soft">Clarity grades how many inclusions a gemologist sees at 10× magnification — under a loupe.</p>

      <div className="mt-4 flex flex-1 flex-col items-center gap-6 sm:flex-row sm:items-center">
        <DiamondGlyph inclusions={index} />
        <div className="w-full">
          <p className="font-mono text-[12px] tracking-[0.1em] text-gold-deep">{grade.grade}</p>
          <p className="font-display text-[22px] leading-tight text-ink">{grade.name}</p>
          <p className="mt-2 text-[14px] text-ink-soft">{grade.detail}</p>
        </div>
      </div>

      <div className="mt-6" role="radiogroup" aria-label="Clarity grade">
        <div className="grid grid-cols-11 gap-1">
          {CLARITY_SCALE.map((g, i) => (
            <button
              key={g.grade}
              type="button"
              role="radio"
              aria-checked={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                "h-9 rounded-[2px] font-mono text-[10px] transition-colors md:text-[11px]",
                i === index ? "bg-ink text-ivory" : "bg-parchment text-ink-soft hover:bg-sand",
              )}
            >
              {g.grade}
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] tracking-[0.08em] text-muted uppercase">
          <span>Flawless</span>
          <span>Eye-clean to about SI1</span>
          <span>Included</span>
        </div>
      </div>
      {guideLink && (
        <Link href="/guides/diamond-clarity" className="link-quiet mt-5 self-start text-[14px] text-ink">
          Read the clarity guide
        </Link>
      )}
    </div>
  );
}
