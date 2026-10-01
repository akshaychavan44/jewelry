import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** Wordmark: serif name over tracked capitals, after the brand reference. */
export function Logo({ className, compact = false, href = "/" }: { className?: string; compact?: boolean; href?: string | null }) {
  const mark = (
    <span className={cn("inline-flex flex-col items-center leading-none text-ink", className)}>
      <span className={cn("font-display tracking-[0.02em]", compact ? "text-[26px]" : "text-[34px] md:text-[38px]")}>{siteConfig.name}</span>
      {!compact && (
        <span className="mt-1.5 pl-[0.34em] text-[8.5px] font-medium tracking-wordmark text-ink-soft uppercase md:text-[9px]">
          {siteConfig.descriptor}
        </span>
      )}
    </span>
  );
  if (!href) return mark;
  return (
    <Link href={href} aria-label={`${siteConfig.name} — home`} className="inline-flex">
      {mark}
    </Link>
  );
}
