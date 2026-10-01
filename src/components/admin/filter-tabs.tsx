import Link from "next/link";
import { cn } from "@/lib/utils";

/** Link-based status tabs with counts — one row above the list they filter. */
export function FilterTabs({ tabs, active, label }: { tabs: { value: string; label: string; href: string; count?: number }[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="scrollbar-none -mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0">
      {tabs.map((t) => (
        <Link
          key={t.value}
          href={t.href}
          aria-current={t.value === active ? "page" : undefined}
          className={cn(
            "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 pt-1 pb-3 text-[14px] whitespace-nowrap transition-colors",
            t.value === active ? "border-ink text-ink" : "border-transparent text-ink-soft hover:text-ink",
          )}
        >
          {t.label}
          {t.count !== undefined && <span className={cn("rounded-full px-1.5 text-[11.5px] leading-5 tabular", t.value === active ? "bg-ink text-ivory" : "bg-parchment text-muted")}>{t.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
