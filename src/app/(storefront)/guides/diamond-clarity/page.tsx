import type { Metadata } from "next";
import { GuideLayout, GuideQuote, GuideSection, GuideTakeaway } from "@/components/guides/guide-layout";
import { ClarityGuide } from "@/components/home/education";
import { guideBySlug } from "@/config/guides";
import { CLARITY_SCALE, CUT_GRADES } from "@/lib/jewelry";
import { CheckCircle2, Eye, Gem, Search, Sparkles } from "lucide-react";

const guide = guideBySlug("diamond-clarity");
export const metadata: Metadata = {
  title: `${guide.title} | Loupe Buying Guides`,
  description: guide.description,
};

const SECTIONS = [
  { id: "scale", label: "The clarity scale" },
  { id: "explorer", label: "Clarity explorer" },
  { id: "eye-clean", label: "Where eye-clean begins" },
  { id: "four-cs", label: "Clarity and the other Cs" },
  { id: "lab-grown", label: "Lab-grown diamonds" },
  { id: "buying", label: "Buying on Loupe" },
];

const GROUPS = ["Flawless", "VVS", "VS", "SI", "Included"] as const;

export default function DiamondClarityGuide() {
  return (
    <GuideLayout
      slug="diamond-clarity"
      sections={SECTIONS}
      cta={{
        label: "Shop GIA & IGI certified diamonds",
        href: "/shop?gem=diamond,lab-grown-diamond&cert=gia,igi",
      }}
    >
      {/* ============================================================ */}
      {/* 01. THE CLARITY SCALE */}
      {/* ============================================================ */}
      <GuideSection id="scale" title="Eleven grades, one magnification">
        <p>
          Nearly every natural diamond formed deep within the earth with tiny crystals, feathers, or clouds inside it — known as <strong>inclusions</strong> — and small surface characteristics called <strong>blemishes</strong>.
        </p>
        <p>
          Clarity measures how visible these natural characteristics are to a trained gemologist examining the stone under <strong>10× magnification</strong> using an achromatic, aplanatic loupe.
        </p>

        {/* Polished Luxury Comparison Table */}
        <div className="my-8 overflow-hidden rounded-[18px] border border-[#e2d6c5] bg-[#FFFDF8] shadow-[0_8px_30px_-12px_rgba(47,44,40,0.08)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[14.5px]">
              <thead>
                <tr className="border-b border-[#e2d6c5] bg-[#f8f1e4] text-[11px] font-bold uppercase tracking-[0.16em] text-[#86683a]">
                  <th className="py-3.5 pl-6 pr-4">Grade</th>
                  <th className="py-3.5 pr-4">Name</th>
                  <th className="py-3.5 pr-6">At 10× Magnification</th>
                </tr>
              </thead>
              {GROUPS.map((group, groupIdx) => (
                <tbody key={group} className={groupIdx > 0 ? "border-t border-[#eee5d8]" : ""}>
                  {CLARITY_SCALE.filter((g) => g.group === group).map((g, idx) => (
                    <tr
                      key={g.grade}
                      className="transition-colors hover:bg-[#FAF6EE] odd:bg-transparent even:bg-[#faf7f2]/50"
                    >
                      <td className="py-3.5 pl-6 pr-4 align-top">
                        <span className="inline-flex items-center rounded-[6px] border border-[#d6b579]/60 bg-[#f7eedf] px-2.5 py-1 font-mono text-[12px] font-bold text-[#86683a] shadow-2xs">
                          {g.grade}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 align-top font-medium text-ink">
                        {g.name}
                      </td>
                      <td className="py-3.5 pr-6 align-top text-[#5a4e40] leading-relaxed">
                        {g.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </div>

        <p className="text-[14.5px] text-ink-soft">
          When assigning a grade, gemological laboratories like <strong>GIA</strong> and <strong>IGI</strong> evaluate five key criteria: the <em>size</em> of the inclusions, their <em>quantity</em>, their <em>position</em> within the stone, their <em>nature</em> (crystals vs feathers), and how prominently they <em>contrast</em> with the diamond.
        </p>

        <GuideQuote
          quote="Clarity is nature's fingerprint. Rather than chasing theoretical perfection, focus on finding an eye-clean diamond that maximizes sparkle and brilliance within your budget."
          author="Amelia Croft"
          role="GIA Graduate Gemologist"
        />
      </GuideSection>

      {/* ============================================================ */}
      {/* 02. CLARITY EXPLORER */}
      {/* ============================================================ */}
      <GuideSection id="explorer" title="Interactive clarity explorer">
        <p>
          Select a clarity grade below to preview its characteristic inclusion pattern and understand how each grade appears under laboratory magnification.
        </p>
        <div className="my-6">
          <ClarityGuide guideLink={false} editorial />
        </div>
      </GuideSection>

      {/* ============================================================ */}
      {/* 03. WHERE EYE-CLEAN BEGINS */}
      {/* ============================================================ */}
      <GuideSection id="eye-clean" title="Where eye-clean begins">
        <p>
          For everyday wear and fine jewelry, the grade that matters most is whether inclusions are visible to the unaided eye from a normal viewing distance (about 6 to 10 inches).
        </p>
        <p>
          For standard round brilliant diamonds under two carats, the eye-clean threshold typically sits comfortably around <strong>VS2 to SI1</strong> — universally recognized by collectors as the sweet spot for maximum value.
        </p>

        <div className="my-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[16px] border border-[#e5d8c3] bg-[#FFFDF8] p-5 shadow-2xs">
            <div className="flex size-9 items-center justify-center rounded-full bg-[#f6eedf] text-[#86683a] mb-3">
              <Sparkles className="size-4.5" />
            </div>
            <h4 className="font-display text-[18px] text-ink">Shape matters</h4>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
              Brilliant cuts scatter light and hide inclusions easily. Step cuts like Emerald and Asscher act like clear windows — choose VS2 or higher.
            </p>
          </div>

          <div className="rounded-[16px] border border-[#e5d8c3] bg-[#FFFDF8] p-5 shadow-2xs">
            <div className="flex size-9 items-center justify-center rounded-full bg-[#f6eedf] text-[#86683a] mb-3">
              <Gem className="size-4.5" />
            </div>
            <h4 className="font-display text-[18px] text-ink">Carat scale</h4>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
              Larger diamonds possess larger facets. An inclusion is noticeably easier to spot on a 3.0 ct diamond than on a 0.80 ct stone.
            </p>
          </div>

          <div className="rounded-[16px] border border-[#e5d8c3] bg-[#FFFDF8] p-5 shadow-2xs">
            <div className="flex size-9 items-center justify-center rounded-full bg-[#f6eedf] text-[#86683a] mb-3">
              <Search className="size-4.5" />
            </div>
            <h4 className="font-display text-[18px] text-ink">Inclusion position</h4>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
              Inclusions near the girdle or prongs are often hidden by settings; inclusions directly under the central table facet are most visible.
            </p>
          </div>
        </div>

        <p>
          When a jeweler on Loupe lists an item as &ldquo;eye-clean&rdquo;, you can request an HD macro video directly through the listing — most ateliers respond within hours.
        </p>
      </GuideSection>

      {/* ============================================================ */}
      {/* 04. CLARITY AND THE OTHER CS */}
      {/* ============================================================ */}
      <GuideSection id="four-cs" title="Balancing clarity with the 4Cs">
        <p>
          Clarity is rarely where you should allocate the bulk of your budget. <strong>Cut</strong> is by far the most critical factor for how intensely a diamond reflects light and scintillates. Always prioritize the highest cut grade available (<em>Excellent</em> for round brilliants).
        </p>
        <p>
          <strong>Color</strong> grades range from D (colorless) through Z. In yellow or rose gold settings, a G–J color diamond faces up brilliantly white while saving significant cost.
        </p>

        <GuideTakeaway
          title="The Loupe Curator Rule of Thumb"
          points={[
            "Allocate the highest priority to Cut grade — it governs 90% of sparkle and light return.",
            "Choose an eye-clean SI1 or VS2 to get the look of a flawless stone at a fraction of the cost.",
            "G–H color diamonds offer pristine white appearance in white gold and platinum.",
          ]}
        />
      </GuideSection>

      {/* ============================================================ */}
      {/* 05. LAB-GROWN DIAMONDS */}
      {/* ============================================================ */}
      <GuideSection id="lab-grown" title="Lab-grown diamonds & certification">
        <p>
          Laboratory-grown diamonds are 100% real diamonds — sharing the exact same physical, chemical, optical, and crystal properties as mined diamonds.
        </p>
        <p>
          They are graded according to the exact same color and clarity scales by certified institutes (principally <strong>IGI</strong> and <strong>GIA</strong>). Every grading certificate clearly identifies laboratory origin, and matching laser inscriptions are etched onto the girdle for complete verification.
        </p>
      </GuideSection>

      {/* ============================================================ */}
      {/* 06. BUYING ON LOUPE */}
      {/* ============================================================ */}
      <GuideSection id="buying" title="Buying a diamond on Loupe">
        <div className="rounded-[18px] border border-[#e5d7c3] bg-[#FFFDF8] p-6 sm:p-8 space-y-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="size-5 shrink-0 text-[#86683a] mt-0.5" />
            <div>
              <p className="font-semibold text-ink">GIA & IGI Report Verification</p>
              <p className="text-[14px] text-ink-soft mt-0.5">
                Every certified piece has its lab report checked against the issuing registry by our authentication team before listing.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="size-5 shrink-0 text-[#86683a] mt-0.5" />
            <div>
              <p className="font-semibold text-ink">3-Day Hands-on Inspection Window</p>
              <p className="text-[14px] text-ink-soft mt-0.5">
                Inspect your piece in person under natural light. Payment remains secured in escrow until you approve the item.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="size-5 shrink-0 text-[#86683a] mt-0.5" />
            <div>
              <p className="font-semibold text-ink">Direct Atelier Communication</p>
              <p className="text-[14px] text-ink-soft mt-0.5">
                Chat directly with independent jewelers for custom resizing, engraving, or high-definition face-up videos.
              </p>
            </div>
          </div>
        </div>
      </GuideSection>
    </GuideLayout>
  );
}
