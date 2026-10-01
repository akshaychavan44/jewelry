import "server-only";

import type { BusinessType, KycDocumentType } from "@/generated/prisma/enums";
import { slugify } from "@/lib/utils";
import { encrypt, lastFour } from "@/server/crypto";
import { db } from "@/server/db";
import { notify } from "./messaging";
import { saveUpload } from "./storage";

export class OnboardingError extends Error {}

const EDITABLE = ["NOT_SUBMITTED", "REJECTED"] as const;

async function uniqueSlug(name: string, excludeSellerId?: string) {
  const base = slugify(name) || "atelier";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const taken = await db.sellerProfile.findFirst({ where: { slug: candidate, ...(excludeSellerId ? { id: { not: excludeSellerId } } : {}) }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export type StoreProfileInput = {
  storeName: string;
  tagline?: string;
  bio?: string;
  country: string;
  city: string;
  defaultCurrency: string;
  foundedYear?: number;
  specialties: string[];
  returnAddress: { fullName: string; line1: string; line2?: string; city: string; region?: string; postalCode: string; country: string; phone?: string };
  logo?: File | null;
  banner?: File | null;
};

/** Step 1 — creates the SellerProfile on first save. */
export async function saveStoreProfile(userId: string, input: StoreProfileInput) {
  const existing = await db.sellerProfile.findUnique({ where: { userId } });
  if (existing && !EDITABLE.includes(existing.verificationStatus as (typeof EDITABLE)[number]) && existing.verificationStatus !== "APPROVED") {
    throw new OnboardingError("Your application is under review — changes are locked until a decision is made.");
  }
  const logo = input.logo?.size ? await saveUpload(input.logo, "STORE_BRANDING", userId, userId) : null;
  const banner = input.banner?.size ? await saveUpload(input.banner, "STORE_BRANDING", userId, userId) : null;

  return db.$transaction(async (tx) => {
    const addressData = { ...input.returnAddress, type: "RETURN" as const, label: "Returns", userId, isDefault: true };
    const address = existing?.returnAddressId
      ? await tx.address.update({ where: { id: existing.returnAddressId }, data: addressData })
      : await tx.address.create({ data: addressData });
    const data = {
      storeName: input.storeName,
      tagline: input.tagline || null,
      bio: input.bio || null,
      country: input.country,
      city: input.city,
      defaultCurrency: input.defaultCurrency,
      foundedYear: input.foundedYear ?? null,
      specialties: input.specialties.slice(0, 6),
      returnAddressId: address.id,
      ...(logo?.url ? { logoUrl: logo.url } : {}),
      ...(banner?.url ? { bannerUrl: banner.url } : {}),
    };
    if (existing) {
      return tx.sellerProfile.update({ where: { id: existing.id }, data: { ...data, onboardingStep: Math.max(existing.onboardingStep, 2) } });
    }
    return tx.sellerProfile.create({ data: { ...data, userId, slug: await uniqueSlug(input.storeName), onboardingStep: 2 } });
  });
}

export type BusinessInput = {
  legalBusinessName: string;
  businessType: BusinessType;
  registrationNumber: string;
  taxId?: string;
  website?: string;
  documents: Partial<Record<KycDocumentType, File | null>>;
};

/** Step 2 — business details (tax ID encrypted at rest) and KYC documents. */
export async function saveBusinessVerification(userId: string, input: BusinessInput) {
  const seller = await db.sellerProfile.findUnique({ where: { userId }, include: { kycDocuments: { where: { submissionId: null } } } });
  if (!seller) throw new OnboardingError("Set up your store profile first.");
  if (!EDITABLE.includes(seller.verificationStatus as (typeof EDITABLE)[number])) throw new OnboardingError("Verification details are locked while your application is reviewed.");

  for (const [type, file] of Object.entries(input.documents) as [KycDocumentType, File | null][]) {
    if (!file?.size) continue;
    const asset = await saveUpload(file, "KYC_DOCUMENT", seller.id, userId);
    // Replace any unsubmitted document of the same type.
    const previous = seller.kycDocuments.find((d) => d.type === type);
    if (previous) await db.kycDocument.delete({ where: { id: previous.id } });
    await db.kycDocument.create({ data: { sellerId: seller.id, type, fileId: asset.id } });
  }

  return db.sellerProfile.update({
    where: { id: seller.id },
    data: {
      legalBusinessName: input.legalBusinessName,
      businessType: input.businessType,
      registrationNumber: input.registrationNumber,
      website: input.website || null,
      ...(input.taxId ? { taxIdEncrypted: encrypt(input.taxId.trim()), taxIdLast4: lastFour(input.taxId) } : {}),
      onboardingStep: Math.max(seller.onboardingStep, 3),
    },
  });
}

export type BankInput = { holder: string; bankName: string; country: string; accountNumber: string; routing: string; currency: string };

/** Step 3 — payouts by bank transfer (Stripe Connect is handled by redirect). */
export async function saveBankPayouts(userId: string, input: BankInput) {
  const seller = await db.sellerProfile.findUnique({ where: { userId } });
  if (!seller) throw new OnboardingError("Set up your store profile first.");
  return db.sellerProfile.update({
    where: { id: seller.id },
    data: {
      payoutMethod: "BANK_TRANSFER",
      bankAccountHolder: input.holder,
      bankName: input.bankName,
      bankCountry: input.country,
      bankAccountEncrypted: encrypt(input.accountNumber.replace(/\s/g, "")),
      bankAccountLast4: lastFour(input.accountNumber),
      bankRoutingEncrypted: encrypt(input.routing.trim()),
      payoutCurrency: input.currency,
      onboardingStep: Math.max(seller.onboardingStep, 4),
    },
  });
}

export async function markStripeConnected(userId: string, accountId: string, demo = false) {
  const seller = await db.sellerProfile.findUniqueOrThrow({ where: { userId } });
  return db.sellerProfile.update({
    where: { id: seller.id },
    data: {
      payoutMethod: "STRIPE_CONNECT",
      stripeAccountId: accountId,
      stripeDetailsSubmitted: true,
      ...(demo ? { stripeChargesEnabled: true, stripePayoutsEnabled: true } : {}),
      payoutCurrency: seller.defaultCurrency,
      onboardingStep: Math.max(seller.onboardingStep, 4),
    },
  });
}

/** Step 4 — freezes a snapshot and queues the application for review. */
export async function submitApplication(userId: string) {
  const seller = await db.sellerProfile.findUnique({ where: { userId }, include: { kycDocuments: { where: { submissionId: null } } } });
  if (!seller) throw new OnboardingError("Set up your store profile first.");
  if (!EDITABLE.includes(seller.verificationStatus as (typeof EDITABLE)[number])) throw new OnboardingError("Your application has already been submitted.");
  const settings = await db.platformSettings.findUniqueOrThrow({ where: { id: "platform" } });
  const missing = settings.requiredKycDocuments.filter((t) => !seller.kycDocuments.some((d) => d.type === t));
  if (missing.length) throw new OnboardingError(`Upload the required documents: ${missing.map((m) => m.toLowerCase().replace(/_/g, " ")).join(", ")}.`);
  if (!seller.legalBusinessName || !seller.registrationNumber) throw new OnboardingError("Complete your business details.");
  if (!seller.payoutMethod) throw new OnboardingError("Choose how you'd like to be paid.");

  const now = new Date();
  await db.$transaction(async (tx) => {
    const submission = await tx.kycSubmission.create({
      data: {
        sellerId: seller.id,
        status: "PENDING",
        submittedAt: now,
        snapshot: {
          storeName: seller.storeName,
          legalBusinessName: seller.legalBusinessName,
          businessType: seller.businessType,
          registrationNumber: seller.registrationNumber,
          taxIdLast4: seller.taxIdLast4,
          country: seller.country,
          payoutMethod: seller.payoutMethod,
          website: seller.website,
        },
      },
    });
    // Documents accepted in a previous review keep their status; new uploads are PENDING by default.
    await tx.kycDocument.updateMany({ where: { sellerId: seller.id, submissionId: null }, data: { submissionId: submission.id } });
    await tx.sellerProfile.update({ where: { id: seller.id }, data: { verificationStatus: "PENDING", submittedAt: now } });
    const admins = await tx.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
    for (const a of admins) await notify(tx, a.id, "KYC", "New jeweler application", seller.storeName, `/admin/kyc/${seller.id}`);
  });
}
