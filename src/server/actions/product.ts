"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { convertMinor, formatMoney, toMinor } from "@/lib/money";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { getPriceContext } from "@/server/services/currency";
import { notify, openConversation, postMessage } from "@/server/services/messaging";
import { createOffer, OfferError, respondToOffer } from "@/server/services/offers";
import type { ActionResult } from "./cart";

const offerSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  amount: z.number().positive("Enter an amount."),
  message: z.string().max(600).optional(),
});

/** `amount` is in the shopper's display currency (major units). */
export async function makeOfferAction(input: z.input<typeof offerSchema>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, requiresAuth: true, message: "Sign in to make an offer." };
  const parsed = offerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check your offer." };

  const product = await db.product.findUnique({ where: { id: parsed.data.productId }, select: { currency: true, slug: true } });
  if (!product) return { ok: false, message: "This piece is no longer available." };
  const ctx = await getPriceContext();
  const amountMinor = convertMinor(toMinor(parsed.data.amount, ctx.currency), ctx.currency, product.currency, ctx.rates, "exact");

  try {
    const { declined } = await createOffer({ buyerId: user.id, productId: parsed.data.productId, variantId: parsed.data.variantId, amountMinor, message: parsed.data.message });
    revalidatePath("/account/offers");
    if (declined) {
      return { ok: false, message: `Your offer of ${formatMoney(amountMinor, product.currency)} is below what this jeweler can accept. Try a higher amount.` };
    }
    return { ok: true, message: "Offer sent. The jeweler has 48 hours to respond — we'll notify you.", href: "/account/offers" };
  } catch (error) {
    if (error instanceof OfferError) return { ok: false, message: error.message };
    throw error;
  }
}

export async function respondToOfferAction(offerId: string, as: "BUYER" | "SELLER", action: "ACCEPT" | "DECLINE" | "COUNTER" | "WITHDRAW", amount?: number, message?: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, requiresAuth: true, message: "Sign in to continue." };
  try {
    const offer = await db.offer.findUnique({ where: { id: offerId }, select: { currency: true } });
    if (!offer) return { ok: false, message: "Offer not found." };
    // Counter amounts are entered in the offer (listing) currency.
    const amountMinor = amount !== undefined ? toMinor(amount, offer.currency) : undefined;
    await respondToOffer(offerId, { userId: user.id, as }, { action, amountMinor, message });
    revalidatePath(as === "SELLER" ? "/seller/offers" : "/account/offers");
    const verbs = { ACCEPT: "Offer accepted.", DECLINE: "Offer declined.", COUNTER: "Counter-offer sent.", WITHDRAW: "Offer withdrawn." };
    return { ok: true, message: verbs[action] };
  } catch (error) {
    if (error instanceof OfferError) return { ok: false, message: error.message };
    throw error;
  }
}

export async function askJewelerAction(input: { productId: string; message: string }): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, requiresAuth: true, message: "Sign in to message the jeweler." };
  const message = input.message.trim();
  if (message.length < 5) return { ok: false, message: "Write a little more so the jeweler can help." };
  if (message.length > 2000) return { ok: false, message: "Keep your message under 2,000 characters." };

  const product = await db.product.findUnique({ where: { id: input.productId }, include: { seller: { select: { id: true, userId: true } } } });
  if (!product) return { ok: false, message: "This piece is no longer available." };
  if (product.seller.userId === user.id) return { ok: false, message: "This is your own listing." };

  const conversationId = await db.$transaction(async (tx) => {
    const convo = await openConversation(tx, {
      type: "PRODUCT_INQUIRY",
      subject: product.title,
      buyerId: user.id,
      sellerId: product.seller.id,
      sellerUserId: product.seller.userId,
      productId: product.id,
    });
    await postMessage(tx, convo.id, user.id, message);
    await notify(tx, product.seller.userId, "MESSAGE", `New question from ${user.name ?? "a buyer"}`, product.title, `/seller/messages/${convo.id}`);
    return convo.id;
  });
  revalidatePath("/account/messages");
  return { ok: true, message: "Message sent — jewelers usually reply within a few hours.", href: `/account/messages/${conversationId}` };
}
