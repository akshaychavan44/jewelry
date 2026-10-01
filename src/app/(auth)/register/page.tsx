import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Divider, RegisterForm, SocialButtons } from "@/components/auth/forms";
import { firstParam, type SearchParams } from "@/lib/utils";
import { oauthProviders } from "@/server/auth";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const intent = firstParam(sp.intent) === "seller" ? "seller" : "buyer";
  const callbackUrl = firstParam(sp.callbackUrl);
  const user = await getCurrentUser();
  if (user) redirect(intent === "seller" ? "/sell" : "/account");

  return (
    <>
      <p className="eyebrow mb-3">{intent === "seller" ? "For jewelers" : "Join Loupe"}</p>
      <h1 className="display-lg text-ink">{intent === "seller" ? "Open your store" : "Create your account"}</h1>
      <p className="mt-2 mb-8 text-[15px] text-ink-soft">
        {intent === "seller"
          ? "Start with your personal account. Next, you'll set up your store and verify your business — it takes about ten minutes."
          : "Save pieces, make offers, follow jewelers and track insured deliveries."}
      </p>
      {intent === "buyer" && (
        <>
          <SocialButtons enabled={oauthProviders} callbackUrl={callbackUrl} />
          <Divider />
        </>
      )}
      <RegisterForm intent={intent} callbackUrl={callbackUrl} />
      <p className="mt-8 text-center text-[14px] text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}
