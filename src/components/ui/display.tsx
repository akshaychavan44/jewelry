import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import type { Tone } from "@/lib/status";
import { cn, initials } from "@/lib/utils";

// ── Badge ─────────────────────────────────────────────────────────────────────

const toneClasses: Record<Tone, string> = {
  neutral: "border-line-strong/70 bg-parchment text-ink-soft",
  sage: "border-sage/30 bg-sage-mist text-sage-deep",
  gold: "border-gold/35 bg-gold-mist text-gold-deep",
  success: "border-moss/25 bg-moss-mist text-moss",
  warning: "border-amber/30 bg-amber-mist text-amber",
  danger: "border-rosewood/25 bg-rosewood-mist text-rosewood",
  info: "border-slate/25 bg-slate-mist text-slate",
};

export function Badge({ tone = "neutral", className, children, dot }: { tone?: Tone; className?: string; children: React.ReactNode; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap", toneClasses[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export function StatusBadge<T extends string>({ status, map }: { status: T; map: Record<T, { label: string; tone: Tone }> }) {
  const s = map[status];
  return (
    <Badge tone={s?.tone ?? "neutral"} dot>
      {s?.label ?? status}
    </Badge>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-[3px] border border-line bg-porcelain", className)} {...props} />;
}

export function CardHeader({ title, description, action, className }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-medium text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ── Stars ─────────────────────────────────────────────────────────────────────

export function Stars({ rating, size = 14, className, label = true }: { rating: number; size?: number; className?: string; label?: boolean }) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-gold", className)} role={label ? "img" : undefined} aria-label={label ? `${rating.toFixed(1)} out of 5 stars` : undefined}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = rounded >= i + 1 ? 1 : rounded >= i + 0.5 ? 0.5 : 0;
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }} aria-hidden>
            <Star className="absolute inset-0 text-line-strong" style={{ width: size, height: size }} strokeWidth={1.4} />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: fill === 1 ? size : size / 2 }}>
                <Star className="fill-gold text-gold" style={{ width: size, height: size }} strokeWidth={1.4} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

// ── Monogram (store logos without an uploaded image) ──────────────────────────

export function Monogram({ name, src, size = 44, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className={cn("shrink-0 rounded-full border border-line object-cover", className)} style={{ width: size, height: size }} />;
  }
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center rounded-full border border-gold/40 bg-porcelain font-display text-gold-deep", className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials(name.replace(/&|and|co\.?/gi, " "))}
    </span>
  );
}

// ── Skeleton & empty states ───────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[2px] bg-sand/70", className)} />;
}

export function EmptyState({ icon, title, children, action, className }: { icon?: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-[3px] border border-dashed border-line-strong bg-porcelain/60 px-6 py-14 text-center", className)}>
      {icon && <div className="mb-4 text-gold [&_svg]:size-7 [&_svg]:stroke-[1.25]">{icon}</div>}
      <h3 className="display-sm text-ink">{title}</h3>
      {children && <div className="mt-2 max-w-md text-[14px] text-ink-soft">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-left text-[14px]", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: React.ComponentProps<"th">) {
  return <th className={cn("border-b border-line px-4 py-3 text-[11px] font-medium tracking-[0.12em] whitespace-nowrap text-muted uppercase", className)} {...props} />;
}

export function Td({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("border-b border-line/70 px-4 py-3.5 align-middle text-ink", className)} {...props} />;
}

// ── Pagination (link-based, works without JS) ─────────────────────────────────

export function Pagination({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (page: number) => string }) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1);
  const item = "grid h-10 min-w-10 place-items-center rounded-[2px] px-3 text-[14px] transition-colors";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(item, "hover:bg-parchment")} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className={cn(item, "text-line-strong")}>
          <ChevronLeft className="size-4" />
        </span>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-muted">…</span>}
          <Link href={hrefFor(p)} aria-current={p === page ? "page" : undefined} className={cn(item, p === page ? "bg-ink text-ivory" : "hover:bg-parchment")}>
            {p}
          </Link>
        </span>
      ))}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={cn(item, "hover:bg-parchment")} aria-label="Next page">
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(item, "text-line-strong")}>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}

// ── Page scaffolding ──────────────────────────────────────────────────────────

export function SectionHeading({ eyebrow, title, action, className, align = "left" }: { eyebrow?: string; title: React.ReactNode; action?: React.ReactNode; className?: string; align?: "left" | "center" }) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-end justify-between gap-4", align === "center" && "flex-col items-center text-center", className)}>
      <div>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 className="display-lg text-ink">{title}</h2>
      </div>
      {action}
    </div>
  );
}
