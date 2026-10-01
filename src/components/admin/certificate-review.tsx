"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reviewCertificateAction } from "@/server/actions/admin";

/** Verify against the lab's own register, or reject with a reason the jeweler can act on. */
export function CertificateDecision({ certificateId, status }: { certificateId: string; status: "PENDING_REVIEW" | "VERIFIED" | "REJECTED" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const run = (decision: "VERIFY" | "REJECT") =>
    start(async () => {
      const res = await reviewCertificateAction(certificateId, decision, decision === "REJECT" ? note : undefined);
      if (res.ok) {
        toast.success(res.message);
        setRejecting(false);
        router.refresh();
      } else toast.error(res.message);
    });

  if (rejecting) {
    return (
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <input
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. report number not found on the lab's register"
          aria-label="Reason for rejecting"
          className="h-9 min-w-0 flex-1 rounded-[2px] border border-line bg-ivory px-3 text-[13px] outline-none focus:border-sage sm:w-72"
        />
        <Button size="sm" variant="danger" pending={pending} disabled={note.trim().length < 5} onClick={() => run("REJECT")}>
          Reject
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
          Cancel
        </Button>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      {status !== "VERIFIED" && (
        <Button size="sm" pending={pending} onClick={() => run("VERIFY")}>
          Mark verified
        </Button>
      )}
      {status !== "REJECTED" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setRejecting(true)}>
          {status === "VERIFIED" ? "Revoke" : "Reject"}
        </Button>
      )}
    </div>
  );
}
