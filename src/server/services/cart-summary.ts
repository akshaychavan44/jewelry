import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/server/db";

export const CART_COOKIE = "loupe_cart";

/** Cart owner for this request: the signed-in user, else the guest cookie. */
export async function cartOwner(userId?: string | null) {
  if (userId) return { userId } as const;
  const token = (await cookies()).get(CART_COOKIE)?.value;
  return token ? ({ guestToken: token } as const) : null;
}

export const getCartCount = cache(async (userId?: string | null) => {
  const owner = await cartOwner(userId);
  if (!owner) return 0;
  const agg = await db.cartItem.aggregate({
    where: { cart: "userId" in owner ? { userId: owner.userId } : { guestToken: owner.guestToken } },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
});
