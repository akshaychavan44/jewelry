import Link from "next/link";
import { cn } from "@/lib/utils";

/** Date-range presets — one row, above everything it scopes. */
export function RangeFilter({ basePath, value, options = [7, 30, 90] }: { basePath: string; value: number; options?: number[] }) {
  return (
    <div className="flex items-center gap-1 rounded-[3px] border border-line bg-porcelain p-1" role="group" aria-label="Date range">
      {options.map((d) => (
        <Link key={d} href={`${basePath}?range=${d}`} aria-current={value === d ? "true" : undefined} className={cn("rounded-[2px] px-3 py-1.5 text-[13px] transition-colors", value === d ? "bg-ink text-ivory" : "text-ink-soft hover:bg-parchment")}>
          Last {d} days
        </Link>
      ))}
    </div>
  );
}

export function parseRange(value: string | undefined, allowed = [7, 30, 90], fallback = 30) {
  const n = Number(value);
  return allowed.includes(n) ? n : fallback;
}
