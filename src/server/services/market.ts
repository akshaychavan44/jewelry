import "server-only";

import { cache } from "react";
import type { SpotMetal } from "@/generated/prisma/enums";
import type { FxRates } from "@/lib/money";
import type { SpotRatesUsd } from "@/lib/pricing";
import { db } from "@/server/db";

export const getFxRates = cache(async (): Promise<FxRates> => {
  const rows = await db.exchangeRate.findMany({ where: { base: "USD" } });
  return { USD: 1, ...Object.fromEntries(rows.map((r) => [r.quote, Number(r.rate)])) };
});

export type SpotQuote = { metal: SpotMetal; usdPerGram: number; changePct: number; fetchedAt: Date; source: string };

/** Latest spot price per metal, with the change against ~24h earlier. */
export const getSpotQuotes = cache(async (): Promise<SpotQuote[]> => {
  const metals: SpotMetal[] = ["GOLD", "SILVER", "PLATINUM", "PALLADIUM"];
  return Promise.all(
    metals.map(async (metal) => {
      const [latest, previous] = await db.metalRate.findMany({
        where: { metal, currency: "USD" },
        orderBy: { fetchedAt: "desc" },
        take: 2,
      });
      const now = Number(latest?.pricePerGram ?? 0);
      const before = Number(previous?.pricePerGram ?? now);
      return {
        metal,
        usdPerGram: now,
        changePct: before ? ((now - before) / before) * 100 : 0,
        fetchedAt: latest?.fetchedAt ?? new Date(),
        source: latest?.source ?? "—",
      };
    }),
  );
});

export const getSpotRates = cache(async (): Promise<SpotRatesUsd> => {
  const quotes = await getSpotQuotes();
  return Object.fromEntries(quotes.filter((q) => q.usdPerGram > 0).map((q) => [q.metal, q.usdPerGram]));
});

export async function getSpotHistory(metal: SpotMetal, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await db.metalRate.findMany({
    where: { metal, currency: "USD", fetchedAt: { gte: since } },
    orderBy: { fetchedAt: "asc" },
    select: { pricePerGram: true, fetchedAt: true },
  });
  return rows.map((r) => ({ at: r.fetchedAt, usdPerGram: Number(r.pricePerGram) }));
}
