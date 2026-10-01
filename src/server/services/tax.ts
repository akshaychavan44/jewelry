import "server-only";

import type { AddressSnapshot } from "@/lib/order-math";
import { estimateDutyRate, estimateTax } from "@/lib/tax-rates";
import { stripe } from "./payments";

export type TaxQuote = { rate: number; label: string; provider: "stripe_tax" | "estimate"; reference?: string };

/**
 * Tax for one vendor's parcel. Uses Stripe Tax when enabled (ship-from the
 * vendor, ship-to the buyer); otherwise the built-in estimator.
 */
export async function calculateTax(args: {
  amountMinor: number;
  currency: string;
  shipTo: AddressSnapshot;
  shipFrom: { country: string; city?: string | null; postalCode?: string | null; line1?: string | null };
  reference: string;
}): Promise<TaxQuote> {
  const s = stripe();
  if (s && process.env.STRIPE_TAX_ENABLED === "true" && args.amountMinor > 0) {
    try {
      const calc = await s.tax.calculations.create({
        currency: args.currency.toLowerCase(),
        line_items: [{ amount: args.amountMinor, reference: args.reference, tax_code: "txcd_99999999" }],
        customer_details: {
          address: { line1: args.shipTo.line1, city: args.shipTo.city, state: args.shipTo.region ?? undefined, postal_code: args.shipTo.postalCode, country: args.shipTo.country },
          address_source: "shipping",
        },
        ship_from_details: { address: { country: args.shipFrom.country, city: args.shipFrom.city ?? undefined, postal_code: args.shipFrom.postalCode ?? undefined, line1: args.shipFrom.line1 ?? undefined } },
      });
      return { rate: calc.tax_amount_exclusive / args.amountMinor, label: "Tax", provider: "stripe_tax", reference: calc.id ?? undefined };
    } catch (error) {
      console.error("[tax] Stripe Tax failed, falling back to estimate", error);
    }
  }
  const est = estimateTax(args.shipTo.country, args.shipTo.region);
  return { rate: est.rate, label: est.label, provider: "estimate" };
}

export function dutyRateFor(origin: string, destination: string) {
  return estimateDutyRate(origin, destination);
}
