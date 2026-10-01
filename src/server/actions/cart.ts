"use server";

import { revalidatePath } from "next/cache";
import type { EngravingStyle } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { track } from "@/server/services/analytics";
import { addToCart, CartError, removeCartItem, updateCartQuantity } from "@/server/services/cart";

export type ActionResult = { ok: boolean; message: string; href?: string; requiresAuth?: boolean };

export async function addToCartAction(input: {
  variantId: string;
  quantity?: number;
  ringSize?: number | null;
  chainLengthMm?: number | null;
  engravingText?: string | null;
  engravingStyle?: EngravingStyle | null;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  try {
    const { product } = await addToCart(input, user?.id);
    await track("ADD_TO_CART", { userId: user?.id, productId: product.id, sellerId: product.sellerId });
    revalidatePath("/", "layout");
    return { ok: true, message: `${product.title} was added to your cart.`, href: "/cart" };
  } catch (error) {
    if (error instanceof CartError) return { ok: false, message: error.message };
    throw error;
  }
}

export async function updateCartItemAction(itemId: string, quantity: number): Promise<ActionResult> {
  const user = await getCurrentUser();
  try {
    await updateCartQuantity(itemId, quantity, user?.id);
    revalidatePath("/", "layout");
    return { ok: true, message: quantity > 0 ? "Quantity updated." : "Removed from your cart." };
  } catch (error) {
    if (error instanceof CartError) return { ok: false, message: error.message };
    throw error;
  }
}

export async function removeCartItemAction(itemId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  try {
    await removeCartItem(itemId, user?.id);
    revalidatePath("/", "layout");
    return { ok: true, message: "Removed from your cart." };
  } catch (error) {
    if (error instanceof CartError) return { ok: false, message: error.message };
    throw error;
  }
}

/** Accepted offer → cart at the negotiated price. */
export async function addOfferToCartAction(offerId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, requiresAuth: true, message: "Sign in to continue." };
  const offer = await db.offer.findFirst({ where: { id: offerId, buyerId: user.id, status: "ACCEPTED" } });
  if (!offer?.variantId) return { ok: false, message: "This offer can't be checked out." };
  if (offer.purchaseDeadline && offer.purchaseDeadline < new Date()) return { ok: false, message: "The checkout window for this offer has closed." };
  const already = await db.cartItem.findUnique({ where: { offerId: offer.id } });
  if (already) return { ok: true, message: "Already in your cart.", href: "/cart" };
  try {
    await addToCart({ variantId: offer.variantId, offerId: offer.id }, user.id);
  } catch (error) {
    if (error instanceof CartError) return { ok: false, message: error.message };
    throw error;
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Added to your cart at the agreed price.", href: "/cart" };
}
