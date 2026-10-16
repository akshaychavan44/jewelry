import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/forms";
import { loginDestination, loginHref, safeCallback, type LoginIntent } from "@/lib/auth-routing";
import { firstParam, type SearchParams } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/session";
import { switchAccountView } from "@/server/actions/account-view";
import { buttonVariants } from "@/components/ui/button";

const ERRORS: Record<string, string> = {
  suspended: "This account has been suspended. Contact concierge@loupe.example for help.",
  OAuthAccountNotLinked: "That email is already registered with a password. Sign in with email instead.",
  AccessDenied: "Access was denied.",
};

export async function LoginPageContent({ intent, searchParams }: { intent: LoginIntent; searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const callbackUrl = safeCallback(firstParam(sp.callbackUrl));
  const user = await getCurrentUser();
  if (user?.role === "SELLER") {
    const view = intent === "seller" ? "seller" : "customer";
    return <div className="space-y-5">
      <h1 className="font-display text-[32px] text-ink">You’re already signed in</h1>
      <p className="text-sm text-ink-soft">Continue with your existing account. Your customer activity and jeweler business stay separate.</p>
      <form action={switchAccountView.bind(null, view, loginDestination(user.role, intent, callbackUrl))}>
        <button type="submit" className={buttonVariants({ className: "w-full" })}>{view === "customer" ? "Continue as a customer" : "Continue to jeweler dashboard"}</button>
      </form>
    </div>;
  }
  if (user) redirect(loginDestination(user.role, intent, callbackUrl));
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
        {seller ? "Manage your business, showcase jewelry, and review custom requests and customer feedback." : "Discover jewelers, send custom requests, and save your favorite pieces."}
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
          <p className="caps mb-1.5 text-[9.5px] font-semibold tracking-wider text-muted uppercase">Demo accounts · development only</p>
          <div className="space-y-1 font-mono text-[11px] text-ink">
            <div>
              <span className="font-sans font-medium text-ink-soft">Customer: </span>
              <span className="select-all">buyer@loupe.example</span> · Pass: <span className="select-all font-semibold">LoupeDemo!2026</span>
            </div>
            <div>
              <span className="font-sans font-medium text-ink-soft">Jeweler: </span>
              <span className="select-all">seller@loupe.example</span> · Pass: <span className="select-all font-semibold">LoupeDemo!2026</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
