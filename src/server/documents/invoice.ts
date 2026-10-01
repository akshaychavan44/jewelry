import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { AddressSnapshot } from "@/lib/order-math";
import { formatMoney } from "@/lib/money";
import { countryName } from "@/lib/regions";
import { num } from "@/lib/utils";
import { createDoc, INK, LINE, MUTED, rule, SAGE, text, wordmark } from "./pdf";

type InvoiceOrder = Prisma.OrderGetPayload<{
  include: { payments: true; sellerOrders: { include: { items: true; seller: { select: { storeName: true; legalBusinessName: true; city: true; country: true; taxIdLast4: true } } } } };
}>;

function addressLines(a: AddressSnapshot) {
  return [a.fullName, a.company, a.line1, a.line2, `${a.city}${a.region ? `, ${a.region}` : ""} ${a.postalCode}`, countryName(a.country)].filter(Boolean) as string[];
}

/** Buyer invoice. When `sellerOrderId` is given, renders only that vendor's part. */
export async function renderInvoice(order: InvoiceOrder, sellerOrderId?: string) {
  const { pdf, page, fonts } = await createDoc();
  const { width, height } = page.getSize();
  const left = 48;
  const right = width - 48;
  const money = (m: bigint | number) => formatMoney(num(m), order.currency, { exact: true });
  const parts = sellerOrderId ? order.sellerOrders.filter((so) => so.id === sellerOrderId) : order.sellerOrders;

  wordmark(page, fonts, left, height - 72);
  text(page, "INVOICE", right, height - 58, fonts.sansBold, 11, SAGE, { align: "right" });
  text(page, sellerOrderId ? parts[0].reference : order.orderNumber, right, height - 74, fonts.mono, 11, INK, { align: "right" });
  text(page, `Issued ${(order.placedAt ?? order.createdAt).toISOString().slice(0, 10)}`, right, height - 88, fonts.sans, 8.5, MUTED, { align: "right" });
  rule(page, left, right, height - 106);

  const ship = order.shippingAddress as AddressSnapshot;
  const bill = order.billingAddress as AddressSnapshot;
  text(page, "BILL TO", left, height - 128, fonts.sansBold, 7.5, MUTED);
  addressLines(bill).forEach((l, i) => text(page, l, left, height - 142 - i * 12, fonts.sans, 9));
  text(page, "SHIP TO", left + 200, height - 128, fonts.sansBold, 7.5, MUTED);
  addressLines(ship).forEach((l, i) => text(page, l, left + 200, height - 142 - i * 12, fonts.sans, 9));
  const payment = order.payments.find((p) => p.status !== "FAILED");
  text(page, "PAYMENT", left + 390, height - 128, fonts.sansBold, 7.5, MUTED);
  text(page, payment?.methodSummary ?? "Card", left + 390, height - 142, fonts.sans, 9);
  text(page, order.email, left + 390, height - 154, fonts.sans, 9);

  let y = height - 230;
  for (const so of parts) {
    text(page, `Sold by ${so.seller.legalBusinessName ?? so.seller.storeName}`, left, y, fonts.sansBold, 9.5);
    text(page, `${so.seller.city ?? ""}, ${countryName(so.seller.country)}${so.seller.taxIdLast4 ? ` · Tax ID ••••${so.seller.taxIdLast4}` : ""} · ${so.reference}`, left, y - 13, fonts.sans, 8, MUTED);
    y -= 32;
    text(page, "ITEM", left, y, fonts.sansBold, 7.5, MUTED);
    text(page, "QTY", right - 150, y, fonts.sansBold, 7.5, MUTED, { align: "right" });
    text(page, "AMOUNT", right, y, fonts.sansBold, 7.5, MUTED, { align: "right" });
    rule(page, left, right, y - 6, LINE, 0.5);
    y -= 22;
    for (const item of so.items) {
      text(page, item.title, left, y, fonts.sans, 9.5, INK, { maxWidth: 330 });
      text(page, `${item.variantTitle ?? ""} · SKU ${item.sku}${item.engravingText ? ` · Engraving "${item.engravingText}"` : ""}${item.ringSize ? ` · Size ${item.ringSize}` : ""}`, left, y - 12, fonts.sans, 7.5, MUTED, { maxWidth: 330 });
      text(page, String(item.quantity), right - 150, y, fonts.sans, 9.5, INK, { align: "right" });
      text(page, money(item.totalMinor), right, y, fonts.sans, 9.5, INK, { align: "right" });
      y -= 34;
    }
    const rows: [string, bigint | number][] = [
      ["Subtotal", so.subtotalMinor],
      ["Insured shipping", so.shippingMinor],
      ...(num(so.insuranceMinor) ? ([["Insurance", so.insuranceMinor]] as [string, bigint][]) : []),
      ["Tax", so.taxMinor],
      ...(num(so.dutiesMinor) ? ([["Import duties", so.dutiesMinor]] as [string, bigint][]) : []),
    ];
    for (const [label, value] of rows) {
      text(page, label, right - 150, y, fonts.sans, 9, MUTED, { align: "right" });
      text(page, money(value), right, y, fonts.sans, 9, INK, { align: "right" });
      y -= 14;
    }
    text(page, "Total", right - 150, y - 2, fonts.sansBold, 9.5, INK, { align: "right" });
    text(page, money(so.totalMinor), right, y - 2, fonts.sansBold, 9.5, INK, { align: "right" });
    y -= 34;
  }

  if (!sellerOrderId && parts.length > 1) {
    rule(page, left, right, y + 14);
    text(page, "Order total", right - 150, y - 4, fonts.serif, 13, INK, { align: "right" });
    text(page, money(order.totalMinor), right, y - 4, fonts.serif, 13, INK, { align: "right" });
  }

  text(page, "Loupe acts as the marketplace facilitator and collects and remits applicable taxes and duties. Goods are sold by the named jewelers.", left, 64, fonts.sans, 7.5, MUTED, { maxWidth: right - left });
  return pdf.save();
}
