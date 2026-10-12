import Link from "next/link";
import { PasswordResetForm } from "@/components/auth/password-reset-form";
export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <><h1 className="mb-6 font-display text-4xl">Reset your password</h1>{token && /^[A-Za-z0-9_-]{43}$/.test(token) ? <PasswordResetForm token={token} /> : <p className="text-sm">Your reset link is invalid. <Link href="/forgot-password" className="underline">Request a new link</Link>.</p>}</>;
}
