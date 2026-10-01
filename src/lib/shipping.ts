import type { Carrier, ShippingMethod, ShippingZone } from "@/generated/prisma/enums";
import { addBusinessDays } from "./format";

export const METHOD_LABELS: Record<ShippingMethod, { label: string; detail: string }> = {
  STANDARD_INSURED: { label: "Insured standard", detail: "Fully insured, tracked, signature on delivery" },
  EXPRESS_INSURED: { label: "Insured express", detail: "Priority handling, fully insured, signature on delivery" },
  SECURE_COURIER: { label: "Secure courier", detail: "Specialist high-value logistics, hand-to-hand delivery" },
  STORE_PICKUP: { label: "Collect in boutique", detail: "Collect in person with photo ID" },
};

export const CARRIERS: Record<Carrier, { label: string; track?: (n: string) => string }> = {
  FEDEX: { label: "FedEx", track: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}` },
  UPS: { label: "UPS", track: (n) => `https://www.ups.com/track?tracknum=${n}` },
  DHL: { label: "DHL Express", track: (n) => `https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=${n}` },
  USPS: { label: "USPS", track: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}` },
  ROYAL_MAIL: { label: "Royal Mail Special Delivery", track: (n) => `https://www.royalmail.com/track-your-item#/tracking-results/${n}` },
  BLUE_DART: { label: "Blue Dart" },
  BRINKS: { label: "Brink's Global Services" },
  MALCA_AMIT: { label: "Malca-Amit" },
  OTHER: { label: "Courier" },
};

export function trackingUrl(carrier: Carrier, trackingNumber?: string | null) {
  if (!trackingNumber) return null;
  return CARRIERS[carrier].track?.(trackingNumber) ?? null;
}

export type RateCardLine = {
  id?: string;
  zone: ShippingZone;
  method: ShippingMethod;
  carrier: Carrier | null;
  priceMinor: number;
  currency: string;
  freeOverMinor: number | null;
  minDays: number;
  maxDays: number;
  insuranceRateBps: number;
  isActive: boolean;
};

/**
 * Methods a seller can offer for this parcel. Above the platform's secure
 * threshold only specialist couriers (or boutique collection) are allowed.
 */
export function eligibleRates<T extends RateCardLine>(rates: T[], zone: ShippingZone, declaredUsdMinor: number, secureThresholdUsdMinor: number): T[] {
  const forZone = rates.filter((r) => r.isActive && r.zone === zone);
  if (declaredUsdMinor >= secureThresholdUsdMinor) {
    const secure = forZone.filter((r) => r.method === "SECURE_COURIER" || r.method === "STORE_PICKUP");
    if (secure.length) return secure;
  }
  return forZone.filter((r) => r.method !== "SECURE_COURIER" || declaredUsdMinor >= secureThresholdUsdMinor / 4);
}

/** Shipping + insurance for one seller's parcel, in the rate card's currency. */
export function quoteRate(rate: RateCardLine, subtotalMinor: number) {
  const free = rate.freeOverMinor !== null && subtotalMinor >= rate.freeOverMinor;
  return {
    shippingMinor: free ? 0 : rate.priceMinor,
    insuranceMinor: Math.round((subtotalMinor * rate.insuranceRateBps) / 10_000),
    isFree: free,
  };
}

export function deliveryWindow(start: Date, leadDays: number, rate: Pick<RateCardLine, "minDays" | "maxDays">) {
  return {
    from: addBusinessDays(start, leadDays + rate.minDays),
    to: addBusinessDays(start, leadDays + rate.maxDays),
  };
}
