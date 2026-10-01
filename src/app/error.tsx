"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="shell flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="display-lg mt-4 text-ink">We couldn&rsquo;t load this page.</h1>
      <p className="mt-4 max-w-md text-[16px] leading-relaxed text-ink-soft">
        Nothing you did caused this, and nothing in your cart or orders has changed. Try again — if it keeps happening, our team has already been alerted.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Go to the homepage
        </Link>
      </div>
      {error.digest && <p className="mt-8 font-mono text-[12px] text-muted">Reference {error.digest}</p>}
    </main>
  );
}
