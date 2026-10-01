import { HandCoins, PackageCheck, RotateCcw, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/config/site";

export function AnnouncementBar() {
  return (
    <div className="bg-sage text-white">
      <p className="shell flex h-8 items-center justify-center gap-3 text-center text-[10.5px] font-medium tracking-[0.2em] uppercase">
        <span aria-hidden className="opacity-70">✦</span>
        <span className="truncate">{siteConfig.announcement}</span>
        <span aria-hidden className="opacity-70">✦</span>
      </p>
    </div>
  );
}

const TRUST = [
  { icon: ShieldCheck, title: "Certified & verified", body: "Every jeweler vetted, every report checked" },
  { icon: HandCoins, title: "Payment held for you", body: "Released only after you approve" },
  { icon: PackageCheck, title: "Insured delivery", body: "Signature-tracked, door to door" },
  { icon: RotateCcw, title: "Returns to the jeweler", body: "Prepaid, insured return labels" },
];

/** Assurance strip shown above the footer (mirrors the reference's service row). */
export function TrustBar() {
  return (
    <section aria-label="Our assurances" className="border-y border-line bg-parchment/60">
      <ul className="shell grid grid-cols-2 gap-y-6 py-7 md:grid-cols-4 md:divide-x md:divide-line-strong/60">
        {TRUST.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex items-center gap-3.5 px-2 md:justify-center md:px-6">
            <Icon className="size-7 shrink-0 text-ink-soft" strokeWidth={1.1} aria-hidden />
            <div>
              <p className="caps text-[10.5px] text-ink">{title}</p>
              <p className="text-[12.5px] leading-snug text-muted">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
