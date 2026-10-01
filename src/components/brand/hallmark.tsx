import type { CertificateLab, MetalType } from "@/generated/prisma/enums";
import { LABS, METALS } from "@/lib/jewelry";
import { cn } from "@/lib/utils";

// Signature detail: purity is shown the way it is struck into the metal —
// as a millesimal fineness mark in a cartouche (750 = 18k, PT950 = platinum).

const cartouche = "[clip-path:polygon(4px_0,calc(100%-4px)_0,100%_4px,100%_calc(100%-4px),calc(100%-4px)_100%,4px_100%,0_calc(100%-4px),0_4px)]";

export function Hallmark({ metal, className, tone = "light" }: { metal: MetalType; className?: string; tone?: "light" | "glass" }) {
  const info = METALS[metal];
  if (!info.fineness) return null;
  return (
    <span
      title={`${info.label} · ${info.purity ? `${(info.purity * 100).toFixed(1)}% pure` : ""}`}
      aria-label={`Hallmark ${info.fineness}: ${info.label}`}
      className={cn(
        "inline-flex h-[22px] items-center p-px",
        cartouche,
        tone === "glass" ? "bg-gold-deep/45" : "bg-gold/55",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex h-full items-center px-2 font-mono text-[10.5px] font-medium tracking-[0.06em] text-gold-deep",
          cartouche,
          tone === "glass" ? "bg-ivory/85 backdrop-blur-sm" : "bg-gold-mist",
        )}
      >
        {info.fineness}
      </span>
    </span>
  );
}

export function LabMark({ lab, className, tone = "light" }: { lab: CertificateLab; className?: string; tone?: "light" | "glass" }) {
  const info = LABS[lab];
  const short = lab === "BIS_HALLMARK" ? "BIS" : lab === "ASSAY_OFFICE" ? "UK HM" : info.name.toUpperCase();
  return (
    <span
      title={`Certified · ${info.full}`}
      aria-label={`Certified by ${info.full}`}
      className={cn(
        "inline-flex h-[22px] items-center gap-1 rounded-full border px-2 font-mono text-[10px] font-medium tracking-[0.08em]",
        tone === "glass" ? "border-sage-deep/30 bg-ivory/85 text-sage-deep backdrop-blur-sm" : "border-sage/35 bg-sage-mist text-sage-deep",
        className,
      )}
    >
      <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
        <path d="M6 .8l1.4 1.1 1.8-.1.5 1.7 1.5 1-.6 1.7.6 1.7-1.5 1-.5 1.7-1.8-.1L6 11.2l-1.4-1.1-1.8.1-.5-1.7-1.5-1 .6-1.7-.6-1.7 1.5-1 .5-1.7 1.8.1z" fill="currentColor" opacity=".22" />
        <path d="M3.9 6.1l1.4 1.3 2.8-2.9" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {short}
    </span>
  );
}
