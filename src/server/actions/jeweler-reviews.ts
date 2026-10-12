"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AccessDenied, assertUser, assertSeller, assertAdmin } from "@/server/auth/session";
import { db } from "@/server/db";
import { refreshJewelerRating } from "@/server/services/discovery";
import { getDirectorySettings } from "@/server/services/jeweler-directory";
import { notify } from "@/server/services/messaging";
export type ReviewState = { ok?: boolean; message?: string };
function refresh(slug?: string) {
  for (const p of ["/jewelers", "/seller", "/seller/reviews", "/account/reviews", "/admin/reviews"]) revalidatePath(p);
  if (slug) revalidatePath(`/jewelers/${slug}`);
}
export async function saveJewelerReview(_: ReviewState, form: FormData): Promise<ReviewState> {
  try {
    const user = await assertUser();
    if (user.role !== "BUYER") return { message: "Use your customer account to review a jeweler." };
    const d = z.object({ sellerId: z.string().min(1), rating: z.coerce.number().int().min(1).max(5), body: z.string().trim().min(20, "Please describe your experience in at least 20 characters.").max(2000) }).parse(Object.fromEntries(form));
    if (form.get("experienced") !== "on") return { message: "Confirm this review reflects your own experience." };
    const seller = await db.sellerProfile.findFirst({ where: { id: d.sellerId, verificationStatus: "APPROVED" } });
    if (!seller || (await getDirectorySettings(seller.id)).isPaused) return { message: "This jeweler is unavailable." };
    await db.$transaction(async tx => {
      await tx.$executeRaw`INSERT INTO "JewelerReview" ("id", "sellerId", "authorId", "rating", "body") VALUES (${randomUUID()}, ${seller.id}, ${user.id}, ${d.rating}, ${d.body}) ON CONFLICT ("sellerId", "authorId") DO UPDATE SET "rating" = EXCLUDED."rating", "body" = EXCLUDED."body", "updatedAt" = CURRENT_TIMESTAMP`;
      await refreshJewelerRating(tx, seller.id);
      await notify(tx, seller.userId, "SYSTEM", "Customer review received", "A customer shared their experience with your business.", "/seller/reviews");
    });
    refresh(seller.slug);
    return { ok: true, message: "Review saved. You can manage it in My Reviews." };
  } catch (e) {
    if (e instanceof z.ZodError) return { message: e.issues[0]?.message };
    if (e instanceof AccessDenied) return { message: e.message };
    throw e;
  }
}
export async function deleteJewelerReview(_: ReviewState, form: FormData): Promise<ReviewState> {
  const user = await assertUser(); const id = String(form.get("id") ?? "");
  const rows = await db.$transaction(async tx => {
    const deleted = await tx.$queryRaw<{ sellerId: string }[]>`DELETE FROM "JewelerReview" WHERE "id" = ${id} AND "authorId" = ${user.id} RETURNING "sellerId"`;
    if (deleted[0]) await refreshJewelerRating(tx, deleted[0].sellerId);
    return deleted;
  });
  if (!rows.length) return { message: "Review not found." };
  revalidatePath("/jewelers/[slug]", "page"); refresh();
  return { ok: true, message: "Review removed." };
}
export async function respondToJewelerReview(_: ReviewState, form: FormData): Promise<ReviewState> {
  try {
    const { seller } = await assertSeller();
    const d = z.object({ id: z.string().min(1), body: z.string().trim().min(3).max(1000), intent: z.enum(["reply", "report"]) }).parse(Object.fromEntries(form));
    const rows = d.intent === "reply"
      ? await db.$queryRaw<{ id: string }[]>`UPDATE "JewelerReview" SET "sellerReply" = ${d.body}, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${d.id} AND "sellerId" = ${seller.id} RETURNING "id"`
      : await db.$queryRaw<{ id: string }[]>`UPDATE "JewelerReview" SET "reportedReason" = ${d.body}, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${d.id} AND "sellerId" = ${seller.id} RETURNING "id"`;
    if (!rows.length) return { message: "Review not found." };
    refresh(seller.slug);
    return { ok: true, message: d.intent === "reply" ? "Public reply saved." : "Report submitted for admin review. The review remains visible until moderated." };
  } catch (e) {
    if (e instanceof z.ZodError) return { message: e.issues[0]?.message };
    if (e instanceof AccessDenied) return { message: e.message };
    throw e;
  }
}
export async function moderateJewelerReview(form: FormData): Promise<void> {
  await assertAdmin();
  const id = z.string().min(1).parse(form.get("id")); const status = z.enum(["PUBLISHED", "HIDDEN"]).parse(form.get("status"));
  await db.$transaction(async tx => {
    const rows = await tx.$queryRaw<{ sellerId: string }[]>`UPDATE "JewelerReview" SET "status" = ${status}, "reportedReason" = '', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${id} RETURNING "sellerId"`;
    if (rows[0]) await refreshJewelerRating(tx, rows[0].sellerId);
  });
  revalidatePath("/jewelers/[slug]", "page"); refresh();
}
