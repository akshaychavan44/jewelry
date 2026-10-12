"use server";

import { revalidatePath } from "next/cache";
import { assertSeller } from "@/server/auth/session";
import { markInquiryNotificationsRead } from "@/server/services/inquiry-notifications";

export async function markInquiryNotificationsReadAction(form: FormData) {
  const { user } = await assertSeller();
  const through = new Date(String(form.get("through")));
  if (!Number.isFinite(through.getTime()) || through > new Date()) return;
  await markInquiryNotificationsRead(user.id, through);
  revalidatePath("/seller", "layout");
}
