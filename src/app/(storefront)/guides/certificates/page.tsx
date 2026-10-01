import type { Metadata } from "next";
import { LabMark } from "@/components/brand/hallmark";
import { GuideLayout, GuideSection } from "@/components/guides/guide-layout";
import { guideBySlug } from "@/config/guides";
import type { CertificateLab } from "@/generated/prisma/enums";
import { LABS } from "@/lib/jewelry";

const guide = guideBySlug("certificates");
export const metadata: Metadata = { title: guide.title, description: guide.description };

const SECTIONS = [
  { id: "why", label: "Why a report matters" },
  { id: "labs", label: "The laboratories" },
  { id: "reading", label: "Reading a report" },
  { id: "hallmarks", label: "Hallmarks count too" },
  { id: "loupe", label: "How Loupe checks" },
];

const LAB_NOTES: { lab: CertificateLab; covers: string }[] = [
  { lab: "GIA", covers: "Created the 4Cs grading system. The most widely recognised reports for diamonds, coloured stones and pearls." },
  { lab: "IGI", covers: "Grades a large share of the world's diamonds, including most lab-grown stones, with reports and girdle inscriptions." },
  { lab: "HRD", covers: "Antwerp's diamond laboratory, common on stones cut and traded in Europe." },
  { lab: "AGS", covers: "Cut-focused diamond reports with light-performance grading; still found on many stones in the resale market." },
  { lab: "SSEF", covers: "Swiss laboratory for rubies, sapphires, emeralds and natural pearls, including origin opinions." },
  { lab: "GUBELIN", covers: "Swiss laboratory known for coloured-stone origin reports on important gems." },
  { lab: "AGL", covers: "American laboratory specialising in coloured stones, treatments and origin." },
  { lab: "BIS_HALLMARK", covers: "India's mandatory gold hallmark, with a unique six-character HUID for each piece." },
  { lab: "ASSAY_OFFICE", covers: "UK assay-office hallmarks guaranteeing precious-metal purity, compulsory above set weights." },
];

export default function CertificatesGuide() {
  return (
    <GuideLayout slug="certificates" sections={SECTIONS} cta={{ label: "Shop certified pieces", href: "/shop?cert=gia,igi,ssef,bis-hallmark" }}>
      <GuideSection id="why" title="Why a report matters">
        <p>
          Two diamonds can look identical across a counter and differ in value by thousands. A grading report from an independent laboratory records what a stone is — its
          weight, colour, clarity, cut and any treatment — measured by people with no stake in the sale. For coloured stones and pearls, it can also tell you whether the gem is
          natural and where it likely came from.
        </p>
        <p>A report describes the stone, not the setting or the price. It&rsquo;s the reason you can compare pieces from jewelers in different countries on equal terms.</p>
      </GuideSection>

      <GuideSection id="labs" title="The laboratories you'll see on Loupe">
        <ul className="list-none! pl-0!">
          {LAB_NOTES.map(({ lab, covers }) => (
            <li key={lab} className="flex flex-col gap-2 border-b border-line py-4 sm:flex-row sm:items-start sm:gap-5">
              <span className="w-28 shrink-0 pt-0.5">
                <LabMark lab={lab} />
              </span>
              <span>
                <strong>{LABS[lab].full}</strong>
                <span className="block">{covers}</span>
                {LABS[lab].verify && <span className="mt-1 block text-[13px] text-muted">Reports can be checked on the lab&rsquo;s website by report number.</span>}
              </span>
            </li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="reading" title="Reading a grading report">
        <ul>
          <li>
            <strong>Report number and date.</strong> The number is your key to the lab&rsquo;s online register. A recent date matters for coloured stones, whose treatments are
            better understood now than a decade ago.
          </li>
          <li>
            <strong>Shape, measurements and carat weight.</strong> Measurements in millimetres tell you how large a stone looks; two stones of equal weight can face up
            differently.
          </li>
          <li>
            <strong>Colour, clarity and cut.</strong> The heart of a diamond report. Cut is graded for round brilliants; fancy shapes list polish and symmetry instead.
          </li>
          <li>
            <strong>Fluorescence.</strong> A glow under UV light. Faint or none is typical; strong blue fluorescence can make a stone look slightly hazy.
          </li>
          <li>
            <strong>Inscription.</strong> Many stones have the report number laser-inscribed on the girdle — invisible to the eye, but visible with a loupe. It&rsquo;s the
            simplest way to match the stone in your hand to its report.
          </li>
          <li>
            <strong>Comments and treatments.</strong> For coloured stones: &ldquo;no indications of heating&rdquo;, &ldquo;minor oil&rdquo; and origin opinions all affect value
            significantly.
          </li>
        </ul>
      </GuideSection>

      <GuideSection id="hallmarks" title="Hallmarks count too">
        <p>
          For plain gold and silver, the relevant document is a hallmark rather than a grading report. An Indian BIS hallmark carries a HUID you can verify in the BIS CARE app;
          a British hallmark is struck by an assay office and even dates antique pieces. Loupe treats both as certificates: they&rsquo;re recorded against the listing and
          verified by our team. The <a href="/guides/gold-purity">gold purity guide</a> covers the marks in detail.
        </p>
      </GuideSection>

      <GuideSection id="loupe" title="How Loupe checks every certificate">
        <ul>
          <li>
            <strong>Verified before it counts.</strong> When a jeweler attaches a report, our team checks the number against the issuing lab&rsquo;s register. Only verified
            reports appear in the &ldquo;certified&rdquo; filters and on the listing badge.
          </li>
          <li>
            <strong>One report, one listing.</strong> A report number can back only one piece on Loupe, so a certificate can&rsquo;t be reused for a lookalike.
          </li>
          <li>
            <strong>Open it before you buy.</strong> The report is attached to the listing — you can read it in full before checkout, and it&rsquo;s included with your order.
          </li>
          <li>
            <strong>Inspect when it arrives.</strong> You have three days after delivery before the jeweler is paid. If anything doesn&rsquo;t match the report, open a case from
            your order and we&rsquo;ll hold the funds while we investigate.
          </li>
        </ul>
      </GuideSection>
    </GuideLayout>
  );
}
