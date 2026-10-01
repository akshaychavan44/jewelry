"use client";

// Hand-rolled SVG charts following the house data-viz rules:
// 2px lines, ~10% area wash, hairline solid grid, ≥8px end-dots with a 2px
// surface ring, ≤24px columns with 4px rounded caps, a crosshair tooltip on
// every plot, and a table view twin. Palette validated for CVD separation:
// slot 1 gold #9a6b12, slot 2 sapphire #2f6fa8 (both ≥3:1 on the surface).

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { SERIES } from "@/lib/chart-palette";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

const SURFACE = "#fdfcf9";
const GRID = "#ebe5da";
const AXIS_TEXT = "#857e73";

export type ValueFormat = { type: "money"; currency: string } | { type: "number" } | { type: "percent" };

export function formatValue(v: number, f: ValueFormat, compact = false) {
  if (f.type === "money") return formatMoney(Math.round(v), f.currency, { compact });
  if (f.type === "percent") return `${v.toFixed(1)}%`;
  return compact ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v) : Math.round(v).toLocaleString("en-US");
}

/** Clean axis ticks: 0, 2,000, 4,000… */
function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

function TableView({ caption, columns, rows }: { caption: string; columns: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-2 text-[12.5px] text-ink-soft">
      <summary className="cursor-pointer text-muted hover:text-ink">View as table</summary>
      <div className="mt-2 max-h-64 overflow-y-auto rounded-[2px] border border-line">
        <table className="w-full text-left tabular">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-parchment">
            <tr>{columns.map((c) => <th key={c} className="px-3 py-1.5 font-medium text-ink">{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-line/70">
                {r.map((cell, j) => <td key={j} className="px-3 py-1">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// ── Time series (1–2 series on one axis) ──────────────────────────────────────

export type Series = { name: string; points: { date: string; value: number }[] };

export function TimeSeriesChart({ series, format, height = 240, area = true, caption, colors = SERIES }: { series: Series[]; format: ValueFormat; height?: number; area?: boolean; caption: string; colors?: readonly string[] }) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = { top: 16, right: 64, bottom: 28, left: 56 };
  const n = series[0]?.points.length ?? 0;
  const max = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.value)));
  const ticks = useMemo(() => niceTicks(max), [max]);
  const top = ticks[ticks.length - 1];
  const plotW = Math.max(10, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => pad.top + plotH - (v / top) * plotH;
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 90))));

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left - pad.left;
    setHover(Math.max(0, Math.min(n - 1, Math.round((px / plotW) * (n - 1)))));
  };
  const hovered = hover !== null ? series.map((s) => ({ name: s.name, value: s.points[hover]?.value ?? 0 })) : null;

  return (
    <figure>
      {series.length > 1 && (
        <figcaption className="mb-3 flex flex-wrap gap-4 text-[12.5px] text-ink-soft">
          {series.map((s, i) => (
            <span key={s.name} className="inline-flex items-center gap-2">
              <span className="h-0.5 w-4 rounded-full" style={{ background: colors[i] }} aria-hidden />
              {s.name}
            </span>
          ))}
        </figcaption>
      )}
      <div ref={box} className="relative">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={caption}
          tabIndex={0}
          className="block outline-none focus-visible:ring-2 focus-visible:ring-sage/30"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
            if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n) - 1));
            if (e.key === "Escape") setHover(null);
          }}
          onBlur={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={pad.left + plotW} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={AXIS_TEXT} className="tabular">
                {formatValue(t, format, true)}
              </text>
            </g>
          ))}
          {series[0]?.points.map((p, i) =>
            i % labelEvery === 0 ? (
              <text key={p.date} x={x(i)} y={height - 8} textAnchor="middle" fontSize={11} fill={AXIS_TEXT}>
                {dayFmt.format(new Date(p.date))}
              </text>
            ) : null,
          )}
          {series.map((s, si) => {
            const path = s.points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join("");
            return (
              <g key={s.name}>
                {area && si === 0 && <path d={`${path}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={colors[si]} opacity={0.1} />}
                <path d={path} fill="none" stroke={colors[si]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {n > 0 && (
                  <>
                    <circle cx={x(n - 1)} cy={y(s.points[n - 1].value)} r={4} fill={colors[si]} stroke={SURFACE} strokeWidth={2} />
                    <text x={x(n - 1) + 9} y={y(s.points[n - 1].value)} dy="0.32em" fontSize={11.5} fill="#2f2c28" fontWeight={500}>
                      {formatValue(s.points[n - 1].value, format, true)}
                    </text>
                  </>
                )}
              </g>
            );
          })}
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + plotH} stroke="#57524a" strokeWidth={1} />
              {series.map((s, si) => (
                <circle key={s.name} cx={x(hover)} cy={y(s.points[hover].value)} r={4} fill={colors[si]} stroke={SURFACE} strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>
        {hover !== null && hovered && (
          <div
            id={`${id}-tip`}
            role="status"
            className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-[3px] border border-line bg-ivory px-3 py-2 shadow-soft"
            style={{ left: Math.min(Math.max(x(hover) + 12, 0), width - 160) }}
          >
            <p className="text-[11.5px] text-muted">{dayFmt.format(new Date(series[0].points[hover].date))}</p>
            {hovered.map((h, i) => (
              <p key={h.name} className="flex items-center gap-2 text-[13px]">
                <span className="h-0.5 w-3 rounded-full" style={{ background: colors[i] }} aria-hidden />
                <span className="font-semibold text-ink">{formatValue(h.value, format)}</span>
                {series.length > 1 && <span className="text-muted">{h.name}</span>}
              </p>
            ))}
          </div>
        )}
      </div>
      <TableView
        caption={caption}
        columns={["Date", ...series.map((s) => s.name)]}
        rows={(series[0]?.points ?? []).map((p, i) => [dayFmt.format(new Date(p.date)), ...series.map((s) => formatValue(s.points[i].value, format))])}
      />
    </figure>
  );
}

// ── Columns (one series across nominal categories → one colour) ───────────────

export function ColumnChart({ data, format, height = 220, caption }: { data: { label: string; value: number }[]; format: ValueFormat; height?: number; caption: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = niceTicks(max, 3);
  const top = ticks[ticks.length - 1];
  const band = 100 / Math.max(1, data.length);
  const plotH = height - 44;
  return (
    <figure>
      <div className="relative" style={{ height }}>
        <div className="absolute inset-x-0 top-0" style={{ height: plotH }}>
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-[#ebe5da]" style={{ bottom: `${(t / top) * 100}%` }}>
              <span className="absolute -top-2 left-0 bg-porcelain pr-1 text-[10.5px] text-muted tabular">{formatValue(t, format, true)}</span>
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 top-0 flex items-end pl-9" style={{ height: plotH }} role="list" aria-label={caption}>
          {data.map((d, i) => {
            const h = (d.value / top) * 100;
            return (
              <div key={d.label} role="listitem" className="relative flex h-full flex-1 items-end justify-center" style={{ maxWidth: `${band}%` }}>
                <button
                  type="button"
                  aria-label={`${d.label}: ${formatValue(d.value, format)}`}
                  className="relative flex h-full w-full items-end justify-center outline-none"
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                >
                  <span className="relative block w-6 max-w-[70%] rounded-t-[4px] transition-opacity" style={{ height: `${h}%`, background: SERIES[0], opacity: hover === null || hover === i ? 1 : 0.55 }}>
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[11.5px] font-medium whitespace-nowrap text-ink">{d.value > 0 ? formatValue(d.value, format, true) : ""}</span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex pl-9" style={{ height: 40 }}>
          {data.map((d) => (
            <p key={d.label} className="flex-1 px-1 pt-2 text-center text-[11px] leading-tight text-ink-soft">
              {d.label}
            </p>
          ))}
        </div>
      </div>
      <TableView caption={caption} columns={["Category", "Value"]} rows={data.map((d) => [d.label, formatValue(d.value, format)])} />
    </figure>
  );
}

// ── Sparkline & stat tile ─────────────────────────────────────────────────────

export function Sparkline({ values, width = 120, height = 32, className }: { values: number[]; width?: number; height?: number; className?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const x = (i: number) => (i / (values.length - 1)) * (width - 6) + 3;
  const y = (v: number) => height - 3 - ((v - min) / (max - min || 1)) * (height - 6);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("");
  const last = values.length - 1;
  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <path d={d} fill="none" stroke="#c9c1b3" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <path d={`M${x(last - 1)},${y(values[last - 1])}L${x(last)},${y(values[last])}`} stroke={SERIES[0]} strokeWidth={2} strokeLinecap="round" />
      <circle cx={x(last)} cy={y(values[last])} r={3} fill={SERIES[0]} stroke={SURFACE} strokeWidth={1.5} />
    </svg>
  );
}

export function StatTile({ label, value, delta, deltaLabel, upIsGood = true, trend, hint }: { label: string; value: string; delta?: number | null; deltaLabel?: string; upIsGood?: boolean; trend?: number[]; hint?: string }) {
  const good = delta === undefined || delta === null ? null : delta === 0 ? null : (delta > 0) === upIsGood;
  return (
    <div className="flex flex-col justify-between rounded-[3px] border border-line bg-porcelain px-5 py-4">
      <p className="text-[12.5px] text-ink-soft">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-[26px] leading-none font-semibold tracking-tight text-ink">{value}</p>
        {trend && <Sparkline values={trend} />}
      </div>
      {(delta !== undefined && delta !== null) || hint ? (
        <p className="mt-2 text-[12px] text-muted">
          {delta !== undefined && delta !== null && (
            <span className={cn("mr-1 font-medium", good === true && "text-moss", good === false && "text-rosewood")}>
              {delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {deltaLabel ?? hint}
        </p>
      ) : null}
    </div>
  );
}
