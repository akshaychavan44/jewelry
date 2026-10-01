import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";
import { type CurrencyCode, convertMinor, formatMoney, isCurrency } from "@/lib/money";
import { currencyForCountry } from "@/lib/regions";
import { getCurrentUser } from "@/server/auth/session";
import { getFxRates } from "./market";

export const CURRENCY_COOKIE = "loupe_currency";

/** Shopper's display currency: cookie → account preference → geo → USD. */
export const getDisplayCurrency = cache(async (): Promise<CurrencyCode> => {
  const jar = await cookies();
  const fromCookie = jar.get(CURRENCY_COOKIE)?.value;
  if (isCurrency(fromCookie)) return fromCookie;
  const user = await getCurrentUser();
  if (isCurrency(user?.preferredCurrency)) return user.preferredCurrency;
  const h = await headers();
  const geo = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry");
  const guess = currencyForCountry(geo);
  return isCurrency(guess) ? guess : "USD";
});

export type PriceContext = { currency: CurrencyCode; rates: Record<string, number> };

export const getPriceContext = cache(async (): Promise<PriceContext> => {
  const [currency, rates] = await Promise.all([getDisplayCurrency(), getFxRates()]);
  return { currency, rates };
});

export type Money = { amountMinor: number; currency: string };

/** Converts a listing price into the shopper's currency (whole units). */
export function toDisplay(minor: number | bigint, from: string, ctx: PriceContext): Money {
  return { amountMinor: convertMinor(Number(minor), from, ctx.currency, ctx.rates, "display"), currency: ctx.currency };
}

export function formatDisplay(minor: number | bigint, from: string, ctx: PriceContext) {
  const m = toDisplay(minor, from, ctx);
  return formatMoney(m.amountMinor, m.currency);
}
