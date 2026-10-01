"use server";

import { signIn } from "@/server/auth";

export async function oauthSignIn(provider: "google" | "apple", callbackUrl?: string) {
  const redirectTo = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/account";
  await signIn(provider, { redirectTo });
}
