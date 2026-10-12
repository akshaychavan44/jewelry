"use server";
import { revalidatePath } from "next/cache";
import { assertUser } from "@/server/auth/session";
import { cancelInquiry } from "@/server/services/jeweler-directory";
export async function cancelCustomInquiry(id: string) {
  const user = await assertUser();
  const rows = await cancelInquiry(user.id, id);
  if (!rows.length) return { ok: false, message: "This request is already closed or unavailable." };
  revalidatePath("/account/custom-requests"); revalidatePath("/seller", "layout");
  return { ok: true, message: "Request cancelled." };
}
