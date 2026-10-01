import type { Metadata } from "next";
import Link from "next/link";
import { GuideCard, GuideRow } from "@/components/guides/guide-layout";
import { guides } from "@/config/guides";
import { formatDate } from "@/lib/format";
import { convertMinor, formatMoney } from "@/lib/money";
import { getPriceContext } from "@/server/services/currency";
import { getSpotQuotes } from "@/server/services/market";

export const metadata: Metadata = {
  title: "Buying guides",
  description: "Plain-spoken guides to gold purity, diamond clarity, ring sizing and gemological certificates — from the jewelers on Loupe.",
};

const METAL_NAMES = { GOLD: "Gold", PLATINUM: "Platinum", SILVER: "Silver", PALLADIUM: "Palladium" } as const;

export default async function GuidesIndex() {
  const [ctx, quotes] = await Promise.all([getPriceContext(), getSpotQuotes()]);
  const [lead, ...rest] = guides;

  return (
    <>
      <header className="shell pt-14 pb-10 md:pt-20">
        <p className="eyebrow">Buying guides</p>
        <h1 className="display-xl mt-3 max-w-3xl text-ink">Know what you&rsquo;re looking at.</h1>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-soft">
          Fine jewelry has its own language — karats, clarity grades, report numbers, hallmarks. These guides translate it, so you can compare pieces from different jewelers with confidence.
        </p>
      </header>

      <section className="shell grid gap-12 pb-16 lg:grid-cols-[1.3fr_1fr]">
        <GuideCard slug={lead.slug} className="[&_h3]:text-[30px]" />
        <div className="flex flex-col gap-8 lg:border-l lg:border-line lg:pl-10">
          <p className="caps text-muted">More guides</p>
          {rest.map((g) => (
            <GuideRow key={g.slug} slug={g.slug} />
          ))}
          <div className="mt-auto rounded-[3px] border border-line bg-porcelain p-6">
            <p className="display-sm text-ink">Still unsure? Ask the jeweler.</p>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">Every listing has an &ldquo;Ask the jeweler&rdquo; button. Most reply within a few hours — about stones, sizing, or a piece you have in mind.</p>
            <Link href="/jewelers" className="link-quiet mt-4 inline-block text-[14px] text-ink">
              Meet our jewelers
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-parchment/40">
        <div className="shell grid gap-8 py-12 md:grid-cols-[1fr_2fr] md:items-center">
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
            {quotes.map((q) => (
              <div key={q.metal} className="rounded-[3px] border border-line bg-porcelain px-4 py-3">
                <dt className="text-[12px] text-muted">{METAL_NAMES[q.metal]}</dt>
                <dd className="mt-1 text-[19px] font-semibold tracking-tight text-ink tabular">{formatMoney(convertMinor(q.usdPerGram * 100, "USD", ctx.currency, ctx.rates, "exact"), ctx.currency, { exact: true })}</dd>
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
