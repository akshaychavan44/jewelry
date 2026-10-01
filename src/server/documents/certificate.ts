import "server-only";

import type { Certificate } from "@/generated/prisma/client";
import { CLARITY_SCALE, CUT_GRADES, GEMSTONES, LABS, STONE_SHAPES } from "@/lib/jewelry";
import { createDoc, GOLD, LINE, MUTED, rule, SAGE, text, wordmark } from "./pdf";

/**
 * Report summary rendered from the grading data a jeweler recorded. Used when
 * the laboratory's own PDF hasn't been uploaded — clearly labelled as a
 * summary, with a link to the laboratory's verification service.
 */
export async function renderCertificateSummary(cert: Certificate, productTitle: string, storeName: string) {
  const { pdf, page, fonts } = await createDoc();
  const { width, height } = page.getSize();
  const lab = LABS[cert.lab];
  const left = 56;
  const right = width - 56;

  page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, borderColor: LINE, borderWidth: 1 });
  wordmark(page, fonts, left, height - 92);
  text(page, "REPORT SUMMARY", right, height - 80, fonts.sansBold, 8, SAGE, { align: "right" });
  text(page, "Not the laboratory's original report", right, height - 93, fonts.sans, 8, MUTED, { align: "right" });
  rule(page, left, right, height - 116);

  text(page, lab.full, left, height - 150, fonts.serif, 22);
  text(page, `${lab.name} report number`, left, height - 176, fonts.sans, 8, MUTED);
  text(page, cert.reportNumber, left, height - 192, fonts.mono, 15);
  if (cert.issuedAt) {
    text(page, "Date of issue", right - 150, height - 176, fonts.sans, 8, MUTED);
    text(page, cert.issuedAt.toISOString().slice(0, 10), right - 150, height - 192, fonts.mono, 12);
  }

  const clarity = CLARITY_SCALE.find((c) => c.grade === cert.clarityGrade);
  const rows: [string, string | null | undefined][] = [
    ["Piece", productTitle],
    ["Offered by", storeName],
    ["Stone", cert.gemstone ? GEMSTONES[cert.gemstone] : null],
    ["Shape and cutting style", cert.shape ? STONE_SHAPES[cert.shape] : null],
    ["Measurements", cert.measurements],
    ["Carat weight", cert.caratWeight ? `${cert.caratWeight.toFixed(2)} ct` : null],
    ["Colour grade", cert.colorGrade],
    ["Clarity grade", clarity ? `${clarity.grade} — ${clarity.name}` : null],
    ["Cut grade", cert.cutGrade ? CUT_GRADES[cert.cutGrade] : null],
    ["Polish", cert.polish ? CUT_GRADES[cert.polish] : null],
    ["Symmetry", cert.symmetry ? CUT_GRADES[cert.symmetry] : null],
    ["Fluorescence", cert.fluorescence],
    ["Origin / treatment", cert.origin],
    ["Hallmark purity", cert.hallmarkPurity],
    ["Assay office", cert.assayOffice],
    ["Notes", cert.notes],
  ];

  let y = height - 240;
  for (const [label, value] of rows) {
    if (!value) continue;
    text(page, label, left, y, fonts.sans, 9, MUTED);
    text(page, value, left + 170, y, fonts.serif, 12, undefined, { maxWidth: right - left - 170 });
    rule(page, left, right, y - 9, LINE, 0.5);
    y -= 30;
  }

  const verify = lab.verify?.(cert.reportNumber);
  y -= 16;
  page.drawRectangle({ x: left, y: y - 58, width: right - left, height: 70, color: GOLD, opacity: 0.08, borderColor: GOLD, borderOpacity: 0.4, borderWidth: 0.6 });
  text(page, "Verify independently", left + 16, y - 8, fonts.sansBold, 9);
  text(
    page,
    verify
      ? `Confirm this report directly with the laboratory: ${verify}`
      : cert.lab === "BIS_HALLMARK"
        ? `Verify HUID ${cert.reportNumber} in the BIS CARE app (Bureau of Indian Standards).`
        : "Ask the jeweler for the original laboratory document before purchase.",
    left + 16,
    y - 24,
    fonts.sans,
    8.5,
    MUTED,
    { maxWidth: right - left - 32 },
  );

  text(page, "Compiled by Loupe from details supplied by the jeweler and checked against the listing. The laboratory's own report remains the authoritative record.", left, 60, fonts.sans, 7.5, MUTED, { maxWidth: right - left });
  return pdf.save();
}
