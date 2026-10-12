"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { directoryProfileSchema } from "@/lib/jeweler-profile";
import { AccessDenied, assertSeller } from "@/server/auth/session";
import { db } from "@/server/db";
import { saveUpload, UploadError } from "@/server/services/storage";
import { setInquiryStatus } from "@/server/services/jeweler-directory";
import type { StepState } from "./onboarding";

function refresh(slug: string) {
  revalidatePath("/seller", "layout");
  revalidatePath("/jewelers");
  revalidatePath(`/jewelers/${slug}`);
  revalidatePath("/custom-orders");
}

export async function saveDirectoryProfileAction(_: StepState, form: FormData): Promise<StepState> {
  try {
    const { seller, user } = await assertSeller();
    const parsed = directoryProfileSchema.safeParse({ ...Object.fromEntries(form), acceptsCustomOrders: form.get("acceptsCustomOrders") === "on" });
    if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, message: "Check the highlighted fields." };
    const d = parsed.data;
    // Business identity is approved by the admin; do not silently replace it.
    if (d.storeName !== seller.storeName) return { fieldErrors: { storeName: ["Use Change business name to request admin approval."] } };
    const file = form.get("logo");
    const logo = file instanceof File && file.size ? await saveUpload(file, "STORE_BRANDING", seller.id, user.id) : null;
    await db.$transaction(async (tx) => {
      await tx.sellerProfile.update({ where: { id: seller.id }, data: {
        tagline: d.tagline || null, bio: d.bio || null, city: d.city,
        specialties: d.specialties.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 6),
        website: d.website || null, acceptsCustomOrders: d.acceptsCustomOrders,
        ...(logo?.url ? { logoUrl: logo.url } : {}),
      } });
      const location = await tx.storeLocation.findFirst({ where: { sellerId: seller.id }, orderBy: { id: "asc" } });
      const locationData = { name: seller.storeName, line1: d.address, city: d.city, country: seller.country, phone: d.phone || null, hours: d.hours || null };
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
    const { seller } = await assertSeller();
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
    const { seller } = await assertSeller();
    const value = z.enum(["NEW", "CONTACTED", "CLOSED"]).parse(status);
    if (!await setInquiryStatus(seller.id, requestId, value)) return { ok: false, message: "Request not found." };
    revalidatePath("/seller", "layout");
    revalidatePath("/account/custom-requests");
    return { ok: true, message: "Request status updated." };
  } catch (error) {
    if (error instanceof AccessDenied || error instanceof z.ZodError) return { ok: false, message: "You cannot update this request." };
    throw error;
  }
}
