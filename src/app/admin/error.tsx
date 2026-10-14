"use client";

import { Button } from "@/components/ui/button";

export default function AdminError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div role="alert" className="rounded-[3px] border border-line bg-porcelain p-6">
      <h2 className="font-display text-2xl text-ink">We couldn’t load this admin page.</h2>
      <p className="mt-2 text-sm text-ink-soft">Check your connection and try again. You can still use the sidebar to open another section.</p>
      <Button className="mt-5" onClick={retry}>Try again</Button>
    </div>
  );
}
