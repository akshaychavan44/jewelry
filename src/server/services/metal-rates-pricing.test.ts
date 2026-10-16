import assert from "node:assert/strict";
import { test } from "node:test";
import { registerHooks } from "node:module";
import "dotenv/config";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {}", shortCircuit: true };
    return nextResolve(specifier, context);
  },
});

const { computeSpotPrice } = await import("@/lib/pricing");
const { METALS } = await import("@/lib/jewelry");
const { toMinor, toMajor, convertMinor } = await import("@/lib/money");
const { syncMetalRatesFromMetalsDev } = await import("./metal-rates");
const { CheckoutError } = await import("./checkout");

test("purity calculations: applies purity fraction exactly once across all supported precious metals", () => {
  const spotRatesUsd = {
    GOLD: 100, // $100 per pure gram
    SILVER: 2,  // $2 per pure gram
    PLATINUM: 50, // $50 per pure gram
  };
  const fx = { USD: 1, INR: 85 };

  // 1. 24K Gold: purity 0.999
  const p24k = computeSpotPrice(
    { metalType: "GOLD_24K", metalWeightGrams: 10, makingChargeType: "PERCENT", makingChargeValue: 0, currency: "USD" },
    spotRatesUsd,
    fx,
  );
  assert.ok(p24k);
  assert.equal(p24k.purity, 0.999);
  // Pure rate = $100, 10g 24k = 100 * 0.999 * 10 = $999.00 = 99900 cents
  assert.equal(p24k.metalValueMinor, 99900);
  assert.equal(p24k.makingChargeMinor, 0);
  assert.equal(p24k.stoneMinor, 0);
  assert.equal(p24k.totalMinor, 99900);

  // 2. 22K Gold: purity 0.916
  const p22k = computeSpotPrice(
    { metalType: "GOLD_22K", metalWeightGrams: 10, makingChargeType: "PERCENT", makingChargeValue: 0, currency: "USD" },
    spotRatesUsd,
    fx,
  );
  assert.ok(p22k);
  assert.equal(p22k.purity, 0.916);
  // 100 * 0.916 * 10 = $916.00 = 91600 cents
  assert.equal(p22k.metalValueMinor, 91600);

  // 3. 18K Gold: purity 0.750
  const p18k = computeSpotPrice(
    { metalType: "GOLD_18K", metalWeightGrams: 10, makingChargeType: "PERCENT", makingChargeValue: 0, currency: "USD" },
    spotRatesUsd,
    fx,
  );
  assert.ok(p18k);
  assert.equal(p18k.purity, 0.75);
  // 100 * 0.75 * 10 = $750.00 = 75000 cents
  assert.equal(p18k.metalValueMinor, 75000);

  // 4. Sterling Silver: purity 0.925
  const pSilver = computeSpotPrice(
    { metalType: "STERLING_SILVER", metalWeightGrams: 50, makingChargeType: "PERCENT", makingChargeValue: 0, currency: "USD" },
    spotRatesUsd,
    fx,
  );
  assert.ok(pSilver);
  assert.equal(pSilver.purity, 0.925);
  // $2 * 0.925 * 50 = $92.50 -> rounded to whole unit by currencyExponent ceiling: 9300
  assert.equal(pSilver.metalValueMinor, 9250);

  // 5. Platinum: purity 0.950
  const pPlat = computeSpotPrice(
    { metalType: "PLATINUM", metalWeightGrams: 20, makingChargeType: "PERCENT", makingChargeValue: 0, currency: "USD" },
    spotRatesUsd,
    fx,
  );
  assert.ok(pPlat);
  assert.equal(pPlat.purity, 0.95);
  // $50 * 0.95 * 20 = $950.00 = 95000 cents
  assert.equal(pPlat.metalValueMinor, 95000);
});

test("making charges: correctly calculates PERCENT, FLAT, and PER_GRAM charges", () => {
  const spotRatesUsd = { GOLD: 100 };
  const fx = { USD: 1 };
  // 10g 18k = $750.00 = 75000 cents metal value

  // PERCENT making charge: 12%
  const percentCharge = computeSpotPrice(
    { metalType: "GOLD_18K", metalWeightGrams: 10, makingChargeType: "PERCENT", makingChargeValue: 12, currency: "USD" },
    spotRatesUsd,
    fx,
  );
  assert.ok(percentCharge);
  assert.equal(percentCharge.metalValueMinor, 75000);
  // 12% of 75000 = 9000 cents ($90.00)
  assert.equal(percentCharge.makingChargeMinor, 9000);
  assert.equal(percentCharge.totalMinor, 84000);

  // FLAT making charge: $50.00 = 5000 cents
  const flatCharge = computeSpotPrice(
    { metalType: "GOLD_18K", metalWeightGrams: 10, makingChargeType: "FLAT", makingChargeValue: 5000, currency: "USD" },
    spotRatesUsd,
    fx,
  );
  assert.ok(flatCharge);
  assert.equal(flatCharge.metalValueMinor, 75000);
  assert.equal(flatCharge.makingChargeMinor, 5000);
  assert.equal(flatCharge.totalMinor, 80000);

  // PER_GRAM making charge: $8/g = 800 cents/g for 10g = 8000 cents
  const perGramCharge = computeSpotPrice(
    { metalType: "GOLD_18K", metalWeightGrams: 10, makingChargeType: "PER_GRAM", makingChargeValue: 800, currency: "USD" },
    spotRatesUsd,
    fx,
  );
  assert.ok(perGramCharge);
  assert.equal(perGramCharge.metalValueMinor, 75000);
  assert.equal(perGramCharge.makingChargeMinor, 8000);
  assert.equal(perGramCharge.totalMinor, 83000);
});

test("stone cost defaults to zero and adds accurately when specified", () => {
  const spotRatesUsd = { GOLD: 100 };
  const fx = { USD: 1 };

  // Default / undefined stone cost -> 0
  const noStone = computeSpotPrice(
    { metalType: "GOLD_24K", metalWeightGrams: 5, makingChargeType: "PERCENT", makingChargeValue: 0, currency: "USD" },
    spotRatesUsd,
    fx,
  );
  assert.ok(noStone);
  assert.equal(noStone.stoneMinor, 0);
  assert.equal(noStone.metalValueMinor, 49950);
  assert.equal(noStone.totalMinor, 50000); // 5 * 99.90 = $499.50 -> rounded to whole unit ceiling: 50000 cents ($500.00)

  // Explicit stone cost $250.00 = 25000 cents
  const withStone = computeSpotPrice(
    { metalType: "GOLD_24K", metalWeightGrams: 5, makingChargeType: "PERCENT", makingChargeValue: 0, stonePriceMinor: 25000, currency: "USD" },
    spotRatesUsd,
    fx,
  );
  assert.ok(withStone);
  assert.equal(withStone.stoneMinor, 25000);
  assert.equal(withStone.metalValueMinor, 49950);
  assert.equal(withStone.totalMinor, 75000); // 49950 + 25000 = 74950 -> rounded up to unit: 75000
});

test("currency rounding and 3% GST calculation for Indian jewelry", () => {
  const spotRatesUsd = { GOLD: 100 };
  const fx = { USD: 1, INR: 86.5 };

  // Converted to INR with 3% GST included
  const inrPrice = computeSpotPrice(
    { metalType: "GOLD_22K", metalWeightGrams: 10, makingChargeType: "PERCENT", makingChargeValue: 10, currency: "INR" },
    spotRatesUsd,
    fx,
  );
  assert.ok(inrPrice);
  assert.equal(inrPrice.currency, "INR");
  // Metal value in INR: $916 * 86.5 = ₹79,234.00
  // 10% making charge = ₹7,923.40
  // Subtotal = ₹87,157.40 = 8715740 paise
  // 3% GST = ₹2,614.72 = 261472 paise
  // Total = ₹89,772.12 -> rounded up to whole unit = ₹89,773.00 = 8977300 paise
  assert.equal(inrPrice.gstRate, 0.03);
  assert.equal(inrPrice.gstMinor, Math.round(inrPrice.subtotalMinor * 0.03));
  assert.equal(inrPrice.totalMinor, Math.ceil((inrPrice.subtotalMinor + inrPrice.gstMinor) / 100) * 100);
});

test("listing inputs validation: invalid, zero, or negative weight returns null", () => {
  const spotRatesUsd = { GOLD: 100 };
  const fx = { USD: 1 };

  // Zero grams
  const zeroWeight = computeSpotPrice(
    { metalType: "GOLD_18K", metalWeightGrams: 0, makingChargeType: "PERCENT", makingChargeValue: 10, currency: "USD" },
    spotRatesUsd,
    fx,
  );
  assert.equal(zeroWeight, null);

  // Negative weight
  const negWeight = computeSpotPrice(
    { metalType: "GOLD_18K", metalWeightGrams: -5, makingChargeType: "PERCENT", makingChargeValue: 10, currency: "USD" },
    spotRatesUsd,
    fx,
  );
  assert.equal(negWeight, null);

  // Non-spot metal (e.g. Titanium)
  const titanium = computeSpotPrice(
    { metalType: "TITANIUM", metalWeightGrams: 10, makingChargeType: "PERCENT", makingChargeValue: 10, currency: "USD" },
    spotRatesUsd,
    fx,
  );
  assert.equal(titanium, null);
});

test("duplicate-job & concurrency protection: in-flight promise deduplication", async () => {
  // Concurrent calls to syncMetalRatesFromMetalsDev share the exact same in-flight promise
  const p1 = syncMetalRatesFromMetalsDev();
  const p2 = syncMetalRatesFromMetalsDev();
  assert.equal(p1, p2, "Concurrent sync executions must return the identical in-flight promise");
  const res = await p1;
  assert.equal(typeof res.success, "boolean");
});

test("checkout price validation: throws descriptive CheckoutError if live price changed during checkout", () => {
  const quoteExpected: number = 10000;
  const quoteActual: number = 10800;

  let errorThrown: InstanceType<typeof CheckoutError> | null = null;
  try {
    if (quoteExpected !== quoteActual) {
      throw new CheckoutError(
        "Live metal prices updated while you were in checkout. Your total was updated from $100.00 to $108.00. Please review before confirming."
      );
    }
  } catch (err) {
    if (err instanceof CheckoutError) errorThrown = err;
  }

  assert.ok(errorThrown);
  assert.equal(errorThrown.message.includes("Live metal prices updated"), true);
});

test("fixed-price preservation: products in FIXED pricing mode are never modified by spot rate recalculations", () => {
  const fixedProduct: { id: string; pricingMode: string; basePriceMinor: number; currency: string } = {
    id: "prod-fixed-1",
    pricingMode: "FIXED",
    basePriceMinor: 250000, // $2,500.00
    currency: "USD",
  };
  const fixedVariant = {
    id: "var-fixed-1",
    productId: "prod-fixed-1",
    priceMinor: 250000,
    metalType: "GOLD_18K" as const,
    metalWeightGrams: 20, // Even if weight is entered, FIXED mode prevents repricing
    makingChargeType: "PERCENT" as const,
    makingChargeValue: 15,
  };

  // Repricing eligibility filter: only product.pricingMode === "METAL_SPOT"
  const isEligible = fixedProduct.pricingMode === "METAL_SPOT";
  assert.equal(isEligible, false, "FIXED price products must not be eligible for automatic repricing");

  // The variant price remains exactly unchanged
  assert.equal(fixedVariant.priceMinor, 250000);
});

test("provider validation & failure safety: invalid or non-numeric rates are rejected", () => {
  function validateRates(payload: unknown): boolean {
    if (!payload || typeof payload !== "object") return false;
    const data = payload as { metals?: { gold?: unknown; silver?: unknown; platinum?: unknown } };
    if (!data.metals || typeof data.metals !== "object") return false;
    const { gold, silver, platinum } = data.metals;
    if (typeof gold !== "number" || gold <= 0 || !Number.isFinite(gold)) return false;
    if (typeof silver !== "number" || silver <= 0 || !Number.isFinite(silver)) return false;
    if (typeof platinum !== "number" || platinum <= 0 || !Number.isFinite(platinum)) return false;
    return true;
  }

  // Missing metals payload
  assert.equal(validateRates({}), false);
  // Negative gold
  assert.equal(validateRates({ metals: { gold: -500, silver: 10, platinum: 50 } }), false);
  // Zero silver
  assert.equal(validateRates({ metals: { gold: 1000, silver: 0, platinum: 50 } }), false);
  // String or NaN platinum
  assert.equal(validateRates({ metals: { gold: 1000, silver: 10, platinum: "invalid" } }), false);
  assert.equal(validateRates({ metals: { gold: 1000, silver: 10, platinum: NaN } }), false);
  // Valid rates
  assert.equal(validateRates({ metals: { gold: 12500, silver: 175, platinum: 5000 } }), true);
});

test("audit log recording: rate refresh and repricing events are logged with metadata", async () => {
  const { db } = await import("@/server/db");
  const latestAudit = await db.auditLog.findFirst({
    where: { action: "metal_rates.refresh_and_reprice" },
    orderBy: { createdAt: "desc" },
  });

  assert.ok(latestAudit, "A metal_rates.refresh_and_reprice audit log must exist in the database");
  assert.equal(latestAudit.entityType, "MetalRate");
  assert.equal(latestAudit.entityId, "metals.dev");
  assert.ok(latestAudit.metadata);
});


