"use server";

import { assertUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { openConversation } from "@/server/services/messaging";
import type { ActionResult } from "./cart";

/** Opens (or reuses) the buyer ↔ jeweler thread for one vendor's part of an order. */
export async function messageAboutOrderAction(sellerOrderId: string): Promise<ActionResult> {
  const user = await assertUser();
  const so = await db.sellerOrder.findUnique({ where: { id: sellerOrderId }, include: { order: true, seller: { select: { id: true, userId: true } } } });
  if (!so || so.order.buyerId !== user.id) return { ok: false, message: "Order not found." };
  const convo = await openConversation(db, {
    type: "ORDER",
    subject: `Order ${so.reference}`,
    buyerId: user.id,
    sellerId: so.seller.id,
    sellerUserId: so.seller.userId,
    sellerOrderId: so.id,
  });
  return { ok: true, message: "Opening conversation…", href: `/account/messages/${convo.id}` };
}
