"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";

export type ToggleResult = { ok: true; saved: boolean } | { ok: false; requiresAuth?: boolean; message: string };

export async function toggleWishlist(productId: string): Promise<ToggleResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, requiresAuth: true, message: "Sign in to save pieces." };

  const existing = await db.wishlistItem.findUnique({ where: { userId_productId: { userId: user.id, productId } } });
  if (existing) {
    await db.$transaction([
      db.wishlistItem.delete({ where: { id: existing.id } }),
      db.product.update({ where: { id: productId }, data: { wishlistCount: { decrement: 1 } } }),
    ]);
  } else {
    const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) return { ok: false, message: "This piece is no longer available." };
    await db.$transaction([
      db.wishlistItem.create({ data: { userId: user.id, productId } }),
      db.product.update({ where: { id: productId }, data: { wishlistCount: { increment: 1 } } }),
    ]);
  }
  revalidatePath("/account/wishlist");
  return { ok: true, saved: !existing };
}

export async function toggleFavoriteStore(sellerId: string): Promise<ToggleResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, requiresAuth: true, message: "Sign in to follow jewelers." };
  const existing = await db.favoriteStore.findUnique({ where: { userId_sellerId: { userId: user.id, sellerId } } });
  if (existing) await db.favoriteStore.delete({ where: { id: existing.id } });
  else await db.favoriteStore.create({ data: { userId: user.id, sellerId } });
  revalidatePath("/account/favorite-stores");
  return { ok: true, saved: !existing };
}
