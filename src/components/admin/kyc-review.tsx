"use client";

import { Check, ExternalLink, FileText, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/controls";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { reinstateSellerAction, reviewKycAction, suspendSellerAction, updateSellerTermsAction } from "@/server/actions/admin";

export type ReviewDocument = { id: string; fileId: string; label: string; fileName: string; size: string };
type DocDecision = { status: "ACCEPTED" | "REJECTED"; reason: string };

/** Per-document checks plus the approve / return decision for a pending application. */
export function KycDecisionPanel({ sellerId, storeName, documents }: { sellerId: string; storeName: string; documents: ReviewDocument[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [docs, setDocs] = useState<Record<string, DocDecision>>(() => Object.fromEntries(documents.map((d) => [d.id, { status: "ACCEPTED", reason: "" }])));
  const [feedback, setFeedback] = useState("");
  const [internal, setInternal] = useState("");
  const rejected = Object.values(docs).filter((d) => d.status === "REJECTED").length;

  const submit = (decision: "APPROVE" | "REJECT") =>
    start(async () => {
      const res = await reviewKycAction({
        sellerId,
        decision,
        feedback,
        internalNotes: internal || undefined,
        documents: Object.entries(docs).map(([id, d]) => ({ id, status: d.status, reason: d.reason || undefined })),
      });
      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else toast.error(res.message);
    });

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[12px] tracking-[0.08em] text-muted uppercase">Documents</p>
        <ul className="divide-y divide-line rounded-[3px] border border-line">
          {documents.map((d) => {
            const state = docs[d.id];
            return (
              <li key={d.id} className="px-3.5 py-3">
                <div className="flex items-center gap-3">
                  <FileText className="size-4 shrink-0 text-muted" strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] text-ink">{d.label}</p>
                    <a href={`/api/files/${d.fileId}`} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-[12px] text-ink-soft underline-offset-2 hover:underline">
                      {d.fileName} · {d.size} <ExternalLink className="size-3 shrink-0" />
                    </a>
                  </div>
                  <div className="flex shrink-0 overflow-hidden rounded-[2px] border border-line" role="group" aria-label={`Decision for ${d.label}`}>
                    {(["ACCEPTED", "REJECTED"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={state.status === s}
                        onClick={() => setDocs((x) => ({ ...x, [d.id]: { ...x[d.id], status: s } }))}
                        className={cn(
                          "grid size-8 place-items-center transition-colors",
                          state.status === s ? (s === "ACCEPTED" ? "bg-moss text-white" : "bg-rosewood text-white") : "bg-ivory text-muted hover:text-ink",
                        )}
                        title={s === "ACCEPTED" ? "Accept" : "Reject"}
                      >
                        {s === "ACCEPTED" ? <Check className="size-4" /> : <X className="size-4" />}
                        <span className="sr-only">{s === "ACCEPTED" ? "Accept" : "Reject"}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {state.status === "REJECTED" && (
                  <Input
                    className="mt-2.5"
                    value={state.reason}
                    onChange={(e) => setDocs((x) => ({ ...x, [d.id]: { ...x[d.id], reason: e.target.value } }))}
                    placeholder="What's wrong with it? e.g. expired, unreadable, name mismatch"
                    aria-label={`Reason for rejecting ${d.label}`}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <Field label="Message to the jeweler" htmlFor="feedback" hint={rejected ? "Required when returning an application. Be specific about what to fix." : "Optional on approval — shown in their notification."}>
        <Textarea id="feedback" rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={rejected ? "Please upload a current business licence — the one provided expired in March." : `Welcome to Loupe, ${storeName}.`} />
      </Field>
      <Field label="Internal notes" htmlFor="internal" hint="Only visible to the admin team.">
        <Textarea id="internal" rows={3} value={internal} onChange={(e) => setInternal(e.target.value)} placeholder="Registry lookup, sanctions screening result, calls made…" />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button pending={pending} disabled={rejected > 0} onClick={() => submit("APPROVE")}>
          Approve store
        </Button>
        <Button variant="outline" disabled={pending || feedback.trim().length < 10} onClick={() => submit("REJECT")}>
          Return with notes
        </Button>
      </div>
      {rejected > 0 && <p className="text-[12.5px] text-rosewood">{rejected === 1 ? "A document is" : `${rejected} documents are`} marked rejected — return the application so the jeweler can replace {rejected === 1 ? "it" : "them"}.</p>}
    </div>
  );
}

/** Commercial terms and enforcement for a live (or suspended) store. */
export function StoreControls({ sellerId, status, initial, defaultCommission }: { sellerId: string; status: "APPROVED" | "SUSPENDED"; initial: { commissionPercent: string; isFeatured: boolean; isTopRated: boolean }; defaultCommission: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState(initial);
  const [reason, setReason] = useState("");
  const done = (res: { ok: boolean; message: string }) => {
    if (res.ok) toast.success(res.message);
    else toast.error(res.message);
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () =>
            done(await updateSellerTermsAction(sellerId, { commissionPercent: form.commissionPercent.trim() === "" ? null : Number(form.commissionPercent), isFeatured: form.isFeatured, isTopRated: form.isTopRated })),
          );
        }}
      >
        <Field label="Commission override (%)" htmlFor="commission" hint={`Leave empty to use rules and the ${defaultCommission} platform default.`}>
          <Input id="commission" inputMode="decimal" value={form.commissionPercent} onChange={(e) => setForm({ ...form, commissionPercent: e.target.value.replace(/[^\d.]/g, "") })} placeholder="Default" />
        </Field>
        <label className="flex items-center justify-between gap-3 text-[14px] text-ink-soft">
          Featured on the homepage <Switch checked={form.isFeatured} onCheckedChange={(v) => setForm({ ...form, isFeatured: v })} />
        </label>
        <label className="flex items-center justify-between gap-3 text-[14px] text-ink-soft">
          &ldquo;Top Rated&rdquo; badge <Switch checked={form.isTopRated} onCheckedChange={(v) => setForm({ ...form, isTopRated: v })} />
        </label>
        <Button type="submit" size="sm" variant="outline" pending={pending}>
          Save terms
        </Button>
      </form>

      <div className="border-t border-line pt-5">
        {status === "APPROVED" ? (
          <>
            <Field label="Suspend store" htmlFor="suspend" hint="Hides every listing, holds undisbursed payouts and blocks the seller studio.">
              <Textarea id="suspend" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason — shown to the jeweler" />
            </Field>
            <Button className="mt-3" size="sm" variant="danger" disabled={pending || reason.trim().length < 10} onClick={() => start(async () => done(await suspendSellerAction(sellerId, reason)))}>
              Suspend store
            </Button>
          </>
        ) : (
          <>
            <p className="text-[13.5px] text-ink-soft">Reinstating makes listings visible again and returns held payouts to the normal release schedule.</p>
            <Button className="mt-3" size="sm" pending={pending} onClick={() => start(async () => done(await reinstateSellerAction(sellerId)))}>
              Reinstate store
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
