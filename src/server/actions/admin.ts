"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DisputeResolution } from "@/lib/domain-enums";
import { toMinor } from "@/lib/money";
import { AccessDenied, assertAdmin } from "@/server/auth/session";
import { db } from "@/server/db";
import {
  AdminError,
  disputeUpdateSchema,
  kycDecisionSchema,
  reinstateSeller,
  reviewCertificate,
  reviewKyc,
  setUserStatus,
  suspendSeller,
  updateDisputeCase,
  updateVerificationSettings,
  verificationSettingsSchema,
  updateSellerControls,
} from "@/server/services/admin";
import { AfterSalesError, resolveDispute } from "@/server/services/after-sales";
import type { ActionResult } from "./cart";

// Every admin mutation re-checks the role against the database, validates its
// input, and writes an audit-log entry in the service layer.
async function run(fn: (adminId: string) => Promise<string>, paths: string[] = []): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    const message = await fn(admin.id);
    for (const p of paths) revalidatePath(p, "layout");
    return { ok: true, message };
  } catch (error) {
    if (error instanceof AdminError || error instanceof AfterSalesError || error instanceof AccessDenied) return { ok: false, message: error.message };
    if (error instanceof z.ZodError) return { ok: false, message: error.issues[0]?.message ?? "Check the form." };
    throw error;
  }
}

// ── Verification ──────────────────────────────────────────────────────────────

export async function reviewKycAction(input: z.input<typeof kycDecisionSchema>) {
  return run(async (adminId) => {
    const data = kycDecisionSchema.parse(input);
    await reviewKyc(adminId, data);
    return data.decision === "APPROVE" ? "Approved - the jeweler now has a verified badge." : "Sent back to the jeweler with your notes.";
  }, ["/admin", "/jewelers", "/shop", "/custom-orders", "/seller", "/account/favorite-stores", "/product"]);
}

export async function suspendSellerAction(sellerId: string, reason: string) {
  return run(async (adminId) => {
    await suspendSeller(adminId, sellerId, reason);
    return "Store suspended. Listings are hidden.";
  }, ["/admin", "/jewelers", "/shop"]);
}

export async function reinstateSellerAction(sellerId: string) {
  return run(async (adminId) => {
    await reinstateSeller(adminId, sellerId);
    return "Store reinstated.";
  }, ["/admin", "/jewelers", "/shop"]);
}

export async function updateSellerControlsAction(sellerId: string, patch: { isFeatured: boolean; isTopRated: boolean }) {
  return run(async (adminId) => {
    await updateSellerControls(adminId, sellerId, patch);
    return "Store controls saved.";
  }, ["/admin", "/jewelers", "/"]);
}

export async function reviewCertificateAction(certificateId: string, decision: "VERIFY" | "REJECT", note?: string) {
  return run(async (adminId) => {
    await reviewCertificate(adminId, certificateId, decision, note);
    return decision === "VERIFY" ? "Certificate verified." : "Certificate rejected — the jeweler has been told why.";
  }, ["/admin/certificates", "/shop"]);
}

// ── Disputes ──────────────────────────────────────────────────────────────────

export async function updateDisputeAction(input: z.input<typeof disputeUpdateSchema>) {
  return run(async (adminId) => {
    await updateDisputeCase(adminId, disputeUpdateSchema.parse(input));
    return "Case updated.";
  }, ["/admin/disputes"]);
}

const resolveSchema = z.object({
  disputeId: z.string().min(1),
  resolution: z.enum(DisputeResolution),
  refundAmount: z.coerce.number().min(0).optional(),
  notes: z.string().trim().min(10, "Explain the decision to both parties (at least a sentence)."),
});

export async function resolveDisputeAction(input: z.input<typeof resolveSchema>) {
  return run(async (adminId) => {
    const data = resolveSchema.parse(input);
    const dispute = await db.dispute.findUnique({ where: { id: data.disputeId }, select: { currency: true } });
    if (!dispute) throw new AdminError("Case not found.");
    await resolveDispute({
      adminId,
      disputeId: data.disputeId,
      resolution: data.resolution,
      refundAmountMinor: data.resolution === "PARTIAL_REFUND" && data.refundAmount ? toMinor(data.refundAmount, dispute.currency) : undefined,
      notes: data.notes,
    });
    return ["FULL_REFUND", "PARTIAL_REFUND", "RETURN_AND_REFUND"].includes(data.resolution) ? "Resolved — the refund has been issued and the jeweler's share reversed." : "Resolved — held funds are released to the jeweler.";
  }, ["/admin/disputes"]);
}

// ── Monetization ──────────────────────────────────────────────────────────────

export async function updateVerificationSettingsAction(input: z.input<typeof verificationSettingsSchema>) {
  return run(async (adminId) => {
    await updateVerificationSettings(adminId, verificationSettingsSchema.parse(input));
    return "Verification settings saved.";
  }, ["/admin", "/seller/onboarding"]);
}

export async function setUserStatusAction(userId: string, status: "ACTIVE" | "SUSPENDED") {
  return run(async (adminId) => {
    await setUserStatus(adminId, userId, status);
    return status === "SUSPENDED" ? "Account suspended — they've been signed out." : "Account reactivated.";
  }, ["/admin/users"]);
}
