import { Award, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifiedJeweler({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[12px] font-medium text-sage-deep", className)} title="Business credentials and identity verified by Loupe">
      <BadgeCheck className="size-[15px]" strokeWidth={1.75} aria-hidden />
      {compact ? "Verified" : "Verified jeweler"}
    </span>
  );
}

export function TopRated({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[12px] font-medium text-gold-deep", className)} title="Consistently rated 4.6★ or higher with fast responses">
      <Award className="size-[15px]" strokeWidth={1.75} aria-hidden />
      Top rated
    </span>
  );
}

export function SocialIcon({ name, className }: { name: "instagram" | "pinterest" | "tiktok"; className?: string }) {
  const common = { className: cn("size-[18px]", className), viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, "aria-hidden": true } as const;
  if (name === "instagram") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
      </svg>
    );
  }
  if (name === "pinterest") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M10.6 20.6 12.2 13.6M11.3 12.9c-.4-1.9.6-3.9 2.6-3.9 1.7 0 2.6 1.2 2.6 2.7 0 2.4-1.3 4.3-3 4.3-.9 0-1.6-.7-1.4-1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M14 3v11.2a3.3 3.3 0 1 1-3.3-3.3" strokeLinecap="round" />
      <path d="M14 3c.4 2.4 2 4.1 4.5 4.3" strokeLinecap="round" />
    </svg>
  );
}
