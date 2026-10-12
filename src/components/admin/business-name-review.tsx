"use client";
import { useActionState } from "react";
import { Field, FormError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { reviewBusinessNameAction } from "@/server/actions/business-name";

export function BusinessNameReview({ id }: { id: string }) {
  const [state, action] = useActionState(reviewBusinessNameAction, {});
  return <form action={action} className="mt-5 space-y-4"><input name="id" type="hidden" value={id} />
    {state.ok ? <p role="status" className="text-sm text-sage-deep">{state.message}</p> : <FormError message={state.message} />}
    <Field label="Review notes" htmlFor={`notes-${id}`} hint="Required when rejecting. Shared with the jeweler."><Textarea id={`notes-${id}`} name="notes" maxLength={1000} /></Field>
    <div className="flex gap-3"><SubmitButton name="decision" value="APPROVED" disabled={state.ok}>Approve</SubmitButton><SubmitButton name="decision" value="REJECTED" variant="subtle" disabled={state.ok}>Reject</SubmitButton></div>
  </form>;
}
