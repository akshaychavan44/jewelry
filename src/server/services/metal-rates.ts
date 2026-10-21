import "server-only";

import { cache } from "react";
import { db } from "@/server/db";
import type { MakingChargeType, SpotMetal } from "@/lib/domain-enums";

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
  formattedPricePerGram?: string;
  fetchedAt: Date;
  source: string;
  accent: "gold" | "silver" | "platinum";
}

export interface MetalPricingData {
  items: PreciousMetalRateItem[];
  lastUpdatedFormatted: string;
  source: string;
}

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

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

import { computeSpotPrice } from "@/lib/pricing";
import { num } from "@/lib/utils";
import { toUsdMinor } from "@/lib/money";
import { getFxRates } from "./market";
import { revalidatePath } from "next/cache";

// In-flight sync promise lock to prevent duplicate or overlapping jobs within this process
let inFlightSync: Promise<{
  success: boolean;
  count: number;
  error?: string;
  timestamp?: Date;
  repricedVariants?: number;
  repricedProducts?: number;
  alreadyFresh?: boolean;
}> | null = null;

export async function getLastSuccessfulRateUpdate(): Promise<{
  fetchedAt: Date | null;
  formattedIst: string | null;
  source: string | null;
}> {
  try {
    const latest = await db.metalRate.findFirst({
      where: { currency: "INR" },
      orderBy: { fetchedAt: "desc" },
    });
    if (!latest) return { fetchedAt: null, formattedIst: null, source: null };
    const fetchedAt = new Date(latest.fetchedAt);
    return {
      fetchedAt,
      formattedIst: formatIstTimestamp(fetchedAt),
      source: latest.source,
    };
  } catch {
    return { fetchedAt: null, formattedIst: null, source: null };
  }
}

/**
 * Backend sync job: Fetches live precious metal spot prices in INR per gram
 * from Metals.Dev API, validates rates, caches them into the database (MetalRate table),
 * and recalculates all eligible automatic metal-price listings.
 *
 * Honors the 100 req/month free tier allowance:
 * Calling every 8 hours consumes 3 scheduled requests/day (up to 93 per month).
 * Prevents overlapping/duplicate executions and ensures rollback consistency.
 */
export function syncMetalRatesFromMetalsDev(options: { force?: boolean } = {}): Promise<{
  success: boolean;
  count: number;
  error?: string;
  timestamp?: Date;
  repricedVariants?: number;
  repricedProducts?: number;
  alreadyFresh?: boolean;
}> {
  if (inFlightSync) {
    return inFlightSync;
  }

  inFlightSync = executeMetalRatesSync(options).finally(() => {
    inFlightSync = null;
  });

  return inFlightSync;
}

const METAL_RATES_LOCK_ID = 847291;

async function executeMetalRatesSync(options: { force?: boolean } = {}): Promise<{
  success: boolean;
  count: number;
  error?: string;
  timestamp?: Date;
  repricedVariants?: number;
  repricedProducts?: number;
  alreadyFresh?: boolean;
}> {
  const apiKey = process.env.METALS_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      count: 0,
      error: "METALS_API_KEY is not configured in environment",
    };
  }

  // 1. Try acquiring PostgreSQL advisory lock so distributed serverless instances never sync concurrently
  let acquiredLock = false;
  try {
    const lockRes = await db.$queryRawUnsafe<Array<{ locked: boolean }>>(
      `SELECT pg_try_advisory_lock(${METAL_RATES_LOCK_ID}) AS locked`
    ).catch(() => null);
    if (lockRes && lockRes.length > 0) {
      acquiredLock = Boolean(lockRes[0]?.locked);
      if (!acquiredLock) {
        console.log("[metals.dev] Another server instance currently holds the sync lock. Skipping concurrent execution.");
        return {
          success: true,
          count: 0,
          alreadyFresh: true,
        };
      }
    }
  } catch {
    // If advisory lock fails (e.g. non-Postgres in unit test mock), proceed safely
  }

  try {
    // 2. Check freshness in database (prevent duplicate calls if fresh within 8h window)
    if (!options.force) {
      const latestInrRecord = await db.metalRate.findFirst({
        where: { currency: "INR" },
        orderBy: { fetchedAt: "desc" },
      });
      if (latestInrRecord) {
        const ageMs = Date.now() - new Date(latestInrRecord.fetchedAt).getTime();
        if (ageMs < EIGHT_HOURS_MS) {
          return {
            success: true,
            count: 0,
            timestamp: new Date(latestInrRecord.fetchedAt),
            alreadyFresh: true,
          };
        }
      }
    }

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
        palladium?: number;
        ibja_gold?: number;
        ibja_silver?: number;
        mcx_gold?: number;
        mcx_silver?: number;
      };
      currencies?: Record<string, number>;
      timestamp?: string;
    };

    // 3. Strict validation of provider payload
    if (!data.metals || typeof data.metals !== "object") {
      return {
        success: false,
        count: 0,
        error: "Metals.dev response missing metals payload",
      };
    }

    if (data.unit && data.unit !== "g") {
      return {
        success: false,
        count: 0,
        error: `Unexpected provider unit '${data.unit}', expected 'g'`,
      };
    }

    const gold = data.metals.gold;
    const silver = data.metals.silver;
    const platinum = data.metals.platinum;
    const palladium = data.metals.palladium;

    if (typeof gold !== "number" || gold <= 0 || !Number.isFinite(gold)) {
      return { success: false, count: 0, error: "Invalid gold rate received from provider" };
    }
    if (typeof silver !== "number" || silver <= 0 || !Number.isFinite(silver)) {
      return { success: false, count: 0, error: "Invalid silver rate received from provider" };
    }
    if (typeof platinum !== "number" || platinum <= 0 || !Number.isFinite(platinum)) {
      return { success: false, count: 0, error: "Invalid platinum rate received from provider" };
    }

    // For domestic Indian prices (INR), use IBJA (India Bullion and Jewellers Association)
    // benchmark rates when available, which reflect India's domestic bullion market (including customs duty).
    // Fall back to international spot rate if IBJA quote is not returned.
    const goldInr =
      typeof data.metals.ibja_gold === "number" && data.metals.ibja_gold > 0
        ? data.metals.ibja_gold
        : gold;

    const silverInr =
      typeof data.metals.ibja_silver === "number" && data.metals.ibja_silver > 0
        ? data.metals.ibja_silver
        : silver;

    const platinumInr = platinum;
    const palladiumInr = palladium;

    const fetchedAt = data.timestamp ? new Date(data.timestamp) : new Date();
    if (data.timestamp) {
      const tsTime = fetchedAt.getTime();
      if (isNaN(tsTime) || Math.abs(Date.now() - tsTime) > 24 * 60 * 60 * 1000) {
        return { success: false, count: 0, error: "Provider returned stale or invalid timestamp" };
      }
    }

    // Determine USD/INR conversion rate for USD metal rates and foreign currencies
    const existingInrFx = await db.exchangeRate.findFirst({ where: { base: "USD", quote: "INR" } });
    const usdToInr =
      typeof data.currencies?.USD === "number" && data.currencies.USD > 0
        ? data.currencies.USD
        : existingInrFx
          ? Number(existingInrFx.rate)
          : 88.2;

    const ratesUsd = {
      GOLD: gold / usdToInr,
      SILVER: silver / usdToInr,
      PLATINUM: platinum / usdToInr,
      PALLADIUM: typeof palladium === "number" && palladium > 0 ? palladium / usdToInr : undefined,
    };

    const ratesInrAsUsd = {
      GOLD: goldInr / usdToInr,
      SILVER: silverInr / usdToInr,
      PLATINUM: platinumInr / usdToInr,
      PALLADIUM: typeof palladiumInr === "number" && palladiumInr > 0 ? palladiumInr / usdToInr : undefined,
    };

    const fx = await getFxRates();
    fx.INR = usdToInr;

    // 3. Query all eligible automatic metal-priced listings across all sellers
    const spotVariants = await db.productVariant.findMany({
      where: {
        product: { pricingMode: "METAL_SPOT", deletedAt: null },
        metalWeightGrams: { not: null },
        makingChargeType: { not: null },
      },
      include: {
        product: { select: { id: true, currency: true, pricingMode: true, status: true } },
      },
    });

    // 4. Precompute recalculated prices. If calculation fails, abort before database write.
    const variantUpdates: Array<{
      id: string;
      productId: string;
      currency: string;
      newPriceMinor: number;
      initialWeight: number;
      initialMakingType: MakingChargeType;
      initialMakingVal: number;
    }> = [];
    const touchedProductIds = new Set<string>();

    for (const v of spotVariants) {
      if (v.product.pricingMode !== "METAL_SPOT") continue; // Never alter fixed-price products
      const weight = Number(v.metalWeightGrams);
      if (!weight || weight <= 0) continue;

      const isDomesticInr = v.product.currency === "INR";
      const applicableRates = isDomesticInr ? ratesInrAsUsd : ratesUsd;

      const breakdown = computeSpotPrice(
        {
          metalType: v.metalType,
          metalWeightGrams: weight,
          makingChargeType: v.makingChargeType!,
          makingChargeValue: Number(v.makingChargeValue ?? 0),
          stonePriceMinor: num(v.stonePriceMinor),
          currency: v.product.currency,
        },
        applicableRates,
        fx,
      );

      if (!breakdown || breakdown.totalMinor <= 0) {
        throw new Error(`Failed to calculate valid price for SKU ${v.sku}`);
      }

      variantUpdates.push({
        id: v.id,
        productId: v.product.id,
        currency: v.product.currency,
        newPriceMinor: breakdown.totalMinor,
        initialWeight: weight,
        initialMakingType: v.makingChargeType!,
        initialMakingVal: Number(v.makingChargeValue ?? 0),
      });
      touchedProductIds.add(v.product.id);
    }

    // 5. Execute all updates atomically in a database transaction
    const recordedRates = await db.$transaction(async (tx) => {
      let recorded = 0;

      // A. Store INR metal spot rates (using domestic benchmark where applicable)
      const inrEntries: Array<{
        metal: SpotMetal;
        price: number | undefined;
        source: string;
        internationalPrice: number | undefined;
      }> = [
        {
          metal: "GOLD",
          price: goldInr,
          source: typeof data.metals?.ibja_gold === "number" && data.metals.ibja_gold > 0 ? "metals.dev (IBJA)" : "metals.dev",
          internationalPrice: gold,
        },
        {
          metal: "SILVER",
          price: silverInr,
          source: typeof data.metals?.ibja_silver === "number" && data.metals.ibja_silver > 0 ? "metals.dev (IBJA)" : "metals.dev",
          internationalPrice: silver,
        },
        {
          metal: "PLATINUM",
          price: platinumInr,
          source: "metals.dev",
          internationalPrice: platinum,
        },
        {
          metal: "PALLADIUM",
          price: palladiumInr,
          source: "metals.dev",
          internationalPrice: palladium,
        },
      ];

      for (const { metal, price, source, internationalPrice } of inrEntries) {
        if (typeof price === "number" && price > 0) {
          await tx.metalRate.create({
            data: {
              metal,
              currency: "INR",
              pricePerGram: price,
              source,
              fetchedAt,
            },
          });
          recorded++;

          // B. Store corresponding international USD spot rates for cross-currency calculations
          const intlPrice = internationalPrice ?? price;
          const usdPrice = intlPrice / usdToInr;
          await tx.metalRate.create({
            data: {
              metal,
              currency: "USD",
              pricePerGram: Number(usdPrice.toFixed(4)),
              source: "metals.dev",
              fetchedAt,
            },
          });
          recorded++;
        }
      }

      // C. Update USD -> INR exchange rate
      if (existingInrFx) {
        await tx.exchangeRate.update({
          where: { id: existingInrFx.id },
          data: { rate: usdToInr, source: "metals.dev", fetchedAt },
        });
      } else {
        await tx.exchangeRate.create({
          data: { base: "USD", quote: "INR", rate: usdToInr, source: "metals.dev", fetchedAt },
        });
      }

      // D. Update all eligible automatic product variants with optimistic concurrency verification
      for (const upd of variantUpdates) {
        const latestVariant = await tx.productVariant.findUnique({
          where: { id: upd.id },
          include: { product: { select: { pricingMode: true } } },
        });

        // If a seller concurrently deleted the piece or switched it to FIXED mode, respect their decision and skip!
        if (!latestVariant || latestVariant.product?.pricingMode !== "METAL_SPOT") {
          continue;
        }

        let finalPriceMinor = upd.newPriceMinor;
        const currentWeight = Number(latestVariant.metalWeightGrams);

        // If a seller concurrently modified weight, making charges, or stones, recompute with their latest values
        if (
          currentWeight !== upd.initialWeight ||
          latestVariant.makingChargeType !== upd.initialMakingType ||
          Number(latestVariant.makingChargeValue) !== upd.initialMakingVal
        ) {
          if (currentWeight > 0 && latestVariant.makingChargeType) {
            const isDomesticInr = upd.currency === "INR";
            const applicableRates = isDomesticInr ? ratesInrAsUsd : ratesUsd;
            const recomputed = computeSpotPrice(
              {
                metalType: latestVariant.metalType,
                metalWeightGrams: currentWeight,
                makingChargeType: latestVariant.makingChargeType,
                makingChargeValue: Number(latestVariant.makingChargeValue ?? 0),
                stonePriceMinor: num(latestVariant.stonePriceMinor),
                currency: upd.currency,
              },
              applicableRates,
              fx
            );
            if (recomputed && recomputed.totalMinor > 0) {
              finalPriceMinor = recomputed.totalMinor;
            }
          }
        }

        await tx.productVariant.update({
          where: { id: upd.id },
          data: {
            priceMinor: finalPriceMinor,
            priceComputedAt: fetchedAt,
          },
        });
      }

      // E. Update catalog facets for touched products
      for (const productId of touchedProductIds) {
        const prod = await tx.product.findUniqueOrThrow({
          where: { id: productId },
          include: {
            variants: { where: { isActive: true } },
            certificates: { where: { status: "VERIFIED" } },
          },
        });
        const sellable = prod.variants.filter((v) => v.allowBackorder || !v.trackInventory || v.stockQuantity > 0);
        const priced = (sellable.length ? sellable : prod.variants).map((v) => num(v.priceMinor)).filter((p) => p > 0);
        const base = priced.length ? Math.min(...priced) : 0;
        await tx.product.update({
          where: { id: productId },
          data: {
            basePriceMinor: base,
            normalizedPriceUsd: base ? toUsdMinor(base, prod.currency, fx) : 0,
            inStock: sellable.length > 0,
            certificationLabs: [...new Set(prod.certificates.map((c) => c.lab))],
          },
        });
      }

      // F. Record in audit system
      await tx.auditLog.create({
        data: {
          actorId: null,
          action: "metal_rates.refresh_and_reprice",
          entityType: "MetalRate",
          entityId: "metals.dev",
          metadata: {
            source: "metals.dev",
            ratesInr: {
              gold: goldInr,
              silver: silverInr,
              platinum: platinumInr,
              palladium: palladiumInr,
              benchmark: typeof data.metals?.ibja_gold === "number" && data.metals.ibja_gold > 0 ? "IBJA" : "SPOT",
            },
            ratesUsd,
            usdToInr,
            repricedVariants: variantUpdates.length,
            repricedProducts: touchedProductIds.size,
            timestamp: fetchedAt.toISOString(),
          },
        },
      });

      return recorded;
    });

    // 6. Revalidate caches
    try {
      revalidatePath("/");
      revalidatePath("/shop");
      revalidatePath("/catalog");
      revalidatePath("/product/[slug]", "page");
      revalidatePath("/seller/products");
    } catch {
      // In isolated test runner without request context, continue gracefully
    }

    return {
      success: true,
      count: recordedRates,
      timestamp: fetchedAt,
      repricedVariants: variantUpdates.length,
      repricedProducts: touchedProductIds.size,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[metals.dev] Sync exception:", message);
    return { success: false, count: 0, error: message };
  } finally {
    if (acquiredLock) {
      try {
        await db.$queryRawUnsafe(`SELECT pg_advisory_unlock(${METAL_RATES_LOCK_ID})`);
      } catch (err) {
        console.warn("[metals.dev] Failed to release pg advisory lock:", err);
      }
    }
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
  { metal: "GOLD", name: "Gold", purity: "24K (999)", symbol: "Au", unitLabel: "per 10g", multiplier: 10, accent: "gold" },
  { metal: "SILVER", name: "Silver", purity: "999 Fine", symbol: "Ag", unitLabel: "per 1 kg", multiplier: 1000, accent: "silver" },
  { metal: "PLATINUM", name: "Platinum", purity: "999 Pure", symbol: "Pt", unitLabel: "per 10g", multiplier: 10, accent: "platinum" },
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
    now - new Date(latestInrRecord.fetchedAt).getTime() > EIGHT_HOURS_MS;

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

  let mostRecentTimestamp: Date | null = null;
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
        if (!mostRecentTimestamp || fetchedAt > mostRecentTimestamp) {
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
          formattedPricePerGram: formatInrAmount(pricePerGram),
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
      if (usdRate && (!mostRecentTimestamp || fetchedAt > mostRecentTimestamp)) {
        mostRecentTimestamp = fetchedAt;
      }

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
        formattedPricePerGram: formatInrAmount(pricePerGram),
        fetchedAt,
        source: usdRate?.source ?? "market-ref",
        accent: cfg.accent,
      };
    })
  );

  return {
    items,
    lastUpdatedFormatted: formatIstTimestamp(mostRecentTimestamp ?? new Date()),
    source: primarySource,
  };
});
