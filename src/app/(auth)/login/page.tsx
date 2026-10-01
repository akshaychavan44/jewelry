import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Divider, LoginForm, SocialButtons } from "@/components/auth/forms";
import { firstParam, type SearchParams } from "@/lib/utils";
import { oauthProviders } from "@/server/auth";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  suspended: "This account has been suspended. Contact concierge@loupe.example for help.",
  OAuthAccountNotLinked: "That email is already registered with a password. Sign in with email instead.",
  AccessDenied: "Access was denied.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const callbackUrl = firstParam(sp.callbackUrl);
  const user = await getCurrentUser();
  if (user) redirect(callbackUrl?.startsWith("/") ? callbackUrl : "/account");
  const error = firstParam(sp.error);

  return (
    <>
      <h1 className="display-lg text-ink">Welcome back</h1>
      <p className="mt-2 mb-8 text-[15px] text-ink-soft">Sign in to see your orders, offers and saved pieces.</p>
      <SocialButtons enabled={oauthProviders} callbackUrl={callbackUrl} />
      <Divider />
      <LoginForm callbackUrl={callbackUrl} initialError={error ? (ERRORS[error] ?? "Sign-in failed. Please try again.") : undefined} />
      <p className="mt-8 text-center text-[14px] text-ink-soft">
        New to Loupe?{" "}
        <Link href={`/register${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`} className="text-ink underline underline-offset-4">
          Create an account
        </Link>
      </p>
      {process.env.NODE_ENV !== "production" && (
        <div className="mt-10 rounded-[3px] border border-dashed border-line-strong bg-porcelain px-4 py-3 text-[12.5px] text-ink-soft">
          <p className="caps mb-1.5 text-[10px] text-muted">Demo accounts · development only</p>
          <ul className="space-y-0.5 font-mono text-[11.5px]">
            <li>buyer@loupe.example — buyer</li>
            <li>seller@loupe.example — approved jeweler</li>
            <li>pending@loupe.example — jeweler awaiting KYC</li>
            <li>admin@loupe.example — super-admin</li>
          </ul>
          <p className="mt-1.5">Shared password: see <span className="font-mono">prisma/seed/data/people.ts</span></p>
        </div>
      )}
    </>
  );
}
