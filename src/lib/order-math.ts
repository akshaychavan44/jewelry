// Per-vendor order totals. Shared by checkout and the seed so historical and
// live orders are computed identically.
import type { DutiesMode } from "@/generated/prisma/enums";

export type AddressSnapshot = {
  fullName: string;
  company?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  postalCode: string;
  country: string;
  phone?: string | null;
};

export type SellerGroupInput = {
  /** Σ unit price × quantity + engraving fees, order currency. */
  itemsMinor: number;
  shippingMinor: number;
  insuranceMinor: number;
  taxRate: number;
  dutyRate: number;
  dutiesMode: DutiesMode;
  commissionBps: number;
};

export type SellerGroupTotals = {
  subtotalMinor: number;
  shippingMinor: number;
  insuranceMinor: number;
  taxMinor: number;
  dutiesMinor: number;
  totalMinor: number;
  commissionRateBps: number;
  commissionMinor: number;
  sellerNetMinor: number;
};

export function computeSellerGroupTotals(input: SellerGroupInput): SellerGroupTotals {
  const subtotalMinor = input.itemsMinor;
  const taxMinor = Math.round((subtotalMinor + input.shippingMinor + input.insuranceMinor) * input.taxRate);
  const dutiesMinor = input.dutiesMode === "DDP" ? Math.round(subtotalMinor * input.dutyRate) : 0;
  // Commission is charged on the merchandise value only — never on shipping,
  // insurance, tax or duties.
  const commissionMinor = Math.round((subtotalMinor * input.commissionBps) / 10_000);
  const totalMinor = subtotalMinor + input.shippingMinor + input.insuranceMinor + taxMinor + dutiesMinor;
  return {
    subtotalMinor,
    shippingMinor: input.shippingMinor,
    insuranceMinor: input.insuranceMinor,
    taxMinor,
    dutiesMinor,
    totalMinor,
    commissionRateBps: input.commissionBps,
    commissionMinor,
    // Tax & duties are retained by the platform as marketplace facilitator.
    sellerNetMinor: subtotalMinor + input.shippingMinor + input.insuranceMinor - commissionMinor,
  };
}

export function sumTotals(groups: SellerGroupTotals[]) {
  const sum = (key: keyof SellerGroupTotals) => groups.reduce((acc, g) => acc + g[key], 0);
  return {
    subtotalMinor: sum("subtotalMinor"),
    shippingMinor: sum("shippingMinor"),
    insuranceMinor: sum("insuranceMinor"),
    taxMinor: sum("taxMinor"),
    dutiesMinor: sum("dutiesMinor"),
    totalMinor: sum("totalMinor"),
    platformFeeMinor: sum("commissionMinor"),
  };
}

/** "LP-7K2Q9M" style public order number. */
export function formatOrderNumber(code: string) {
  return `LP-${code}`;
}

export function sellerOrderReference(orderNumber: string, index: number) {
  return `${orderNumber}-${String.fromCharCode(65 + index)}`;
}
