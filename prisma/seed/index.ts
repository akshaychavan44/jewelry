/* Loupe seed — builds a complete, internally consistent demo marketplace. */
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { createNeonDbClient } from "../../src/server/db/neon-client";
import bcrypt from "bcryptjs";
import { type Prisma } from "../../src/generated/prisma/client";
import type {
  Carrier,
  CertificateLab,
  EngravingStyle,
  FulfillmentStatus,
  MetalType,
  ShippingMethod,
  ShippingRegion,
  ShipmentStatus,
} from "../../src/generated/prisma/enums";
import { type CommissionRuleLite, resolveCommissionBps } from "../../src/lib/commission";
import { chainLengthLabel, METALS, metalLabel } from "../../src/lib/jewelry";
import { convertMinor, type FxRates, toMinor, toUsdMinor } from "../../src/lib/money";
import {
  type AddressSnapshot,
  computeSellerGroupTotals,
  formatOrderNumber,
  sellerOrderReference,
  sumTotals,
} from "../../src/lib/order-math";
import { computeSpotPrice, type SpotRatesUsd } from "../../src/lib/pricing";
import { regionForCountry, zoneFor } from "../../src/lib/regions";
import { deliveryWindow, eligibleRates, quoteRate, type RateCardLine } from "../../src/lib/shipping";
import { estimateDutyRate, estimateTax } from "../../src/lib/tax-rates";
import { CATEGORY_TREE, type ProductSpec, SELLERS, type SellerSpec } from "./data/catalog";
import { ADMINS, BUYERS, type BuyerSpec, DEMO_PASSWORD, REVIEW_SNIPPETS } from "./data/people";
import { writeSampleKycDocument } from "./documents";
import { addHours, chance, code, daysAgo, daysFromNow, img, int, now, pick, random, shuffle } from "./lib";
import type { PrismaClient } from "../../src/generated/prisma/client";

try {
  process.loadEnvFile(".env");
} catch {
  // env already provided
}

const prisma: PrismaClient = createNeonDbClient(process.env.DATABASE_URL) as unknown as PrismaClient;

// ── Market data ───────────────────────────────────────────────────────────────

const FX: FxRates = { USD: 1, EUR: 0.92, GBP: 0.78, INR: 88.2, AED: 3.6725, CHF: 0.86, CAD: 1.37, AUD: 1.52, SGD: 1.33, JPY: 148.5 };
const SPOT: SpotRatesUsd = { GOLD: 131.2, SILVER: 1.58, PLATINUM: 49.8, PALLADIUM: 43.4 };

const SETTINGS = {
  defaultCommissionBps: 1200,
  listingFeeUsdMinor: 200,
  signatureThresholdUsd: 50_000,
  secureCourierThresholdUsd: 2_500_000,
  inspectionWindowDays: 3,
};

const PLANS = {
  atelier: { code: "atelier", name: "Atelier", price: 0, discount: 0, slots: 0, homepage: false, waived: false, features: ["Standard commission", "Up to 50 active listings", "Seller analytics", "Make an Offer & custom orders"] },
  maison: { code: "maison", name: "Maison", price: 14900, discount: 200, slots: 3, homepage: false, waived: true, features: ["2% lower commission", "3 featured listings", "Listing fees waived", "Priority KYC review", "POS inventory sync"] },
  haute: { code: "haute", name: "Haute", price: 49900, discount: 300, slots: 10, homepage: true, waived: true, features: ["3% lower commission", "10 featured listings", "Homepage storefront placement", "Listing fees waived", "Dedicated account manager", "Secure-courier rates"] },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function encrypt(plaintext: string) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes (base64) — see .env.example");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const slug = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const major = (amount: number, currency: string) => toMinor(amount, currency);
const usd = (minor: number, currency: string) => toUsdMinor(minor, currency, FX);

function trackingNumber(carrier: Carrier) {
  const digits = (n: number) => code(n, "0123456789");
  switch (carrier) {
    case "FEDEX": return digits(12);
    case "UPS": return `1Z${code(16, "0123456789ABCDEFGHJKLMNPRSTUVWXY")}`;
    case "DHL": return digits(10);
    case "USPS": return `9400${digits(18)}`;
    case "ROYAL_MAIL": return `SD${digits(9)}GB`;
    case "BLUE_DART": return digits(11);
    case "BRINKS": return `BGS-${code(8)}`;
    case "MALCA_AMIT": return `MA-${code(8)}`;
    default: return `AP${digits(10)}`;
  }
}

const HUBS: Record<string, string> = {
  US: "Memphis, TN", GB: "East Midlands, GB", FR: "Paris CDG, FR", IT: "Bergamo, IT", IN: "Mumbai, IN",
  AU: "Sydney, AU", AE: "Dubai, AE", JP: "Tokyo Narita, JP", SG: "Singapore Changi, SG",
};

// ── Seeded records kept in memory for cross-referencing ───────────────────────

type SeededVariant = {
  id: string;
  sku: string;
  title: string;
  priceMinor: number;
  stock: number;
  allowBackorder: boolean;
  metalType: MetalType;
  ringSize: number | null;
  chainLengthMm: number | null;
  caratWeight: number | null;
  pricingSnapshot: Prisma.InputJsonValue | null;
};

type SeededProduct = {
  id: string;
  slug: string;
  title: string;
  sellerKey: string;
  sellerId: string;
  currency: string;
  categoryId: string;
  categoryIds: string[];
  imageUrl: string;
  variants: SeededVariant[];
  spec: ProductSpec;
  status: "ACTIVE" | "DRAFT" | "SOLD";
};

type SeededSeller = {
  id: string;
  userId: string;
  spec: SellerSpec;
  rates: RateCardLine[];
  planDiscountBps: number;
  returnAddress: AddressSnapshot;
};

type SeededBuyer = { id: string; spec: BuyerSpec; address: AddressSnapshot; cardSummary: string };

const sellers = new Map<string, SeededSeller>();
const products: SeededProduct[] = [];
const buyers = new Map<string, SeededBuyer>();
const categoryIds = new Map<string, { id: string; parentId: string | null }>();
let commissionRules: CommissionRuleLite[] = [];
let adminIds: string[] = [];

const productByTitle = (title: string) => {
  const p = products.find((x) => x.title === title);
  if (!p) throw new Error(`Seed product not found: ${title}`);
  return p;
};

// ── Reset ─────────────────────────────────────────────────────────────────────

async function reset() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  }
}

// ── Platform configuration ────────────────────────────────────────────────────

async function seedPlatform() {
  await prisma.platformSettings.create({
    data: {
      id: "platform",
      defaultCommissionBps: SETTINGS.defaultCommissionBps,
      listingFeeMinor: SETTINGS.listingFeeUsdMinor,
      listingFeeCurrency: "USD",
      signatureThresholdUsd: SETTINGS.signatureThresholdUsd,
      secureCourierThresholdUsd: SETTINGS.secureCourierThresholdUsd,
      inspectionWindowDays: SETTINGS.inspectionWindowDays,
      offerExpiryHours: 48,
      minOfferBps: 5000,
      reservationMinutes: 15,
      requiredKycDocuments: ["TAX_REGISTRATION", "BUSINESS_LICENSE", "GOVERNMENT_ID"],
    },
  });

  for (const [i, plan] of Object.values(PLANS).entries()) {
    await prisma.subscriptionPlan.create({
      data: {
        code: plan.code,
        name: plan.name,
        description: plan.code === "atelier" ? "Everything you need to start selling." : plan.code === "maison" ? "For established jewelers who want more visibility." : "For houses selling high jewelry at scale.",
        priceMinor: plan.price,
        currency: "USD",
        interval: "MONTH",
        commissionDiscountBps: plan.discount,
        featuredSlots: plan.slots,
        homepagePlacement: plan.homepage,
        listingFeeWaived: plan.waived,
        features: [...plan.features],
        position: i,
      },
    });
  }

  for (const [currency, rate] of Object.entries(FX)) {
    if (currency === "USD") continue;
    await prisma.exchangeRate.create({ data: { base: "USD", quote: currency, rate, source: "seed", fetchedAt: now() } });
  }

  // 30 days of spot history (a gentle random walk ending at today's rate).
  for (const [metal, latest] of Object.entries(SPOT) as [keyof typeof SPOT, number][]) {
    let value = latest * (1 - 0.035);
    for (let d = 30; d >= 0; d--) {
      value = d === 0 ? latest : value * (1 + (random() - 0.42) * 0.012);
      await prisma.metalRate.create({
        data: { metal, currency: "USD", pricePerGram: Number(value.toFixed(4)), source: d === 0 ? "seed · live" : "seed · history", fetchedAt: daysAgo(d, d === 0 ? 0 : 1) },
      });
    }
  }
}

async function seedCategories() {
  for (const [i, parent] of CATEGORY_TREE.entries()) {
    const created = await prisma.category.create({
      data: { slug: parent.slug, name: parent.name, description: parent.description, imageUrl: img(parent.image), position: i },
    });
    categoryIds.set(parent.slug, { id: created.id, parentId: null });
    for (const [j, child] of parent.children.entries()) {
      const c = await prisma.category.create({
        data: { slug: child.slug, name: child.name, imageUrl: img(child.image), parentId: created.id, position: j },
      });
      categoryIds.set(child.slug, { id: c.id, parentId: created.id });
    }
  }

  const high = categoryIds.get("high-jewelry")!.id;
  const vintage = categoryIds.get("vintage")!.id;
  const rules = [
    { name: "High jewelry — reduced rate", categoryId: high, sellerId: null, rateBps: 800, priority: 10 },
    { name: "Vintage & pre-owned", categoryId: vintage, sellerId: null, rateBps: 1500, priority: 5 },
  ];
  for (const r of rules) await prisma.commissionRule.create({ data: r });
  commissionRules = rules.map((r) => ({ ...r, isActive: true }));
}

// ── People ────────────────────────────────────────────────────────────────────

async function seedPeople(passwordHash: string) {
  for (const a of ADMINS) {
    const u = await prisma.user.create({
      data: { email: a.email, name: a.name, passwordHash, role: "ADMIN", emailVerified: daysAgo(400), country: "GB", preferredCurrency: "USD", lastLoginAt: daysAgo(0, 2) },
    });
    adminIds.push(u.id);
  }

  for (const b of BUYERS) {
    const address: AddressSnapshot = { fullName: b.name, ...b.address, country: b.country };
    const user = await prisma.user.create({
      data: {
        email: b.email,
        name: b.name,
        passwordHash,
        role: "BUYER",
        emailVerified: daysAgo(int(60, 500)),
        country: b.country,
        preferredCurrency: b.currency,
        phone: b.address.phone,
        marketingOptIn: chance(0.6),
        stripeCustomerId: `cus_demo_${b.key}`,
        lastLoginAt: daysAgo(int(0, 12)),
        createdAt: daysAgo(int(200, 540)),
        addresses: {
          create: [
            { type: "SHIPPING", label: "Home", fullName: b.name, ...b.address, country: b.country, isDefault: true },
            { type: "BILLING", label: "Billing", fullName: b.name, ...b.address, country: b.country, isDefault: true },
          ],
        },
        paymentMethods: {
          create: [
            { provider: "DEMO", providerPaymentMethodId: `pm_demo_${b.key}_1`, brand: b.card.brand, last4: b.card.last4, expMonth: b.card.exp[0], expYear: b.card.exp[1], billingName: b.name, isDefault: true },
          ],
        },
      },
    });
    const brand = b.card.brand === "amex" ? "Amex" : b.card.brand.charAt(0).toUpperCase() + b.card.brand.slice(1);
    buyers.set(b.key, { id: user.id, spec: b, address, cardSummary: `${brand} •••• ${b.card.last4}` });
  }

  // Olivia keeps a second address (her studio) and a second card.
  const olivia = buyers.get("olivia")!;
  await prisma.address.create({
    data: { userId: olivia.id, type: "SHIPPING", label: "Studio", fullName: "Olivia Carter", company: "Carter & Wolfe Design", line1: "55 Water Street", line2: "Floor 9", city: "Brooklyn", region: "NY", postalCode: "11201", country: "US" },
  });
  await prisma.paymentMethod.create({
    data: { userId: olivia.id, provider: "DEMO", providerPaymentMethodId: "pm_demo_olivia_2", brand: "amex", last4: "1005", expMonth: 2, expYear: 2028, billingName: "Olivia Carter" },
  });
}

// ── Sellers ───────────────────────────────────────────────────────────────────

async function seedSellers(passwordHash: string) {
  const plans = await prisma.subscriptionPlan.findMany();
  const planByCode = new Map(plans.map((p) => [p.code, p]));
  const reviewer = adminIds[0];

  for (const s of SELLERS) {
    const approved = s.status === "APPROVED";
    const createdAt = approved ? daysAgo(int(260, 720)) : s.status === "PENDING" ? daysAgo(int(2, 9)) : daysAgo(int(40, 200));
    const user = await prisma.user.create({
      data: {
        email: s.owner.email,
        name: s.owner.name,
        passwordHash,
        role: "SELLER",
        emailVerified: createdAt,
        country: s.country,
        preferredCurrency: s.currency,
        createdAt,
        lastLoginAt: daysAgo(int(0, 5)),
      },
    });

    const returnAddress: AddressSnapshot = { fullName: s.storeName, ...s.returnAddress, country: s.country };
    const addr = await prisma.address.create({
      data: { userId: user.id, type: "RETURN", label: "Returns", fullName: s.storeName, ...s.returnAddress, country: s.country, isDefault: true },
    });

    const submittedAt =
      s.status === "PENDING" ? (s.key === "saffron" ? daysAgo(0, 5) : daysAgo(2, 3)) : addHours(createdAt, 30);
    const isStripe = s.payout === "STRIPE_CONNECT";

    const seller = await prisma.sellerProfile.create({
      data: {
        userId: user.id,
        storeName: s.storeName,
        slug: s.slug,
        tagline: s.tagline,
        bio: s.bio,
        bannerUrl: img(s.banner),
        country: s.country,
        city: s.city,
        defaultCurrency: s.currency,
        foundedYear: s.foundedYear,
        specialties: s.specialties,
        returnAddressId: addr.id,
        legalBusinessName: s.business.legalName,
        businessType: s.business.type,
        registrationNumber: s.business.registration,
        taxIdEncrypted: encrypt(s.business.taxId),
        taxIdLast4: s.business.taxId.replace(/\s/g, "").slice(-4),
        website: s.business.website,
        payoutMethod: s.payout,
        stripeAccountId: isStripe ? `acct_demo_${s.key}` : null,
        stripeChargesEnabled: isStripe && approved,
        stripePayoutsEnabled: isStripe && approved,
        stripeDetailsSubmitted: isStripe,
        bankAccountHolder: isStripe ? null : s.business.legalName,
        bankName: isStripe ? null : s.country === "IN" ? "HDFC Bank" : s.country === "AE" ? "Emirates NBD" : "DNB Bank",
        bankCountry: isStripe ? null : s.country,
        bankAccountEncrypted: isStripe ? null : encrypt(`00${code(10, "0123456789")}`),
        bankAccountLast4: isStripe ? null : code(4, "0123456789"),
        bankRoutingEncrypted: isStripe ? null : encrypt(s.country === "IN" ? "HDFC0000212" : "EBILAEAD"),
        payoutCurrency: s.currency,
        onboardingStep: 4,
        verificationStatus: s.status,
        submittedAt,
        approvedAt: approved || s.status === "SUSPENDED" ? addHours(submittedAt, 26) : null,
        suspendedAt: s.status === "SUSPENDED" ? daysAgo(5) : null,
        suspensionReason: s.status === "SUSPENDED" ? s.kycNotes : null,
        isFeatured: !!s.featured,
        isTopRated: !!s.topRated,
        responseTimeMinutes: s.responseTimeMinutes ?? null,
        responseRate: s.responseRate ?? null,
        handlingDays: s.handlingDays ?? 2,
        returnWindowDays: s.returnWindowDays ?? 30,
        createdAt,
        locations: {
          create: s.locations.map((l) => ({ ...l, country: s.country, appointmentOnly: !!l.appointmentOnly })),
        },
      },
    });

    // Rate card
    const rates: RateCardLine[] = s.rates.map(([zone, method, price, minDays, maxDays, carrier, freeOver]) => ({
      zone,
      method,
      carrier,
      priceMinor: major(price, s.currency),
      currency: s.currency,
      freeOverMinor: freeOver !== undefined ? major(freeOver, s.currency) : null,
      minDays,
      maxDays,
      insuranceRateBps: 0,
      isActive: true,
    }));
    await prisma.shippingRate.createMany({ data: rates.map((r) => ({ ...r, sellerId: seller.id })) });

    // KYC submission + documents
    const submissionStatus = s.status === "SUSPENDED" ? "APPROVED" : s.status;
    const submission = await prisma.kycSubmission.create({
      data: {
        sellerId: seller.id,
        status: submissionStatus,
        snapshot: {
          legalBusinessName: s.business.legalName,
          businessType: s.business.type,
          registrationNumber: s.business.registration,
          taxIdLast4: s.business.taxId.slice(-4),
          country: s.country,
          payoutMethod: s.payout,
          website: s.business.website ?? null,
        },
        submittedAt,
        reviewedAt: s.status === "PENDING" ? null : addHours(submittedAt, 26),
        reviewerId: s.status === "PENDING" ? null : reviewer,
        reviewerNotes:
          s.status === "REJECTED"
            ? s.kycNotes
            : s.status === "PENDING"
              ? null
              : "Business registration verified against the public register. Identity confirmed. Welcome to Loupe.",
        internalNotes: s.status === "APPROVED" ? "Registry match. Sanctions & PEP screening clear." : null,
        riskScore: s.status === "REJECTED" ? 64 : s.status === "PENDING" ? int(12, 35) : int(4, 18),
      },
    });

    for (const type of ["TAX_REGISTRATION", "BUSINESS_LICENSE", "GOVERNMENT_ID"] as const) {
      const key = `kyc/${seller.id}/${type.toLowerCase()}.pdf`;
      const size = await writeSampleKycDocument({
        key,
        type,
        legalName: s.business.legalName,
        holder: s.owner.name,
        country: s.country,
        reference: type === "TAX_REGISTRATION" ? s.business.taxId : s.business.registration,
      });
      const file = await prisma.fileAsset.create({
        data: {
          key,
          visibility: "PRIVATE",
          purpose: "KYC_DOCUMENT",
          fileName: `${type.toLowerCase().replace(/_/g, "-")}.pdf`,
          mimeType: "application/pdf",
          sizeBytes: size,
          uploadedById: user.id,
          createdAt: submittedAt,
        },
      });
      await prisma.kycDocument.create({
        data: {
          sellerId: seller.id,
          submissionId: submission.id,
          type,
          fileId: file.id,
          status: s.status === "PENDING" ? "PENDING" : s.status === "REJECTED" && type !== "TAX_REGISTRATION" ? "REJECTED" : "ACCEPTED",
          rejectionReason:
            s.status === "REJECTED" && type === "BUSINESS_LICENSE"
              ? "Licence expired March 2025."
              : s.status === "REJECTED" && type === "GOVERNMENT_ID"
                ? "Name does not match registered director."
                : null,
          createdAt: submittedAt,
        },
      });
    }

    // Subscription
    const plan = planByCode.get(s.plan)!;
    if (s.plan !== "atelier" && approved) {
      await prisma.sellerSubscription.create({
        data: {
          sellerId: seller.id,
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodStart: daysAgo(12),
          currentPeriodEnd: daysFromNow(18),
          stripeSubscriptionId: `sub_demo_${s.key}`,
        },
      });
      for (let m = 5; m >= 0; m--) {
        await prisma.ledgerEntry.create({
          data: {
            type: "SUBSCRIPTION_FEE",
            amountMinor: plan.priceMinor,
            currency: "USD",
            amountUsdMinor: plan.priceMinor,
            sellerId: seller.id,
            reference: `sub_demo_${s.key}`,
            description: `${plan.name} plan`,
            occurredAt: daysAgo(m * 30 + 12),
          },
        });
      }
    }

    // Audit trail for decided applications
    if (s.status !== "PENDING") {
      await prisma.auditLog.create({
        data: {
          actorId: reviewer,
          action: s.status === "REJECTED" ? "kyc.reject" : "kyc.approve",
          entityType: "SellerProfile",
          entityId: seller.id,
          metadata: { storeName: s.storeName },
          createdAt: addHours(submittedAt, 26),
        },
      });
    }
    if (s.status === "SUSPENDED") {
      await prisma.auditLog.create({
        data: { actorId: reviewer, action: "seller.suspend", entityType: "SellerProfile", entityId: seller.id, metadata: { reason: s.kycNotes ?? "" }, createdAt: daysAgo(5) },
      });
    }

    sellers.set(s.key, { id: seller.id, userId: user.id, spec: s, rates, planDiscountBps: plan.commissionDiscountBps, returnAddress });
  }
}

// ── Catalogue ─────────────────────────────────────────────────────────────────

function variantTitle(spec: ProductSpec, v: ProductSpec["variants"][number]) {
  if (v.title) return v.title;
  const parts: string[] = [];
  const metal = v.metalType ?? spec.metal;
  parts.push(metalLabel(metal, v.metalColor ?? spec.color));
  if (v.caratWeight && spec.variants.some((o) => o.caratWeight !== v.caratWeight)) parts.push(`${v.caratWeight.toFixed(2)} ct`);
  if (v.ringSize) parts.push(`Size ${v.ringSize}`);
  if (v.chainLengthMm) parts.push(chainLengthLabel(v.chainLengthMm));
  return parts.join(" · ");
}

function shipsToFor(seller: SellerSpec, spec: ProductSpec): ShippingRegion[] {
  if (spec.shipsTo) return spec.shipsTo;
  const regions = new Set<ShippingRegion>();
  for (const [zone] of seller.rates) regions.add(zone === "DOMESTIC" ? regionForCountry(seller.country) : zone);
  return [...regions];
}

async function seedProducts() {
  const usedSlugs = new Set<string>();

  for (const s of SELLERS) {
    const seller = sellers.get(s.key)!;
    const prefix = s.storeName.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();

    for (const [pi, spec] of s.products.entries()) {
      const cat = categoryIds.get(spec.category);
      if (!cat) throw new Error(`Unknown category ${spec.category}`);
      let productSlug = slug(spec.title);
      if (usedSlugs.has(productSlug)) productSlug = `${productSlug}-${s.slug}`;
      usedSlugs.add(productSlug);

      const pricingMode = spec.spot ? "METAL_SPOT" : "FIXED";
      const variants = spec.variants.map((v, vi) => {
        let priceMinor = major(v.price ?? 0, s.currency);
        let snapshot: Prisma.InputJsonValue | null = null;
        if (spec.spot) {
          const breakdown = computeSpotPrice(
            {
              metalType: v.metalType ?? spec.metal,
              metalWeightGrams: v.metalWeightGrams ?? 0,
              makingChargeType: v.makingChargeType ?? "PERCENT",
              makingChargeValue: v.makingChargeType === "PERCENT" ? (v.makingChargeValue ?? 0) : major(v.makingChargeValue ?? 0, s.currency),
              stonePriceMinor: v.stonePrice ? major(v.stonePrice, s.currency) : 0,
              currency: s.currency,
            },
            SPOT,
            FX,
          );
          if (!breakdown) throw new Error(`Could not price ${spec.title}`);
          priceMinor = breakdown.totalMinor;
          snapshot = breakdown as unknown as Prisma.InputJsonValue;
        }
        return {
          sku: `${prefix}-${String(pi + 1).padStart(3, "0")}-${String.fromCharCode(65 + vi)}`,
          title: variantTitle(spec, v),
          metalType: v.metalType ?? spec.metal,
          metalColor: v.metalColor ?? spec.color ?? null,
          gemstone: v.gemstone ?? (spec.gemstone && spec.gemstone !== "NONE" ? spec.gemstone : null),
          caratWeight: v.caratWeight ?? null,
          stoneQuality: v.stoneQuality ?? null,
          ringSize: v.ringSize ?? null,
          chainLengthMm: v.chainLengthMm ?? null,
          priceMinor,
          compareAtPriceMinor: v.compareAt ? major(v.compareAt, s.currency) : null,
          metalWeightGrams: v.metalWeightGrams ?? null,
          makingChargeType: v.makingChargeType ?? null,
          makingChargeValue:
            v.makingChargeValue === undefined ? null : v.makingChargeType === "PERCENT" ? v.makingChargeValue : major(v.makingChargeValue, s.currency),
          stonePriceMinor: v.stonePrice ? major(v.stonePrice, s.currency) : null,
          priceComputedAt: spec.spot ? now() : null,
          stockQuantity: v.stock ?? 1,
          lowStockThreshold: spec.oneOfAKind ? 0 : 1,
          allowBackorder: !!v.allowBackorder,
          isDefault: vi === 0,
          position: vi,
          snapshot,
        };
      });

      const active = variants.filter((v) => v.stockQuantity > 0 || v.allowBackorder);
      const base = Math.min(...(active.length ? active : variants).map((v) => v.priceMinor));
      const status = spec.status ?? (s.status === "APPROVED" ? "ACTIVE" : "DRAFT");
      const publishedAt = status === "ACTIVE" ? daysAgo(int(6, 240)) : null;
      const labs = [...new Set((spec.certificates ?? []).filter((c) => c.pendingReviewDaysAgo === undefined).map((c) => c.lab))] as CertificateLab[];

      const product = await prisma.product.create({
        data: {
          sellerId: seller.id,
          categoryId: cat.id,
          title: spec.title,
          slug: productSlug,
          shortDescription: spec.short,
          description: spec.description,
          status,
          condition: spec.condition ?? "NEW",
          conditionGrade: spec.conditionGrade,
          conditionNotes: spec.conditionNotes,
          era: spec.era,
          isHandcrafted: spec.handcrafted ?? true,
          isOneOfAKind: !!spec.oneOfAKind,
          isMadeToOrder: !!spec.madeToOrder,
          productionDays: spec.productionDays ?? 0,
          primaryMetal: spec.metal,
          metalColor: spec.color,
          primaryGemstone: spec.gemstone ?? "NONE",
          totalCaratWeight: spec.carat,
          stoneShape: spec.shape,
          widthMm: spec.dims?.w,
          heightMm: spec.dims?.h,
          depthMm: spec.dims?.d,
          weightGrams: spec.dims?.g,
          currency: s.currency,
          basePriceMinor: base,
          compareAtPriceMinor: variants[0].compareAtPriceMinor,
          normalizedPriceUsd: usd(base, s.currency),
          pricingMode,
          acceptsOffers: !!spec.offers,
          offerFloorMinor: spec.offers ? major(spec.offers.floor, s.currency) : null,
          sizingMode: spec.sizing ?? "NONE",
          ringSizeMin: spec.ringMin,
          ringSizeMax: spec.ringMax,
          resizingFeeMinor: spec.resizingFee ? major(spec.resizingFee, s.currency) : null,
          engravingEnabled: !!spec.engraving,
          engravingMaxChars: spec.engraving?.maxChars,
          engravingFeeMinor: spec.engraving?.fee ? major(spec.engraving.fee, s.currency) : null,
          shipsFromCountry: s.country,
          shipsTo: shipsToFor(s, spec),
          warrantyMonths: spec.warrantyMonths ?? 12,
          tags: spec.tags,
          isFeatured: spec.featured !== undefined,
          featuredRank: spec.featured,
          inStock: active.length > 0,
          certificationLabs: labs,
          publishedAt,
          createdAt: publishedAt ? addHours(publishedAt, -48) : daysAgo(1),
          images: {
            create: spec.images.map((im, i) => ({ url: img(im.id), alt: im.alt, angle: im.angle, position: i })),
          },
        },
      });

      const createdVariants: SeededVariant[] = [];
      for (const v of variants) {
        const { snapshot, ...data } = v;
        const created = await prisma.productVariant.create({ data: { ...data, productId: product.id, sellerId: seller.id } });
        createdVariants.push({
          id: created.id,
          sku: created.sku,
          title: created.title,
          priceMinor: v.priceMinor,
          stock: v.stockQuantity,
          allowBackorder: v.allowBackorder,
          metalType: v.metalType,
          ringSize: v.ringSize,
          chainLengthMm: v.chainLengthMm,
          caratWeight: v.caratWeight,
          pricingSnapshot: snapshot,
        });
      }

      for (const c of spec.certificates ?? []) {
        await prisma.certificate.create({
          data: {
            productId: product.id,
            lab: c.lab,
            reportNumber: c.reportNumber,
            issuedAt: new Date(c.issuedAt),
            gemstone: c.gemstone,
            shape: c.shape,
            caratWeight: c.caratWeight,
            colorGrade: c.colorGrade,
            clarityGrade: c.clarityGrade,
            cutGrade: c.cutGrade,
            polish: c.polish,
            symmetry: c.symmetry,
            fluorescence: c.fluorescence,
            measurements: c.measurements,
            origin: c.origin,
            hallmarkPurity: c.hallmarkPurity,
            assayOffice: c.assayOffice,
            notes: c.notes,
            ...(c.pendingReviewDaysAgo === undefined
              ? { status: "VERIFIED" as const, verifiedAt: publishedAt ?? now() }
              : { status: "PENDING_REVIEW" as const, createdAt: daysAgo(c.pendingReviewDaysAgo, 4) }),
          },
        });
      }

      // Listing fee for sellers whose plan doesn't waive it.
      if (status === "ACTIVE" && s.plan === "atelier") {
        await prisma.ledgerEntry.create({
          data: {
            type: "LISTING_FEE",
            amountMinor: SETTINGS.listingFeeUsdMinor,
            currency: "USD",
            amountUsdMinor: SETTINGS.listingFeeUsdMinor,
            sellerId: seller.id,
            reference: product.id,
            description: `Listing fee · ${spec.title}`,
            occurredAt: publishedAt ?? now(),
          },
        });
      }

      products.push({
        id: product.id,
        slug: product.slug,
        title: product.title,
        sellerKey: s.key,
        sellerId: seller.id,
        currency: s.currency,
        categoryId: cat.id,
        categoryIds: [cat.id, cat.parentId].filter(Boolean) as string[],
        imageUrl: img(spec.images[0].id),
        variants: createdVariants,
        spec,
        status,
      });
    }
  }
}

// ── Orders ────────────────────────────────────────────────────────────────────

type OrderLine = {
  product: SeededProduct;
  variant?: SeededVariant;
  quantity?: number;
  ringSize?: number;
  engravingText?: string;
  engravingStyle?: EngravingStyle;
  listPriceOverrideMinor?: number;
  offerId?: string;
};

type CreatedSellerOrder = {
  id: string;
  sellerKey: string;
  status: FulfillmentStatus;
  deliveredAt: Date | null;
  totalMinor: number;
  currency: string;
  items: { id: string; productId: string; line: OrderLine }[];
};

const STAGE_ORDER: FulfillmentStatus[] = ["PENDING", "PROCESSING", "IN_PRODUCTION", "SHIPPED", "DELIVERED"];

function timeline(placedAt: Date, target: FulfillmentStatus, needsProduction: boolean, transitDays: number) {
  const cap = (d: Date) => (d.getTime() > Date.now() - 3_600_000 ? new Date(Date.now() - 3_600_000) : d);
  const t: Partial<Record<FulfillmentStatus, Date>> = { PENDING: placedAt };
  if (target === "CANCELLED") {
    t.CANCELLED = cap(addHours(placedAt, 20));
    return t;
  }
  const reach = target === "REFUNDED" ? "DELIVERED" : target;
  const idx = STAGE_ORDER.indexOf(reach);
  if (idx >= 1) t.PROCESSING = cap(addHours(placedAt, int(4, 18)));
  if (idx >= 2 && (needsProduction || reach === "IN_PRODUCTION")) t.IN_PRODUCTION = cap(addHours(t.PROCESSING!, int(10, 30)));
  if (idx >= 3) t.SHIPPED = cap(addHours(t.IN_PRODUCTION ?? t.PROCESSING!, needsProduction ? int(72, 200) : int(12, 40)));
  if (idx >= 4) t.DELIVERED = cap(addHours(t.SHIPPED!, transitDays * 24 + int(2, 10)));
  if (target === "REFUNDED") t.REFUNDED = cap(addHours(t.DELIVERED!, int(96, 240)));
  return t;
}

async function createOrder(opts: {
  buyer: SeededBuyer;
  lines: OrderLine[];
  placedAt: Date;
  status: FulfillmentStatus | Record<string, FulfillmentStatus>;
  method?: ShippingMethod;
}): Promise<{ orderId: string; orderNumber: string; sellerOrders: CreatedSellerOrder[] }> {
  const { buyer, placedAt } = opts;
  const orderCurrency = buyer.spec.currency;
  const groups = new Map<string, OrderLine[]>();
  for (const line of opts.lines) {
    line.variant ??= line.product.variants[0];
    const list = groups.get(line.product.sellerKey) ?? [];
    list.push(line);
    groups.set(line.product.sellerKey, list);
  }

  const orderNumber = formatOrderNumber(code(6));
  const computed = [...groups.entries()].map(([sellerKey, lines], index) => {
    const seller = sellers.get(sellerKey)!;
    const sc = seller.spec.currency;
    let itemsMinor = 0;
    let listSubtotal = 0;
    const priced = lines.map((line) => {
      const qty = line.quantity ?? 1;
      const listMinor = line.listPriceOverrideMinor ?? line.variant!.priceMinor;
      const unit = convertMinor(listMinor, sc, orderCurrency, FX, "display");
      const engravingFeeList = line.engravingText && line.product.spec.engraving?.fee ? major(line.product.spec.engraving.fee, sc) : 0;
      const engravingFee = engravingFeeList ? convertMinor(engravingFeeList, sc, orderCurrency, FX, "display") : 0;
      itemsMinor += unit * qty + engravingFee;
      listSubtotal += listMinor * qty + engravingFeeList;
      return { line, qty, listMinor, unit, engravingFee, total: unit * qty + engravingFee };
    });

    const zone = zoneFor(seller.spec.country, buyer.spec.country);
    const declaredUsd = usd(listSubtotal, sc);
    const eligible = eligibleRates(seller.rates, zone, declaredUsd, SETTINGS.secureCourierThresholdUsd).filter((r) => r.method !== "STORE_PICKUP");
    const fallback = seller.rates.find((r) => r.zone === zone) ?? seller.rates[0];
    const rate =
      (opts.method && eligible.find((r) => r.method === opts.method)) ||
      eligible.find((r) => r.method === "STANDARD_INSURED") ||
      eligible.find((r) => r.method === "EXPRESS_INSURED") ||
      eligible[0] ||
      fallback;
    const quote = quoteRate(rate, listSubtotal);
    const shippingMinor = convertMinor(quote.shippingMinor, sc, orderCurrency, FX, "display");
    const insuranceMinor = convertMinor(quote.insuranceMinor, sc, orderCurrency, FX, "display");
    const tax = estimateTax(buyer.spec.country, buyer.spec.address.region);
    const commissionBps = resolveCommissionBps({
      sellerId: seller.id,
      categoryIds: lines[0].product.categoryIds,
      planDiscountBps: seller.planDiscountBps,
      defaultBps: SETTINGS.defaultCommissionBps,
      rules: commissionRules,
    });
    const totals = computeSellerGroupTotals({
      itemsMinor,
      shippingMinor,
      insuranceMinor,
      taxRate: tax.rate,
      dutyRate: estimateDutyRate(seller.spec.country, buyer.spec.country),
      dutiesMode: "DDP",
      commissionBps,
    });
    const status = typeof opts.status === "string" ? opts.status : (opts.status[sellerKey] ?? "DELIVERED");
    const leadDays = (seller.spec.handlingDays ?? 2) + Math.max(...lines.map((l) => l.product.spec.productionDays ?? 0));
    const window = deliveryWindow(placedAt, leadDays, rate);
    return { seller, sellerKey, index, priced, rate, totals, declaredUsd, status, window, taxProvider: tax.label };
  });

  const orderTotals = sumTotals(computed.map((c) => c.totals));
  const anyActive = computed.some((c) => !["CANCELLED"].includes(c.status));
  const allDone = computed.every((c) => ["DELIVERED", "REFUNDED", "CANCELLED"].includes(c.status));
  const refunded = computed.filter((c) => c.status === "REFUNDED");

  const order = await prisma.order.create({
    data: {
      orderNumber,
      buyerId: buyer.id,
      status: !anyActive ? "CANCELLED" : allDone ? "COMPLETED" : "PLACED",
      paymentStatus: !anyActive ? "REFUNDED" : refunded.length === computed.length ? "REFUNDED" : refunded.length ? "PARTIALLY_REFUNDED" : "SUCCEEDED",
      currency: orderCurrency,
      ...orderTotals,
      email: buyer.spec.email,
      shippingAddress: buyer.address,
      billingAddress: buyer.address,
      taxProvider: "estimate",
      dutiesMode: "DDP",
      transferGroup: `tg_${orderNumber}`,
      fxSnapshot: { base: "USD", rates: FX },
      placedAt,
      cancelledAt: !anyActive ? addHours(placedAt, 20) : null,
      createdAt: placedAt,
      payments: {
        create: {
          provider: "DEMO",
          providerRef: `pi_demo_${code(14, "abcdefghijklmnopqrstuvwxyz0123456789")}`,
          chargeId: `ch_demo_${code(14, "abcdefghijklmnopqrstuvwxyz0123456789")}`,
          status: "SUCCEEDED",
          amountMinor: orderTotals.totalMinor,
          currency: orderCurrency,
          methodSummary: buyer.cardSummary,
          createdAt: placedAt,
        },
      },
    },
  });

  await prisma.ledgerEntry.createMany({
    data: [
      { type: "SALE", amountMinor: orderTotals.subtotalMinor, currency: orderCurrency, amountUsdMinor: usd(orderTotals.subtotalMinor, orderCurrency), orderId: order.id, reference: orderNumber, occurredAt: placedAt },
      { type: "TAX_COLLECTED", amountMinor: orderTotals.taxMinor, currency: orderCurrency, amountUsdMinor: usd(orderTotals.taxMinor, orderCurrency), orderId: order.id, reference: orderNumber, occurredAt: placedAt },
      ...(orderTotals.dutiesMinor
        ? [{ type: "DUTIES_COLLECTED" as const, amountMinor: orderTotals.dutiesMinor, currency: orderCurrency, amountUsdMinor: usd(orderTotals.dutiesMinor, orderCurrency), orderId: order.id, reference: orderNumber, occurredAt: placedAt }]
        : []),
    ],
  });

  const created: CreatedSellerOrder[] = [];
  for (const c of computed) {
    const needsProduction = c.priced.some((p) => p.line.product.spec.madeToOrder || p.line.engravingText || p.line.product.spec.sizing === "MADE_TO_SIZE");
    const t = timeline(placedAt, c.status, needsProduction, int(c.rate.minDays, c.rate.maxDays));
    const so = await prisma.sellerOrder.create({
      data: {
        orderId: order.id,
        sellerId: c.seller.id,
        reference: sellerOrderReference(orderNumber, c.index),
        status: c.status,
        currency: orderCurrency,
        subtotalMinor: c.totals.subtotalMinor,
        shippingMinor: c.totals.shippingMinor,
        insuranceMinor: c.totals.insuranceMinor,
        taxMinor: c.totals.taxMinor,
        dutiesMinor: c.totals.dutiesMinor,
        totalMinor: c.totals.totalMinor,
        commissionRateBps: c.totals.commissionRateBps,
        commissionMinor: c.totals.commissionMinor,
        sellerNetMinor: c.totals.sellerNetMinor,
        shippingMethod: c.rate.method,
        signatureRequired: true,
        insured: true,
        declaredValueMinor: c.totals.subtotalMinor,
        estimatedDeliveryFrom: c.window.from,
        estimatedDeliveryTo: c.window.to,
        processingAt: t.PROCESSING,
        productionStartedAt: t.IN_PRODUCTION,
        shippedAt: t.SHIPPED,
        deliveredAt: t.DELIVERED,
        cancelledAt: t.CANCELLED,
        refundedAt: t.REFUNDED,
        createdAt: placedAt,
      },
    });

    const statusNotes: Partial<Record<FulfillmentStatus, string>> = {
      PENDING: "Payment confirmed. Order sent to the jeweler.",
      PROCESSING: "The jeweler has accepted your order.",
      IN_PRODUCTION: "Sizing and finishing in the workshop.",
      SHIPPED: "Handed to the courier, insured and signature-tracked.",
      DELIVERED: "Delivered and signed for.",
      CANCELLED: "Cancelled before dispatch. Payment refunded in full.",
      REFUNDED: "Return received and refunded.",
    };
    for (const [status, at] of Object.entries(t) as [FulfillmentStatus, Date][]) {
      await prisma.orderStatusEvent.create({
        data: { sellerOrderId: so.id, status, note: statusNotes[status], actorType: status === "PENDING" ? "SYSTEM" : "SELLER", createdAt: at },
      });
    }

    const items: CreatedSellerOrder["items"] = [];
    for (const p of c.priced) {
      const v = p.line.variant!;
      const item = await prisma.orderItem.create({
        data: {
          orderId: order.id,
          sellerOrderId: so.id,
          productId: p.line.product.id,
          variantId: v.id,
          offerId: p.line.offerId,
          title: p.line.product.title,
          variantTitle: v.title,
          sku: v.sku,
          imageUrl: p.line.product.imageUrl,
          metalType: v.metalType,
          quantity: p.qty,
          unitPriceMinor: p.unit,
          listPriceMinor: p.listMinor,
          listCurrency: c.seller.spec.currency,
          engravingFeeMinor: p.engravingFee,
          totalMinor: p.total,
          ringSize: p.line.ringSize ?? v.ringSize,
          chainLengthMm: v.chainLengthMm,
          engravingText: p.line.engravingText,
          engravingStyle: p.line.engravingStyle,
          pricingSnapshot: v.pricingSnapshot ?? undefined,
          createdAt: placedAt,
        },
      });
      items.push({ id: item.id, productId: p.line.product.id, line: p.line });
    }

    // Shipment + carrier scans
    if (t.SHIPPED) {
      const carrier = c.rate.carrier ?? "OTHER";
      const tracking = trackingNumber(carrier);
      const delivered = !!t.DELIVERED;
      const shipment = await prisma.shipment.create({
        data: {
          sellerOrderId: so.id,
          direction: "OUTBOUND",
          carrier,
          service: c.rate.method === "SECURE_COURIER" ? "Hand-to-hand secure delivery" : c.rate.method === "EXPRESS_INSURED" ? "Priority · insured" : "Standard · insured",
          trackingNumber: tracking,
          status: delivered ? "DELIVERED" : "IN_TRANSIT",
          fromAddress: c.seller.returnAddress,
          toAddress: buyer.address,
          insuredValueMinor: c.totals.subtotalMinor,
          currency: orderCurrency,
          signatureRequired: true,
          weightGrams: int(180, 900),
          costMinor: c.totals.shippingMinor,
          estimatedDeliveryAt: c.window.to,
          shippedAt: t.SHIPPED,
          deliveredAt: t.DELIVERED,
          createdAt: addHours(t.SHIPPED, -2),
        },
      });
      const origin = `${c.seller.spec.city}, ${c.seller.spec.country}`;
      const hub = HUBS[buyer.spec.country] ?? "International hub";
      const scans: { status: ShipmentStatus; description: string; location: string; at: Date }[] = [
        { status: "LABEL_CREATED", description: "Shipping label created by the jeweler", location: origin, at: addHours(t.SHIPPED, -2) },
        { status: "IN_TRANSIT", description: "Picked up — insured, signature required", location: origin, at: t.SHIPPED },
        { status: "IN_TRANSIT", description: zoneFor(c.seller.spec.country, buyer.spec.country) === "DOMESTIC" ? "Arrived at sorting facility" : "Cleared customs — duties prepaid", location: hub, at: addHours(t.SHIPPED, 22) },
      ];
      if (delivered) {
        scans.push({ status: "OUT_FOR_DELIVERY", description: "Out for delivery", location: buyer.spec.address.city, at: addHours(t.DELIVERED!, -5) });
        scans.push({ status: "DELIVERED", description: `Delivered — signed for by ${buyer.spec.name.split(" ")[0].toUpperCase()}`, location: buyer.spec.address.city, at: t.DELIVERED! });
      }
      await prisma.shipmentEvent.createMany({
        data: scans.filter((s) => s.at.getTime() <= Date.now()).map((s) => ({ shipmentId: shipment.id, status: s.status, description: s.description, location: s.location, occurredAt: s.at })),
      });
    }

    // Escrow payout
    const inspectionEnds = t.DELIVERED ? addHours(t.DELIVERED, SETTINGS.inspectionWindowDays * 24) : null;
    const payoutStatus =
      c.status === "CANCELLED" ? "CANCELLED" : c.status === "REFUNDED" ? "REVERSED" : inspectionEnds && inspectionEnds.getTime() < Date.now() ? "RELEASED" : "PENDING";
    await prisma.payout.create({
      data: {
        sellerId: c.seller.id,
        sellerOrderId: so.id,
        amountMinor: c.totals.sellerNetMinor,
        currency: orderCurrency,
        status: payoutStatus,
        releaseAfter: inspectionEnds,
        providerTransferId: payoutStatus === "RELEASED" || payoutStatus === "REVERSED" ? `tr_demo_${code(14, "abcdefghijklmnopqrstuvwxyz0123456789")}` : null,
        releasedAt: payoutStatus === "RELEASED" || payoutStatus === "REVERSED" ? inspectionEnds : null,
        createdAt: placedAt,
      },
    });

    const ledger: Prisma.LedgerEntryCreateManyInput[] = [];
    if (c.status !== "CANCELLED") {
      ledger.push({ type: "COMMISSION", amountMinor: c.totals.commissionMinor, currency: orderCurrency, amountUsdMinor: usd(c.totals.commissionMinor, orderCurrency), sellerId: c.seller.id, orderId: order.id, sellerOrderId: so.id, reference: so.reference, occurredAt: placedAt });
    }
    if (payoutStatus === "RELEASED") {
      ledger.push({ type: "PAYOUT", amountMinor: c.totals.sellerNetMinor, currency: orderCurrency, amountUsdMinor: usd(c.totals.sellerNetMinor, orderCurrency), sellerId: c.seller.id, orderId: order.id, sellerOrderId: so.id, reference: so.reference, occurredAt: inspectionEnds! });
    }
    if (c.status === "CANCELLED" || c.status === "REFUNDED") {
      const at = t.REFUNDED ?? t.CANCELLED ?? placedAt;
      ledger.push({ type: "REFUND", amountMinor: c.totals.totalMinor, currency: orderCurrency, amountUsdMinor: usd(c.totals.totalMinor, orderCurrency), sellerId: c.seller.id, orderId: order.id, sellerOrderId: so.id, reference: so.reference, occurredAt: at });
      if (c.status === "REFUNDED") {
        ledger.push({ type: "COMMISSION_REVERSAL", amountMinor: c.totals.commissionMinor, currency: orderCurrency, amountUsdMinor: usd(c.totals.commissionMinor, orderCurrency), sellerId: c.seller.id, orderId: order.id, sellerOrderId: so.id, reference: so.reference, occurredAt: at });
      }
      await prisma.refund.create({
        data: {
          orderId: order.id,
          sellerOrderId: so.id,
          amountMinor: c.totals.totalMinor,
          currency: orderCurrency,
          reason: c.status === "CANCELLED" ? "Cancelled before dispatch" : "Return received",
          status: "SUCCEEDED",
          initiatedBy: c.status === "CANCELLED" ? "BUYER" : "SELLER",
          providerRefundId: `re_demo_${code(14, "abcdefghijklmnopqrstuvwxyz0123456789")}`,
          createdAt: at,
        },
      });
    }
    if (ledger.length) await prisma.ledgerEntry.createMany({ data: ledger });

    created.push({ id: so.id, sellerKey: c.sellerKey, status: c.status, deliveredAt: t.DELIVERED ?? null, totalMinor: c.totals.totalMinor, currency: orderCurrency, items });
  }

  return { orderId: order.id, orderNumber, sellerOrders: created };
}

async function addWarrantyAndReview(buyer: SeededBuyer, so: CreatedSellerOrder, opts: { review?: boolean | 3 | 4 | 5; photo?: string } = {}) {
  if (so.status !== "DELIVERED" || !so.deliveredAt) return;
  for (const item of so.items) {
    const product = products.find((p) => p.id === item.productId)!;
    const months = product.spec.warrantyMonths ?? 12;
    const endsAt = new Date(so.deliveredAt);
    endsAt.setMonth(endsAt.getMonth() + months);
    await prisma.warranty.create({
      data: {
        warrantyNumber: `WR-${code(7)}`,
        orderItemId: item.id,
        buyerId: buyer.id,
        sellerId: product.sellerId,
        coverage: `${months}-month warranty against manufacturing defects, including stone settings, clasps and solder joints. Excludes loss, theft and accidental damage.`,
        startsAt: so.deliveredAt,
        endsAt,
        isTransferable: months >= 24,
      },
    });

    const want = opts.review ?? chance(0.62);
    if (!want) continue;
    const rating = typeof want === "number" ? want : random() < 0.72 ? 5 : random() < 0.85 ? 4 : 3;
    const snippet = pick(REVIEW_SNIPPETS[rating as 3 | 4 | 5]);
    await prisma.review.create({
      data: {
        productId: product.id,
        sellerId: product.sellerId,
        authorId: buyer.id,
        orderItemId: item.id,
        rating,
        title: snippet.title,
        body: snippet.body,
        photoUrls: opts.photo ? [opts.photo] : chance(0.18) ? [product.imageUrl] : [],
        isVerifiedPurchase: true,
        sellerReply: rating <= 4 && chance(0.8) ? "Thank you for taking the time to write this — we're always here if anything needs adjusting." : chance(0.25) ? "Thank you — it was a pleasure making this for you." : null,
        sellerRepliedAt: addHours(so.deliveredAt, int(30, 120)),
        helpfulCount: int(0, 14),
        createdAt: addHours(so.deliveredAt, int(24, 400)),
      },
    });
  }
}

function statusForAge(ageDays: number, madeToOrder: boolean): FulfillmentStatus {
  if (ageDays < 1) return "PENDING";
  if (ageDays < 3) return madeToOrder ? "IN_PRODUCTION" : "PROCESSING";
  if (ageDays < 7) return madeToOrder ? "IN_PRODUCTION" : "SHIPPED";
  if (ageDays < 12) return chance(0.5) ? "SHIPPED" : "DELIVERED";
  const r = random();
  return r < 0.04 ? "CANCELLED" : r < 0.07 ? "REFUNDED" : "DELIVERED";
}

async function seedHistoricalOrders() {
  const shoppers = [...buyers.values()].filter((b) => b.spec.key !== "olivia");
  const pool = products.filter((p) => p.status === "ACTIVE" && !p.spec.oneOfAKind && p.variants.some((v) => v.stock > 1 || v.allowBackorder));
  const weights = pool.map((p) => (p.spec.featured ? 3 : 1) * (p.variants[0].priceMinor > 5_000_000 ? 0.4 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  const weightedPick = () => {
    let r = random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  };

  for (let i = 0; i < 84; i++) {
    const ageDays = Math.pow(random(), 1.35) * 175;
    const buyer = pick(shoppers);
    const first = weightedPick();
    const lines: OrderLine[] = [{ product: first, variant: pick(first.variants.filter((v) => v.stock > 0 || v.allowBackorder)) }];
    if (chance(0.3)) {
      const second = weightedPick();
      if (second.id !== first.id) lines.push({ product: second, variant: pick(second.variants.filter((v) => v.stock > 0 || v.allowBackorder)) });
    }
    for (const l of lines) if (l.product.spec.sizing === "MADE_TO_SIZE") l.ringSize = pick([5, 5.5, 6, 6.5, 7, 7.5]);
    const madeToOrder = lines.some((l) => l.product.spec.madeToOrder);
    const result = await createOrder({ buyer, lines, placedAt: daysAgo(ageDays), status: statusForAge(ageDays, madeToOrder) });
    for (const so of result.sellerOrders) await addWarrantyAndReview(buyer, so);
  }
}

async function seedSoldArchive() {
  // One-of-a-kind pieces that have already sold: gives vintage dealers a
  // reviewed sales history and powers "Recently sold" on storefronts.
  const shoppers = [...buyers.values()].filter((b) => b.spec.key !== "olivia");
  for (const p of products.filter((x) => x.status === "SOLD")) {
    const buyer = pick(shoppers);
    const result = await createOrder({ buyer, lines: [{ product: p }], placedAt: daysAgo(int(35, 170)), status: "DELIVERED" });
    await addWarrantyAndReview(buyer, result.sellerOrders[0], { review: 5 });
  }
}

// ── Curated demo journeys ─────────────────────────────────────────────────────

async function notify(userId: string, type: Prisma.NotificationCreateInput["type"], title: string, body: string, href: string, at: Date, read = false) {
  await prisma.notification.create({ data: { userId, type, title, body, href, createdAt: at, readAt: read ? addHours(at, 2) : null } });
}

async function conversation(opts: {
  type: Prisma.ConversationCreateInput["type"];
  subject: string;
  sellerKey: string;
  buyer: SeededBuyer;
  productId?: string;
  sellerOrderId?: string;
  offerId?: string;
  customRequestId?: string;
  disputeId?: string;
  includeAdmin?: boolean;
  messages: { from: "buyer" | "seller" | "admin" | "system"; body: string; at: Date }[];
}) {
  const seller = sellers.get(opts.sellerKey)!;
  const last = opts.messages[opts.messages.length - 1]?.at ?? now();
  const convo = await prisma.conversation.create({
    data: {
      type: opts.type,
      subject: opts.subject,
      sellerId: seller.id,
      productId: opts.productId,
      sellerOrderId: opts.sellerOrderId,
      offerId: opts.offerId,
      customRequestId: opts.customRequestId,
      disputeId: opts.disputeId,
      lastMessageAt: last,
      createdAt: opts.messages[0]?.at ?? now(),
      participants: {
        create: [
          { userId: opts.buyer.id, role: "BUYER", lastReadAt: opts.messages.at(-1)?.from === "buyer" ? last : addHours(last, -1) },
          { userId: seller.userId, role: "SELLER", lastReadAt: opts.messages.at(-1)?.from === "seller" ? last : addHours(last, -1) },
          ...(opts.includeAdmin ? [{ userId: adminIds[0], role: "ADMIN" as const, lastReadAt: last }] : []),
        ],
      },
    },
  });
  for (const m of opts.messages) {
    await prisma.message.create({
      data: {
        conversationId: convo.id,
        senderId: m.from === "buyer" ? opts.buyer.id : m.from === "seller" ? seller.userId : m.from === "admin" ? adminIds[0] : null,
        body: m.body,
        isSystem: m.from === "system",
        createdAt: m.at,
      },
    });
  }
  return convo;
}

async function seedDemoBuyer() {
  const olivia = buyers.get("olivia")!;

  // A · delivered multi-vendor order (review + warranty)
  const pendant = productByTitle("Open Heart Diamond Pendant");
  const huggies = productByTitle("Petite Gold Huggies");
  const a = await createOrder({
    buyer: olivia,
    lines: [{ product: pendant, variant: pendant.variants[1] }, { product: huggies, variant: huggies.variants[0] }],
    placedAt: daysAgo(41),
    status: "DELIVERED",
  });
  await addWarrantyAndReview(olivia, a.sellerOrders[0], { review: 5, photo: "https://images.unsplash.com/photo-1616294208582-c2a6d73b467b" });
  await addWarrantyAndReview(olivia, a.sellerOrders[1], { review: 5 });

  // B · international order in transit (duties prepaid)
  const studs = productByTitle("Round Diamond Studs");
  const b = await createOrder({ buyer: olivia, lines: [{ product: studs, variant: studs.variants[1] }], placedAt: daysAgo(4), status: "SHIPPED", method: "EXPRESS_INSURED" });

  // C · split fulfilment: signet in production, bracelet shipped
  const signet = productByTitle("Hand-Engraved Florentine Signet");
  const bracelet = productByTitle("Rose Gold Link Bracelet");
  const c = await createOrder({
    buyer: olivia,
    lines: [
      { product: signet, ringSize: 7, engravingText: "OAC", engravingStyle: "SCRIPT" },
      { product: bracelet },
    ],
    placedAt: daysAgo(6),
    status: { oro: "IN_PRODUCTION", marlowe: "SHIPPED" },
  });

  // D · older order, now in for resizing under warranty
  const heart = productByTitle("Heart Pavé Stacking Ring");
  const d = await createOrder({ buyer: olivia, lines: [{ product: heart, variant: heart.variants[1] }], placedAt: daysAgo(128), status: "DELIVERED" });
  await addWarrantyAndReview(olivia, d.sellerOrders[0], { review: 4 });

  const kaia = sellers.get("kaia")!;
  const heartItem = d.sellerOrders[0].items[0];
  const warranty = await prisma.warranty.findUnique({ where: { orderItemId: heartItem.id } });
  const service = await prisma.serviceRequest.create({
    data: {
      ticketNumber: `SR-${code(6)}`,
      buyerId: olivia.id,
      sellerId: kaia.id,
      orderItemId: heartItem.id,
      warrantyId: warranty?.id,
      type: "RESIZING",
      description: "The ring has become a little loose — could it be sized up from 6 to 6½? The pavé heart should stay centred.",
      status: "IN_PROGRESS",
      coveredByWarranty: true,
      createdAt: daysAgo(10),
    },
  });
  const serviceSteps: [Prisma.ServiceEventCreateManyInput["status"], string, number, "BUYER" | "SELLER"][] = [
    ["REQUESTED", "Resizing requested from 6 to 6½.", 10, "BUYER"],
    ["APPROVED", "Covered under your warranty — no charge. A prepaid insured label has been emailed.", 9, "SELLER"],
    ["AWAITING_ITEM", "Waiting for the ring to arrive at the studio.", 9, "SELLER"],
    ["RECEIVED", "Ring received and inspected. Pavé all secure.", 4, "SELLER"],
    ["IN_PROGRESS", "Sizing up to 6½ and re-polishing.", 3, "SELLER"],
  ];
  for (const [status, note, ago, actor] of serviceSteps) {
    await prisma.serviceEvent.create({ data: { serviceRequestId: service.id, status, note, actorType: actor, createdAt: daysAgo(ago) } });
  }

  // Offers
  const pink = productByTitle("Pink Sapphire & Diamond Halo Ring");
  const marlowe = sellers.get("marlowe")!;
  const countered = await prisma.offer.create({
    data: {
      productId: pink.id,
      variantId: pink.variants[0].id,
      buyerId: olivia.id,
      sellerId: marlowe.id,
      status: "COUNTERED",
      currency: "USD",
      listPriceMinor: pink.variants[0].priceMinor,
      currentAmountMinor: 735000,
      lastActor: "SELLER",
      expiresAt: daysFromNow(1.4),
      createdAt: daysAgo(1, 6),
      events: {
        create: [
          { actor: "BUYER", actorId: olivia.id, action: "OFFER", amountMinor: 690000, message: "I love this ring — would you consider $6,900?", createdAt: daysAgo(1, 6) },
          { actor: "SELLER", actorId: marlowe.userId, action: "COUNTER", amountMinor: 735000, message: "Unheated Madagascan pinks this clean are rare — we can do $7,350 and resize it at no charge.", createdAt: daysAgo(0, 20) },
        ],
      },
    },
  });
  await conversation({
    type: "OFFER",
    subject: "Offer · Pink Sapphire & Diamond Halo Ring",
    sellerKey: "marlowe",
    buyer: olivia,
    productId: pink.id,
    offerId: countered.id,
    messages: [
      { from: "system", body: "Olivia offered $6,900 on Pink Sapphire & Diamond Halo Ring.", at: daysAgo(1, 6) },
      { from: "buyer", body: "I love this ring — would you consider $6,900?", at: daysAgo(1, 6) },
      { from: "system", body: "Marlowe Fine Jewelry countered at $7,350.", at: daysAgo(0, 20) },
      { from: "seller", body: "Unheated Madagascan pinks this clean are rare — we can do $7,350 and resize it at no charge.", at: daysAgo(0, 20) },
    ],
  });

  const victorian = productByTitle("Victorian Rose-Cut Cluster Ring, c. 1880");
  const hollis = sellers.get("hollis")!;
  const accepted = await prisma.offer.create({
    data: {
      productId: victorian.id,
      variantId: victorian.variants[0].id,
      buyerId: olivia.id,
      sellerId: hollis.id,
      status: "ACCEPTED",
      currency: "GBP",
      listPriceMinor: victorian.variants[0].priceMinor,
      currentAmountMinor: 620000,
      acceptedAmountMinor: 620000,
      lastActor: "SELLER",
      expiresAt: daysFromNow(1.5),
      acceptedAt: daysAgo(0, 12),
      purchaseDeadline: daysFromNow(1.5),
      createdAt: daysAgo(2),
      events: {
        create: [
          { actor: "BUYER", actorId: olivia.id, action: "OFFER", amountMinor: 620000, message: "Would you accept £6,200? I'd like it sized to 7.", createdAt: daysAgo(2) },
          { actor: "SELLER", actorId: hollis.userId, action: "ACCEPT", amountMinor: 620000, message: "Accepted — and we'll size it to 7 before it ships.", createdAt: daysAgo(0, 12) },
        ],
      },
    },
  });

  const cushionSet = productByTitle("Cushion Halo Engagement Set");
  await prisma.offer.create({
    data: {
      productId: cushionSet.id,
      variantId: cushionSet.variants[0].id,
      buyerId: olivia.id,
      sellerId: sellers.get("solene")!.id,
      status: "DECLINED",
      currency: "EUR",
      listPriceMinor: cushionSet.variants[0].priceMinor,
      currentAmountMinor: 1100000,
      lastActor: "SYSTEM",
      expiresAt: daysAgo(18),
      createdAt: daysAgo(20),
      events: {
        create: [
          { actor: "BUYER", actorId: olivia.id, action: "OFFER", amountMinor: 1100000, createdAt: daysAgo(20) },
          { actor: "SYSTEM", action: "DECLINE", message: "Below the jeweler's minimum offer.", createdAt: daysAgo(20) },
        ],
      },
    },
  });

  // Cart: the accepted-offer ring plus a pair of hoops
  const hoops = productByTitle("Twisted Gold Hoops");
  await prisma.cart.create({
    data: {
      userId: olivia.id,
      items: {
        create: [
          { productId: victorian.id, variantId: victorian.variants[0].id, ringSize: 7, offerId: accepted.id },
          { productId: hoops.id, variantId: hoops.variants[1].id },
        ],
      },
    },
  });

  // Wishlist & favourite stores
  const wish = [
    "Emerald-Cut Solitaire on Pavé Band",
    "Colombian Emerald Halo Pendant",
    "Akoya Pearl Strand, 7.5–8 mm",
    "Serpent Coil Bracelet",
    "Diamond Eternity Band, 2 ctw",
    "Belle Époque Pearl & Diamond Parure",
  ];
  for (const [i, title] of wish.entries()) {
    await prisma.wishlistItem.create({ data: { userId: olivia.id, productId: productByTitle(title).id, notifyOnPriceDrop: i < 2, createdAt: daysAgo(30 - i * 4) } });
  }
  for (const key of ["solene", "hollis", "kaia"]) {
    await prisma.favoriteStore.create({ data: { userId: olivia.id, sellerId: sellers.get(key)!.id, createdAt: daysAgo(int(10, 90)) } });
  }

  // Custom request with two quotes
  const rings = categoryIds.get("rings")!.id;
  const request = await prisma.customRequest.create({
    data: {
      reference: `CR-${code(6)}`,
      buyerId: olivia.id,
      categoryId: rings,
      title: "Recreate my grandmother's sapphire ring",
      description:
        "My grandmother had an oval sapphire (about 1.5 ct) flanked by two small old-cut diamonds on a thin platinum band. The original was lost — I have two photos. I'd love it recreated as closely as possible, size 6½.",
      budgetMinMinor: 500000,
      budgetMaxMinor: 800000,
      currency: "USD",
      metalPreference: "PLATINUM",
      gemstonePreference: "SAPPHIRE",
      ringSize: 6.5,
      neededBy: daysFromNow(75),
      referenceImageUrls: ["https://images.unsplash.com/photo-1535632066927-ab7c9ab60908"],
      status: "QUOTED",
      createdAt: daysAgo(8),
    },
  });
  const solene = sellers.get("solene")!;
  const oro = sellers.get("oro")!;
  await prisma.customRequestQuote.createMany({
    data: [
      { customRequestId: request.id, sellerId: solene.id, amountMinor: 640000, currency: "EUR", depositPercent: 30, leadTimeDays: 35, message: "We have a 1.52 ct unheated Ceylon oval that matches your photos closely, and period old-cut diamonds for the shoulders. We'd build the band in platinum by hand. A 30% deposit secures the stone.", status: "PENDING", validUntil: daysFromNow(14), createdAt: daysAgo(6) },
      { customRequestId: request.id, sellerId: oro.id, amountMinor: 490000, currency: "EUR", depositPercent: 25, leadTimeDays: 28, message: "I can source a 1.4–1.6 ct sapphire from my Bangkok cutter and hand-fabricate the band. I'll send three stone options with videos before you commit.", status: "PENDING", validUntil: daysFromNow(10), createdAt: daysAgo(5) },
    ],
  });
  await conversation({
    type: "CUSTOM_REQUEST",
    subject: "Custom request · Grandmother's sapphire ring",
    sellerKey: "solene",
    buyer: olivia,
    customRequestId: request.id,
    messages: [
      { from: "seller", body: "Thank you for sharing the photos — the band looks like a 1950s knife-edge. I've sent a quote with a stone I think you'll love.", at: daysAgo(6) },
      { from: "buyer", body: "That's so thoughtful. Could you send a video of the sapphire in daylight?", at: daysAgo(5, 20) },
      { from: "seller", body: "Of course — filming it by the window this afternoon.", at: daysAgo(5, 18) },
    ],
  });

  // Conversations with jewelers
  const solitaire = productByTitle("Emerald-Cut Solitaire on Pavé Band");
  await conversation({
    type: "PRODUCT_INQUIRY",
    subject: "Emerald-Cut Solitaire on Pavé Band",
    sellerKey: "solene",
    buyer: olivia,
    productId: solitaire.id,
    messages: [
      { from: "buyer", body: "Hello! Is the GIA report number laser-inscribed on the girdle of the 1.51 ct stone? And could the band be made 2 mm rather than 1.8?", at: daysAgo(3, 5) },
      { from: "seller", body: "Bonjour Olivia — yes, the inscription matches report 2215837461 and we'll send a macro photo. A 2 mm band is no problem at no extra cost.", at: daysAgo(3, 4) },
      { from: "buyer", body: "Perfect, thank you. I'm deciding between yellow gold and platinum.", at: daysAgo(3, 2) },
    ],
  });
  await conversation({
    type: "ORDER",
    subject: `Order ${c.orderNumber} · Florentine signet`,
    sellerKey: "oro",
    buyer: olivia,
    sellerOrderId: c.sellerOrders.find((s) => s.sellerKey === "oro")!.id,
    messages: [
      { from: "seller", body: "Ciao Olivia — before I start engraving, here is a sketch of 'OAC' in the script style. Should the A be the largest initial, as is traditional?", at: daysAgo(4) },
      { from: "buyer", body: "Yes please, traditional order with the A in the centre. It's beautiful!", at: daysAgo(3, 20) },
      { from: "seller", body: "Wonderful. The ring goes to the bench tomorrow; I'll send photos before it ships.", at: daysAgo(3, 18) },
    ],
  });

  // Notifications
  await notify(olivia.id, "OFFER", "Marlowe countered your offer", "Pink Sapphire & Diamond Halo Ring · $7,350", "/account/offers", daysAgo(0, 20));
  await notify(olivia.id, "OFFER", "Offer accepted — check out within 48 hours", "Victorian Rose-Cut Cluster Ring · £6,200", "/cart", daysAgo(0, 12));
  await notify(olivia.id, "ORDER", "Your order has shipped", `${b.orderNumber} · Round Diamond Studs`, `/account/orders/${b.orderNumber}`, daysAgo(2), true);
  await notify(olivia.id, "CUSTOM_REQUEST", "New quote for your custom request", "Atelier Solène · €6,400 · 35 days", "/account/custom-requests", daysAgo(6), true);
  await notify(olivia.id, "SERVICE", "Your ring is in the workshop", "Heart Pavé Stacking Ring · resizing to 6½", "/account/warranty", daysAgo(3));
  await notify(solene.userId, "MESSAGE", "New question from Olivia Carter", "Emerald-Cut Solitaire on Pavé Band", "/seller/messages", daysAgo(3, 2));
  await notify(solene.userId, "ORDER", "New order to fulfil", `${b.orderNumber} · Round Diamond Studs`, "/seller/orders", daysAgo(4), true);
}

async function seedDisputesAndReturns() {
  const hannah = buyers.get("hannah")!;
  const daniel = buyers.get("daniel")!;
  const sofia = buyers.get("sofia")!;
  const marcus = buyers.get("marcus")!;
  const emma = buyers.get("emma")!;
  const chloe = buyers.get("chloe")!;
  const [adminA, adminB] = adminIds;

  // 1 · Awaiting seller: vintage clip earrings not as described
  const clips = productByTitle("1980s Gold & Pearl Clip Earrings");
  const o1 = await createOrder({ buyer: hannah, lines: [{ product: clips }], placedAt: daysAgo(9), status: "DELIVERED" });
  await prisma.product.update({ where: { id: clips.id }, data: { status: "SOLD", inStock: false, variants: { updateMany: { where: {}, data: { stockQuantity: 0 } } } } });
  clips.status = "SOLD";
  const so1 = o1.sellerOrders[0];
  const d1 = await prisma.dispute.create({
    data: {
      caseNumber: `DSP-${code(6)}`,
      orderId: o1.orderId,
      sellerOrderId: so1.id,
      sellerId: sellers.get("hollis")!.id,
      openedById: hannah.id,
      reason: "NOT_AS_DESCRIBED",
      description: "One of the clip mechanisms doesn't close and the pearl on the left earring has a chip that isn't mentioned or visible in the listing photos.",
      evidenceUrls: ["https://images.unsplash.com/photo-1778182530965-b7dd00070c17"],
      status: "AWAITING_SELLER",
      priority: "NORMAL",
      claimAmountMinor: so1.totalMinor,
      currency: so1.currency,
      sellerResponseDueAt: daysFromNow(2),
      createdAt: daysAgo(1, 4),
    },
  });
  await prisma.payout.update({ where: { sellerOrderId: so1.id }, data: { status: "ON_HOLD", holdReason: `Dispute ${d1.caseNumber} open` } });
  await conversation({
    type: "DISPUTE",
    subject: `Dispute ${d1.caseNumber}`,
    sellerKey: "hollis",
    buyer: hannah,
    disputeId: d1.id,
    includeAdmin: true,
    messages: [
      { from: "system", body: "Hannah opened a dispute: Item not as described. Hollis & Rowe has 72 hours to respond.", at: daysAgo(1, 4) },
      { from: "buyer", body: "The left clip won't stay closed and there's a chip on the pearl. I'd be happy with a repair or a partial refund.", at: daysAgo(1, 4) },
    ],
  });

  // 2 · Under review (high priority): authenticity concern, assigned to an admin
  const drop = productByTitle("Cushion Diamond Drop Pendant");
  const o2 = await createOrder({ buyer: daniel, lines: [{ product: drop }], placedAt: daysAgo(16), status: "DELIVERED" });
  const so2 = o2.sellerOrders[0];
  const d2 = await prisma.dispute.create({
    data: {
      caseNumber: `DSP-${code(6)}`,
      orderId: o2.orderId,
      sellerOrderId: so2.id,
      sellerId: sellers.get("marlowe")!.id,
      openedById: daniel.id,
      assignedAdminId: adminA,
      reason: "AUTHENTICITY",
      description: "My jeweler couldn't find a laser inscription on the girdle matching GIA 6214573820. I need confirmation this is the certified stone before the inspection window closes.",
      evidenceUrls: [],
      status: "UNDER_REVIEW",
      priority: "HIGH",
      claimAmountMinor: so2.totalMinor,
      currency: so2.currency,
      internalNotes: "Seller supplied macro photos showing inscription under 40×. Requested independent GIA report check via their Report Check service — awaiting confirmation.",
      createdAt: daysAgo(5),
    },
  });
  await prisma.payout.update({ where: { sellerOrderId: so2.id }, data: { status: "ON_HOLD", holdReason: `Dispute ${d2.caseNumber} under review` } });
  await conversation({
    type: "DISPUTE",
    subject: `Dispute ${d2.caseNumber}`,
    sellerKey: "marlowe",
    buyer: daniel,
    disputeId: d2.id,
    includeAdmin: true,
    messages: [
      { from: "system", body: "Daniel opened a dispute: Authenticity concern. Funds for this order are on hold.", at: daysAgo(5) },
      { from: "buyer", body: "My local jeweler couldn't locate an inscription. I'd like the stone verified.", at: daysAgo(5) },
      { from: "seller", body: "The inscription is very fine (0.03 mm) and sits near a bezel prong. Macro photos at 40× attached — it reads GIA 6214573820. Happy to cover an independent check.", at: daysAgo(4, 10) },
      { from: "admin", body: "Thank you both. Loupe's gemmology team is reviewing the photos and cross-checking with GIA Report Check. We'll update this case within 48 hours; funds remain held meanwhile.", at: daysAgo(3, 22) },
    ],
  });

  // 3 · Resolved with a forced partial refund
  const chunky = productByTitle("Chunky Gold Hoops");
  const o3 = await createOrder({ buyer: sofia, lines: [{ product: chunky }], placedAt: daysAgo(34), status: "DELIVERED" });
  const so3 = o3.sellerOrders[0];
  const partial = Math.round(so3.totalMinor * 0.18);
  const d3 = await prisma.dispute.create({
    data: {
      caseNumber: `DSP-${code(6)}`,
      orderId: o3.orderId,
      sellerOrderId: so3.id,
      sellerId: sellers.get("oro")!.id,
      openedById: sofia.id,
      assignedAdminId: adminB,
      reason: "DAMAGED_IN_TRANSIT",
      description: "One hoop arrived with a small dent near the hinge.",
      evidenceUrls: ["https://images.unsplash.com/photo-1708220040824-b273dd0a17cc"],
      status: "RESOLVED",
      priority: "LOW",
      claimAmountMinor: partial,
      currency: so3.currency,
      resolution: "PARTIAL_REFUND",
      resolutionNotes: "Courier damage confirmed from packaging photos. Buyer chose to keep the hoops; partial refund issued and recovered from the carrier's insurance claim.",
      refundAmountMinor: partial,
      resolvedAt: daysAgo(22),
      createdAt: daysAgo(26),
    },
  });
  await prisma.refund.create({
    data: {
      orderId: o3.orderId,
      sellerOrderId: so3.id,
      disputeId: d3.id,
      amountMinor: partial,
      currency: so3.currency,
      reason: "Dispute resolution — damaged in transit",
      status: "SUCCEEDED",
      initiatedBy: "ADMIN",
      initiatedById: adminB,
      isForced: true,
      reverseTransfer: false,
      providerRefundId: `re_demo_${code(12, "abcdefghijklmnopqrstuvwxyz0123456789")}`,
      createdAt: daysAgo(22),
    },
  });
  await prisma.ledgerEntry.create({
    data: { type: "REFUND", amountMinor: partial, currency: so3.currency, amountUsdMinor: usd(partial, so3.currency), sellerId: sellers.get("oro")!.id, orderId: o3.orderId, sellerOrderId: so3.id, reference: d3.caseNumber, occurredAt: daysAgo(22) },
  });
  await prisma.order.update({ where: { id: o3.orderId }, data: { paymentStatus: "PARTIALLY_REFUNDED" } });
  await prisma.auditLog.create({
    data: { actorId: adminB, action: "dispute.force_refund", entityType: "Dispute", entityId: d3.id, metadata: { amountMinor: partial, currency: so3.currency }, createdAt: daysAgo(22) },
  });

  // Returns — always routed to the jeweler's own return address
  const faces = productByTitle("Sculpted Face Drop Earrings");
  const r1 = await createOrder({ buyer: marcus, lines: [{ product: faces }], placedAt: daysAgo(11), status: "DELIVERED" });
  await prisma.returnRequest.create({
    data: {
      rmaNumber: `RMA-${code(6)}`,
      sellerOrderId: r1.sellerOrders[0].id,
      buyerId: marcus.id,
      sellerId: sellers.get("kaia")!.id,
      reason: "CHANGED_MIND",
      details: "They're lovely but a little larger than I expected for everyday wear.",
      status: "REQUESTED",
      returnToAddress: sellers.get("kaia")!.returnAddress,
      refundAmountMinor: r1.sellerOrders[0].totalMinor,
      createdAt: daysAgo(0, 7),
      items: { create: [{ orderItemId: r1.sellerOrders[0].items[0].id, quantity: 1 }] },
    },
  });

  const station = productByTitle("Diamond Station Necklace");
  const r2 = await createOrder({ buyer: emma, lines: [{ product: station, variant: station.variants[0] }], placedAt: daysAgo(15), status: "DELIVERED" });
  const solene = sellers.get("solene")!;
  const rma2 = await prisma.returnRequest.create({
    data: {
      rmaNumber: `RMA-${code(6)}`,
      sellerOrderId: r2.sellerOrders[0].id,
      buyerId: emma.id,
      sellerId: solene.id,
      reason: "WRONG_SIZE",
      details: "The 16-inch length sits too high — I'd like to return it and reorder the 18-inch.",
      status: "LABEL_ISSUED",
      returnToAddress: solene.returnAddress,
      refundAmountMinor: r2.sellerOrders[0].totalMinor,
      sellerResponse: "Of course — a prepaid insured label to our boutique is attached. We'll refund as soon as it's inspected.",
      approvedAt: daysAgo(2),
      createdAt: daysAgo(3),
      items: { create: [{ orderItemId: r2.sellerOrders[0].items[0].id, quantity: 1 }] },
    },
  });
  await prisma.shipment.create({
    data: {
      returnRequestId: rma2.id,
      direction: "RETURN",
      carrier: "DHL",
      service: "Return · insured",
      trackingNumber: trackingNumber("DHL"),
      status: "LABEL_CREATED",
      fromAddress: emma.address,
      toAddress: solene.returnAddress,
      insuredValueMinor: r2.sellerOrders[0].totalMinor,
      currency: r2.sellerOrders[0].currency,
      signatureRequired: true,
      createdAt: daysAgo(2),
      events: { create: [{ status: "LABEL_CREATED", description: "Return label issued — routed to Atelier Solène, Paris", location: "Lyon, FR", occurredAt: daysAgo(2) }] },
    },
  });

  const clasp = productByTitle("Pearl Strand with Diamond Clasp");
  const r3 = await createOrder({ buyer: chloe, lines: [{ product: clasp }], placedAt: daysAgo(48), status: "REFUNDED" });
  await prisma.returnRequest.create({
    data: {
      rmaNumber: `RMA-${code(6)}`,
      sellerOrderId: r3.sellerOrders[0].id,
      buyerId: chloe.id,
      sellerId: sellers.get("tidewater")!.id,
      reason: "NOT_AS_DESCRIBED",
      details: "The overtone is much more cream than rosé.",
      status: "REFUNDED",
      returnToAddress: sellers.get("tidewater")!.returnAddress,
      refundAmountMinor: r3.sellerOrders[0].totalMinor,
      approvedAt: daysAgo(36),
      receivedAt: daysAgo(31),
      refundedAt: daysAgo(30),
      createdAt: daysAgo(37),
      items: { create: [{ orderItemId: r3.sellerOrders[0].items[0].id, quantity: 1 }] },
    },
  });

  // Another buyer's commission in production (seller view)
  const priya = buyers.get("priya")!;
  const bridal = await prisma.customRequest.create({
    data: {
      reference: `CR-${code(6)}`,
      buyerId: priya.id,
      sellerId: sellers.get("kanchan")!.id,
      categoryId: categoryIds.get("high-jewelry")!.id,
      title: "Temple-work bridal set for a February wedding",
      description: "Lakshmi-coin necklace with matching jhumkas, around 90 g in 22k. Ruby accents rather than green.",
      budgetMinMinor: 90000000,
      budgetMaxMinor: 130000000,
      currency: "INR",
      metalPreference: "GOLD_22K",
      gemstonePreference: "RUBY",
      neededBy: daysFromNow(110),
      status: "IN_PRODUCTION",
      createdAt: daysAgo(30),
    },
  });
  const quote = await prisma.customRequestQuote.create({
    data: { customRequestId: bridal.id, sellerId: sellers.get("kanchan")!.id, amountMinor: 118500000, currency: "INR", depositPercent: 40, leadTimeDays: 70, message: "Design sketches attached. Priced at today's 22k rate for 92 g plus making and rubies; final gold weight will be confirmed on delivery.", status: "ACCEPTED", createdAt: daysAgo(27) },
  });
  await prisma.customRequest.update({ where: { id: bridal.id }, data: { acceptedQuoteId: quote.id } });

  // An open request for any jeweler
  await prisma.customRequest.create({
    data: {
      reference: `CR-${code(6)}`,
      buyerId: buyers.get("kenji")!.id,
      title: "Men's platinum band with a hidden sapphire",
      description: "6 mm comfort-fit platinum band with a small blue sapphire set flush on the inside. Size US 10.",
      budgetMinMinor: 150000,
      budgetMaxMinor: 300000,
      currency: "USD",
      metalPreference: "PLATINUM",
      gemstonePreference: "SAPPHIRE",
      ringSize: 10,
      status: "OPEN",
      createdAt: daysAgo(1),
    },
  });

  // Admin notifications
  await notify(adminA, "KYC", "2 jeweler applications awaiting review", "Zafira Gems · Saffron Atelier", "/admin/kyc", daysAgo(0, 5));
  await notify(adminA, "DISPUTE", "High-priority dispute assigned to you", `${d2.caseNumber} · authenticity concern`, `/admin/disputes/${d2.id}`, daysAgo(5));
  await notify(sellers.get("hollis")!.userId, "DISPUTE", "A buyer opened a dispute", `${d1.caseNumber} · respond within 72 hours`, "/seller/orders", daysAgo(1, 4));
}

// ── Integrations (POS inventory sync) ─────────────────────────────────────────

async function seedIntegrations() {
  const kanchan = sellers.get("kanchan")!;
  const shopify = await prisma.inventoryIntegration.create({
    data: {
      sellerId: kanchan.id,
      provider: "SHOPIFY",
      name: "Johari Bazaar Shopify POS",
      status: "ACTIVE",
      shopDomain: "kanchan-jewellers.myshopify.com",
      externalLocationId: "gid://shopify/Location/71844315",
      webhookSecretEncrypted: encrypt(`whsec_${code(24)}`),
      accessTokenEncrypted: encrypt(`shpat_${code(32, "abcdef0123456789")}`),
      lastSyncedAt: daysAgo(0, 1),
      createdAt: daysAgo(120),
    },
  });
  const kanchanVariants = products.filter((p) => p.sellerKey === "kanchan").flatMap((p) => p.variants);
  for (const [i, v] of kanchanVariants.entries()) {
    await prisma.externalSkuMapping.create({
      data: { integrationId: shopify.id, variantId: v.id, externalId: `4471${String(9020300 + i * 17)}`, externalSku: v.sku, lastQuantity: v.stock, lastSyncedAt: daysAgo(0, int(1, 30)) },
    });
  }
  for (let i = 0; i < 14; i++) {
    const v = pick(kanchanVariants);
    const failed = i === 3;
    await prisma.inventorySyncEvent.create({
      data: {
        integrationId: shopify.id,
        direction: i % 4 === 0 ? "OUTBOUND" : "INBOUND",
        externalEventId: `wh_${code(20, "abcdef0123456789")}`,
        topic: i % 4 === 0 ? "inventory_levels/set" : "inventory_levels/update",
        status: failed ? "FAILED" : "PROCESSED",
        payload: { inventory_item_id: failed ? 99999991 : Number(`4471${9020300 + i}`), location_id: 71844315, available: int(0, 4), sku: failed ? "UNMAPPED-SKU" : v.sku },
        error: failed ? "No SKU mapping for inventory_item_id 99999991" : null,
        processedAt: failed ? null : daysAgo(i * 0.6),
        createdAt: daysAgo(i * 0.6),
      },
    });
  }

  const marlowe = sellers.get("marlowe")!;
  const apiKey = `lp_live_${code(32, "abcdefghijklmnopqrstuvwxyz0123456789")}`;
  const custom = await prisma.inventoryIntegration.create({
    data: {
      sellerId: marlowe.id,
      provider: "CUSTOM_API",
      name: "Salon inventory system",
      status: "ACTIVE",
      apiKeyPrefix: apiKey.slice(0, 12),
      apiKeyHash: sha256(apiKey),
      lastSyncedAt: daysAgo(0, 3),
      createdAt: daysAgo(210),
    },
  });
  for (let i = 0; i < 6; i++) {
    const p = pick(products.filter((x) => x.sellerKey === "marlowe"));
    await prisma.inventorySyncEvent.create({
      data: {
        integrationId: custom.id,
        direction: "INBOUND",
        externalEventId: `req_${code(16, "abcdef0123456789")}`,
        topic: "inventory.bulk_set",
        status: "PROCESSED",
        payload: { items: [{ sku: p.variants[0].sku, quantity: p.variants[0].stock }] },
        processedAt: daysAgo(i * 1.3, 3),
        createdAt: daysAgo(i * 1.3, 3),
      },
    });
  }
}

// ── Traffic analytics (last 60 days) ──────────────────────────────────────────

async function seedAnalytics() {
  const live = products.filter((p) => p.status === "ACTIVE");
  const sellerList = [...sellers.values()].filter((s) => s.spec.status === "APPROVED");
  const paths = ["/", "/shop", "/shop/rings", "/shop/necklaces", "/shop/earrings", "/shop/high-jewelry", "/jewelers", "/guides/gold-purity", "/guides/diamond-clarity", "/custom-orders"];
  const referrers = ["https://www.google.com/", "https://www.instagram.com/", "https://www.pinterest.com/", null, null, "https://www.vogue.com/"];
  const countries = ["US", "US", "US", "GB", "GB", "IN", "IN", "FR", "AE", "AU", "DE", "SG", "JP", "IT", "CA"];
  const rows: Prisma.AnalyticsEventCreateManyInput[] = [];

  for (let d = 59; d >= 0; d--) {
    const growth = 1 + (59 - d) / 90;
    const weekend = [0, 6].includes(daysAgo(d).getDay()) ? 1.25 : 1;
    const sessions = Math.round((110 + random() * 40) * growth * weekend);
    for (let s = 0; s < sessions; s++) {
      const sessionId = `s_${code(12, "abcdefghijklmnopqrstuvwxyz0123456789")}`;
      const at = daysAgo(d, random() * 23);
      const country = pick(countries);
      rows.push({ type: "PAGE_VIEW", sessionId, path: pick(paths), referrer: pick(referrers), country, createdAt: at });
      const views = int(0, 3);
      for (let v = 0; v < views; v++) {
        const p = pick(live);
        rows.push({ type: "PRODUCT_VIEW", sessionId, productId: p.id, sellerId: p.sellerId, path: `/product/${p.slug}`, country, createdAt: addHours(at, v * 0.05) });
        if (chance(0.07)) rows.push({ type: "ADD_TO_CART", sessionId, productId: p.id, sellerId: p.sellerId, country, createdAt: addHours(at, v * 0.05 + 0.02) });
      }
      if (chance(0.12)) {
        const seller = pick(sellerList);
        rows.push({ type: "STORE_VIEW", sessionId, sellerId: seller.id, path: `/jewelers/${seller.spec.slug}`, country, createdAt: addHours(at, 0.1) });
      }
      if (chance(0.15)) rows.push({ type: "SEARCH", sessionId, metadata: { q: pick(["emerald", "tennis bracelet", "22k gold", "pearl", "vintage ring", "oval solitaire", "GIA"]) }, country, createdAt: addHours(at, 0.03) });
      if (chance(0.02)) rows.push({ type: "CHECKOUT_STARTED", sessionId, country, createdAt: addHours(at, 0.2) });
    }
  }

  for (let i = 0; i < rows.length; i += 4000) await prisma.analyticsEvent.createMany({ data: rows.slice(i, i + 4000) });
  return rows.length;
}

// ── Denormalised aggregates ───────────────────────────────────────────────────

async function refreshAggregates() {
  await prisma.$executeRaw`
    UPDATE "Product" p SET
      "ratingAverage" = COALESCE(r.avg, 0),
      "ratingCount"   = COALESCE(r.cnt, 0)
    FROM (SELECT "productId", AVG(rating)::float AS avg, COUNT(*)::int AS cnt FROM "Review" WHERE status = 'PUBLISHED' GROUP BY "productId") r
    WHERE r."productId" = p.id`;
  await prisma.$executeRaw`
    UPDATE "Product" p SET "salesCount" = s.cnt
    FROM (SELECT oi."productId", SUM(oi.quantity)::int AS cnt FROM "OrderItem" oi JOIN "SellerOrder" so ON so.id = oi."sellerOrderId" WHERE so.status NOT IN ('CANCELLED') GROUP BY oi."productId") s
    WHERE s."productId" = p.id`;
  await prisma.$executeRaw`
    UPDATE "Product" p SET "viewCount" = v.cnt
    FROM (SELECT "productId", COUNT(*)::int AS cnt FROM "AnalyticsEvent" WHERE type = 'PRODUCT_VIEW' GROUP BY "productId") v
    WHERE v."productId" = p.id`;
  await prisma.$executeRaw`
    UPDATE "Product" p SET "wishlistCount" = w.cnt
    FROM (SELECT "productId", COUNT(*)::int AS cnt FROM "WishlistItem" GROUP BY "productId") w
    WHERE w."productId" = p.id`;
  await prisma.$executeRaw`
    UPDATE "SellerProfile" s SET
      "ratingAverage" = COALESCE(r.avg, 0),
      "ratingCount"   = COALESCE(r.cnt, 0)
    FROM (SELECT "sellerId", AVG(rating)::float AS avg, COUNT(*)::int AS cnt FROM "Review" WHERE status = 'PUBLISHED' GROUP BY "sellerId") r
    WHERE r."sellerId" = s.id`;
  await prisma.$executeRaw`
    UPDATE "SellerProfile" s SET "salesCount" = c.cnt
    FROM (SELECT "sellerId", COUNT(*)::int AS cnt FROM "SellerOrder" WHERE status NOT IN ('CANCELLED') GROUP BY "sellerId") c
    WHERE c."sellerId" = s.id`;
  await prisma.$executeRaw`
    UPDATE "SellerProfile" s SET "activeListingCount" = c.cnt
    FROM (SELECT "sellerId", COUNT(*)::int AS cnt FROM "Product" WHERE status = 'ACTIVE' AND "deletedAt" IS NULL GROUP BY "sellerId") c
    WHERE c."sellerId" = s.id`;
}

async function seedMisc() {
  for (const email of ["mira.k@example.com", "l.bertrand@example.com", "sam.o@example.com", "yuki.t@example.com", "arun.v@example.com"]) {
    await prisma.newsletterSubscriber.create({ data: { email, source: "footer", createdAt: daysAgo(int(1, 120)) } });
  }
  await prisma.auditLog.createMany({
    data: [
      { actorId: adminIds[0], action: "settings.update", entityType: "PlatformSettings", entityId: "platform", metadata: { defaultCommissionBps: { from: 1300, to: 1200 } }, createdAt: daysAgo(64) },
      { actorId: adminIds[0], action: "commission_rule.create", entityType: "CommissionRule", metadata: { name: "High jewelry — reduced rate", rateBps: 800 }, createdAt: daysAgo(63) },
      { actorId: adminIds[1], action: "subscription_plan.update", entityType: "SubscriptionPlan", metadata: { code: "haute", priceMinor: 49900 }, createdAt: daysAgo(40) },
    ],
  });
}

// ── Run ───────────────────────────────────────────────────────────────────────

async function main() {
  const started = Date.now();
  console.log("Seeding Loupe marketplace…");
  await reset();
  await seedPlatform();
  await seedCategories();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await seedPeople(passwordHash);
  await seedSellers(passwordHash);
  await seedProducts();
  console.log(`  ✓ ${sellers.size} jewelers, ${products.length} listings`);
  await seedDemoBuyer();
  await seedHistoricalOrders();
  await seedSoldArchive();
  await seedDisputesAndReturns();
  const orders = await prisma.order.count();
  console.log(`  ✓ ${orders} orders with fulfilment timelines, payouts & ledger`);
  await seedIntegrations();
  const events = await seedAnalytics();
  console.log(`  ✓ ${events.toLocaleString()} analytics events`);
  await seedMisc();
  await refreshAggregates();
  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
  console.log("Demo accounts are listed in prisma/seed/data/people.ts");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

// Silence "unused" warnings for helpers reserved for future seeds.
void shuffle;
void METALS;
