import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** The original Jewelrex artwork, displayed without recoloring or distortion. */
export function Logo({ className, compact = false, href = "/" }: { className?: string; compact?: boolean; href?: string | null }) {
  const mark = (
    <span className={cn("inline-flex flex-col items-center leading-none text-ink", className)}>
      <Image src="/brand/jewelrex-logo.png" alt={siteConfig.name} width={1984} height={793} unoptimized
        className={cn("block h-auto shrink-0 object-contain", compact ? "w-[160px]" : "w-[190px]")} />
      {!compact && <span className="mt-1 text-[8px] font-medium tracking-[0.16em] text-ink-soft uppercase">{siteConfig.descriptor}</span>}
    </span>
  );
  if (!href) return mark;
  return <Link href={href} aria-label={siteConfig.name + " — home"} className="inline-flex">{mark}</Link>;
}
