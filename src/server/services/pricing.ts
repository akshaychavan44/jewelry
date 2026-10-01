import "server-only";

import type { MakingChargeType, MetalType, PricingMode } from "@/generated/prisma/enums";
import { computeSpotPrice, type SpotPriceBreakdown } from "@/lib/pricing";
import { num } from "@/lib/utils";
import { getFxRates, getSpotRates } from "./market";

type PricedVariant = {
  priceMinor: bigint | number;
  metalType: MetalType;
  metalWeightGrams: number | null;
  makingChargeType: MakingChargeType | null;
  makingChargeValue: number | null;
  stonePriceMinor: bigint | number | null;
};

/**
 * Current price of a SKU in its listing currency. METAL_SPOT listings are
 * re-priced from live spot rates; fixed listings use the stored price.
 */
export async function livePrice(
  product: { pricingMode: PricingMode; currency: string },
  variant: PricedVariant,
): Promise<{ priceMinor: number; breakdown: SpotPriceBreakdown | null }> {
  if (product.pricingMode !== "METAL_SPOT" || !variant.metalWeightGrams || !variant.makingChargeType) {
    return { priceMinor: num(variant.priceMinor), breakdown: null };
  }
  const [rates, fx] = await Promise.all([getSpotRates(), getFxRates()]);
  const breakdown = computeSpotPrice(
    {
      metalType: variant.metalType,
      metalWeightGrams: variant.metalWeightGrams,
      makingChargeType: variant.makingChargeType,
      makingChargeValue: variant.makingChargeValue ?? 0,
      stonePriceMinor: num(variant.stonePriceMinor),
      currency: product.currency,
    },
    rates,
    fx,
  );
  return { priceMinor: breakdown?.totalMinor ?? num(variant.priceMinor), breakdown };
}
