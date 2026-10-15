import "server-only";

import { cache } from "react";
import { db } from "@/server/db";
import type { SpotMetal } from "@/lib/domain-enums";

export interface PreciousMetalRateItem {
  metal: SpotMetal;
  name: string;
  purity: string;
  symbol: string;
  currency: string;
  pricePerGram: number;
  displayPrice: number;
  unitLabel: string;
  formattedPrice: string;
  fetchedAt: Date;
  source: string;
  accent: "gold" | "silver" | "platinum";
}

export interface MetalPricingData {
  items: PreciousMetalRateItem[];
  lastUpdatedFormatted: string;
  source: string;
}

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

/**
 * Formats a Date into Indian Standard Time (IST) string.
 * Example: "13 Oct 2026, 01:15 PM IST"
 */
export function formatIstTimestamp(date: Date): string {
  try {
    const formatted = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
    return `${formatted} IST`;
  } catch {
    return `${date.toLocaleString("en-IN")} IST`;
  }
}

/**
 * Formats numeric amount into Indian Rupee (INR) currency per gram string.
 * Example: "₹7,450.00"
 */
export function formatInrAmount(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Backend sync job: Fetches live precious metal spot prices in INR per gram
 * from Metals.Dev API and caches them into the database (MetalRate table).
 *
 * Honors the 100 req/month free tier allowance:
 * Calling every 12 hours consumes only 2 requests/day (~60 reqs/month).
 */
export async function syncMetalRatesFromMetalsDev(): Promise<{
  success: boolean;
  count: number;
  error?: string;
  timestamp?: Date;
}> {
  const apiKey = process.env.METALS_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      count: 0,
      error: "METALS_API_KEY is not configured in environment",
    };
  }

  try {
    const url = `https://api.metals.dev/v1/latest?api_key=${encodeURIComponent(apiKey)}&currency=INR&unit=g`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[metals.dev] HTTP error:", res.status, errText);
      return {
        success: false,
        count: 0,
        error: `Metals.dev returned status ${res.status}`,
      };
    }

    const data = (await res.json()) as {
      status?: string;
      currency?: string;
      unit?: string;
      metals?: {
        gold?: number;
        silver?: number;
        platinum?: number;
      };
      timestamp?: string;
    };

    if (!data.metals || typeof data.metals !== "object") {
      return {
        success: false,
        count: 0,
        error: "Metals.dev response missing metals payload",
      };
    }

    const fetchedAt = data.timestamp ? new Date(data.timestamp) : new Date();
    let recorded = 0;

    const entries: Array<{ metal: SpotMetal; price: number | undefined }> = [
      { metal: "GOLD", price: data.metals.gold },
      { metal: "SILVER", price: data.metals.silver },
      { metal: "PLATINUM", price: data.metals.platinum },
    ];

    for (const { metal, price } of entries) {
      if (typeof price === "number" && price > 0) {
        await db.metalRate.create({
          data: {
            metal,
            currency: "INR",
            pricePerGram: price,
            source: "metals.dev",
            fetchedAt,
          },
        });
        recorded++;
      }
    }

    return { success: true, count: recorded, timestamp: fetchedAt };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[metals.dev] Sync exception:", message);
    return { success: false, count: 0, error: message };
  }
}

const METAL_CONFIG: Array<{
  metal: SpotMetal;
  name: string;
  purity: string;
  symbol: string;
  unitLabel: string;
  multiplier: number;
  accent: "gold" | "silver" | "platinum";
}> = [
  { metal: "GOLD", name: "Gold", purity: "24K (999)", symbol: "Au", unitLabel: "per gram", multiplier: 1, accent: "gold" },
  { metal: "SILVER", name: "Silver", purity: "999 Fine", symbol: "Ag", unitLabel: "per gram", multiplier: 1, accent: "silver" },
  { metal: "PLATINUM", name: "Platinum", purity: "999 Pure", symbol: "Pt", unitLabel: "per gram", multiplier: 1, accent: "platinum" },
];

/**
 * Returns cached precious metal reference prices for Gold, Silver, and Platinum
 * in INR per gram for all three metals.
 *
 * Visitors only query the database; external Metals.Dev API is never invoked
 * directly by page visits.
 */
export const getPreciousMetalRates = cache(async (): Promise<MetalPricingData> => {
  // Check the latest cached INR rate to see if a scheduled refresh is needed
  const latestInrRecord = await db.metalRate.findFirst({
    where: { currency: "INR" },
    orderBy: { fetchedAt: "desc" },
  });

  const now = Date.now();
  const isStale =
    !latestInrRecord ||
    now - new Date(latestInrRecord.fetchedAt).getTime() > TWELVE_HOURS_MS;

  // If stale or missing and API key is present, trigger refresh in background
  if (isStale && process.env.METALS_API_KEY) {
    // Fire-and-forget sync to avoid blocking or delaying page response
    syncMetalRatesFromMetalsDev().catch((err) => {
      console.warn("[metals.dev] Background auto-sync failed:", err);
    });
  }

  // Pre-fetch fallback FX rate in case INR rate has not been synced yet
  const inrFx = await db.exchangeRate.findFirst({
    where: { base: "USD", quote: "INR" },
  });
  const fallbackFx = inrFx ? Number(inrFx.rate) : 88.2;

  let mostRecentTimestamp = new Date();
  let primarySource = "metals.dev";

  const items: PreciousMetalRateItem[] = await Promise.all(
    METAL_CONFIG.map(async (cfg) => {
      // 1. Fetch latest cached INR rate
      const inrRate = await db.metalRate.findFirst({
        where: { metal: cfg.metal, currency: "INR" },
        orderBy: { fetchedAt: "desc" },
      });

      if (inrRate) {
        const pricePerGram = Number(inrRate.pricePerGram);
        const displayPrice = pricePerGram * cfg.multiplier;
        const fetchedAt = new Date(inrRate.fetchedAt);
        if (fetchedAt > mostRecentTimestamp || !latestInrRecord) {
          mostRecentTimestamp = fetchedAt;
        }
        primarySource = inrRate.source;
        return {
          metal: cfg.metal,
          name: cfg.name,
          purity: cfg.purity,
          symbol: cfg.symbol,
          currency: "INR",
          pricePerGram,
          displayPrice,
          unitLabel: cfg.unitLabel,
          formattedPrice: formatInrAmount(displayPrice),
          fetchedAt,
          source: inrRate.source,
          accent: cfg.accent,
        };
      }

      // 2. If no INR record in DB yet, compute market reference from latest USD spot * USD/INR
      const usdRate = await db.metalRate.findFirst({
        where: { metal: cfg.metal, currency: "USD" },
        orderBy: { fetchedAt: "desc" },
      });

      const usdPrice = usdRate ? Number(usdRate.pricePerGram) : 0;
      const pricePerGram = usdPrice * fallbackFx;
      const displayPrice = pricePerGram * cfg.multiplier;
      const fetchedAt = usdRate ? new Date(usdRate.fetchedAt) : new Date();

      return {
        metal: cfg.metal,
        name: cfg.name,
        purity: cfg.purity,
        symbol: cfg.symbol,
        currency: "INR",
        pricePerGram,
        displayPrice,
        unitLabel: cfg.unitLabel,
        formattedPrice: formatInrAmount(displayPrice),
        fetchedAt,
        source: usdRate?.source ?? "market-ref",
        accent: cfg.accent,
      };
    })
  );

  return {
    items,
    lastUpdatedFormatted: formatIstTimestamp(mostRecentTimestamp),
    source: primarySource,
  };
});
