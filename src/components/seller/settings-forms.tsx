"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/controls";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Carrier, ShippingMethod, ShippingZone } from "@/generated/prisma/enums";
import { ZONE_LABELS } from "@/lib/regions";
import { CARRIERS, METHOD_LABELS } from "@/lib/shipping";
import { cn } from "@/lib/utils";
import { changePlanAction, savePoliciesAction, saveShippingRatesAction } from "@/server/actions/seller";

export function PoliciesForm({ initial }: { initial: { returnWindowDays: number; handlingDays: number; acceptsOffers: boolean; acceptsCustomOrders: boolean } }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-5 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await savePoliciesAction(form);
          if (res.ok) toast.success(res.message);
          else toast.error(res.message);
          router.refresh();
        });
      }}
    >
      <Field label="Return window (days)" htmlFor="rw" hint="Engraved and made-to-measure pieces are exempt unless faulty.">
        <Input id="rw" inputMode="numeric" value={form.returnWindowDays} onChange={(e) => setForm({ ...form, returnWindowDays: Number(e.target.value.replace(/\D/g, "")) })} />
      </Field>
      <Field label="Handling time (working days)" htmlFor="hd" hint="Before dispatch, for in-stock pieces.">
        <Input id="hd" inputMode="numeric" value={form.handlingDays} onChange={(e) => setForm({ ...form, handlingDays: Number(e.target.value.replace(/\D/g, "")) })} />
      </Field>
      <label className="flex items-center justify-between gap-3 rounded-[3px] border border-line px-4 py-3 text-[14px] text-ink-soft">
        Accept offers on eligible listings <Switch checked={form.acceptsOffers} onCheckedChange={(v) => setForm({ ...form, acceptsOffers: v })} />
      </label>
      <label className="flex items-center justify-between gap-3 rounded-[3px] border border-line px-4 py-3 text-[14px] text-ink-soft">
        Take bespoke commissions <Switch checked={form.acceptsCustomOrders} onCheckedChange={(v) => setForm({ ...form, acceptsCustomOrders: v })} />
      </label>
      <div>
        <Button type="submit" pending={pending}>
          Save policies
        </Button>
      </div>
    </form>
  );
}

type Rate = { zone: ShippingZone; method: ShippingMethod; carrier: Carrier | null; price: string; freeOver: string; minDays: string; maxDays: string; insuranceRateBps: string; isActive: boolean };

export function RateCardEditor({ initial, currency }: { initial: Rate[]; currency: string }) {
  const router = useRouter();
  const [rates, setRates] = useState<Rate[]>(initial);
  const [pending, start] = useTransition();
  const update = (i: number, patch: Partial<Rate>) => setRates((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const cell = "h-9 rounded-[2px] border border-line bg-ivory px-2 text-[13px] outline-none focus:border-sage";
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-line text-[11px] tracking-[0.08em] text-muted uppercase">
              <th className="px-2 py-2">Destination</th>
              <th className="px-2 py-2">Service</th>
              <th className="px-2 py-2">Carrier</th>
              <th className="px-2 py-2">Price ({currency})</th>
              <th className="px-2 py-2">Free over</th>
              <th className="px-2 py-2">Days</th>
              <th className="px-2 py-2">Insurance (bps)</th>
              <th className="px-2 py-2">On</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rates.map((r, i) => (
              <tr key={i} className="border-b border-line/70">
                <td className="px-2 py-1.5">
                  <select className={cn(cell, "w-40")} value={r.zone} onChange={(e) => update(i, { zone: e.target.value as ShippingZone })} aria-label="Destination">
                    {(Object.keys(ZONE_LABELS) as ShippingZone[]).map((z) => (
                      <option key={z} value={z}>{ZONE_LABELS[z]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <select className={cn(cell, "w-40")} value={r.method} onChange={(e) => update(i, { method: e.target.value as ShippingMethod })} aria-label="Service">
                    {(Object.keys(METHOD_LABELS) as ShippingMethod[]).map((m) => (
                      <option key={m} value={m}>{METHOD_LABELS[m].label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <select className={cn(cell, "w-36")} value={r.carrier ?? ""} onChange={(e) => update(i, { carrier: (e.target.value || null) as Carrier | null })} aria-label="Carrier">
                    <option value="">—</option>
                    {(Object.keys(CARRIERS) as Carrier[]).map((c) => (
                      <option key={c} value={c}>{CARRIERS[c].label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5"><input className={cn(cell, "w-24")} inputMode="decimal" value={r.price} onChange={(e) => update(i, { price: e.target.value })} aria-label="Price" /></td>
                <td className="px-2 py-1.5"><input className={cn(cell, "w-24")} inputMode="decimal" value={r.freeOver} onChange={(e) => update(i, { freeOver: e.target.value })} aria-label="Free over" /></td>
                <td className="px-2 py-1.5">
                  <span className="flex items-center gap-1">
                    <input className={cn(cell, "w-12")} inputMode="numeric" value={r.minDays} onChange={(e) => update(i, { minDays: e.target.value })} aria-label="Minimum days" />–
                    <input className={cn(cell, "w-12")} inputMode="numeric" value={r.maxDays} onChange={(e) => update(i, { maxDays: e.target.value })} aria-label="Maximum days" />
                  </span>
                </td>
                <td className="px-2 py-1.5"><input className={cn(cell, "w-20")} inputMode="numeric" value={r.insuranceRateBps} onChange={(e) => update(i, { insuranceRateBps: e.target.value })} aria-label="Insurance basis points" /></td>
                <td className="px-2 py-1.5"><Switch checked={r.isActive} onCheckedChange={(v) => update(i, { isActive: v })} aria-label="Active" /></td>
                <td className="px-2 py-1.5">
                  <button type="button" onClick={() => setRates((x) => x.filter((_, j) => j !== i))} className="p-1 text-muted hover:text-rosewood" aria-label="Remove rate"><Trash2 className="size-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setRates((r) => [...r, { zone: "DOMESTIC", method: "STANDARD_INSURED", carrier: null, price: "0", freeOver: "", minDays: "2", maxDays: "4", insuranceRateBps: "0", isActive: true }])}>
          <Plus /> Add a rate
        </Button>
        <Button
          size="sm"
          pending={pending}
          onClick={() =>
            start(async () => {
              const res = await saveShippingRatesAction(
                rates.map((r) => ({ ...r, price: Number(r.price || 0), freeOver: r.freeOver ? Number(r.freeOver) : null, minDays: Number(r.minDays), maxDays: Number(r.maxDays), insuranceRateBps: Number(r.insuranceRateBps || 0) })),
              );
              if (res.ok) toast.success(res.message);
              else toast.error(res.message);
              router.refresh();
            })
          }
        >
          Save rate card
        </Button>
      </div>
      <p className="mt-3 text-[12.5px] text-muted">Shipping terms, fulfillment timeframes and direct dispatch options displayed to prospective customers.</p>
    </div>
  );
}

export function PlanPicker({ plans, current }: { plans: { code: string; name: string; price: string; commission: string; features: string[] }[]; current: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {plans.map((p) => (
        <div key={p.code} className={cn("flex flex-col rounded-[3px] border p-5", p.code === current ? "border-sage bg-sage-mist/40" : "border-line bg-ivory")}>
          <p className="caps text-ink">{p.name}</p>
          <p className="mt-2 text-[22px] font-semibold text-ink">{p.price}</p>
          <p className="text-[13px] text-sage-deep">0% sales commission · Direct client sales</p>
          <ul className="mt-4 flex-1 space-y-1.5 text-[13px] text-ink-soft">
            {p.features.map((f) => (
              <li key={f}>✦ {f}</li>
            ))}
          </ul>
          {p.code === current ? (
            <p className="mt-4 text-[13px] text-sage-deep">Current plan</p>
          ) : (
            <Button
              className="mt-4"
              size="sm"
              variant="outline"
              pending={pending}
              onClick={() =>
                start(async () => {
                  const res = await changePlanAction(p.code);
                  if (res.ok) toast.success(res.message);
                  else toast.error(res.message);
                  router.refresh();
                })
              }
            >
              Switch to {p.name}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
