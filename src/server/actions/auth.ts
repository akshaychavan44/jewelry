"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { loginDestination, safeCallback, type LoginIntent } from "@/lib/auth-routing";
import { ACCOUNT_VIEW_COOKIE } from "@/lib/account-view";
import { cookies } from "next/headers";
import { setAccountView } from "@/server/account-view";
import { DATABASE_UNAVAILABLE_MESSAGE, isDatabaseUnavailable } from "@/lib/database-errors";
import { signIn, signOut, unstable_update } from "@/server/auth";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { mergeGuestCart } from "@/server/services/cart";

export type AuthFormState = { error?: string; fieldErrors?: Record<string, string[] | undefined> };

async function signInWithPassword(email: string, password: string, intent: LoginIntent): Promise<string | null> {
  try {
    const url = await signIn("credentials", { email, password, intent, redirect: false });
    if (typeof url === "string" && url.includes("error=")) return "Email or password is incorrect.";
    return null;
  } catch (error) {
    if (isDatabaseUnavailable(error)) return DATABASE_UNAVAILABLE_MESSAGE;
    if (error instanceof AuthError) {
      const code = (error as AuthError & { code?: string }).code;
      if (code === "wrong_portal") {
        if (intent === "admin") return "This account does not have administrator privileges.";
        return intent === "seller"
          ? "This is a customer account. Choose Customer login to sign in."
          : "This is a jeweler account. Choose Jeweler login to sign in.";
      }
      if (code === "suspended") return "This account has been suspended. Contact concierge@loupe.example for help.";
      return "Email or password is incorrect.";
    }
    throw error;
  }
}

const loginSchema = z.object({
  intent: z.enum(["buyer", "seller", "admin"]).default("buyer"),
  email: z.email("Enter a valid email address.").transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1, "Enter your password."),
});

export async function loginAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password"), intent: formData.get("intent") });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const error = await signInWithPassword(parsed.data.email, parsed.data.password, parsed.data.intent);
  if (error) return { error };

  // The credentials provider already verified the administrator role. Admin
  // sign-in has no cart to merge and needs no additional database round trips.
  if (parsed.data.intent === "admin") redirect(safeCallback(formData.get("callbackUrl")) ?? "/admin");

  const user = await db.user.findFirst({ where: { email: { equals: parsed.data.email, mode: "insensitive" } }, select: { id: true, role: true } });
  if (user?.role === "BUYER" || user?.role === "SELLER") await mergeGuestCart(user.id);
  await setAccountView(parsed.data.intent === "seller" ? "seller" : "customer");
  redirect(loginDestination(user?.role ?? "BUYER", parsed.data.intent, formData.get("callbackUrl")));
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  email: z.email("Enter a valid email address.").transform((v) => v.trim().toLowerCase()),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .regex(/[A-Za-z]/, "Include at least one letter.")
    .regex(/\d/, "Include at least one number."),
  intent: z.enum(["buyer", "seller"]).default("buyer"),
  marketing: z.boolean().default(false),
});

export async function registerAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    intent: formData.get("intent") ?? undefined,
    marketing: formData.get("marketing") === "on",
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { name, email, password, intent, marketing } = parsed.data;

  const existing = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
  if (existing) return { fieldErrors: { email: ["An account with this email already exists. Sign in instead."] } };

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: intent === "seller" ? "SELLER" : "BUYER",
      marketingOptIn: marketing,
    },
  });

  const error = await signInWithPassword(email, password, intent);
  if (error) return { error };
  await mergeGuestCart(user.id);
  await setAccountView(intent === "seller" ? "seller" : "customer");
  redirect(intent === "seller" ? "/seller/onboarding" : (safeCallback(formData.get("callbackUrl")) ?? "/account"));
}

export async function signOutAction() {
  await signOut({ redirect: false });
  (await cookies()).delete(ACCOUNT_VIEW_COOKIE);
  revalidatePath("/", "layout");
  redirect("/");
}

/** An existing buyer opens a store: upgrade the role and refresh the session. */
export async function becomeSellerAction() {
  const user = await requireUser("/sell");
  if (user.role !== "SELLER") {
    await db.user.update({ where: { id: user.id }, data: { role: "SELLER" } });
    await unstable_update({});
  }
  redirect("/seller/onboarding");
}
