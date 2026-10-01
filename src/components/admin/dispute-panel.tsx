"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioItem } from "@/components/ui/controls";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import type { DisputePriority, DisputeResolution } from "@/generated/prisma/enums";
import { formatMoney, toMajor, toMinor } from "@/lib/money";
import { DISPUTE_PRIORITY, DISPUTE_RESOLUTIONS } from "@/lib/status";
import { resolveDisputeAction, updateDisputeAction } from "@/server/actions/admin";

type OpenStatus = "OPEN" | "AWAITING_SELLER" | "AWAITING_BUYER" | "UNDER_REVIEW";
const STATUS_OPTIONS: { value: OpenStatus; label: string }[] = [
  { value: "OPEN", label: "Open — not yet triaged" },
  { value: "AWAITING_SELLER", label: "Waiting on the jeweler" },
  { value: "AWAITING_BUYER", label: "Waiting on the buyer" },
  { value: "UNDER_REVIEW", label: "Under review by Loupe" },
];

export function CaseControls({ disputeId, status, priority, internalNotes, assignedToMe }: { disputeId: string; status: OpenStatus; priority: DisputePriority; internalNotes: string; assignedToMe: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ status, priority, internalNotes });
  const save = (assignToMe = false) =>
    start(async () => {
      const res = await updateDisputeAction({ disputeId, ...form, assignToMe });
      if (res.ok) toast.success(assignToMe ? "Assigned to you." : res.message);
      else toast.error(res.message);
      router.refresh();
    });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      {!assignedToMe && (
        <Button type="button" variant="outline" size="sm" className="w-full" pending={pending} onClick={() => save(true)}>
          Assign to me &amp; join the thread
        </Button>
      )}
      <Field label="Stage" htmlFor="stage" hint="Changing the stage posts an update to both parties.">
        <NativeSelect id="stage" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as OpenStatus })}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Priority" htmlFor="priority">
        <NativeSelect id="priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as DisputePriority })}>
          {(Object.keys(DISPUTE_PRIORITY) as DisputePriority[]).map((p) => (
            <option key={p} value={p}>
              {DISPUTE_PRIORITY[p].label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Internal notes" htmlFor="notes" hint="Only visible to the admin team.">
        <Textarea id="notes" rows={4} value={form.internalNotes} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} placeholder="Carrier claim filed, photos reviewed, jeweler called…" />
      </Field>
      <Button type="submit" size="sm" pending={pending}>
        Save case
      </Button>
    </form>
  );
}

const RESOLUTION_ORDER: DisputeResolution[] = ["FULL_REFUND", "PARTIAL_REFUND", "RETURN_AND_REFUND", "IN_FAVOR_OF_SELLER", "WITHDRAWN"];

/** Final decision. Refund outcomes are forced through Stripe and reverse the jeweler's transfer. */
export function ResolvePanel({ disputeId, currency, refundableMinor, claimMinor }: { disputeId: string; currency: string; refundableMinor: number; claimMinor: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [resolution, setResolution] = useState<DisputeResolution>("FULL_REFUND");
  const [amount, setAmount] = useState(String(toMajor(Math.min(claimMinor, refundableMinor), currency)));
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false);

  const refundMinor = resolution === "PARTIAL_REFUND" ? toMinor(Number(amount || 0), currency) : resolution === "FULL_REFUND" || resolution === "RETURN_AND_REFUND" ? refundableMinor : 0;
  const invalidAmount = resolution === "PARTIAL_REFUND" && (refundMinor <= 0 || refundMinor > refundableMinor);

  const confirm = () =>
    start(async () => {
      const res = await resolveDisputeAction({ disputeId, resolution, refundAmount: resolution === "PARTIAL_REFUND" ? Number(amount) : undefined, notes });
      if (res.ok) {
        toast.success(res.message);
        setConfirming(false);
        router.refresh();
      } else toast.error(res.message);
    });

  return (
    <div className="space-y-4">
      <RadioGroup value={resolution} onValueChange={(v) => setResolution(v as DisputeResolution)} aria-label="Outcome">
        {RESOLUTION_ORDER.map((r) => (
          <label key={r} className="flex cursor-pointer gap-3 rounded-[3px] border border-line px-3.5 py-3 has-[[data-state=checked]]:border-sage has-[[data-state=checked]]:bg-sage-mist/30">
            <RadioItem value={r} className="mt-0.5" />
            <span>
              <span className="block text-[13.5px] text-ink">{DISPUTE_RESOLUTIONS[r].label}</span>
              <span className="block text-[12.5px] leading-snug text-muted">{DISPUTE_RESOLUTIONS[r].hint}</span>
            </span>
          </label>
        ))}
      </RadioGroup>

      {resolution === "PARTIAL_REFUND" && (
        <Field label={`Refund amount (${currency})`} htmlFor="amount" hint={`Up to ${formatMoney(refundableMinor, currency, { exact: true })} is still refundable.`} error={invalidAmount && amount ? "Enter an amount within the refundable balance." : undefined}>
          <Input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
        </Field>
      )}

      <Field label="Decision notes" htmlFor="decision" hint="Posted to the buyer and jeweler in the case thread.">
        <Textarea id="decision" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Photos confirm the prong was damaged in transit; refunding in full." />
      </Field>

      <Button className="w-full" variant={refundMinor > 0 ? "dark" : "primary"} disabled={pending || invalidAmount || notes.trim().length < 10} onClick={() => setConfirming(true)}>
        {refundMinor > 0 ? `Refund ${formatMoney(refundMinor, currency, { exact: true })} & close case` : "Close case — release funds"}
      </Button>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{refundMinor > 0 ? "Issue a forced refund?" : "Close this case?"}</DialogTitle>
            <DialogDescription>
              {refundMinor > 0
                ? `${formatMoney(refundMinor, currency, { exact: true })} goes back to the buyer's original payment method now, and the jeweler's share is reversed. This can't be undone.`
                : "Held funds are released to the jeweler on the normal schedule. Both parties are notified."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="text-[13.5px] text-ink-soft">
            <p>
              Outcome: <span className="text-ink">{DISPUTE_RESOLUTIONS[resolution].label}</span>
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Keep reviewing
            </Button>
            <Button variant={refundMinor > 0 ? "danger" : "primary"} pending={pending} onClick={confirm}>
              {refundMinor > 0 ? "Refund & close" : "Close case"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
