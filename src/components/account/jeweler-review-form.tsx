"use client";
import { useActionState } from "react";
import { saveJewelerReview, deleteJewelerReview, respondToJewelerReview, type ReviewState } from "@/server/actions/jeweler-reviews";
import { Field, FormError } from "@/components/ui/field";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
export function JewelerReviewForm({ sellerId, rating = 5, body = "" }: { sellerId: string; rating?: number; body?: string }) {
  const [state, action] = useActionState<ReviewState, FormData>(saveJewelerReview, {});
  return (
    <form action={action} className="space-y-4 rounded border border-line bg-porcelain p-6">
      <h3 className="font-display text-xl">Share your experience</h3>
      <p className="text-sm text-muted">Review your own interaction with this jeweler. Purchases take place separately.</p>
      <input type="hidden" name="sellerId" value={sellerId} />
      <FormError message={!state.ok ? state.message : undefined} />
      {state.ok && <p role="status" className="text-sm text-sage-deep">{state.message}</p>}
      <Field label="Rating" htmlFor={`rating-${sellerId}`}>
        <NativeSelect name="rating" id={`rating-${sellerId}`} defaultValue={rating}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>{n} {n === 1 ? "star" : "stars"}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Your review" htmlFor={`review-${sellerId}`}>
        <Textarea id={`review-${sellerId}`} name="body" defaultValue={body} required maxLength={2000} />
      </Field>
      <label className="flex gap-3 text-sm">
        <input name="experienced" type="checkbox" required />
        This reflects my own experience with this jeweler.
      </label>
      <SubmitButton pendingLabel="Saving…">Post review</SubmitButton>
    </form>
  );
}
export function DeleteJewelerReview({ id }: { id: string }) {
  const [state, action] = useActionState<ReviewState, FormData>(deleteJewelerReview, {});
  return <form action={action} className="mt-4"><input name="id" type="hidden" value={id} /><SubmitButton variant="outline" size="sm" pendingLabel="Removing…">Remove my review</SubmitButton>{state.message && <p role="status" className="mt-2 text-sm">{state.message}</p>}</form>;
}
export function JewelerReviewResponse({ id, reply }: { id: string; reply: string }) {
  const [state, action] = useActionState<ReviewState, FormData>(respondToJewelerReview, {});
  return <form action={action} className="mt-4 space-y-3"><input name="id" type="hidden" value={id} /><NativeSelect name="intent" aria-label="Review action"><option value="reply">Public reply</option><option value="report">Report to admin</option></NativeSelect><Textarea name="body" defaultValue={reply} aria-label="Reply or report reason" required minLength={3} maxLength={1000} /><SubmitButton size="sm" pendingLabel="Saving…">Submit</SubmitButton>{state.message && <p role="status" className="text-sm">{state.message}</p>}</form>;
}
