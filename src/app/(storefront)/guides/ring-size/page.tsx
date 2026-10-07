import type { Metadata } from "next";
import { GuideLayout, GuideQuote, GuideSection, GuideTakeaway } from "@/components/guides/guide-layout";
import { SizeFinder } from "@/components/guides/size-finder";
import { guideBySlug } from "@/config/guides";
import { RING_SIZES } from "@/lib/jewelry";
import { CheckCircle2, Ruler, Sparkles, UserCheck } from "lucide-react";

const guide = guideBySlug("ring-size");
export const metadata: Metadata = { title: `${guide.title} | Loupe Buying Guides`, description: guide.description };

const SECTIONS = [
  { id: "measure", label: "Three ways to measure" },
  { id: "finder", label: "Size finder" },
  { id: "chart", label: "International size chart" },
  { id: "between", label: "Between sizes" },
  { id: "resizing", label: "Resizing & made-to-size" },
];

export default function RingSizeGuide() {
  return (
    <GuideLayout slug="ring-size" sections={SECTIONS} cta={{ label: "Shop rings made to your exact size", href: "/shop/rings" }}>
      {/* 01. THREE WAYS TO MEASURE */}
      <GuideSection id="measure" title="Three reliable ways to measure">
        <p>
          Ring sizing is precise to fractions of a millimeter. Here are the three most trusted methods to determine your exact fit before commissioning or purchasing a ring:
        </p>

        <div className="my-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[16px] border border-[#e5d8c3] bg-[#FFFDF8] p-5 shadow-2xs">
            <div className="flex size-9 items-center justify-center rounded-full bg-[#f6eedf] text-[#86683a] mb-3">
              <Ruler className="size-4.5" />
            </div>
            <h4 className="font-display text-[18px] text-ink">1. Existing ring</h4>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
              Lay a ring that already fits on a ruler and measure its <strong>inside diameter</strong> in mm. Ensure it is worn on the same target finger.
            </p>
          </div>

          <div className="rounded-[16px] border border-[#e5d8c3] bg-[#FFFDF8] p-5 shadow-2xs">
            <div className="flex size-9 items-center justify-center rounded-full bg-[#f6eedf] text-[#86683a] mb-3">
              <Sparkles className="size-4.5" />
            </div>
            <h4 className="font-display text-[18px] text-ink">2. Paper or string</h4>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
              Wrap a strip snugly around the base of your finger, mark the overlap, and measure length to calculate your <strong>circumference</strong>.
            </p>
          </div>

          <div className="rounded-[16px] border border-[#e5d8c3] bg-[#FFFDF8] p-5 shadow-2xs">
            <div className="flex size-9 items-center justify-center rounded-full bg-[#f6eedf] text-[#86683a] mb-3">
              <UserCheck className="size-4.5" />
            </div>
            <h4 className="font-display text-[18px] text-ink">3. Master jeweler</h4>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
              Any local atelier will size you with calibrated steel sizing rings in seconds — the gold standard for wide wedding bands.
            </p>
          </div>
        </div>

        <GuideQuote
          quote="A properly sized ring should slide smoothly over the knuckle with slight resistance, resting comfortably without spinning throughout daily activities."
          author="Marcus Vane"
          role="Loupe Head of Bench Operations"
        />
      </GuideSection>

      {/* 02. SIZE FINDER */}
      <section id="finder" aria-label="Size finder" className="scroll-mt-32">
        <SizeFinder />
      </section>

      {/* 03. INTERNATIONAL SIZE CHART */}
      <GuideSection id="chart" title="International ring size chart">
        <p>
          US sizes serve as Loupe&rsquo;s unified benchmark. Every listing translates measurements across standard scales, and your jeweler receives your precise choice.
        </p>

        {/* Polished Luxury Scrollable Table */}
        <div className="my-7 overflow-hidden rounded-[18px] border border-[#e2d6c5] bg-[#FFFDF8] shadow-[0_8px_30px_-12px_rgba(47,44,40,0.08)]">
          <div className="max-h-[500px] overflow-auto">
            <table className="w-full min-w-[540px] text-left text-[14px]">
              <thead className="sticky top-0 bg-[#f8f1e4] z-10 border-b border-[#e2d6c5]">
                <tr className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#86683a]">
                  <th className="py-3.5 pl-6 pr-4">US</th>
                  <th className="py-3.5 pr-4">UK / AU</th>
                  <th className="py-3.5 pr-4">EU</th>
                  <th className="py-3.5 pr-4">India</th>
                  <th className="py-3.5 pr-4 text-right">Diameter</th>
                  <th className="py-3.5 pr-6 text-right">Circumference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee5d8]">
                {RING_SIZES.map((s) => (
                  <tr key={s.us} className="transition-colors hover:bg-[#FAF6EE] odd:bg-transparent even:bg-[#faf7f2]/50">
                    <td className="py-3 pl-6 pr-4 font-display text-[16px] text-ink font-normal">{s.us}</td>
                    <td className="py-3 pr-4 text-[#5a4e40]">{s.uk}</td>
                    <td className="py-3 pr-4 text-[#5a4e40]">{s.eu}</td>
                    <td className="py-3 pr-4 text-[#5a4e40]">{s.india}</td>
                    <td className="py-3 pr-4 text-right font-mono text-[13px] text-[#86683a] font-semibold">{s.diameterMm} mm</td>
                    <td className="py-3 pr-6 text-right font-mono text-[13px] text-ink font-semibold">{s.circumferenceMm} mm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </GuideSection>

      {/* 04. BETWEEN SIZES */}
      <GuideSection id="between" title="If you're between sizes">
        <GuideTakeaway
          title="Important Sizing Principles"
          points={[
            "Measure late in the day when fingers are naturally warmer and at full volume.",
            "For wide bands (over 5mm width), size up by 1/4 to 1/2 size for a comfortable fit.",
            "Always choose the larger size when uncertain — sizing down is simpler than sizing up.",
            "For prominent knuckles, size for the knuckle and request sizing beads from the jeweler to prevent spinning.",
          ]}
        />
      </GuideSection>

      {/* 05. RESIZING */}
      <GuideSection id="resizing" title="Resizing and made-to-size rings">
        <div className="rounded-[18px] border border-[#e5d7c3] bg-[#FFFDF8] p-6 sm:p-8 space-y-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="size-5 shrink-0 text-[#86683a] mt-0.5" />
            <div>
              <p className="font-semibold text-ink">Made to Size at the Bench</p>
              <p className="text-[14px] text-ink-soft mt-0.5">
                Many rings on Loupe are crafted custom to your finger circumference before shipment, ensuring pristine metal integrity.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="size-5 shrink-0 text-[#86683a] mt-0.5" />
            <div>
              <p className="font-semibold text-ink">Complimentary Atelier Consultations</p>
              <p className="text-[14px] text-ink-soft mt-0.5">
                Message the atelier directly to confirm whether eternity settings or antique bands can be safely resized.
              </p>
            </div>
          </div>
        </div>
      </GuideSection>
    </GuideLayout>
  );
}
