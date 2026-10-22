import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** The storefront navbar uses the video-derived wordmark on desktop. */
export function Logo({ className, compact = false, href = "/", videoWordmark = false }: { className?: string; compact?: boolean; href?: string | null; videoWordmark?: boolean }) {
  const mark = (
    <span className={cn("inline-flex flex-col items-center leading-none text-ink", className)}>
      {videoWordmark ? (
        <picture className="block">
          <source media="(min-width: 1024px)" srcSet="/brand/jewelrex-video-wordmark.png" />
          <Image src="/brand/jewelrex-logo.png" alt={siteConfig.name} width={1984} height={793} unoptimized
            data-brand-wordmark className="block h-auto w-[170px] shrink-0 object-contain" />
        </picture>
      ) : <Image src="/brand/jewelrex-logo.png" alt={siteConfig.name} width={1984} height={793} unoptimized
        className={cn("block h-auto shrink-0 object-contain", compact ? "w-[160px]" : "w-[190px]")} />}
      {!compact && <span data-brand-description className="mt-1 text-[8px] font-medium tracking-[0.16em] text-ink-soft uppercase">{siteConfig.descriptor}</span>}
    </span>
  );
  if (!href) return mark;
  return <Link href={href} aria-label={siteConfig.name + " — home"} className="inline-flex">{mark}</Link>;
}
