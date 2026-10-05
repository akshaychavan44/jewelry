import { HandCoins, PackageCheck, RotateCcw, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/config/site";
import styles from "./bars.module.css";

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
    <section aria-label="Our assurances" className={styles.trustBar}>
      <ul>
        {TRUST.map(({ icon: Icon, title, body }) => (
          <li key={title}>
            <Icon strokeWidth={1.1} aria-hidden />
            <div>
              <p>{title}</p>
              <p>{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
