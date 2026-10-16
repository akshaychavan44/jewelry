// Per-vendor order totals. Shared by checkout and the seed so historical and
// live orders are computed identically.
import type { DutiesMode } from "@/lib/domain-enums";

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
  taxInclusive?: boolean;
  dutyRate: number;
  dutiesMode: DutiesMode;
  commissionBps: number;
};

export type SellerGroupTotals = {
  subtotalMinor: number;
  shippingMinor: number;
  insuranceMinor: number;
  taxMinor: number;
  taxInclusive?: boolean;
  dutiesMinor: number;
  totalMinor: number;
  commissionRateBps: number;
  commissionMinor: number;
  sellerNetMinor: number;
};

export function computeSellerGroupTotals(input: SellerGroupInput): SellerGroupTotals {
  const subtotalMinor = input.itemsMinor;
  let taxMinor: number;
  let totalMinor: number;

  if (input.taxInclusive && input.taxRate > 0) {
    // When prices already include tax (e.g. 3% GST on Indian retail jewelry),
    // extract the tax portion from the merchandise value rather than double-adding it.
    const itemTaxMinor = Math.round(subtotalMinor - subtotalMinor / (1 + input.taxRate));
    const shippingTaxMinor = Math.round((input.shippingMinor + input.insuranceMinor) * input.taxRate);
    taxMinor = itemTaxMinor + shippingTaxMinor;
    const dutiesMinor = input.dutiesMode === "DDP" ? Math.round(subtotalMinor * input.dutyRate) : 0;
    const commissionMinor = Math.round((subtotalMinor * input.commissionBps) / 10_000);
    totalMinor = subtotalMinor + input.shippingMinor + input.insuranceMinor + shippingTaxMinor + dutiesMinor;

    return {
      subtotalMinor,
      shippingMinor: input.shippingMinor,
      insuranceMinor: input.insuranceMinor,
      taxMinor,
      taxInclusive: true,
      dutiesMinor,
      totalMinor,
      commissionRateBps: input.commissionBps,
      commissionMinor,
      sellerNetMinor: subtotalMinor + input.shippingMinor + input.insuranceMinor - commissionMinor,
    };
  }

  taxMinor = Math.round((subtotalMinor + input.shippingMinor + input.insuranceMinor) * input.taxRate);
  const dutiesMinor = input.dutiesMode === "DDP" ? Math.round(subtotalMinor * input.dutyRate) : 0;
  // Commission is charged on the merchandise value only — never on shipping,
  // insurance, tax or duties.
  const commissionMinor = Math.round((subtotalMinor * input.commissionBps) / 10_000);
  totalMinor = subtotalMinor + input.shippingMinor + input.insuranceMinor + taxMinor + dutiesMinor;
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

type NumericTotalsKey = "subtotalMinor" | "shippingMinor" | "insuranceMinor" | "taxMinor" | "dutiesMinor" | "totalMinor" | "commissionMinor";

export function sumTotals(groups: SellerGroupTotals[]) {
  const sum = (key: NumericTotalsKey) => groups.reduce((acc, g) => acc + (Number(g[key]) || 0), 0);
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
