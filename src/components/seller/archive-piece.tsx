"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { archiveShowcaseAction } from "@/server/actions/showcase";
export function ArchivePiece({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button disabled={pending} className="text-sm text-muted underline disabled:opacity-50" onClick={() => start(async () => { const r = await archiveShowcaseAction(id); if (r.ok) toast.success(r.message); else toast.error(r.message); })}>{pending ? "Archiving…" : "Archive"}</button>;
}
