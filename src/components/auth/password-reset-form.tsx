"use client";
import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, resetPassword, type ResetState } from "@/server/actions/password-reset";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
export function PasswordResetForm({ token }: { token?: string }) {
  const [state, action] = useActionState<ResetState, FormData>(token ? resetPassword : requestPasswordReset, {});
  if (state.ok) return <div role="status" className="space-y-5"><p className="text-sm leading-relaxed text-sage-deep">{state.message}</p><Link href="/login" className="text-sm underline">Customer login</Link><Link href="/jeweler/login" className="ml-5 text-sm underline">Jeweler login</Link></div>;
  return <form action={action} className="space-y-5"><FormError message={state.message} />{token ? <><input type="hidden" name="token" value={token} /><Field label="New password" htmlFor="newPassword" hint="8–72 characters, with a letter and a number."><Input id="newPassword" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} /></Field><Field label="Confirm password" htmlFor="confirmation"><Input id="confirmation" name="confirmation" type="password" autoComplete="new-password" required /></Field></> : <Field label="Account email" htmlFor="resetEmail"><Input id="resetEmail" name="email" type="email" autoComplete="email" required /></Field>}<SubmitButton className="w-full" pendingLabel="Please wait…">{token ? "Set new password" : "Email reset link"}</SubmitButton></form>;
}
