"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { cancelCustomInquiry } from "@/server/actions/cancel-inquiry";
export function CancelInquiry({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button className="text-sm text-muted underline disabled:opacity-50" disabled={pending} onClick={() => start(async () => { const r = await cancelCustomInquiry(id); if (r.ok) toast.success(r.message); else toast.error(r.message); })}>{pending ? "Cancelling…" : "Cancel request"}</button>;
}
