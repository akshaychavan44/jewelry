"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DisputeReason, ReturnReason, ServiceType, Gemstone, MetalType } from "@/generated/prisma/enums";
import { isCurrency, toMinor } from "@/lib/money";
import { randomCode } from "@/lib/utils";
import { assertUser, getSellerForUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { acceptQuote, AfterSalesError, createRefund, createReview, createServiceRequest, declineQuote, openDispute, requestReturn } from "@/server/services/after-sales";
import { notify, postMessage } from "@/server/services/messaging";
import type { ActionResult } from "./cart";

async function run(fn: () => Promise<ActionResult | void>, paths: string[] = []): Promise<ActionResult> {
  try {
    const res = await fn();
    for (const p of paths) revalidatePath(p);
    return res ?? { ok: true, message: "Saved." };
  } catch (error) {
    if (error instanceof AfterSalesError) return { ok: false, message: error.message };
    if (error instanceof z.ZodError) return { ok: false, message: error.issues[0]?.message ?? "Check the form." };
    throw error;
  }
}

export async function requestReturnAction(input: { sellerOrderId: string; itemIds: string[]; reason: string; details?: string }) {
  const user = await assertUser();
  return run(async () => {
    const reason = z.enum(ReturnReason).parse(input.reason);
    const rma = await requestReturn({ buyerId: user.id, sellerOrderId: input.sellerOrderId, itemIds: input.itemIds, reason, details: input.details?.slice(0, 1500) });
    return { ok: true, message: `Return ${rma.rmaNumber} requested. The jeweler will reply within two working days.` };
  }, ["/account/orders"]);
}

export async function openDisputeAction(input: { sellerOrderId: string; reason: string; description: string }) {
  const user = await assertUser();
  return run(async () => {
    const reason = z.enum(DisputeReason).parse(input.reason);
    const dispute = await openDispute({ buyerId: user.id, sellerOrderId: input.sellerOrderId, reason, description: input.description.slice(0, 3000) });
    return { ok: true, message: `Case ${dispute.caseNumber} opened. Funds are on hold while Loupe mediates.`, href: "/account/messages" };
  }, ["/account/orders", "/account/messages"]);
}

export async function cancelSellerOrderAction(sellerOrderId: string) {
  const user = await assertUser();
  return run(async () => {
    const so = await db.sellerOrder.findUnique({ where: { id: sellerOrderId }, include: { order: true, seller: { select: { userId: true } } } });
    if (!so || so.order.buyerId !== user.id) throw new AfterSalesError("Order not found.");
    if (so.status !== "PENDING") throw new AfterSalesError("The jeweler has already started on this order — message them to ask about cancelling.");
    await createRefund({ orderId: so.orderId, sellerOrderId: so.id, amountMinor: Number(so.totalMinor), reason: "Cancelled by buyer before processing", initiatedBy: "BUYER", initiatedById: user.id, sellerAtFault: true });
    await db.sellerOrder.update({ where: { id: so.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    await notify(db, so.seller.userId, "ORDER", "Order cancelled by buyer", so.reference, `/seller/orders/${so.id}`);
    return { ok: true, message: "Cancelled and refunded in full." };
  }, ["/account/orders"]);
}

export async function createReviewAction(input: { orderItemId: string; rating: number; title?: string; body: string }) {
  const user = await assertUser();
  return run(async () => {
    await createReview({ authorId: user.id, orderItemId: input.orderItemId, rating: input.rating, title: input.title, body: input.body });
    return { ok: true, message: "Thank you — your review is live." };
  }, ["/account/orders"]);
}

export async function createServiceRequestAction(input: { orderItemId: string; type: string; description: string }) {
  const user = await assertUser();
  return run(async () => {
    const type = z.enum(ServiceType).parse(input.type);
    const ticket = await createServiceRequest({ buyerId: user.id, orderItemId: input.orderItemId, type, description: input.description });
    return { ok: true, message: `Request ${ticket.ticketNumber} sent to the jeweler.${ticket.coveredByWarranty ? " It's covered by your warranty." : ""}` };
  }, ["/account/warranty"]);
}

const customSchema = z.object({
  title: z.string().trim().min(6, "Give your request a short title."),
  description: z.string().trim().min(40, "Describe the piece in a little more detail (40+ characters)."),
  categoryId: z.string().optional(),
  sellerSlug: z.string().optional(),
  budgetMin: z.coerce.number().nonnegative().optional(),
  budgetMax: z.coerce.number().positive("Enter a maximum budget."),
  currency: z.string().refine((c) => isCurrency(c), "Choose a currency."),
  metal: z.enum(MetalType).optional(),
  gemstone: z.enum(Gemstone).optional(),
  ringSize: z.coerce.number().min(3).max(13).optional(),
  neededBy: z.string().optional(),
});

export type CustomRequestState = { ok?: boolean; message?: string; fieldErrors?: Record<string, string[] | undefined> };

export async function createCustomRequestAction(_: CustomRequestState, formData: FormData): Promise<CustomRequestState> {
  const user = await assertUser();
  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => v !== ""));
  const parsed = customSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const d = parsed.data;
  const seller = d.sellerSlug ? await db.sellerProfile.findUnique({ where: { slug: d.sellerSlug }, select: { id: true, userId: true, acceptsCustomOrders: true, verificationStatus: true } }) : null;
  if (seller && (!seller.acceptsCustomOrders || seller.verificationStatus !== "APPROVED")) return { message: "That jeweler isn't taking commissions right now." };

  const request = await db.customRequest.create({
    data: {
      reference: `CR-${randomCode(6)}`,
      buyerId: user.id,
      sellerId: seller?.id,
      categoryId: d.categoryId || null,
      title: d.title,
      description: d.description,
      budgetMinMinor: d.budgetMin !== undefined ? toMinor(d.budgetMin, d.currency) : null,
      budgetMaxMinor: toMinor(d.budgetMax, d.currency),
      currency: d.currency,
      metalPreference: d.metal,
      gemstonePreference: d.gemstone,
      ringSize: d.ringSize,
      neededBy: d.neededBy ? new Date(d.neededBy) : null,
    },
  });
  // Directed requests notify one jeweler; open requests go to jewelers who take commissions.
  const recipients = seller
    ? [seller.userId]
    : (await db.sellerProfile.findMany({ where: { verificationStatus: "APPROVED", acceptsCustomOrders: true }, select: { userId: true }, take: 25 })).map((s) => s.userId);
  for (const id of recipients) await notify(db, id, "CUSTOM_REQUEST", "New commission request", request.title, "/seller/custom-requests");
  revalidatePath("/account/custom-requests");
  return { ok: true, message: `Request ${request.reference} sent. Quotes usually arrive within 48 hours.` };
}

export async function acceptQuoteAction(quoteId: string) {
  const user = await assertUser();
  return run(async () => {
    await acceptQuote(user.id, quoteId);
    return { ok: true, message: "Quote accepted — the jeweler will be in touch about the deposit." };
  }, ["/account/custom-requests"]);
}

export async function declineQuoteAction(quoteId: string) {
  const user = await assertUser();
  return run(async () => {
    await declineQuote(user.id, quoteId);
    return { ok: true, message: "Quote declined." };
  }, ["/account/custom-requests"]);
}

/** Buyers, the store's owner, or admins may post in a conversation they can see. */
export async function sendMessageAction(conversationId: string, body: string): Promise<ActionResult> {
  const user = await assertUser();
  const text = body.trim();
  if (!text) return { ok: false, message: "Write a message first." };
  if (text.length > 4000) return { ok: false, message: "Messages are limited to 4,000 characters." };
  const convo = await db.conversation.findUnique({ where: { id: conversationId }, include: { participants: true, seller: { select: { userId: true } } } });
  if (!convo) return { ok: false, message: "Conversation not found." };
  const seller = user.role === "SELLER" ? await getSellerForUser(user.id) : null;
  const allowed = convo.participants.some((p) => p.userId === user.id) || (seller && convo.sellerId === seller.id) || user.role === "ADMIN";
  if (!allowed) return { ok: false, message: "You can't post in this conversation." };

  await db.$transaction(async (tx) => {
    if (!convo.participants.some((p) => p.userId === user.id)) {
      await tx.conversationParticipant.create({ data: { conversationId, userId: user.id, role: user.role } });
    }
    await postMessage(tx, conversationId, user.id, text);
    const recipients = convo.participants.filter((p) => p.userId !== user.id);
    for (const r of recipients) {
      const href = r.role === "SELLER" ? `/seller/messages/${conversationId}` : r.role === "ADMIN" ? `/admin/disputes` : `/account/messages/${conversationId}`;
      await notify(tx, r.userId, "MESSAGE", `New message from ${user.name ?? "Loupe"}`, text.slice(0, 90), href);
    }
  });
  revalidatePath(`/account/messages/${conversationId}`);
  revalidatePath(`/seller/messages/${conversationId}`);
  return { ok: true, message: "Sent." };
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name."),
  phone: z.string().trim().optional(),
  preferredCurrency: z.string().refine((c) => isCurrency(c), "Choose a currency."),
  marketingOptIn: z.boolean(),
});

export async function updateProfileAction(input: z.input<typeof profileSchema>) {
  const user = await assertUser();
  return run(async () => {
    const data = profileSchema.parse(input);
    await db.user.update({ where: { id: user.id }, data });
    return { ok: true, message: "Profile updated." };
  }, ["/account/settings"]);
}

export async function changePasswordAction(input: { current: string; next: string }) {
  const user = await assertUser();
  return run(async () => {
    const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (record.passwordHash && !(await bcrypt.compare(input.current, record.passwordHash))) throw new AfterSalesError("Your current password is incorrect.");
    if (input.next.length < 8 || !/[A-Za-z]/.test(input.next) || !/\d/.test(input.next)) throw new AfterSalesError("Use at least 8 characters, with a letter and a number.");
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(input.next, 12) } });
    return { ok: true, message: "Password changed." };
  });
}

export async function setDefaultCardAction(id: string) {
  const user = await assertUser();
  return run(async () => {
    await db.$transaction([
      db.paymentMethod.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
      db.paymentMethod.updateMany({ where: { id, userId: user.id }, data: { isDefault: true } }),
    ]);
    return { ok: true, message: "Default card updated." };
  }, ["/account/payment-methods"]);
}

export async function removeCardAction(id: string) {
  const user = await assertUser();
  return run(async () => {
    await db.paymentMethod.deleteMany({ where: { id, userId: user.id } });
    return { ok: true, message: "Card removed." };
  }, ["/account/payment-methods"]);
}

/** Demo mode only: stores a tokenised test card (never real card numbers). */
export async function addDemoCardAction(brand: "visa" | "mastercard" | "amex") {
  const user = await assertUser();
  if (process.env.STRIPE_SECRET_KEY) return { ok: false, message: "Add cards through the secure Stripe form." };
  return run(async () => {
    const last4 = brand === "amex" ? "0005" : brand === "mastercard" ? "4444" : "1881";
    await db.paymentMethod.create({ data: { userId: user.id, provider: "DEMO", providerPaymentMethodId: `pm_demo_${randomCode(12, "abcdefghijklmnopqrstuvwxyz0123456789")}`, brand, last4, expMonth: 12, expYear: new Date().getFullYear() + 3, billingName: user.name } });
    return { ok: true, message: "Test card added." };
  }, ["/account/payment-methods"]);
}

export async function markNotificationsReadAction() {
  const user = await assertUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/account");
}
