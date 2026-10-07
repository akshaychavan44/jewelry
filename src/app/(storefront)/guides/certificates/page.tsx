import type { Metadata } from "next";
import Link from "next/link";
import { LabMark } from "@/components/brand/hallmark";
import { GuideLayout, GuideQuote, GuideSection, GuideTakeaway } from "@/components/guides/guide-layout";
import { guideBySlug } from "@/config/guides";
import type { CertificateLab } from "@/generated/prisma/enums";
import { LABS } from "@/lib/jewelry";
import { CheckCircle2, ExternalLink, FileCheck, FileText, Gem, ShieldCheck, Sparkles } from "lucide-react";

const guide = guideBySlug("certificates");
export const metadata: Metadata = { title: `${guide.title} | Loupe Buying Guides`, description: guide.description };

const SECTIONS = [
  { id: "why", label: "Why a report matters" },
  { id: "labs", label: "The laboratories" },
  { id: "reading", label: "Reading a report" },
  { id: "hallmarks", label: "Hallmarks count too" },
  { id: "loupe", label: "How Loupe checks" },
];

const LAB_NOTES: { lab: CertificateLab; covers: string }[] = [
  { lab: "GIA", covers: "Created the 4Cs grading system. The universally recognised gold standard for natural diamonds, coloured stones, and pearls." },
  { lab: "IGI", covers: "World authority in diamond and lab-grown gemstone certification, providing comprehensive reports and laser girdle inscriptions." },
  { lab: "HRD", covers: "Antwerp's premier diamond laboratory, respected throughout European diamond bourses and legacy houses." },
  { lab: "AGS", covers: "Pioneered scientific cut-grade and light-performance analysis for high-brilliance diamond cuts." },
  { lab: "SSEF", covers: "Swiss Gemmological Institute, the benchmark laboratory for exceptional rubies, sapphires, emeralds, and natural pearls." },
  { lab: "GUBELIN", covers: "Legendary Swiss laboratory renowned for high-jewelry origin reports and gemstone treatment detection." },
  { lab: "AGL", covers: "American Gemological Laboratories, specializing in colored gemstone country-of-origin and thermal treatment analysis." },
  { lab: "BIS_HALLMARK", covers: "India's mandatory government hallmark with unique 6-character HUID laser authentication for precious gold." },
  { lab: "ASSAY_OFFICE", covers: "UK statutory assay-office hallmarks guaranteeing precious metal purity across centuries of fine smithing." },
];

export default function CertificatesGuide() {
  return (
    <GuideLayout slug="certificates" sections={SECTIONS} cta={{ label: "Shop verified certified pieces", href: "/shop?cert=gia,igi,ssef,bis-hallmark" }}>
      {/* 01. WHY A REPORT MATTERS */}
      <GuideSection id="why" title="Why an independent report matters">
        <p>
          Two gemstones can look identical across a boutique counter and differ in value by thousands. A grading report from an independent gemological laboratory records what a stone objectively is — its exact weight, color, clarity, cut, and whether any heat or clarity enhancement treatments have occurred.
        </p>
        <p>
          A certificate describes the gemstone itself, not the retail markup. It provides an impartial, scientific baseline so you can evaluate pieces from independent ateliers worldwide with absolute transparency.
        </p>

        <GuideQuote
          quote="A laboratory report is your gemstone's passport and provenance. It eliminates conjecture and gives both buyer and collector unassailable peace of mind."
          author="Dr. Henri Dubois"
          role="Senior Gemological Consultant"
        />
      </GuideSection>

      {/* 02. THE LABORATORIES */}
      <GuideSection id="labs" title="The laboratories you'll see on Loupe">
        <div className="my-7 grid gap-4 sm:grid-cols-2">
          {LAB_NOTES.map(({ lab, covers }) => (
            <div key={lab} className="rounded-[16px] border border-[#e5d8c3] bg-[#FFFDF8] p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <LabMark lab={lab} />
                  {LABS[lab].verify && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10.5px] font-semibold text-[#86683a] uppercase tracking-wider bg-[#f8f1e4] px-2 py-0.5 rounded-full border border-[#d6b579]/40">
                      <FileCheck className="size-3" /> Online Verify
                    </span>
                  )}
                </div>
                <h4 className="font-display text-[18px] text-ink font-normal">{LABS[lab].full}</h4>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{covers}</p>
              </div>
            </div>
          ))}
        </div>
      </GuideSection>

      {/* 03. READING A REPORT */}
      <GuideSection id="reading" title="Anatomy of a grading report">
        <p>Key checkpoints to review when evaluating a laboratory report:</p>
        
        <div className="my-6 space-y-3.5">
          <div className="rounded-[14px] border border-[#e5d8c3] bg-[#FFFDF8] p-4.5 flex items-start gap-3.5 shadow-2xs">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f6eedf] text-[#86683a] mt-0.5">
              <FileText className="size-4" />
            </div>
            <div>
              <p className="font-medium text-[15px] text-ink">Report Number & Issue Date</p>
              <p className="text-[13.5px] text-ink-soft mt-0.5">Your unique lookup key on the issuing registry. Recent dates are preferred for colored gems as modern detection methods continue to advance.</p>
            </div>
          </div>

          <div className="rounded-[14px] border border-[#e5d8c3] bg-[#FFFDF8] p-4.5 flex items-start gap-3.5 shadow-2xs">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f6eedf] text-[#86683a] mt-0.5">
              <Gem className="size-4" />
            </div>
            <div>
              <p className="font-medium text-[15px] text-ink">Measurements & Carat Weight</p>
              <p className="text-[13.5px] text-ink-soft mt-0.5">Precise millimeter dimensions (length × width × depth). Stones of identical carat weight can have drastically different face-up visual presence depending on proportions.</p>
            </div>
          </div>

          <div className="rounded-[14px] border border-[#e5d8c3] bg-[#FFFDF8] p-4.5 flex items-start gap-3.5 shadow-2xs">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f6eedf] text-[#86683a] mt-0.5">
              <Sparkles className="size-4" />
            </div>
            <div>
              <p className="font-medium text-[15px] text-ink">4Cs Grading & Laser Inscription</p>
              <p className="text-[13.5px] text-ink-soft mt-0.5">Color, Clarity, Cut, Polish, and Symmetry grades. Many diamonds feature microscopic laser inscriptions on the girdle matching the registry ID.</p>
            </div>
          </div>
        </div>
      </GuideSection>

      {/* 04. HALLMARKS */}
      <GuideSection id="hallmarks" title="Precious metal hallmarks">
        <p>
          For fine gold and silver, the statutory guarantee is a formal assay hallmark rather than a gem paper. An Indian BIS hallmark carries an individual HUID verifiable in the BIS CARE app; a British hallmark is struck by one of four historic assay offices and dates antique jewelry.
        </p>
        <p>
          Learn more in our dedicated <Link href="/guides/gold-purity" className="font-medium text-[#86683a] underline underline-offset-4 hover:text-ink transition-colors">Gold Purity & Hallmarks Guide</Link>.
        </p>
      </GuideSection>

      {/* 05. HOW LOUPE CHECKS */}
      <GuideSection id="loupe" title="How Loupe verifies every certificate">
        <GuideTakeaway
          title="Loupe Authentication Guarantees"
          points={[
            "Registry Verification: Every attached report is verified directly with the issuing institute (GIA, IGI, SSEF) prior to listing approval.",
            "Single-Listing Integrity: A certificate number can belong to only one physical piece on Loupe, preventing copycat reuse.",
            "Complete Transparency: Review full high-resolution report PDFs directly on the piece page before placing an order.",
            "3-Day Inspection Escrow: Your payment remains secure in escrow during your in-person 3-day inspection window.",
          ]}
        />
      </GuideSection>
    </GuideLayout>
  );
}
