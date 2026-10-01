"use client";

import Link from "next/link";
import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/menus";
import { SubmitButton } from "@/components/ui/submit-button";
import { type AuthFormState, loginAction, registerAction } from "@/server/actions/auth";
import { oauthSignIn } from "@/server/actions/oauth";

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8Z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 10l3.7-2.9Z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4Z" />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9s-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8 2.2-1.3 3.1-2.5a10 10 0 0 0 1.4-2.9 4.4 4.4 0 0 1-2.7-4.1ZM13.9 4.9A4.2 4.2 0 0 0 14.9 2a4.4 4.4 0 0 0-2.9 1.5 4.1 4.1 0 0 0-1 2.9 3.6 3.6 0 0 0 2.9-1.5Z" />
    </svg>
  );
}

export function SocialButtons({ enabled, callbackUrl }: { enabled: { google: boolean; apple: boolean }; callbackUrl?: string }) {
  const [pending, start] = useTransition();
  const button = (provider: "google" | "apple", label: string, icon: React.ReactNode) => {
    const b = (
      <Button type="button" variant="subtle" size="lg" className="w-full normal-case tracking-normal text-[14px] font-normal" disabled={!enabled[provider] || pending} onClick={() => start(() => oauthSignIn(provider, callbackUrl))}>
        {icon} {label}
      </Button>
    );
    return enabled[provider] ? b : (
      <Tooltip content={`Set AUTH_${provider.toUpperCase()}_ID and AUTH_${provider.toUpperCase()}_SECRET to enable`}>
        <span className="block">{b}</span>
      </Tooltip>
    );
  };
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {button("google", "Continue with Google", <GoogleGlyph />)}
      {button("apple", "Continue with Apple", <AppleGlyph />)}
    </div>
  );
}

export function Divider({ label = "or with email" }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-4 text-[12px] tracking-[0.1em] text-muted uppercase">
      <span className="h-px flex-1 bg-line" /> {label} <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function LoginForm({ callbackUrl, initialError }: { callbackUrl?: string; initialError?: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(loginAction, { error: initialError });
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
      <FormError message={state.error} />
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!state.fieldErrors?.email} />
      </Field>
      <Field label="Password" htmlFor="password" error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!state.fieldErrors?.password} />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}

export function RegisterForm({ intent, callbackUrl }: { intent: "buyer" | "seller"; callbackUrl?: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(registerAction, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
      <FormError message={state.error} />
      <Field label="Full name" htmlFor="name" error={state.fieldErrors?.name}>
        <Input id="name" name="name" autoComplete="name" required aria-invalid={!!state.fieldErrors?.name} />
      </Field>
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!state.fieldErrors?.email} />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 8 characters, with a letter and a number." error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={!!state.fieldErrors?.password} />
      </Field>
      <label className="flex items-start gap-3 text-[13.5px] text-ink-soft">
        <input type="checkbox" name="marketing" className="mt-1 size-4 accent-[#7b8069]" />
        Send me new arrivals and private sales. You can unsubscribe at any time.
      </label>
      <SubmitButton size="lg" className="w-full" pendingLabel="Creating your account…">
        {intent === "seller" ? "Create jeweler account" : "Create account"}
      </SubmitButton>
      <p className="text-[12.5px] text-muted">
        By continuing you agree to Loupe&rsquo;s{" "}
        <Link href="/help/terms" className="underline underline-offset-2">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/help/privacy" className="underline underline-offset-2">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}
