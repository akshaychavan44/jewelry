import type { Metadata } from "next";
import Link from "next/link";
import "./guides-index.css";
import { ArrowRight, MessagesSquare } from "lucide-react";
import { guides } from "@/config/guides";
import { formatDate } from "@/lib/format";
import { convertMinor, formatMoney } from "@/lib/money";
import { getPriceContext } from "@/server/services/currency";
import { getSpotQuotes } from "@/server/services/market";

export const metadata: Metadata = {
  title: "Buying guides",
  description: "Plain-spoken guides to gold purity, diamond clarity, ring sizing and gemological certificates — from the jewelers on Loupe.",
};

const GUIDE_CROPS: Record<string, string> = { "diamond-clarity": "1042 168 140 106", "ring-size": "1042 303 140 105", certificates: "1042 438 140 104" };
const METAL_CROPS: Record<string, string> = { GOLD: "683 825 88 72", SILVER: "955 825 88 72", PLATINUM: "1235 825 88 72", PALLADIUM: "1493 825 88 72" };
function ReferenceImage({ crop, className }: { crop: string; className?: string }) { return <svg viewBox={crop} className={className} aria-hidden="true"><image href="/media/guides-reference.png" width="1672" height="941" /></svg>; }
const METAL_NAMES = { GOLD: "Gold", PLATINUM: "Platinum", SILVER: "Silver", PALLADIUM: "Palladium" } as const;

export default async function GuidesIndex() {
  const [ctx, quotes] = await Promise.all([getPriceContext(), getSpotQuotes()]);
  const [lead, ...rest] = guides;

  return (
    <>
      <section aria-labelledby="buying-guides-heading" className="guides-editorial">
        <div className="guides-editorial-grid">
          <div className="min-w-0">
            <header className="guides-intro">
              <p className="flex items-center gap-3 text-[12px] font-medium uppercase tracking-[0.2em] text-ink-soft">
                <span className="h-px w-10 bg-gold" aria-hidden />Buying guides
              </p>
              <h1 id="buying-guides-heading" className="mt-4 font-display text-[44px] leading-[1.04] tracking-[-0.035em] text-ink sm:text-[58px] xl:text-[72px]">
                Know what you&rsquo;re<br /><span className="text-[#b67b31]">looking at.</span>
              </h1>
              <p className="mt-5 max-w-[740px] font-display text-[19px] leading-[1.5] text-ink sm:text-[22px]">
                Understand gold purity, diamond clarity, sizing and hallmarks. Choose your next piece with confidence.
              </p>
            </header>

            <article className="guides-featured">
              <div className="guides-featured-copy">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">{lead.minutes} min read</p>
                <h2 className="mt-3 font-display text-[30px] leading-[1.15] tracking-[-0.02em] text-ink xl:text-[36px]">{lead.title}</h2>
                <p className="mt-4 text-[16px] leading-[1.65] text-ink-soft">{lead.description}</p>
                <Link href={`/guides/${lead.slug}`} className="mt-6 inline-flex min-h-11 w-fit items-center gap-4 rounded-full border border-gold px-6 py-3 text-[12px] font-medium uppercase tracking-[0.13em] text-ink transition-colors hover:bg-gold-mist focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
                  Read guide <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </article>
          </div>

          <aside aria-labelledby="more-guides-heading" className="guides-sidebar">
            <h2 id="more-guides-heading" className="text-[13px] font-medium uppercase tracking-[0.18em] text-ink">More guides</h2>
            <div className="mt-4 divide-y divide-line">
              {rest.map((g) => (
                <Link key={g.slug} href={`/guides/${g.slug}`} className="guides-row group">
                  <ReferenceImage crop={GUIDE_CROPS[g.slug]} className="guides-thumbnail" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-soft">{g.minutes} min read</p>
                    <h3 className="mt-1 font-display text-[22px] leading-[1.18] tracking-[-0.015em] text-ink group-hover:text-gold-deep xl:text-[25px]">{g.title}</h3>
                    <p className="mt-2 line-clamp-2 text-[14px] leading-[1.5] text-ink-soft">{g.description}</p>
                    <span className="mt-3 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-gold-deep">Read guide <ArrowRight className="size-4" aria-hidden /></span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="guides-help">
              <div className="flex items-start gap-4">
                <MessagesSquare className="mt-1 hidden size-9 shrink-0 stroke-[1.2] text-gold-deep sm:block" aria-hidden />
                <div>
                  <h3 className="font-display text-[25px] leading-[1.2] text-ink">Still unsure? Ask the jeweler.</h3>
                  <p className="mt-3 text-[14px] leading-[1.6] text-ink-soft">Contact the jeweler directly for advice on stones, sizing and designs.</p>
                  <Link href="/jewelers" className="mt-5 inline-flex min-h-11 items-center gap-3 rounded-full border border-gold px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink transition-colors hover:bg-gold-mist focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
                    Meet our jewelers <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
      <section className="border-y border-line bg-parchment/40">
        <div className="guides-prices">
          <div>
            <p className="eyebrow">Today&rsquo;s spot prices</p>
            <p className="mt-2 text-[14.5px] text-ink-soft">
              Per gram of pure metal in {ctx.currency}. Jewelers who price by weight update automatically — see{" "}
              <Link href="/guides/gold-purity#live-pricing" className="link-quiet text-ink">
                how live pricing works
              </Link>
              .
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...quotes].sort((a, b) => ["GOLD", "SILVER", "PLATINUM", "PALLADIUM"].indexOf(a.metal) - ["GOLD", "SILVER", "PLATINUM", "PALLADIUM"].indexOf(b.metal)).map((q) => (
              <div key={q.metal} className="guides-price-card">
                <ReferenceImage crop={METAL_CROPS[q.metal]} className="guides-metal" />
                <dt className="text-[14px] text-ink-soft">{METAL_NAMES[q.metal]}</dt>
                <dd className="mt-1 text-[21px] font-semibold tracking-tight text-ink tabular">{formatMoney(convertMinor(q.usdPerGram * 100, "USD", ctx.currency, ctx.rates, "exact"), ctx.currency, { exact: true })}</dd>
                <dd className={q.changePct >= 0 ? "text-[12px] text-moss" : "text-[12px] text-rosewood"}>
                  {q.changePct >= 0 ? "▲" : "▼"} {Math.abs(q.changePct).toFixed(2)}% · {formatDate(q.fetchedAt, "dayMonth")}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
