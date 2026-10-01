import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/server/db";
import { auth } from "./index";

// Route protection in `proxy.ts` is only the first line of defence. Every page,
// server action and route handler re-checks access here against the database.

export const getSession = cache(async () => auth());

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      status: true,
      country: true,
      preferredCurrency: true,
    },
  });
  if (!user || user.status !== "ACTIVE") return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(callbackUrl?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`);
  return user;
}

export async function requireRole(roles: Role[], callbackUrl?: string) {
  const user = await requireUser(callbackUrl);
  if (!roles.includes(user.role)) redirect("/");
  return user;
}

export async function requireAdmin() {
  return requireRole(["ADMIN"], "/admin");
}

export const getSellerForUser = cache(async (userId: string) =>
  db.sellerProfile.findUnique({ where: { userId } }),
);

/**
 * Seller guard. Dashboard features require an APPROVED store; onboarding pages
 * pass `{ verified: false }`.
 */
export async function requireSeller({ verified = true }: { verified?: boolean } = {}) {
  const user = await requireUser("/seller");
  if (user.role !== "SELLER") redirect("/sell");
  const seller = await getSellerForUser(user.id);
  if (!seller) redirect("/sell");
  if (verified && seller.verificationStatus !== "APPROVED") redirect("/seller/onboarding");
  return { user, seller };
}

/** For server actions: throw instead of redirecting. */
export class AccessDenied extends Error {
  constructor(message = "You don't have access to do that.") {
    super(message);
  }
}

export async function assertUser() {
  const user = await getCurrentUser();
  if (!user) throw new AccessDenied("Sign in to continue.");
  return user;
}

export async function assertSeller({ verified = true }: { verified?: boolean } = {}) {
  const user = await assertUser();
  const seller = await getSellerForUser(user.id);
  if (user.role !== "SELLER" || !seller) throw new AccessDenied("A jeweler account is required.");
  if (verified && seller.verificationStatus !== "APPROVED") {
    throw new AccessDenied("Your store must be approved before you can do this.");
  }
  return { user, seller };
}

export async function assertAdmin() {
  const user = await assertUser();
  if (user.role !== "ADMIN") throw new AccessDenied();
  return user;
}
