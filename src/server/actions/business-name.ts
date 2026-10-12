"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AccessDenied, assertAdmin, assertSeller } from "@/server/auth/session";
import { db } from "@/server/db";
import { applyNameReview } from "@/server/services/jeweler-directory";
import type { StepState } from "./onboarding";

export async function requestBusinessNameAction(_: StepState, form: FormData): Promise<StepState> {
  try {
    const { seller } = await assertSeller();
    const parsed = z.object({ requestedName: z.string().trim().min(2).max(60), reason: z.string().trim().min(10, "Explain why your business name is changing.").max(1000) }).safeParse(Object.fromEntries(form));
    if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
    if (parsed.data.requestedName === seller.storeName) return { message: "Enter a different business name." };
    const rows = await db.$queryRaw<{ id: string }[]>`INSERT INTO "BusinessNameChange" ("id", "sellerId", "previousName", "requestedName", "reason")
      VALUES (${randomUUID()}, ${seller.id}, ${seller.storeName}, ${parsed.data.requestedName}, ${parsed.data.reason}) ON CONFLICT DO NOTHING RETURNING "id"`;
    if (!rows.length) return { message: "You already have a name change awaiting review." };
    revalidatePath("/seller/settings"); revalidatePath("/admin/business-names");
    return { ok: true, message: "Name change sent for admin review. Your current name stays live until approved." };
  } catch (error) { if (error instanceof AccessDenied) return { message: error.message }; throw error; }
}

export async function reviewBusinessNameAction(_: StepState, form: FormData): Promise<StepState> {
  try {
    const admin = await assertAdmin();
    const d = z.object({ id: z.string().min(1), decision: z.enum(["APPROVED", "REJECTED"]), notes: z.string().trim().max(1000) }).parse(Object.fromEntries(form));
    if (d.decision === "REJECTED" && d.notes.length < 5) return { message: "Add a reason so the jeweler understands the decision." };
    const slug = await db.$transaction(async (tx) => {
      return applyNameReview(tx, admin.id, d);
    });
    if (!slug) return { message: "This request has already been reviewed." };
    for (const path of ["/seller/settings", "/seller/preview", "/jewelers", `/jewelers/${slug}`, "/admin/business-names", "/custom-orders"]) revalidatePath(path);
    return { ok: true, message: `Name change ${d.decision.toLowerCase()}.` };
  } catch (error) { if (error instanceof AccessDenied || error instanceof z.ZodError) return { message: "Unable to review this name change. Check your input and access." }; throw error; }
}
