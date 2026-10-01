import type { ShippingRegion, ShippingZone } from "@/generated/prisma/enums";

export const REGION_LABELS: Record<ShippingRegion, string> = {
  NORTH_AMERICA: "North America",
  LATIN_AMERICA: "Latin America",
  UNITED_KINGDOM: "United Kingdom",
  EUROPE: "Europe",
  MIDDLE_EAST: "Middle East",
  AFRICA: "Africa",
  INDIA: "India",
  ASIA_PACIFIC: "Asia Pacific",
};

export const ZONE_LABELS: Record<ShippingZone, string> = {
  DOMESTIC: "Domestic",
  ...REGION_LABELS,
};

const REGION_BY_COUNTRY: Record<string, ShippingRegion> = {
  US: "NORTH_AMERICA", CA: "NORTH_AMERICA", MX: "LATIN_AMERICA",
  BR: "LATIN_AMERICA", AR: "LATIN_AMERICA", CL: "LATIN_AMERICA", CO: "LATIN_AMERICA", PE: "LATIN_AMERICA",
  GB: "UNITED_KINGDOM",
  IE: "EUROPE", FR: "EUROPE", DE: "EUROPE", IT: "EUROPE", ES: "EUROPE", PT: "EUROPE", NL: "EUROPE",
  BE: "EUROPE", LU: "EUROPE", AT: "EUROPE", CH: "EUROPE", SE: "EUROPE", NO: "EUROPE", DK: "EUROPE",
  FI: "EUROPE", PL: "EUROPE", CZ: "EUROPE", GR: "EUROPE", MC: "EUROPE",
  AE: "MIDDLE_EAST", SA: "MIDDLE_EAST", QA: "MIDDLE_EAST", KW: "MIDDLE_EAST", BH: "MIDDLE_EAST",
  OM: "MIDDLE_EAST", IL: "MIDDLE_EAST", TR: "MIDDLE_EAST",
  ZA: "AFRICA", NG: "AFRICA", KE: "AFRICA", EG: "AFRICA", MA: "AFRICA",
  IN: "INDIA",
  JP: "ASIA_PACIFIC", CN: "ASIA_PACIFIC", HK: "ASIA_PACIFIC", SG: "ASIA_PACIFIC", KR: "ASIA_PACIFIC",
  TW: "ASIA_PACIFIC", TH: "ASIA_PACIFIC", MY: "ASIA_PACIFIC", ID: "ASIA_PACIFIC", PH: "ASIA_PACIFIC",
  VN: "ASIA_PACIFIC", AU: "ASIA_PACIFIC", NZ: "ASIA_PACIFIC", LK: "ASIA_PACIFIC", NP: "ASIA_PACIFIC",
};

let displayNames: Intl.DisplayNames | undefined;

export function countryName(code: string | null | undefined) {
  if (!code) return "";
  displayNames ??= new Intl.DisplayNames(["en"], { type: "region" });
  try {
    return displayNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** Countries offered in address forms (ISO 3166-1 alpha-2). */
export const COUNTRY_CODES = Object.keys(REGION_BY_COUNTRY).sort((a, b) =>
  countryName(a).localeCompare(countryName(b)),
);

export function regionForCountry(country: string): ShippingRegion {
  return REGION_BY_COUNTRY[country.toUpperCase()] ?? "ASIA_PACIFIC";
}

/** Rate-card zone for a shipment from `origin` to `destination`. */
export function zoneFor(origin: string, destination: string): ShippingZone {
  if (origin.toUpperCase() === destination.toUpperCase()) return "DOMESTIC";
  return regionForCountry(destination);
}

/** Default buyer currency for a country (used when no preference is saved). */
export function currencyForCountry(country: string | null | undefined) {
  switch ((country ?? "").toUpperCase()) {
    case "GB":
      return "GBP";
    case "IN":
      return "INR";
    case "AE":
      return "AED";
    case "CH":
      return "CHF";
    case "CA":
      return "CAD";
    case "AU":
      return "AUD";
    case "SG":
      return "SGD";
    case "JP":
      return "JPY";
    default:
      return REGION_BY_COUNTRY[(country ?? "").toUpperCase()] === "EUROPE" ? "EUR" : "USD";
  }
}
