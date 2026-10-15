"use client";
import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, resetPassword, type ResetState } from "@/server/actions/password-reset";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
export function PasswordResetForm({ token }: { token?: string }) {
  const [state, action] = useActionState<ResetState, FormData>(token ? resetPassword : requestPasswordReset, {});
  if (state.ok) {
    return (
      <div role="status" className="space-y-5">
        <p className="text-sm leading-relaxed text-sage-deep">{state.message}</p>
        {state.demoResetLink && (
          <div className="rounded-[3px] border border-gold/40 bg-sand/30 p-4">
            <p className="text-[11px] font-medium tracking-[0.06em] text-ink-soft uppercase">Direct Reset Link:</p>
            <Link
              href={state.demoResetLink}
              className="mt-2 inline-flex items-center gap-1.5 text-[14px] font-medium text-gold hover:underline"
            >
              Click here to set your new password &rarr;
            </Link>
          </div>
        )}
        <div className="flex gap-5 pt-1">
          <Link href="/login" className="text-sm underline">Customer login</Link>
          <Link href="/jeweler/login" className="text-sm underline">Jeweler login</Link>
        </div>
      </div>
    );
  }
  return <form action={action} className="space-y-5"><FormError message={state.message} />{token ? <><input type="hidden" name="token" value={token} /><Field label="New password" htmlFor="newPassword" hint="8–72 characters, with a letter and a number."><Input id="newPassword" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} /></Field><Field label="Confirm password" htmlFor="confirmation"><Input id="confirmation" name="confirmation" type="password" autoComplete="new-password" required /></Field></> : <Field label="Account email" htmlFor="resetEmail"><Input id="resetEmail" name="email" type="email" autoComplete="email" required /></Field>}<SubmitButton className="w-full" pendingLabel="Please wait…">{token ? "Set new password" : "Email reset link"}</SubmitButton></form>;
}
