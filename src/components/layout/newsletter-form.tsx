"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { type NewsletterState, subscribeToNewsletter } from "@/server/actions/preferences";
import styles from "./footer.module.css";

export function NewsletterForm() {
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribeToNewsletter, {});
  if (state.ok) {
    return <p className={styles.formSuccess} role="status">{state.message}</p>;
  }
  return (
    <form action={action} className="space-y-2">
      <div className={styles.formRow}>
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-invalid={state.message ? true : undefined}
          aria-describedby={state.message ? "newsletter-feedback" : undefined}
          placeholder="Your email"
        />
        <button type="submit" disabled={pending} aria-label={pending ? "Subscribing" : "Subscribe"}>
          {pending ? <LoaderCircle size={22} className="animate-spin motion-reduce:animate-none" aria-hidden /> : <ArrowRight size={24} strokeWidth={1.4} aria-hidden />}
        </button>
      </div>
      {state.message && <p id="newsletter-feedback" className={styles.formMessage} role="alert">{state.message}</p>}
    </form>
  );
}
