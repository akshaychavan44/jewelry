import type { Role } from "@/lib/domain-enums";

export type LoginIntent = "buyer" | "seller" | "admin";

export function canUseLogin(role: Role, intent: LoginIntent) {
  if (intent === "admin") return role === "ADMIN";
  if (intent === "seller") return role === "SELLER" || role === "ADMIN";
  return true;
}

export function loginDestination(role: Role, intent: LoginIntent, callback?: unknown) {
  const destination = safeCallback(callback);
  if (destination) return destination;
  if (role === "ADMIN") return "/admin";
  if (intent === "seller" && role === "SELLER") return "/seller";
  return "/";
}

export function registrationDestination(intent: "buyer" | "seller", callback?: unknown) {
  return intent === "seller" ? "/seller/onboarding" : (safeCallback(callback) ?? "/");
}

export function safeCallback(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return undefined;
  return value;
}

export function homeFor(role: Role) {
  return role === "ADMIN" ? "/admin" : "/";
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

