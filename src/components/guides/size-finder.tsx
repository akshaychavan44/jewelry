"use client";

import { useState } from "react";
import { RING_SIZES } from "@/lib/jewelry";
import { cn } from "@/lib/utils";

/** Measurement → nearest ring size across the four scales Loupe sells in. */
export function SizeFinder() {
  const [mode, setMode] = useState<"diameter" | "circumference">("circumference");
  const [value, setValue] = useState("");
  const mm = Number(value.replace(",", "."));
  const valid = Number.isFinite(mm) && mm > 0;
  const key = mode === "diameter" ? "diameterMm" : "circumferenceMm";
  const nearest = valid ? RING_SIZES.reduce((best, s) => (Math.abs(s[key] - mm) < Math.abs(best[key] - mm) ? s : best)) : null;
  const outOfRange = nearest && Math.abs(nearest[key] - mm) > (mode === "diameter" ? 0.6 : 2);

  return (
    <div className="rounded-[3px] border border-line bg-porcelain p-6">
      <p className="caps text-ink">Size finder</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex overflow-hidden rounded-[2px] border border-line" role="radiogroup" aria-label="What did you measure?">
          {(["circumference", "diameter"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cn("px-3.5 py-2 text-[13px] capitalize transition-colors", mode === m ? "bg-ink text-ivory" : "bg-ivory text-ink-soft hover:text-ink")}
            >
              {m === "circumference" ? "Finger (strip)" : "Ring (inside)"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[13px] text-ink-soft">
          <span className="sr-only">{mode === "diameter" ? "Inside diameter" : "Circumference"} in millimetres</span>
          <input
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d.,]/g, ""))}
            placeholder={mode === "diameter" ? "e.g. 17.3" : "e.g. 54.4"}
            className="h-10 w-28 rounded-[2px] border border-line bg-ivory px-3 font-mono text-[14px] text-ink outline-none focus:border-sage"
          />
          mm {mode === "diameter" ? "across" : "around"}
        </label>
      </div>
      <div className="mt-5 min-h-16" aria-live="polite">
        {nearest && !outOfRange ? (
          <dl className="grid grid-cols-4 gap-2 text-center">
            {[
              ["US", nearest.us],
              ["UK", nearest.uk],
              ["EU", nearest.eu],
              ["India", nearest.india],
            ].map(([k, v]) => (
              <div key={k} className="rounded-[2px] bg-parchment px-2 py-3">
                <dt className="text-[11px] tracking-[0.1em] text-muted uppercase">{k}</dt>
                <dd className="mt-1 font-display text-[24px] leading-none text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-[13.5px] text-muted">
            {outOfRange ? "That measurement is outside the sizes our jewelers stock — message a jeweler about a made-to-measure piece." : "Enter a measurement to see your size in every scale."}
          </p>
        )}
      </div>
    </div>
  );
}
