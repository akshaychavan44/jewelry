"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isCurrency } from "@/lib/money";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { CURRENCY_COOKIE } from "@/server/services/currency";

export async function setCurrency(code: string) {
  if (!isCurrency(code)) return;
  (await cookies()).set(CURRENCY_COOKIE, code, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const user = await getCurrentUser();
  if (user) await db.user.update({ where: { id: user.id }, data: { preferredCurrency: code } });
  revalidatePath("/", "layout");
}

export type NewsletterState = { ok?: boolean; message?: string };

export async function subscribeToNewsletter(_: NewsletterState, formData: FormData): Promise<NewsletterState> {
  const parsed = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { ok: false, message: "Enter a valid email address." };
  await db.newsletterSubscriber.upsert({
    where: { email: parsed.data },
    update: { unsubscribedAt: null },
    create: { email: parsed.data, source: "footer" },
  });
  return { ok: true, message: "You're on the list — new arrivals and private sales, twice a month." };
}
