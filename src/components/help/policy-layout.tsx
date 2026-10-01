import Link from "next/link";
import { cn } from "@/lib/utils";

const HELP_PAGES = [
  { href: "/help/shipping-returns", label: "Shipping & returns" },
  { href: "/help/terms", label: "Terms of use" },
  { href: "/help/privacy", label: "Privacy" },
];

/** Plain-language policy pages: title, last-updated line, prose, sibling navigation. */
export function PolicyLayout({ current, title, updated, intro, children, sample }: { current: string; title: string; updated: string; intro: React.ReactNode; children: React.ReactNode; sample?: boolean }) {
  return (
    <div className="shell grid gap-12 py-12 md:py-16 lg:grid-cols-[200px_minmax(0,1fr)]">
      <aside>
        <p className="caps mb-3 text-muted">Help</p>
        <nav aria-label="Help pages" className="flex gap-4 overflow-x-auto text-[14px] lg:flex-col lg:gap-2">
          {HELP_PAGES.map((p) => (
            <Link key={p.href} href={p.href} aria-current={p.href === current ? "page" : undefined} className={cn("shrink-0 whitespace-nowrap", p.href === current ? "text-ink underline underline-offset-4" : "text-ink-soft hover:text-ink")}>
              {p.label}
            </Link>
          ))}
        </nav>
      </aside>
      <article className="max-w-[720px] min-w-0">
        <p className="eyebrow">Updated {updated}</p>
        <h1 className="display-lg mt-3 text-ink">{title}</h1>
        <div className="mt-5 text-[17px] leading-relaxed text-ink-soft">{intro}</div>
        <div className="prose-loupe mt-10">{children}</div>
        {sample && (
          <p className="mt-12 rounded-[3px] border border-dashed border-line-strong px-4 py-3 text-[13px] text-muted">
            Sample policy for this marketplace build. Have it reviewed by counsel in each market you operate in before launch.
          </p>
        )}
      </article>
    </div>
  );
}
