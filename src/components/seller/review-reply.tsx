"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { replyToReviewAction } from "@/server/actions/seller";

export function ReviewReply({ reviewId, existing }: { reviewId: string; existing: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(existing ?? "");
  const [pending, start] = useTransition();
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-[13px] text-ink underline underline-offset-4">
        {existing ? "Edit reply" : "Reply publicly"}
      </button>
    );
  }
  return (
    <div className="mt-2 space-y-2">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-20" aria-label="Your reply" />
      <div className="flex gap-2">
        <Button
          size="sm"
          pending={pending}
          onClick={() =>
            start(async () => {
              const res = await replyToReviewAction(reviewId, text);
              if (res.ok) {
                toast.success(res.message);
                setOpen(false);
                router.refresh();
              } else toast.error(res.message);
            })
          }
        >
          Publish reply
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
