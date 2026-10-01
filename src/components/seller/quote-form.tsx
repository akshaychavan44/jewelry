"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { setCommissionStatusAction, submitQuoteAction } from "@/server/actions/seller";

export function QuoteForm({ requestId, currency }: { requestId: string; currency: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ amount: "", lead: "30", deposit: "30", message: "" });
  return (
    <form
      className="grid gap-3 rounded-[3px] border border-line bg-ivory p-4 md:grid-cols-[1fr_1fr_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await submitQuoteAction({ requestId, amount: Number(form.amount), leadTimeDays: Number(form.lead), depositPercent: Number(form.deposit), message: form.message });
          if (res.ok) toast.success(res.message);
          else toast.error(res.message);
          router.refresh();
        });
      }}
    >
      <label className="text-[12px] text-ink-soft">
        Price ({currency})
        <Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.]/g, "") })} inputMode="decimal" className="mt-1 h-9" />
      </label>
      <label className="text-[12px] text-ink-soft">
        Lead time (days)
        <Input value={form.lead} onChange={(e) => setForm({ ...form, lead: e.target.value.replace(/\D/g, "") })} inputMode="numeric" className="mt-1 h-9" />
      </label>
      <label className="text-[12px] text-ink-soft">
        Deposit (%)
        <Input value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value.replace(/\D/g, "") })} inputMode="numeric" className="mt-1 h-9" />
      </label>
      <div className="flex items-end">
        <Button type="submit" size="sm" pending={pending} className="h-9 w-full">
          Send quote
        </Button>
      </div>
      <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="How would you make it? Stones you'd propose, sketches, timing…" className="min-h-20 md:col-span-4" aria-label="Message to the buyer" />
    </form>
  );
}

export function CommissionStatus({ requestId, status }: { requestId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = status === "ACCEPTED" ? "IN_PRODUCTION" : status === "IN_PRODUCTION" ? "COMPLETED" : null;
  if (!next) return null;
  return (
    <Button
      size="sm"
      variant="outline"
      pending={pending}
      onClick={() =>
        start(async () => {
          const res = await setCommissionStatusAction(requestId, next);
          if (res.ok) toast.success(res.message);
          else toast.error(res.message);
          router.refresh();
        })
      }
    >
      {next === "IN_PRODUCTION" ? "Start making" : "Mark completed"}
    </Button>
  );
}
