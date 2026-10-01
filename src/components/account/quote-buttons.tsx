"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acceptQuoteAction, declineQuoteAction } from "@/server/actions/account";

export function QuoteButtons({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: typeof acceptQuoteAction) =>
    start(async () => {
      const res = await fn(quoteId);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      router.refresh();
    });
  return (
    <div className="flex gap-2">
      <Button size="sm" pending={pending} onClick={() => run(acceptQuoteAction)}>
        Accept quote
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(declineQuoteAction)}>
        Decline
      </Button>
    </div>
  );
}
