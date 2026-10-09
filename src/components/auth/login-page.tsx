import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/forms";
import { homeFor, loginHref, safeCallback, type LoginIntent } from "@/lib/auth-routing";
import { firstParam, type SearchParams } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/session";

const ERRORS: Record<string, string> = {
  suspended: "This account has been suspended. Contact concierge@loupe.example for help.",
  OAuthAccountNotLinked: "That email is already registered with a password. Sign in with email instead.",
  AccessDenied: "Access was denied.",
};

export async function LoginPageContent({ intent, searchParams }: { intent: LoginIntent; searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const callbackUrl = safeCallback(firstParam(sp.callbackUrl));
  const user = await getCurrentUser();
  if (user) redirect(callbackUrl ?? homeFor(user.role));
  const error = firstParam(sp.error);
  const seller = intent === "seller";
  const registration = new URLSearchParams({ intent });
  if (callbackUrl) registration.set("callbackUrl", callbackUrl);

  return (
    <>
      <nav aria-label="Choose your account type" className="mb-7 grid grid-cols-2 rounded-[3px] border border-line bg-porcelain p-1">
        {(["buyer", "seller"] as const).map((option) => (
          <Link key={option} href={loginHref(option, callbackUrl)} aria-current={intent === option ? "page" : undefined}
            className={`rounded-[2px] px-3 py-3 text-center text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${intent === option ? "bg-ink text-ivory" : "text-ink-soft hover:bg-sand"}`}>
            {option === "seller" ? "Jeweler login" : "Customer login"}
          </Link>
        ))}
      </nav>
      <p className="eyebrow mb-2">{seller ? "For jewelers" : "For customers"}</p>
      <h1 className="font-display text-[32px] leading-tight text-ink sm:text-[38px]">{seller ? "Welcome to your store" : "Welcome back"}</h1>
      <p className="mt-1.5 mb-6 text-[14.5px] text-ink-soft">
        {seller ? "Manage your jewelry, respond to inquiries and keep track of customer orders." : "Find your next piece, make an inquiry and keep track of your purchases."}
      </p>
      <LoginForm key={intent} intent={intent} callbackUrl={callbackUrl} initialError={error ? (ERRORS[error] ?? "Sign-in failed. Please try again.") : undefined} />
      <p className="mt-6 text-center text-[14px] text-ink-soft">
        {seller ? "New to selling on Loupe?" : "New to Loupe?"}{" "}
        <Link href={`/register?${registration}`} className="text-ink underline underline-offset-4">
          {seller ? "Create a jeweler account" : "Create a customer account"}
        </Link>
      </p>
      <Link href={seller ? "/sell" : "/shop"} className="mt-4 text-center text-[13px] text-ink-soft underline underline-offset-4">
        {seller ? "Learn about selling on Loupe" : "Continue browsing jewelry"}
      </Link>
      {process.env.NODE_ENV !== "production" && (
        <div className="mt-6 rounded-[3px] border border-dashed border-line-strong bg-porcelain px-3.5 py-2.5 text-[11.5px] text-ink-soft">
          <p className="caps mb-1 text-[9.5px] text-muted">Demo accounts · development only</p>
          <ul className="space-y-0.5 font-mono text-[11px]">
            {seller ? <><li>seller@loupe.example — approved jeweler</li><li>pending@loupe.example — awaiting KYC</li></> : <><li>buyer@loupe.example — customer</li><li>admin@loupe.example — super-admin</li></>}
          </ul>
          <p className="mt-1">Shared password: see <span className="font-mono">prisma/seed/data/people.ts</span></p>
        </div>
      )}
    </>
  );
}
