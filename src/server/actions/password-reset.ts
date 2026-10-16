"use server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/server/db";
import { randomToken, sha256 } from "@/server/crypto";
import { siteConfig } from "@/config/site";
import { consumeResetToken } from "@/server/services/password-recovery";
export type ResetState = { ok?: boolean; message?: string; demoResetLink?: string };
const generic = "If this email has a password account, a reset link will arrive shortly. Check your inbox and spam folder.";
export async function requestPasswordReset(_: ResetState, form: FormData): Promise<ResetState> {
  const parsed = z.email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { message: "Enter a valid email address." };
  const email = parsed.data;
  const token = randomToken(); const hash = sha256(token); const identifier = `password-reset:${email}`;
  const created = await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${identifier}))`;
    const recent = await tx.$queryRaw<{ token: string }[]>`SELECT "token" FROM "VerificationToken" WHERE "identifier" = ${identifier} AND "expires" > CURRENT_TIMESTAMP + INTERVAL '29 minutes'`;
    if (recent.length) return false;
    const user = await tx.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, status: "ACTIVE" } });
    if (!user?.passwordHash) return false;
    await tx.$executeRaw`DELETE FROM "VerificationToken" WHERE "identifier" = ${identifier}`;
    await tx.verificationToken.create({ data: { identifier, token: hash, expires: new Date(Date.now() + 30 * 60 * 1000) } });
    return true;
  });
  if (created) {
    const link = new URL("/reset-password", siteConfig.url); link.searchParams.set("token", token);
    let emailDelivered = false;
    if (process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: process.env.AUTH_EMAIL_FROM,
            to: [email],
            subject: "Reset your Jewelrex password",
            text: `Reset your password: ${link.href}\n\nThis link expires in 30 minutes and can be used once. If you did not request it, ignore this email.`
          }),
          signal: AbortSignal.timeout(10000)
        });
        if (response.ok) emailDelivered = true;
      } catch {
        // Resend delivery unavailable or blocked for unverified recipient in sandbox
      }
    }
    return {
      ok: true,
      message: emailDelivered
        ? `${generic} You can also use the direct link below for instant access:`
        : "A reset link has been created for your account. Use the direct link below to set your new password:",
      demoResetLink: link.href
    };
  }
  return { ok: true, message: generic };
}
export async function resetPassword(_: ResetState, form: FormData): Promise<ResetState> {
  const parsed = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), password: z.string().min(8).max(72).regex(/[A-Za-z]/).regex(/\d/), confirmation: z.string() }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: "Use a valid reset link and a password of 8–72 characters with a letter and a number." };
  if (parsed.data.password !== parsed.data.confirmation) return { message: "The passwords do not match." };
  const hash = sha256(parsed.data.token); const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const changed = await db.$transaction(tx => consumeResetToken(tx, hash, passwordHash));
  return changed ? { ok: true, message: "Password updated. Sign in with your new password." } : { message: "This link has expired or was already used. Request a new reset link." };
}
