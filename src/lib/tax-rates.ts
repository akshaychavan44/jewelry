// Fallback tax & import-duty estimator, used when Stripe Tax / TaxJar are not
// configured. Rates are indicative for jewelry (HS 7113) and shown to buyers as
// estimates; production should rely on the configured tax provider.

type TaxRate = { rate: number; label: string };

const US_STATE_TAX: Record<string, number> = {
  NY: 0.08875,
  CA: 0.0725,
  TX: 0.0625,
  FL: 0.06,
  IL: 0.0625,
  WA: 0.065,
  MA: 0.0625,
  NJ: 0.06625,
};

const COUNTRY_TAX: Record<string, TaxRate> = {
  GB: { rate: 0.2, label: "VAT" },
  FR: { rate: 0.2, label: "VAT" },
  DE: { rate: 0.19, label: "VAT" },
  IT: { rate: 0.22, label: "VAT" },
  ES: { rate: 0.21, label: "VAT" },
  NL: { rate: 0.21, label: "VAT" },
  IE: { rate: 0.23, label: "VAT" },
  BE: { rate: 0.21, label: "VAT" },
  AT: { rate: 0.2, label: "VAT" },
  CH: { rate: 0.081, label: "VAT" },
  IN: { rate: 0.03, label: "GST" },
  AE: { rate: 0.05, label: "VAT" },
  SA: { rate: 0.15, label: "VAT" },
  AU: { rate: 0.1, label: "GST" },
  NZ: { rate: 0.15, label: "GST" },
  CA: { rate: 0.13, label: "HST" },
  SG: { rate: 0.09, label: "GST" },
  JP: { rate: 0.1, label: "Consumption tax" },
  HK: { rate: 0, label: "Tax" },
};

export function estimateTax(country: string, region?: string | null): TaxRate {
  const c = country.toUpperCase();
  if (c === "US") {
    return { rate: US_STATE_TAX[(region ?? "").toUpperCase()] ?? 0.065, label: "Sales tax" };
  }
  return COUNTRY_TAX[c] ?? { rate: 0.1, label: "Tax" };
}

const DUTY: Record<string, number> = {
  US: 0.055,
  CA: 0.085,
  GB: 0.025,
  IN: 0.2,
  AE: 0.05,
  SA: 0.05,
  AU: 0.05,
  NZ: 0.05,
  JP: 0.054,
  SG: 0,
  HK: 0,
  CH: 0,
};

const EU = new Set(["FR", "DE", "IT", "ES", "NL", "IE", "BE", "AT", "PT", "LU", "FI", "SE", "DK", "PL", "CZ", "GR"]);

/** Import duty rate for a cross-border parcel (0 within the same customs union). */
export function estimateDutyRate(origin: string, destination: string) {
  const o = origin.toUpperCase();
  const d = destination.toUpperCase();
  if (o === d || (EU.has(o) && EU.has(d))) return 0;
  if (EU.has(d)) return 0.025;
  return DUTY[d] ?? 0.05;
}
