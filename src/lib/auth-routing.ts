import type { Role } from "@/generated/prisma/enums";

export type LoginIntent = "buyer" | "seller" | "admin";

export function safeCallback(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return undefined;
  return value;
}

export function homeFor(role: Role) {
  return role === "ADMIN" ? "/admin" : role === "SELLER" ? "/seller" : "/account";
}

export function loginHref(intent: LoginIntent, callback?: string) {
  const path = intent === "admin" ? "/admin/login" : intent === "seller" ? "/jeweler/login" : "/login";
  const destination = safeCallback(callback);
  return destination ? `${path}?callbackUrl=${encodeURIComponent(destination)}` : path;
}

export function loginForDestination(callback?: string) {
  const path = safeCallback(callback)?.split(/[?#]/)[0];
  if (path === "/admin" || path?.startsWith("/admin/")) return loginHref("admin", callback);
  return loginHref(path === "/seller" || path?.startsWith("/seller/") ? "seller" : "buyer", callback);
}

