import "server-only";
import { cookies } from "next/headers";
import { ACCOUNT_VIEW_COOKIE, accountViewFor, type AccountView } from "@/lib/account-view";
import type { Role } from "@/lib/domain-enums";

export async function getAccountView(role?: Role) {
  return accountViewFor(role, (await cookies()).get(ACCOUNT_VIEW_COOKIE)?.value);
}

export async function setAccountView(view: AccountView) {
  (await cookies()).set(ACCOUNT_VIEW_COOKIE, view, {
    path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}
