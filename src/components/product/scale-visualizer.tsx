"use client";

import { useState } from "react";
import { SCALE_REFERENCES } from "@/lib/jewelry";
import { cn } from "@/lib/utils";

const VIEW_W = 360;
const VIEW_H = 190;
const PAD = 24;

function dodecagon(cx: number, cy: number, r: number) {
  return Array.from({ length: 12 }, (_, i) => {
    const a = (Math.PI / 6) * i + Math.PI / 12;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");
}

/**
 * Draws the piece's real footprint beside a familiar object, at a shared
 * millimetre scale, so buyers can judge size before it arrives.
 */
export function ScaleVisualizer({ widthMm, heightMm, depthMm, label }: { widthMm: number; heightMm: number; depthMm?: number | null; label: string }) {
  const [refId, setRefId] = useState(SCALE_REFERENCES[0].id);
  const ref = SCALE_REFERENCES.find((r) => r.id === refId)!;

  // Long pieces (necklaces, bracelets) are drawn along their visible drop.
  const pieceW = Math.min(widthMm, 120);
  const pieceH = Math.min(heightMm, 120);
  const gap = 14;
  const totalW = pieceW + ref.widthMm + gap;
  const totalH = Math.max(pieceH, ref.heightMm);
  const scale = Math.min((VIEW_W - PAD * 2) / totalW, (VIEW_H - PAD * 2 - 18) / totalH);
  const baseline = VIEW_H - PAD - 18;

  const px = PAD;
  const pw = pieceW * scale;
  const ph = pieceH * scale;
  const rx = PAD + pw + gap * scale;
  const rw = ref.widthMm * scale;
  const rh = ref.heightMm * scale;
  const rulerMm = Math.ceil(totalW / 10) * 10;

  return (
    <div className="rounded-[3px] border border-line bg-porcelain p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="caps text-ink">Actual size</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Compare with">
          {SCALE_REFERENCES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={r.id === refId}
              onClick={() => setRefId(r.id)}
              className={cn("rounded-full border px-2.5 py-1 text-[12px] transition-colors", r.id === refId ? "border-ink bg-ink text-ivory" : "border-line text-ink-soft hover:border-ink/40")}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="mt-4 w-full" role="img" aria-label={`${label}: ${widthMm} by ${heightMm} millimetres, shown beside a ${ref.label} (${ref.widthMm} mm).`}>
        {/* piece */}
        <rect x={px} y={baseline - ph} width={pw} height={ph} rx={Math.min(pw, ph) * 0.3} fill="#efe5d2" stroke="#a8864f" strokeWidth="1.2" />
        <text x={px + pw / 2} y={baseline - ph - 7} textAnchor="middle" className="fill-ink" style={{ font: "500 10px var(--font-dm-mono)" }}>
          {widthMm} × {heightMm} mm
        </text>

        {/* reference object */}
        {ref.shape === "rect" && <rect x={rx} y={baseline - rh} width={rw} height={rh} rx={3 * scale} fill="none" stroke="#857e73" strokeDasharray="3 3" />}
        {ref.shape === "circle" && <circle cx={rx + rw / 2} cy={baseline - rh / 2} r={rw / 2} fill="none" stroke="#857e73" strokeDasharray="3 3" />}
        {ref.shape === "dodecagon" && <polygon points={dodecagon(rx + rw / 2, baseline - rh / 2, rw / 2)} fill="none" stroke="#857e73" strokeDasharray="3 3" />}
        <text x={rx + rw / 2} y={baseline - rh - 7} textAnchor="middle" className="fill-muted" style={{ font: "10px var(--font-jost)" }}>
          {ref.label} · {ref.widthMm} mm
        </text>

        {/* ruler */}
        <line x1={PAD} y1={baseline + 8} x2={PAD + rulerMm * scale} y2={baseline + 8} stroke="#d2c8b8" />
        {Array.from({ length: rulerMm / 5 + 1 }, (_, i) => {
          const x = PAD + i * 5 * scale;
          const major = i % 2 === 0;
          return (
            <g key={i}>
              <line x1={x} y1={baseline + 8} x2={x} y2={baseline + (major ? 14 : 11)} stroke="#d2c8b8" />
              {major && (i * 5) % 20 === 0 && (
                <text x={x} y={baseline + 24} textAnchor="middle" className="fill-muted" style={{ font: "8.5px var(--font-dm-mono)" }}>
                  {i * 5}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-[12.5px] text-muted">
        {widthMm} mm wide × {heightMm} mm {heightMm > 60 ? "long" : "high"}
        {depthMm ? ` · ${depthMm} mm deep` : ""}. Measurements are the visible face of the piece.
      </p>
    </div>
  );
}
