// Money is always carried as integer *minor units* plus an ISO-4217 code.
// Converted (non-native) prices are rounded to whole major units so the price a
// shopper sees on the listing, in the cart and at checkout is identical.

export const CURRENCIES = {
  USD: { code: "USD", name: "US dollar", exponent: 2, locale: "en-US" },
  EUR: { code: "EUR", name: "Euro", exponent: 2, locale: "en-IE" },
  GBP: { code: "GBP", name: "British pound", exponent: 2, locale: "en-GB" },
  INR: { code: "INR", name: "Indian rupee", exponent: 2, locale: "en-IN" },
  AED: { code: "AED", name: "UAE dirham", exponent: 2, locale: "en-AE" },
  CHF: { code: "CHF", name: "Swiss franc", exponent: 2, locale: "de-CH" },
  CAD: { code: "CAD", name: "Canadian dollar", exponent: 2, locale: "en-CA" },
  AUD: { code: "AUD", name: "Australian dollar", exponent: 2, locale: "en-AU" },
  SGD: { code: "SGD", name: "Singapore dollar", exponent: 2, locale: "en-SG" },
  JPY: { code: "JPY", name: "Japanese yen", exponent: 0, locale: "en-US" },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export const BASE_CURRENCY: CurrencyCode = "USD";
export const SUPPORTED_CURRENCIES = Object.keys(CURRENCIES) as CurrencyCode[];

/** Units of each currency per 1 USD. */
export type FxRates = Record<string, number>;

export function isCurrency(code: string | null | undefined): code is CurrencyCode {
  return !!code && code in CURRENCIES;
}

export function currencyExponent(code: string) {
  return isCurrency(code) ? CURRENCIES[code].exponent : 2;
}

export function toMajor(minor: number | bigint, currency: string) {
  return Number(minor) / 10 ** currencyExponent(currency);
}

export function toMinor(major: number, currency: string) {
  return Math.round(major * 10 ** currencyExponent(currency));
}

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, decimals: number, compact: boolean) {
  const key = `${currency}:${decimals}:${compact}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(isCurrency(currency) ? CURRENCIES[currency].locale : "en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      notation: compact ? "compact" : "standard",
      minimumFractionDigits: compact ? 0 : decimals,
      maximumFractionDigits: compact ? 1 : decimals,
    });
    formatters.set(key, f);
  }
  return f;
}

/**
 * Formats minor units. Whole amounts drop the ".00" (luxury convention);
 * pass `exact` for invoices and ledgers.
 */
export function formatMoney(
  minor: number | bigint,
  currency: string,
  options: { exact?: boolean; compact?: boolean } = {},
) {
  const major = toMajor(minor, currency);
  const exp = currencyExponent(currency);
  const hasFraction = Math.abs(Math.round(major * 10 ** exp) % 10 ** exp) > 0;
  const decimals = options.exact || hasFraction ? exp : 0;
  return formatter(currency, decimals, !!options.compact).format(major);
}

export function convertMinor(
  minor: number | bigint,
  from: string,
  to: string,
  rates: FxRates,
  mode: "exact" | "display" = "display",
): number {
  const amount = Number(minor);
  if (from === to) return amount;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) throw new Error(`Missing FX rate for ${from} → ${to}`);
  const major = (toMajor(amount, from) / fromRate) * toRate;
  if (mode === "display") return Math.round(major) * 10 ** currencyExponent(to);
  return toMinor(major, to);
}

/** Minor units in `currency` → USD cents (analytics & cross-currency filters). */
export function toUsdMinor(minor: number | bigint, currency: string, rates: FxRates) {
  return convertMinor(minor, currency, "USD", rates, "exact");
}

export function bpsToPercent(bps: number, fractionDigits = 0) {
  return `${(bps / 100).toFixed(fractionDigits)}%`;
}

export function applyBps(minor: number, bps: number) {
  return Math.round((minor * bps) / 10_000);
}
