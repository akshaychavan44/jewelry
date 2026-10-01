import "server-only";

import { PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from "pdf-lib";

// Shared PDF primitives for invoices, packing slips, labels and report summaries.
// Standard fonts only support WinAnsi, so text is transliterated first.

export const INK = rgb(0.184, 0.173, 0.157);
export const MUTED = rgb(0.52, 0.49, 0.45);
export const LINE = rgb(0.86, 0.82, 0.76);
export const SAGE = rgb(0.482, 0.502, 0.412);
export const GOLD = rgb(0.659, 0.525, 0.31);
export const WHITE = rgb(1, 1, 1);

export function winAnsi(text: string) {
  return text
    .replace(/[₹]/g, "Rs.")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[×]/g, "x")
    .replace(/[•·]/g, "-")
    .replace(/[″]/g, '"')
    .replace(/[½]/g, " 1/2")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

export type Fonts = { serif: PDFFont; sans: PDFFont; sansBold: PDFFont; mono: PDFFont };

export async function createDoc(size: [number, number] = [595.28, 841.89]) {
  const pdf = await PDFDocument.create();
  const fonts: Fonts = {
    serif: await pdf.embedFont(StandardFonts.TimesRoman),
    sans: await pdf.embedFont(StandardFonts.Helvetica),
    sansBold: await pdf.embedFont(StandardFonts.HelveticaBold),
    mono: await pdf.embedFont(StandardFonts.Courier),
  };
  const page = pdf.addPage(size);
  return { pdf, page, fonts };
}

export function text(page: PDFPage, value: string, x: number, y: number, font: PDFFont, size: number, color = INK, opts: { maxWidth?: number; align?: "left" | "right" | "center" } = {}) {
  const t = winAnsi(value);
  const width = font.widthOfTextAtSize(t, size);
  const dx = opts.align === "right" ? -width : opts.align === "center" ? -width / 2 : 0;
  page.drawText(t, { x: x + dx, y, size, font, color, maxWidth: opts.maxWidth, lineHeight: size * 1.35 });
}

export function rule(page: PDFPage, x1: number, x2: number, y: number, color = LINE, thickness = 0.8) {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, color, thickness });
}

/** Wordmark in the brand's serif-over-caps arrangement. */
export function wordmark(page: PDFPage, fonts: Fonts, x: number, y: number) {
  text(page, "Loupe", x, y, fonts.serif, 26);
  text(page, "FINE JEWELRY MARKETPLACE", x + 1, y - 13, fonts.sans, 6.5, MUTED);
}

/** A Code 128-style barcode drawn from the input (visual, for labels & slips). */
export function barcode(page: PDFPage, value: string, x: number, y: number, width: number, height: number) {
  const bits: number[] = [];
  for (const ch of value) {
    const c = ch.charCodeAt(0);
    for (let i = 0; i < 7; i++) bits.push((c >> i) & 1, 1 - ((c >> (i + 1)) & 1));
  }
  const bar = width / bits.length;
  bits.forEach((b, i) => {
    if (b) page.drawRectangle({ x: x + i * bar, y, width: Math.max(bar * 0.9, 0.6), height, color: INK });
  });
}
