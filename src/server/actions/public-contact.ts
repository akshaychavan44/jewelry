"use server";

import { revalidatePath } from "next/cache";
import { publicContactSchema, type PublicContactInput } from "@/lib/public-contact";
import { AccessDenied, assertSeller } from "@/server/auth/session";
import { db } from "@/server/db";
import type { ActionResult } from "./cart";

export async function savePublicContact(input: PublicContactInput): Promise<ActionResult> {
  try {
    const { seller } = await assertSeller();
    const parsed = publicContactSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check your contact details." };
    const { id, ...fields } = parsed.data;
    const data = { ...fields, phone: fields.phone || null, hours: fields.hours || null };
    if (id) {
      const location = await db.storeLocation.findFirst({ where: { id, sellerId: seller.id }, select: { id: true } });
      if (!location) return { ok: false, message: "This showroom does not belong to your store." };
      await db.storeLocation.update({ where: { id: location.id }, data });
    } else {
      await db.storeLocation.create({ data: { ...data, sellerId: seller.id, country: seller.country } });
    }
    revalidatePath("/seller/settings");
    revalidatePath(`/jewelers/${seller.slug}`);
    revalidatePath("/product/[slug]", "page");
    return { ok: true, message: "Public contact details saved." };
  } catch (error) {
    if (error instanceof AccessDenied) return { ok: false, message: error.message };
    throw error;
  }
}
