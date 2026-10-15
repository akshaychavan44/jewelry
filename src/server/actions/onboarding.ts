"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BusinessType } from "@/lib/domain-enums";
import { isCurrency } from "@/lib/money";
import { absoluteUrl } from "@/lib/utils";
import { assertUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { markStripeConnected, OnboardingError, saveBankPayouts, saveBusinessVerification, saveStoreProfile, submitApplication } from "@/server/services/onboarding";
import { createConnectOnboardingLink } from "@/server/services/payments";
import { UploadError } from "@/server/services/storage";
import { businessPhoneSchema, businessSpecialtiesSchema, socialEnrollmentSchema } from "@/lib/jeweler-profile";

export type StepState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

async function sellerUser() {
  const user = await assertUser();
  if (user.role !== "SELLER" && user.role !== "ADMIN") throw new OnboardingError("Open a jeweler account first.");
  return user;
}

function fail(error: unknown): StepState {
  if (error instanceof Error) return { ok: false, message: error.message };
  return { ok: false, message: "An unexpected error occurred." };
}

const file = (v: FormDataEntryValue | null) => (v instanceof File && v.size > 0 ? v : null);

const storeSchema = z.object({
  storeName: z.string().trim().min(2, "Enter your store name.").max(60),
  tagline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(1500).optional(),
  country: z.string().length(2, "Choose a country."),
  city: z.string().trim().min(2, "Enter your city."),
  defaultCurrency: z.string().refine((c) => isCurrency(c), "Choose a currency."),
  foundedYear: z
    .union([z.coerce.number().int().min(1700).max(new Date().getFullYear()), z.literal(""), z.nan()])
    .optional()
    .transform((v) => (typeof v === "number" && !Number.isNaN(v) ? v : undefined)),
  specialties: businessSpecialtiesSchema.optional(),
  ra_line1: z.string().trim().min(3, "Enter the return street address."),
  ra_line2: z.string().trim().optional(),
  ra_city: z.string().trim().min(2, "Enter the return city."),
  ra_region: z.string().trim().optional(),
  ra_postalCode: z.string().trim().min(2, "Enter the return postal code."),
  ra_phone: businessPhoneSchema.optional(),
}).extend({ instagram: socialEnrollmentSchema.shape.instagram.default(""), facebook: socialEnrollmentSchema.shape.facebook.default(""), youtube: socialEnrollmentSchema.shape.youtube.default(""), whatsapp: socialEnrollmentSchema.shape.whatsapp.default(""), publicEmail: socialEnrollmentSchema.shape.publicEmail.default(""), maps: socialEnrollmentSchema.shape.maps.default("") });

export async function saveStoreProfileAction(_: StepState, formData: FormData): Promise<StepState> {
  const raw = Object.fromEntries(
    [...formData.entries()]
      .filter(([, v]) => typeof v === "string")
      .map(([k, v]) => [k, (v as string).trim()])
  ) as Record<string, string>;

  try {
    const user = await sellerUser();
    const parsed = storeSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors, values: raw };
    const d = parsed.data;
    await saveStoreProfile(user.id, {
      storeName: d.storeName,
      socials: socialEnrollmentSchema.parse(d),
      tagline: d.tagline,
      bio: d.bio,
      country: d.country,
      city: d.city,
      defaultCurrency: d.defaultCurrency,
      foundedYear: d.foundedYear,
      specialties: (d.specialties ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      returnAddress: { fullName: d.storeName, line1: d.ra_line1, line2: d.ra_line2, city: d.ra_city, region: d.ra_region, postalCode: d.ra_postalCode, country: d.country, phone: d.ra_phone },
      logo: file(formData.get("logo")) ?? (typeof formData.get("logo_fileId") === "string" ? formData.get("logo_fileId") as string : null),
      banner: file(formData.get("banner")) ?? (typeof formData.get("banner_fileId") === "string" ? formData.get("banner_fileId") as string : null),
    });
  } catch (error) {
    const res = fail(error);
    return { ...res, values: raw };
  }
  revalidatePath("/seller/onboarding");
  return { ok: true, message: "Store profile saved." };
}

/** Same fields as onboarding step 1, for approved stores (no redirect). */
export async function updateStoreProfileAction(_: StepState, formData: FormData): Promise<StepState> {
  const raw = Object.fromEntries(
    [...formData.entries()]
      .filter(([, v]) => typeof v === "string")
      .map(([k, v]) => [k, (v as string).trim()])
  ) as Record<string, string>;

  try {
    const user = await sellerUser();
    const parsed = storeSchema.safeParse(raw);
    if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: raw };
    const d = parsed.data;
    await saveStoreProfile(user.id, {
      storeName: d.storeName,
      socials: socialEnrollmentSchema.parse(d),
      tagline: d.tagline,
      bio: d.bio,
      country: d.country,
      city: d.city,
      defaultCurrency: d.defaultCurrency,
      foundedYear: d.foundedYear,
      specialties: (d.specialties ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      returnAddress: { fullName: d.storeName, line1: d.ra_line1, line2: d.ra_line2, city: d.ra_city, region: d.ra_region, postalCode: d.ra_postalCode, country: d.country, phone: d.ra_phone },
      logo: file(formData.get("logo")) ?? (typeof formData.get("logo_fileId") === "string" ? formData.get("logo_fileId") as string : null),
      banner: file(formData.get("banner")) ?? (typeof formData.get("banner_fileId") === "string" ? formData.get("banner_fileId") as string : null),
    });
  } catch (error) {
    const res = fail(error);
    return { ...res, values: raw };
  }
  revalidatePath("/seller/settings");
  return { ok: true, message: "Store profile saved." };
}

const businessSchema = z.object({
  legalBusinessName: z.string().trim().min(2, "Enter the registered business name."),
  businessType: z.enum(BusinessType),
  registrationNumber: z.string().trim().min(3, "Enter the registration number."),
  taxId: z.string().trim().optional(),
  website: z.union([z.url("Enter a full URL, including https://"), z.literal("")]).optional(),
});

export async function saveBusinessAction(_: StepState, formData: FormData): Promise<StepState> {
  const raw = Object.fromEntries(
    [...formData.entries()]
      .filter(([, v]) => typeof v === "string")
      .map(([k, v]) => [k, (v as string).trim()])
  ) as Record<string, string>;

  try {
    const user = await sellerUser();
    const parsed = businessSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors, values: raw };

    const existing = await db.sellerProfile.findUnique({
      where: { userId: user.id },
      include: { kycDocuments: { where: { submissionId: null } } },
    });

    if (!parsed.data.taxId && !existing?.taxIdLast4) {
      return { ok: false, fieldErrors: { taxId: ["Enter your tax ID (VAT, GST, EIN…)."] }, values: raw };
    }

    const document = (name: string) => {
      const id = formData.get(`${name}_fileId`);
      return file(formData.get(name)) ?? (typeof id === "string" && id.length <= 128 && id.trim() ? id.trim() : null);
    };
    const docTax = document("doc_TAX_REGISTRATION");
    const docBiz = document("doc_BUSINESS_LICENSE");
    const docId = document("doc_GOVERNMENT_ID");
    const docProof = document("doc_PROOF_OF_ADDRESS");

    const hasTaxDoc = !!docTax || (existing?.kycDocuments.some((d) => d.type === "TAX_REGISTRATION") ?? false);
    const hasBizDoc = !!docBiz || (existing?.kycDocuments.some((d) => d.type === "BUSINESS_LICENSE") ?? false);
    const hasIdDoc = !!docId || (existing?.kycDocuments.some((d) => d.type === "GOVERNMENT_ID") ?? false);

    const docErrors: Record<string, string[]> = {};
    if (!hasTaxDoc) docErrors.doc_TAX_REGISTRATION = ["Tax registration document is required."];
    if (!hasBizDoc) docErrors.doc_BUSINESS_LICENSE = ["Business licence / registration is required."];
    if (!hasIdDoc) docErrors.doc_GOVERNMENT_ID = ["Identity document is required."];

    if (Object.keys(docErrors).length > 0) {
      return {
        ok: false,
        fieldErrors: docErrors,
        message: "Please upload all required verification documents to continue.",
        values: raw,
      };
    }

    await saveBusinessVerification(user.id, {
      ...parsed.data,
      documents: {
        TAX_REGISTRATION: docTax,
        BUSINESS_LICENSE: docBiz,
        GOVERNMENT_ID: docId,
        PROOF_OF_ADDRESS: docProof,
      },
    });
  } catch (error) {
    const res = fail(error);
    return { ...res, values: raw };
  }
  revalidatePath("/seller/onboarding");
  return { ok: true, message: "Business verification saved." };
}

const bankSchema = z.object({
  holder: z.string().trim().min(2, "Enter the account holder."),
  bankName: z.string().trim().min(2, "Enter the bank name."),
  country: z.string().length(2),
  accountNumber: z.string().trim().min(6, "Enter the account number or IBAN."),
  routing: z.string().trim().min(4, "Enter the routing, sort code, SWIFT or IFSC."),
  currency: z.string().refine((c) => isCurrency(c), "Choose a currency."),
});

export async function saveBankAction(_: StepState, formData: FormData): Promise<StepState> {
  try {
    const user = await sellerUser();
    const parsed = bankSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
    await saveBankPayouts(user.id, parsed.data);
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/seller/onboarding");
  redirect("/seller/onboarding?step=4");
}

/** Stripe Connect Express onboarding (demo account when Stripe isn't configured). */
export async function connectStripeAction() {
  const user = await sellerUser();
  const seller = await db.sellerProfile.findUniqueOrThrow({ where: { userId: user.id } });
  const link = await createConnectOnboardingLink({
    accountId: seller.stripeAccountId,
    email: user.email,
    country: seller.country,
    sellerId: seller.id,
    returnUrl: absoluteUrl("/seller/onboarding?step=4&stripe=return"),
    refreshUrl: absoluteUrl("/seller/onboarding?step=3"),
  });
  if (link) {
    await markStripeConnected(user.id, link.accountId);
    redirect(link.url);
  }
  await markStripeConnected(user.id, `acct_demo_${seller.id.slice(-10)}`, true);
  revalidatePath("/seller/onboarding");
  redirect("/seller/onboarding?step=4");
}

export async function submitApplicationAction(_: StepState, formData: FormData): Promise<StepState> {
  try {
    const user = await sellerUser();
    if (formData.get("agree") !== "on") return { message: "Please confirm the seller commitments." };
    await submitApplication(user.id);
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/seller/onboarding");
  revalidatePath("/jewelers");
  revalidatePath("/custom-orders");
  revalidatePath("/");
  return { ok: true };
}
