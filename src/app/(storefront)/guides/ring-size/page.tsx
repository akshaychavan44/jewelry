import type { Metadata } from "next";
import { GuideLayout, GuideSection } from "@/components/guides/guide-layout";
import { SizeFinder } from "@/components/guides/size-finder";
import { guideBySlug } from "@/config/guides";
import { RING_SIZES } from "@/lib/jewelry";

const guide = guideBySlug("ring-size");
export const metadata: Metadata = { title: guide.title, description: guide.description };

const SECTIONS = [
  { id: "measure", label: "Three ways to measure" },
  { id: "finder", label: "Size finder" },
  { id: "chart", label: "International size chart" },
  { id: "between", label: "Between sizes" },
  { id: "resizing", label: "Resizing & made-to-size" },
];

export default function RingSizeGuide() {
  return (
    <GuideLayout slug="ring-size" sections={SECTIONS} cta={{ label: "Shop rings made to your size", href: "/shop/rings" }}>
      <GuideSection id="measure" title="Three ways to measure">
        <h3>1. From a ring that already fits</h3>
        <p>
          Lay the ring on a ruler and measure the <strong>inside diameter</strong> edge to edge, in millimetres. Use a ring worn on the same finger — sizes differ between
          hands and fingers.
        </p>
        <h3>2. With a strip of paper</h3>
        <p>
          Wrap a thin strip of paper snugly around the base of your finger, mark where it overlaps, then measure the length. That&rsquo;s your <strong>circumference</strong>.
          Make sure it slides over your knuckle.
        </p>
        <h3>3. At a jeweler</h3>
        <p>
          Any jeweler will size you with a set of steel sizing rings in a minute, free. It&rsquo;s the most accurate option before a significant purchase — especially for wide
          bands.
        </p>
      </GuideSection>

      <section id="finder" aria-label="Size finder" className="scroll-mt-28">
        <SizeFinder />
      </section>

      <GuideSection id="chart" title="International size chart">
        <p>US sizes are Loupe&rsquo;s reference. Listings show every scale, and your jeweler receives the size you choose exactly as you chose it.</p>
        <div className="my-5 max-h-[520px] overflow-auto rounded-[3px] border border-line">
          <table className="w-full min-w-[520px] text-left text-[14px]">
            <thead className="sticky top-0 bg-parchment">
              <tr className="text-[11px] tracking-[0.12em] text-muted uppercase">
                <th className="px-4 py-2.5 font-medium">US</th>
                <th className="px-4 py-2.5 font-medium">UK</th>
                <th className="px-4 py-2.5 font-medium">EU</th>
                <th className="px-4 py-2.5 font-medium">India</th>
                <th className="px-4 py-2.5 text-right font-medium">Diameter</th>
                <th className="px-4 py-2.5 text-right font-medium">Circumference</th>
              </tr>
            </thead>
            <tbody>
              {RING_SIZES.map((s) => (
                <tr key={s.us} className="border-t border-line/70">
                  <td className="px-4 py-2 font-medium text-ink">{s.us}</td>
                  <td className="px-4 py-2 text-ink-soft">{s.uk}</td>
                  <td className="px-4 py-2 text-ink-soft">{s.eu}</td>
                  <td className="px-4 py-2 text-ink-soft">{s.india}</td>
                  <td className="px-4 py-2 text-right font-mono text-[12.5px] text-ink-soft">{s.diameterMm} mm</td>
                  <td className="px-4 py-2 text-right font-mono text-[12.5px] text-ink-soft">{s.circumferenceMm} mm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GuideSection>

      <GuideSection id="between" title="If you're between sizes">
        <ul>
          <li>
            <strong>Measure late in the day</strong>, when fingers are at their largest — and not straight after exercise or in the cold.
          </li>
          <li>
            <strong>Wide bands fit tighter.</strong> For bands wider than about 5 mm, go up a quarter to half a size.
          </li>
          <li>
            <strong>Choose the larger size</strong> when in doubt. A ring can be sized down more easily than up, especially if it has stones set around the band.
          </li>
          <li>
            <strong>Large knuckles?</strong> Size for the knuckle, and ask the jeweler about sizing beads that keep the ring from turning.
          </li>
        </ul>
      </GuideSection>

      <GuideSection id="resizing" title="Resizing and made-to-size rings">
        <p>
          Many rings on Loupe are <strong>made to size</strong> — the jeweler finishes the band to your measurement before shipping, and the listing shows how many working days
          that adds. Others are stocked in set sizes; if yours isn&rsquo;t listed, use &ldquo;Ask the jeweler&rdquo;, and many will resize before dispatch for a small fee shown on
          the listing.
        </p>
        <p>
          Eternity bands and some antique pieces can&rsquo;t be resized. The listing will say so, and those rings are always returnable in their original size under the
          jeweler&rsquo;s return policy.
        </p>
      </GuideSection>
    </GuideLayout>
  );
}
