import "server-only";

import type { ActorType } from "@/generated/prisma/enums";
import { formatMoney } from "@/lib/money";
import { num } from "@/lib/utils";
import { db } from "@/server/db";
import { notify, openConversation, postMessage } from "./messaging";

export class OfferError extends Error {}

async function settings() {
  return db.platformSettings.findUniqueOrThrow({ where: { id: "platform" }, select: { offerExpiryHours: true, minOfferBps: true } });
}

/**
 * Buyer makes an offer (amount in the listing currency). Offers under the
 * jeweler's private floor are declined automatically without revealing it.
 */
export async function createOffer(args: { buyerId: string; productId: string; variantId?: string | null; amountMinor: number; message?: string }) {
  const product = await db.product.findUnique({
    where: { id: args.productId },
    include: { variants: { where: { isActive: true } }, seller: { select: { id: true, userId: true, storeName: true, verificationStatus: true } } },
  });
  if (!product || product.status !== "ACTIVE" || product.seller.verificationStatus !== "APPROVED") throw new OfferError("This piece is no longer available.");
  if (!product.acceptsOffers) throw new OfferError("This jeweler isn't accepting offers on this piece.");
  if (product.seller.userId === args.buyerId) throw new OfferError("You can't make an offer on your own listing.");

  const variant = product.variants.find((v) => v.id === args.variantId) ?? product.variants[0];
  const listPrice = num(variant.priceMinor);
  const { offerExpiryHours, minOfferBps } = await settings();

  if (args.amountMinor >= listPrice) throw new OfferError("Your offer is at or above the list price — you can simply add it to your cart.");
  if (args.amountMinor < Math.round((listPrice * minOfferBps) / 10_000)) {
    throw new OfferError(`Offers must be at least ${minOfferBps / 100}% of the list price.`);
  }
  const open = await db.offer.findFirst({ where: { buyerId: args.buyerId, productId: product.id, status: { in: ["PENDING", "COUNTERED", "ACCEPTED"] } } });
  if (open) throw new OfferError("You already have an offer in progress on this piece. You'll find it under Account → Offers.");

  const belowFloor = product.offerFloorMinor !== null && args.amountMinor < num(product.offerFloorMinor);
  const expiresAt = new Date(Date.now() + offerExpiryHours * 3_600_000);
  const amountLabel = formatMoney(args.amountMinor, product.currency);

  return db.$transaction(async (tx) => {
    const offer = await tx.offer.create({
      data: {
        productId: product.id,
        variantId: variant.id,
        buyerId: args.buyerId,
        sellerId: product.seller.id,
        status: belowFloor ? "DECLINED" : "PENDING",
        currency: product.currency,
        listPriceMinor: listPrice,
        currentAmountMinor: args.amountMinor,
        lastActor: belowFloor ? "SYSTEM" : "BUYER",
        expiresAt,
        events: {
          create: [
            { actor: "BUYER", actorId: args.buyerId, action: "OFFER", amountMinor: args.amountMinor, message: args.message || null },
            ...(belowFloor ? [{ actor: "SYSTEM" as ActorType, action: "DECLINE" as const, message: "Below the jeweler's minimum offer." }] : []),
          ],
        },
      },
    });
    if (!belowFloor) {
      const convo = await openConversation(tx, {
        type: "OFFER",
        subject: `Offer · ${product.title}`,
        buyerId: args.buyerId,
        sellerId: product.seller.id,
        sellerUserId: product.seller.userId,
        productId: product.id,
        offerId: offer.id,
      });
      await postMessage(tx, convo.id, null, `New offer of ${amountLabel} on ${product.title}.`, { isSystem: true });
      if (args.message) await postMessage(tx, convo.id, args.buyerId, args.message);
      await notify(tx, product.seller.userId, "OFFER", "New offer received", `${product.title} · ${amountLabel}`, "/seller/offers");
    }
    return { offer, declined: belowFloor };
  });
}

type Response = { action: "ACCEPT" | "DECLINE" | "COUNTER" | "WITHDRAW"; amountMinor?: number; message?: string };

/** Seller or buyer responds to the latest move in a negotiation. */
export async function respondToOffer(offerId: string, actor: { userId: string; as: "BUYER" | "SELLER" }, response: Response) {
  const offer = await db.offer.findUnique({
    where: { id: offerId },
    include: { product: { select: { title: true, currency: true } }, seller: { select: { userId: true, storeName: true } }, conversation: true },
  });
  if (!offer) throw new OfferError("Offer not found.");
  const isBuyer = actor.as === "BUYER" && offer.buyerId === actor.userId;
  const isSeller = actor.as === "SELLER" && offer.seller.userId === actor.userId;
  if (!isBuyer && !isSeller) throw new OfferError("You can't respond to this offer.");
  if (!["PENDING", "COUNTERED"].includes(offer.status)) throw new OfferError("This offer is no longer open.");
  if (offer.expiresAt < new Date()) {
    await db.offer.update({ where: { id: offer.id }, data: { status: "EXPIRED" } });
    throw new OfferError("This offer has expired.");
  }

  // Only the party *awaiting* a response may accept, decline or counter.
  const awaitingSeller = offer.lastActor === "BUYER";
  if (response.action !== "WITHDRAW" && ((isSeller && !awaitingSeller) || (isBuyer && awaitingSeller))) {
    throw new OfferError("Waiting for the other party to respond.");
  }
  if (response.action === "WITHDRAW" && !isBuyer) throw new OfferError("Only the buyer can withdraw an offer.");

  const { offerExpiryHours } = await settings();
  const now = new Date();
  const listPrice = num(offer.listPriceMinor);
  const current = num(offer.currentAmountMinor);
  let data: Parameters<typeof db.offer.update>[0]["data"] = {};
  let summary = "";

  switch (response.action) {
    case "ACCEPT":
      data = { status: "ACCEPTED", acceptedAmountMinor: current, acceptedAt: now, purchaseDeadline: new Date(now.getTime() + offerExpiryHours * 3_600_000), lastActor: actor.as };
      summary = `Offer accepted at ${formatMoney(current, offer.currency)}.`;
      break;
    case "DECLINE":
      data = { status: "DECLINED", lastActor: actor.as };
      summary = "Offer declined.";
      break;
    case "WITHDRAW":
      data = { status: "WITHDRAWN", lastActor: "BUYER" };
      summary = "Offer withdrawn.";
      break;
    case "COUNTER": {
      const amount = response.amountMinor ?? 0;
      if (amount <= 0 || amount >= listPrice) throw new OfferError("A counter-offer must be below the list price.");
      if (isSeller && amount <= current) throw new OfferError("Counter with an amount above the buyer's offer — or accept it.");
      if (isBuyer && amount <= current) throw new OfferError("Counter with an amount above your previous offer.");
      data = { status: "COUNTERED", currentAmountMinor: amount, lastActor: actor.as, expiresAt: new Date(now.getTime() + offerExpiryHours * 3_600_000) };
      summary = `${isSeller ? offer.seller.storeName : "The buyer"} countered at ${formatMoney(amount, offer.currency)}.`;
      break;
    }
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.offer.update({ where: { id: offer.id }, data });
    await tx.offerEvent.create({
      data: { offerId: offer.id, actor: actor.as, actorId: actor.userId, action: response.action, amountMinor: response.action === "COUNTER" ? response.amountMinor : current, message: response.message || null },
    });
    if (offer.conversation) {
      await postMessage(tx, offer.conversation.id, null, summary, { isSystem: true });
      if (response.message) await postMessage(tx, offer.conversation.id, actor.userId, response.message);
    }
    const recipient = isSeller ? offer.buyerId : offer.seller.userId;
    await notify(tx, recipient, "OFFER", summary, offer.product.title, isSeller ? "/account/offers" : "/seller/offers");
    return updated;
  });
}
