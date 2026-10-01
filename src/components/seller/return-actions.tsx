"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { returnDecisionAction } from "@/server/actions/seller";

export function ReturnActions({ returnId, status }: { returnId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const run = (decision: "APPROVE" | "REJECT" | "RECEIVE", message?: string) =>
    start(async () => {
      const res = await returnDecisionAction(returnId, decision, message);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      router.refresh();
    });
  if (status === "REQUESTED") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" pending={pending} onClick={() => run("APPROVE")}>
          Approve & issue label
        </Button>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason if declining" className="h-9 w-52 rounded-[2px] border border-line bg-ivory px-3 text-[13px]" />
        <Button size="sm" variant="ghost" disabled={pending || reason.length < 5} onClick={() => run("REJECT", reason)}>
          Decline
        </Button>
      </div>
    );
  }
  if (["LABEL_ISSUED", "IN_TRANSIT", "APPROVED"].includes(status)) {
    return (
      <Button size="sm" variant="outline" pending={pending} onClick={() => run("RECEIVE")}>
        Mark received & refund
      </Button>
    );
  }
  return null;
}
