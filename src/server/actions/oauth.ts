"use server";

import { signIn } from "@/server/auth";
import { safeCallback } from "@/lib/auth-routing";
import { setAccountView } from "@/server/account-view";

export async function oauthSignIn(provider: "google" | "apple", callbackUrl?: string) {
  const redirectTo = safeCallback(callbackUrl) ?? "/";
  await setAccountView("customer");
  await signIn(provider, { redirectTo });
}
