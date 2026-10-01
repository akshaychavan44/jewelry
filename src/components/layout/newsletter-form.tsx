"use client";

import { Heart } from "lucide-react";
import { useActionState } from "react";
import { type NewsletterState, subscribeToNewsletter } from "@/server/actions/preferences";

export function NewsletterForm() {
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribeToNewsletter, {});
  if (state.ok) {
    return <p className="rounded-[2px] border border-sage/30 bg-sage-mist px-4 py-3 text-[14px] text-sage-deep">{state.message}</p>;
  }
  return (
    <form action={action} className="space-y-2">
      <div className="flex">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          placeholder="Your email"
          className="h-11 min-w-0 flex-1 rounded-l-[2px] border border-r-0 border-line-strong/60 bg-porcelain px-3.5 text-[14px] outline-none placeholder:text-muted focus:border-sage"
        />
        <button type="submit" disabled={pending} className="grid h-11 w-12 place-items-center rounded-r-[2px] bg-sage text-white transition-colors hover:bg-sage-deep disabled:opacity-60" aria-label="Subscribe">
          <Heart className="size-4" strokeWidth={1.6} />
        </button>
      </div>
      {state.message && <p className="text-[13px] text-rosewood">{state.message}</p>}
    </form>
  );
}
