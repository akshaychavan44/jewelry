"use server";
import { after } from "next/server";
import { sendInquiryEmail } from "@/server/services/inquiry-notifications";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { directoryProfileSchema } from "@/lib/jeweler-profile";
import { AccessDenied, assertSeller } from "@/server/auth/session";
import { db } from "@/server/db";
import { saveUpload, UploadError } from "@/server/services/storage";
import { setInquiryStatus } from "@/server/services/jeweler-directory";
import type { StepState } from "./onboarding";
import { notify } from "@/server/services/messaging";
import { INQUIRY_LABELS } from "@/lib/jeweler-profile";

function refresh(slug: string) {
  revalidatePath("/seller", "layout");
  revalidatePath("/jewelers");
  revalidatePath(`/jewelers/${slug}`);
  revalidatePath(`/jewelers/${slug}/about`);
  revalidatePath("/custom-orders");
}

export async function saveDirectoryProfileAction(_: StepState, form: FormData): Promise<StepState> {
  try {
    const { seller, user } = await assertSeller({ verified: false, listed: true });
    const parsed = directoryProfileSchema.safeParse({ ...Object.fromEntries(form), acceptsCustomOrders: form.get("acceptsCustomOrders") === "on" });
    if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, message: "Check the highlighted fields." };
    const d = parsed.data;
    if (!!d.latitude !== !!d.longitude) return { fieldErrors: { latitude: ["Add both coordinates, or leave both empty."], longitude: ["Add both coordinates, or leave both empty."] } };
    // Business identity is approved by the admin; do not silently replace it.
    if (d.storeName !== seller.storeName) return { fieldErrors: { storeName: ["Use Change business name to request admin approval."] } };
    const file = form.get("logo");
    const logo = file instanceof File && file.size ? await saveUpload(file, "STORE_BRANDING", seller.id, user.id) : null;
    const bannerFile = form.get("banner");
    const banner = bannerFile instanceof File && bannerFile.size ? await saveUpload(bannerFile, "STORE_BRANDING", seller.id, user.id) : null;
    await db.$transaction(async (tx) => {
      const addressData = { fullName: seller.storeName, line1: d.address, line2: d.addressLine2 || null, city: d.addressCity, region: d.region || null, postalCode: d.postalCode, country: d.country, phone: d.phone || null };
      const address = seller.returnAddressId
        ? await tx.address.update({ where: { id: seller.returnAddressId }, data: addressData })
        : await tx.address.create({ data: { ...addressData, userId: user.id, type: "RETURN", label: "Business address", isDefault: true } });
      await tx.sellerProfile.update({ where: { id: seller.id }, data: {
        tagline: d.tagline || null, bio: d.bio || null, city: d.city,
        country: d.country, defaultCurrency: d.defaultCurrency, foundedYear: d.foundedYear ? Number(d.foundedYear) : null, returnAddressId: address.id,
        specialties: d.specialties.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 6),
        website: d.website || null, acceptsCustomOrders: d.acceptsCustomOrders,
        ...(logo?.url ? { logoUrl: logo.url } : {}),
        ...(banner?.url ? { bannerUrl: banner.url } : {}),
      } });
      const location = await tx.storeLocation.findFirst({ where: { sellerId: seller.id }, orderBy: { id: "asc" } });
      const locationData = { name: seller.storeName, line1: d.address, line2: d.addressLine2 || null, region: d.region || null, postalCode: d.postalCode || null, city: d.addressCity, country: d.country, phone: d.phone || null, hours: d.hours || null, latitude: d.latitude ? Number(d.latitude) : null, longitude: d.longitude ? Number(d.longitude) : null };
      if (location) await tx.storeLocation.update({ where: { id: location.id }, data: locationData });
      else await tx.storeLocation.create({ data: { ...locationData, sellerId: seller.id } });
      await tx.$executeRaw`INSERT INTO "JewelerDirectorySettings" ("sellerId", "instagram", "facebook", "youtube", "whatsapp", "publicEmail", "maps")
        VALUES (${seller.id}, ${d.instagram}, ${d.facebook}, ${d.youtube}, ${d.whatsapp.replace(/\D/g, "")}, ${d.publicEmail}, ${d.maps})
        ON CONFLICT ("sellerId") DO UPDATE SET "instagram" = EXCLUDED."instagram", "facebook" = EXCLUDED."facebook", "youtube" = EXCLUDED."youtube", "whatsapp" = EXCLUDED."whatsapp", "publicEmail" = EXCLUDED."publicEmail", "maps" = EXCLUDED."maps", "updatedAt" = CURRENT_TIMESTAMP`;
    });
    refresh(seller.slug);
    return { ok: true, message: "Your business profile has been saved." };
  } catch (error) {
    if (error instanceof AccessDenied || error instanceof UploadError) return { message: error.message };
    throw error;
  }
}

export async function setDirectoryPausedAction(paused: boolean) {
  try {
    const { seller } = await assertSeller({ verified: false, listed: true });
    const value = z.boolean().parse(paused);
    await db.$executeRaw`INSERT INTO "JewelerDirectorySettings" ("sellerId", "isPaused") VALUES (${seller.id}, ${value})
      ON CONFLICT ("sellerId") DO UPDATE SET "isPaused" = EXCLUDED."isPaused", "updatedAt" = CURRENT_TIMESTAMP`;
    refresh(seller.slug);
    return { ok: true, message: value ? "Listing paused. Existing requests remain available." : "Your listing is live again." };
  } catch (error) {
    if (error instanceof AccessDenied) return { ok: false, message: error.message };
    throw error;
  }
}

export async function updateInquiryStatusAction(requestId: string, status: string) {
  try {
    const { seller } = await assertSeller({ verified: false, listed: true });
    const value = z.enum(["NEW", "CONTACTED", "CLOSED"]).parse(status);
    const request = await db.customRequest.findFirst({ where: { id: requestId, sellerId: seller.id }, select: { buyerId: true, title: true, buyer: { select: { email: true } } } });
    if (!request) return { ok: false, message: "Request not found." };
    const updated = await db.$transaction(async tx => {
      const current = await tx.$queryRaw<{ inquiryStatus: string; status: string }[]>`SELECT "inquiryStatus", "status" FROM "CustomRequest" WHERE "id" = ${requestId} AND "sellerId" = ${seller.id} FOR UPDATE`;
      if (!current[0] || current[0].status === "CANCELLED") return null;
      if (current[0].inquiryStatus === value) return "unchanged";
      if (!await setInquiryStatus(seller.id, requestId, value, tx)) return null;
      const notification = await notify(tx, request.buyerId, "CUSTOM_REQUEST", `Custom request: ${INQUIRY_LABELS[value]}`, request.title, "/account/custom-requests");
      return notification.id;
    });
    if (!updated) return { ok: false, message: "Request not found." };
    if (updated === "unchanged") return { ok: true, message: "Request status is already up to date." };
    after(async () => { await sendInquiryEmail({ to: request.buyer.email, subject: `Your Loupe enquiry: ${INQUIRY_LABELS[value]}`, text: `${seller.storeName} updated “${request.title}” to ${INQUIRY_LABELS[value]}.`, href: "/account/custom-requests", key: `inquiry-update/${updated}` }); });
    revalidatePath("/seller", "layout");
    revalidatePath("/account/custom-requests");
    return { ok: true, message: "Request status updated." };
  } catch (error) {
    if (error instanceof AccessDenied || error instanceof z.ZodError) return { ok: false, message: "You cannot update this request." };
    throw error;
  }
}
