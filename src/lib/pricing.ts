// Live spot-metal pricing:  price = weight × spot(purity) + making charge + stones
// Pure and isomorphic so the storefront, seller tools, jobs and seed agree.
import type { MakingChargeType, MetalType, SpotMetal } from "@/generated/prisma/enums";
import { METALS } from "./jewelry";
import { convertMinor, currencyExponent, type FxRates } from "./money";

/** USD per gram of *pure* metal. */
export type SpotRatesUsd = Partial<Record<SpotMetal, number>>;

export type SpotPricingInput = {
  metalType: MetalType;
  metalWeightGrams: number;
  makingChargeType: MakingChargeType;
  /** FLAT / PER_GRAM → minor units of `currency`; PERCENT → percent of metal value. */
  makingChargeValue: number;
  stonePriceMinor?: number | null;
  currency: string;
};

export type SpotPriceBreakdown = {
  currency: string;
  metal: SpotMetal;
  purity: number;
  weightGrams: number;
  rateUsdPerGram: number;
  /** Price per gram at this purity, in `currency` minor units. */
  perGramMinor: number;
  metalValueMinor: number;
  makingChargeMinor: number;
  stoneMinor: number;
  totalMinor: number;
};

export function computeSpotPrice(
  input: SpotPricingInput,
  rates: SpotRatesUsd,
  fx: FxRates,
): SpotPriceBreakdown | null {
  const info = METALS[input.metalType];
  if (!info.spot || !info.purity || input.metalWeightGrams <= 0) return null;
  const rateUsdPerGram = rates[info.spot];
  if (!rateUsdPerGram) return null;

  const perGramUsdCents = rateUsdPerGram * info.purity * 100;
  const perGramMinor = convertMinor(perGramUsdCents, "USD", input.currency, fx, "exact");
  const metalValueMinor = Math.round(perGramMinor * input.metalWeightGrams);

  let makingChargeMinor = 0;
  switch (input.makingChargeType) {
    case "FLAT":
      makingChargeMinor = Math.round(input.makingChargeValue);
      break;
    case "PERCENT":
      makingChargeMinor = Math.round((metalValueMinor * input.makingChargeValue) / 100);
      break;
    case "PER_GRAM":
      makingChargeMinor = Math.round(input.makingChargeValue * input.metalWeightGrams);
      break;
  }

  const stoneMinor = Math.round(input.stonePriceMinor ?? 0);
  const unit = 10 ** currencyExponent(input.currency);
  // Round up to a whole major unit so displayed and charged prices match.
  const totalMinor = Math.ceil((metalValueMinor + makingChargeMinor + stoneMinor) / unit) * unit;

  return {
    currency: input.currency,
    metal: info.spot,
    purity: info.purity,
    weightGrams: input.metalWeightGrams,
    rateUsdPerGram,
    perGramMinor,
    metalValueMinor,
    makingChargeMinor,
    stoneMinor,
    totalMinor,
  };
}

export const TROY_OUNCE_GRAMS = 31.1034768;
