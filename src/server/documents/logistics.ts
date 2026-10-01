import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { AddressSnapshot } from "@/lib/order-math";
import { countryName } from "@/lib/regions";
import { CARRIERS } from "@/lib/shipping";
import { barcode, createDoc, INK, LINE, MUTED, rule, SAGE, text, WHITE, wordmark } from "./pdf";

function block(a: AddressSnapshot) {
  return [a.fullName, a.company, a.line1, a.line2, `${a.city}${a.region ? `, ${a.region}` : ""} ${a.postalCode}`, countryName(a.country).toUpperCase(), a.phone].filter(Boolean) as string[];
}

type LabelShipment = Prisma.ShipmentGetPayload<{ include: { sellerOrder: { select: { reference: true } }; returnRequest: { select: { rmaNumber: true } } } }>;

/**
 * 4×6" thermal label. Deliberately plain: no brand name and no mention of
 * jewelry on the outside of a high-value parcel.
 */
export async function renderShippingLabel(s: LabelShipment) {
  const { pdf, page, fonts } = await createDoc([288, 432]);
  const from = s.fromAddress as AddressSnapshot;
  const to = s.toAddress as AddressSnapshot;
  const carrier = CARRIERS[s.carrier].label.toUpperCase();

  page.drawRectangle({ x: 8, y: 8, width: 272, height: 416, borderColor: INK, borderWidth: 1.2 });
  text(page, carrier, 18, 400, fonts.sansBold, 13);
  text(page, (s.service ?? "INSURED").toUpperCase(), 270, 401, fonts.sansBold, 8, INK, { align: "right" });
  rule(page, 8, 280, 390, INK, 1);

  text(page, "FROM", 18, 376, fonts.sansBold, 6.5, MUTED);
  block(from).forEach((l, i) => text(page, l, 18, 365 - i * 9.5, fonts.sans, 7.5));
  rule(page, 8, 280, 296, LINE, 0.6);

  text(page, "SHIP TO", 18, 282, fonts.sansBold, 7.5);
  block(to).forEach((l, i) => text(page, l, 18, 266 - i * 13, i === 0 ? fonts.sansBold : fonts.sans, i === 0 ? 11.5 : 10));
  rule(page, 8, 280, 168, INK, 1);

  if (s.signatureRequired) {
    page.drawRectangle({ x: 18, y: 140, width: 118, height: 20, color: INK });
    text(page, "SIGNATURE REQUIRED", 77, 146, fonts.sansBold, 7.5, WHITE, { align: "center" });
  }
  text(page, s.direction === "RETURN" ? `RETURN ${s.returnRequest?.rmaNumber ?? ""}` : `REF ${s.sellerOrder?.reference ?? ""}`, 270, 146, fonts.mono, 8, INK, { align: "right" });

  if (s.trackingNumber) {
    barcode(page, s.trackingNumber, 22, 58, 244, 64);
    text(page, s.trackingNumber, 144, 42, fonts.mono, 10, INK, { align: "center" });
  }
  text(page, `Weight ${s.weightGrams ?? 250} g · Insured · ${new Date().toISOString().slice(0, 10)}`, 144, 20, fonts.sans, 6.5, MUTED, { align: "center" });
  return pdf.save();
}

type SlipOrder = Prisma.SellerOrderGetPayload<{
  include: { order: { select: { orderNumber: true; shippingAddress: true; placedAt: true; createdAt: true } }; items: true; seller: { select: { storeName: true; returnWindowDays: true } } };
}>;

export async function renderPackingSlip(so: SlipOrder) {
  const { pdf, page, fonts } = await createDoc();
  const { width, height } = page.getSize();
  const left = 52;
  const right = width - 52;
  const to = so.order.shippingAddress as AddressSnapshot;

  wordmark(page, fonts, left, height - 74);
  text(page, "PACKING SLIP", right, height - 60, fonts.sansBold, 10, SAGE, { align: "right" });
  text(page, so.reference, right, height - 75, fonts.mono, 11, INK, { align: "right" });
  text(page, `Order date ${(so.order.placedAt ?? so.order.createdAt).toISOString().slice(0, 10)}`, right, height - 89, fonts.sans, 8.5, MUTED, { align: "right" });
  rule(page, left, right, height - 106);

  text(page, "FOR", left, height - 130, fonts.sansBold, 7.5, MUTED);
  block(to).forEach((l, i) => text(page, l, left, height - 145 - i * 13, fonts.sans, 10));
  text(page, "FROM", left + 280, height - 130, fonts.sansBold, 7.5, MUTED);
  text(page, so.seller.storeName, left + 280, height - 145, fonts.serif, 13);
  text(page, "via Loupe", left + 280, height - 160, fonts.sans, 9, MUTED);

  let y = height - 260;
  text(page, "PIECE", left, y, fonts.sansBold, 7.5, MUTED);
  text(page, "SKU", left + 300, y, fonts.sansBold, 7.5, MUTED);
  text(page, "QTY", right, y, fonts.sansBold, 7.5, MUTED, { align: "right" });
  rule(page, left, right, y - 7, LINE, 0.6);
  y -= 26;
  for (const item of so.items) {
    text(page, item.title, left, y, fonts.serif, 12, INK, { maxWidth: 280 });
    const details = [item.variantTitle, item.ringSize ? `Ring size US ${item.ringSize}` : null, item.engravingText ? `Engraved: "${item.engravingText}"` : null].filter(Boolean).join(" · ");
    text(page, details, left, y - 14, fonts.sans, 8.5, MUTED, { maxWidth: 280 });
    text(page, item.sku, left + 300, y, fonts.mono, 9.5);
    text(page, String(item.quantity), right, y, fonts.sans, 10, INK, { align: "right" });
    y -= 44;
    rule(page, left, right, y + 16, LINE, 0.4);
  }

  y -= 20;
  page.drawRectangle({ x: left, y: y - 70, width: right - left, height: 84, borderColor: LINE, borderWidth: 0.8 });
  text(page, "Inspect on arrival", left + 16, y - 6, fonts.serif, 13);
  text(
    page,
    `You have three days after delivery to report anything in your Loupe account before the jeweler is paid, and ${so.seller.returnWindowDays} days to request a return. Keep the original packaging and certificates with the piece.`,
    left + 16,
    y - 24,
    fonts.sans,
    9,
    MUTED,
    { maxWidth: right - left - 32 },
  );
  text(page, `Track or manage this order: loupe.example/account/orders/${so.order.orderNumber}`, left, 60, fonts.sans, 8, MUTED);
  return pdf.save();
}
