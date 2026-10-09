import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/forms";
import { homeFor, safeCallback } from "@/lib/auth-routing";
import { firstParam, type SearchParams } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/session";

const ERRORS: Record<string, string> = {
  suspended: "This account has been suspended. Contact security@loupe.example for help.",
  OAuthAccountNotLinked: "That email is already registered with a password. Sign in with email instead.",
  AccessDenied: "Access was denied. Super admin privileges required.",
};

export async function AdminLoginPageContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const callbackUrl = safeCallback(firstParam(sp.callbackUrl)) ?? "/admin";
  const user = await getCurrentUser();
  if (user) {
    if (user.role === "ADMIN") redirect(callbackUrl);
    redirect(homeFor(user.role));
  }
  const error = firstParam(sp.error);

  return (
    <>
      <h1 className="text-center font-display text-[32px] leading-tight text-ink sm:text-[36px]">
        Admin Console Login
      </h1>
      <p className="mt-2 mb-6 text-center text-[14.5px] leading-relaxed text-ink-soft">
        Sign in with your administrative credentials to manage verified jewelers, approve certificates, and oversee marketplace operations.
      </p>
      <LoginForm
        intent="admin"
        callbackUrl={callbackUrl}
        initialError={error ? (ERRORS[error] ?? "Admin sign-in failed. Please verify credentials.") : undefined}
      />
      <div className="mt-6 flex flex-col items-center gap-2 text-center text-[13px] text-ink-soft">
        <Link href="/" className="text-ink underline underline-offset-4">
          ← Back to Loupe Storefront
        </Link>
      </div>
      {process.env.NODE_ENV !== "production" && (
        <div className="mt-6 rounded-[3px] border border-dashed border-line-strong bg-porcelain px-3.5 py-2.5 text-[11.5px] text-ink-soft">
          <p className="caps mb-1 text-[9.5px] text-muted">Super admin credentials · development only</p>
          <p className="font-mono text-[11px] text-ink">
            admin@loupe.example · <span className="text-muted">Password:</span> LoupeDemo!2026
          </p>
        </div>
      )}
    </>
  );
}
