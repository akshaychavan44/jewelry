import type { Metadata } from "next";
import { Hallmark } from "@/components/brand/hallmark";
import { GuideLayout, GuideSection } from "@/components/guides/guide-layout";
import { GoldPurityChart } from "@/components/home/education";
import { guideBySlug } from "@/config/guides";
import { formatDate } from "@/lib/format";
import { GOLD_PURITY } from "@/lib/jewelry";
import { convertMinor, formatMoney } from "@/lib/money";
import { computeSpotPrice } from "@/lib/pricing";
import { getPriceContext } from "@/server/services/currency";
import { getSpotQuotes, getSpotRates } from "@/server/services/market";

const guide = guideBySlug("gold-purity");
export const metadata: Metadata = { title: guide.title, description: guide.description };

const SECTIONS = [
  { id: "karats", label: "Karats & fineness" },
  { id: "chart", label: "Purity chart" },
  { id: "colour", label: "Yellow, white & rose" },
  { id: "hallmarks", label: "Hallmarks by country" },
  { id: "live-pricing", label: "How live pricing works" },
  { id: "choosing", label: "Which karat to choose" },
];

export default async function GoldPurityGuide() {
  const [ctx, quotes, spot] = await Promise.all([getPriceContext(), getSpotQuotes(), getSpotRates()]);
  const gold = quotes.find((q) => q.metal === "GOLD");
  const pureGoldPerGram = convertMinor((gold?.usdPerGram ?? 0) * 100, "USD", ctx.currency, ctx.rates, "exact");
  const money = (m: number) => formatMoney(m, ctx.currency, { exact: true });
  const example = computeSpotPrice({ metalType: "GOLD_22K", metalWeightGrams: 12, makingChargeType: "PERCENT", makingChargeValue: 12, currency: ctx.currency }, spot, ctx.rates);
  const rounding = example ? example.totalMinor - example.metalValueMinor - example.makingChargeMinor - example.stoneMinor : 0;

  return (
    <GuideLayout slug="gold-purity" sections={SECTIONS} cta={{ label: "Shop 18k and 22k gold", href: "/shop?metal=gold-18k,gold-22k" }}>
      <GuideSection id="karats" title="Karats and fineness are the same idea">
        <p>
          Pure gold is too soft to hold a stone securely, so jewelers alloy it with silver, copper, zinc or palladium. <strong>Karat</strong> tells you how much of the
          metal is gold, in twenty-fourths: 18k is 18 parts gold to 6 parts alloy, or 75%. <strong>Fineness</strong> says the same thing in parts per thousand, and it&rsquo;s
          the number you&rsquo;ll find struck inside a ring: 750.
        </p>
        <div className="my-6 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-[3px] border border-line bg-porcelain px-5 py-4">
          {(["GOLD_9K", "GOLD_14K", "GOLD_18K", "GOLD_22K", "GOLD_24K", "PLATINUM", "STERLING_SILVER"] as const).map((m) => (
            <span key={m} className="flex flex-col items-center gap-1.5">
              <Hallmark metal={m} />
              <span className="text-[11.5px] text-muted">{m === "PLATINUM" ? "Platinum" : m === "STERLING_SILVER" ? "Sterling" : m.replace("GOLD_", "").toLowerCase()}</span>
            </span>
          ))}
        </div>
        <p>
          On Loupe, every listing shows its fineness in that cartouche, exactly as it would be stamped — so a 585 piece from Florence and a 14k piece from Portland are easy to
          compare.
        </p>
      </GuideSection>

      <section id="chart" aria-label="Gold purity chart" className="scroll-mt-28">
        <GoldPurityChart pureGoldPerGram={pureGoldPerGram} currency={ctx.currency} updatedLabel={gold ? `Spot · ${formatDate(gold.fetchedAt, "dayMonth")}` : ""} guideLink={false} />
      </section>

      <GuideSection id="colour" title="Yellow, white and rose">
        <p>Colour comes from the alloy, not the gold itself.</p>
        <ul>
          <li>
            <strong>Yellow gold</strong> balances silver and copper. The higher the karat, the richer the colour — 22k has the deep, buttery tone prized in Indian bridal jewelry.
          </li>
          <li>
            <strong>White gold</strong> is alloyed with palladium or silver and usually plated with rhodium for a bright finish. Expect to re-plate every few years on rings worn
            daily; your jeweler can do it in a day.
          </li>
          <li>
            <strong>Rose gold</strong> owes its blush to copper. It&rsquo;s slightly harder than yellow gold of the same karat and never needs plating.
          </li>
        </ul>
      </GuideSection>

      <GuideSection id="hallmarks" title="Hallmarks, country by country">
        <p>A hallmark is an independent guarantee of purity, struck by an assay office rather than the maker. Rules differ by country:</p>
        <h3>India — BIS hallmark with HUID</h3>
        <p>
          Gold jewelry sold in India carries three marks: the BIS logo, the purity grade (for example <span className="font-mono text-[13px]">22K916</span>) and a
          six-character <strong>HUID</strong> unique to that piece. You can check any HUID in the government&rsquo;s BIS CARE app. Jewelers on Loupe enter the HUID on the
          listing, and our team verifies it before the piece is marked hallmarked.
        </p>
        <h3>United Kingdom — the assay office marks</h3>
        <p>
          Gold articles over one gram must be hallmarked by one of four assay offices. Look for the sponsor&rsquo;s (maker&rsquo;s) mark, the fineness number and the assay
          office symbol — the leopard&rsquo;s head for London, the anchor for Birmingham. Antique pieces often add a date letter, which dates them to the year.
        </p>
        <h3>United States — quality marks</h3>
        <p>
          There&rsquo;s no government assay, but any karat stamp must be accurate and federal law requires a maker&rsquo;s trademark beside it. For higher-value American
          pieces, look for a laboratory report or a jeweler&rsquo;s written specification — both are shown on Loupe listings when available.
        </p>
      </GuideSection>

      <GuideSection id="live-pricing" title="How live gold pricing works on Loupe">
        <p>
          Some jewelers — especially for plain gold chains, bangles and 22k bridal pieces — price by weight rather than a fixed tag. Their listings update automatically as the
          gold market moves, using one transparent formula:
        </p>
        <p className="my-5 rounded-[3px] border border-line bg-porcelain px-5 py-4 font-mono text-[13px] leading-relaxed text-ink">
          price = weight (g) × today&rsquo;s gold price × purity + making charge + stones
        </p>
        {example ? (
          <>
            <p>For a 12-gram 22k chain with a 12% making charge, today that works out to:</p>
            <dl className="my-5 divide-y divide-line rounded-[3px] border border-line bg-porcelain text-[14px]">
              {[
                ["22k gold per gram (91.6% of spot)", money(example.perGramMinor)],
                ["Metal value · 12 g", money(example.metalValueMinor)],
                ["Making charge · 12%", money(example.makingChargeMinor)],
                ...(rounding > 0 ? [["Rounded up to a whole amount", `+${money(rounding)}`]] : []),
                ["Price you pay", money(example.totalMinor)],
              ].map(([k, v], i, all) => (
                <div key={k} className={i === all.length - 1 ? "flex justify-between gap-4 px-5 py-3 font-medium text-ink" : "flex justify-between gap-4 px-5 py-3 text-ink-soft"}>
                  <dt>{k}</dt>
                  <dd className="tabular">{v}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}
        <p>
          Tap the price on any weight-priced listing to see this breakdown for that piece. The price is locked the moment you check out, and the breakdown is saved on your
          invoice.
        </p>
      </GuideSection>

      <GuideSection id="choosing" title="Which karat should you choose?">
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[14px]">
            <thead>
              <tr className="border-b border-line text-[11px] tracking-[0.12em] text-muted uppercase">
                <th className="px-1 py-2.5 font-medium">Karat</th>
                <th className="px-1 py-2.5 font-medium">Fineness</th>
                <th className="px-1 py-2.5 font-medium">Gold</th>
                <th className="px-1 py-2.5 font-medium">Best for</th>
                <th className="px-1 py-2.5 text-right font-medium">Per gram today</th>
              </tr>
            </thead>
            <tbody>
              {GOLD_PURITY.map((k) => (
                <tr key={k.karat} className="border-b border-line/70">
                  <td className="px-1 py-3 font-display text-[18px] text-ink">{k.karat}</td>
                  <td className="px-1 py-3 font-mono text-[13px] text-ink-soft">{k.fineness}</td>
                  <td className="px-1 py-3 text-ink-soft tabular">{k.percent}%</td>
                  <td className="px-1 py-3 text-ink-soft">{k.use}</td>
                  <td className="px-1 py-3 text-right text-ink tabular">{pureGoldPerGram ? money(Math.round((pureGoldPerGram * k.percent) / 100)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-5">
          For an engagement ring worn every day, 18k is the classic choice: secure prongs and a warm colour. 14k is tougher and kinder to a budget. 22k is beautiful for
          bangles and pendants, but too soft to hold small stones for decades.
        </p>
      </GuideSection>
    </GuideLayout>
  );
}
