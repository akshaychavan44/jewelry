"use client";
import { useActionState } from "react";
import { Field, FormError } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { requestBusinessNameAction } from "@/server/actions/business-name";

export function BusinessNameForm({ pending }: { pending: boolean }) {
  const [state, action] = useActionState(requestBusinessNameAction, {});
  return <form action={action} className="space-y-4">
    {state.ok ? <p role="status" className="text-sm text-sage-deep">{state.message}</p> : <FormError message={state.message} />}
    <Field label="Requested business name" htmlFor="requestedName" error={state.fieldErrors?.requestedName}><Input id="requestedName" name="requestedName" maxLength={60} required disabled={pending || state.ok} /></Field>
    <Field label="Reason for change" htmlFor="nameChangeReason" error={state.fieldErrors?.reason}><Textarea id="nameChangeReason" name="reason" maxLength={1000} required disabled={pending || state.ok} /></Field>
    <SubmitButton disabled={pending || state.ok} pendingLabel="Submitting…">{pending ? "Awaiting admin review" : "Request name change"}</SubmitButton>
  </form>;
}
