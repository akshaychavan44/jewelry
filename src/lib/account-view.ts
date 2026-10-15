import type { Role } from "./domain-enums";

export type AccountView = "customer" | "seller";
export const ACCOUNT_VIEW_COOKIE = "loupe_account_view";

/** A display preference only; authorization always uses the stored account role. */
export function accountViewFor(role: Role | undefined, preference?: string): AccountView {
  return role === "SELLER" && preference !== "customer" ? "seller" : "customer";
}

export function canReviewJeweler(role: Role, authorId: string, sellerUserId: string) {
  return (role === "BUYER" || role === "SELLER") && authorId !== sellerUserId;
}
