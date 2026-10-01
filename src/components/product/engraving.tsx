"use client";

import type { EngravingStyle } from "@/generated/prisma/enums";
import { ENGRAVING_STYLES } from "@/lib/jewelry";
import { cn } from "@/lib/utils";

/** Live preview of engraving on the inside of a band. */
export function EngravingPreview({ text, style }: { text: string; style: EngravingStyle }) {
  const cls = ENGRAVING_STYLES[style].className;
  return (
    <div className="relative overflow-hidden rounded-[3px] border border-line bg-gradient-to-b from-[#f6efe2] to-[#e8dcc4] px-5 py-6">
      <div aria-hidden className="absolute inset-x-6 top-1/2 h-[46px] -translate-y-1/2 rounded-full bg-gradient-to-b from-[#d9bf8c] via-[#f4e3bd] to-[#b8955a] shadow-[inset_0_2px_6px_rgba(0,0,0,0.18)]" />
      <p
        className={cn("relative truncate text-center text-[20px] text-[#6b5530] [text-shadow:0_1px_0_rgba(255,255,255,0.55)]", cls, !text && "text-[#6b5530]/40")}
        aria-live="polite"
      >
        {text || "Your words here"}
      </p>
      <p className="relative mt-4 text-center text-[11px] tracking-[0.12em] text-ink-soft/70 uppercase">Preview · inside the band</p>
    </div>
  );
}

export function EngravingField({
  enabled,
  onToggle,
  text,
  onText,
  style,
  onStyle,
  maxChars,
  feeLabel,
}: {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  text: string;
  onText: (v: string) => void;
  style: EngravingStyle;
  onStyle: (s: EngravingStyle) => void;
  maxChars: number;
  feeLabel: string;
}) {
  return (
    <div className="rounded-[3px] border border-line bg-porcelain">
      <label className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5">
        <span className="text-[14px] text-ink">
          Add engraving <span className="text-muted">· {feeLabel}</span>
        </span>
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} className="size-4 accent-[#7b8069]" />
      </label>
      {enabled && (
        <div className="space-y-4 border-t border-line px-4 py-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="engraving-text" className="text-[12px] tracking-[0.06em] text-ink-soft uppercase">
                Engraving text
              </label>
              <span className={cn("font-mono text-[11px]", text.length >= maxChars ? "text-rosewood" : "text-muted")}>
                {text.length}/{maxChars}
              </span>
            </div>
            <input
              id="engraving-text"
              value={text}
              maxLength={maxChars}
              onChange={(e) => onText(e.target.value.replace(/[^\p{L}\p{N} .,&'♥+\-]/gu, ""))}
              placeholder={maxChars <= 3 ? "Initials, e.g. OAC" : "e.g. Always · 14.02.2027"}
              className="h-11 w-full rounded-[2px] border border-line bg-ivory px-3.5 text-[15px] outline-none focus:border-sage"
            />
          </div>
          <div className="flex gap-2" role="radiogroup" aria-label="Engraving style">
            {(Object.keys(ENGRAVING_STYLES) as EngravingStyle[]).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={style === s}
                onClick={() => onStyle(s)}
                className={cn("flex-1 rounded-[2px] border py-2 text-[15px] transition-colors", ENGRAVING_STYLES[s].className, style === s ? "border-ink bg-ink text-ivory" : "border-line text-ink hover:border-ink/40")}
              >
                {ENGRAVING_STYLES[s].label}
              </button>
            ))}
          </div>
          <EngravingPreview text={text} style={style} />
          <p className="text-[12.5px] text-muted">Engraved pieces are personal, so they can&rsquo;t be returned unless faulty. Engraving adds about two working days.</p>
        </div>
      )}
    </div>
  );
}
