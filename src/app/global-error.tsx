"use client";

import "./globals.css";

// Last-resort boundary: replaces the root layout, so it renders its own document.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center bg-ivory px-6 text-center text-ink">
        <p className="text-[12px] tracking-[0.2em] text-ink-soft uppercase">Loupe</p>
        <h1 className="mt-4 text-[32px] leading-tight">We&rsquo;ll be right back.</h1>
        <p className="mt-3 max-w-md text-[15px] text-ink-soft">The marketplace hit an unexpected problem. Your cart and orders are safe.</p>
        <button type="button" onClick={reset} className="mt-8 rounded-[2px] bg-sage px-6 py-3 text-[13px] tracking-[0.12em] text-white uppercase">
          Try again
        </button>
        {error.digest && <p className="mt-6 font-mono text-[12px] text-ink-soft">Reference {error.digest}</p>}
      </body>
    </html>
  );
}
