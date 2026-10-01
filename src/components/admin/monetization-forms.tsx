"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Switch } from "@/components/ui/controls";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import type { KycDocumentType } from "@/generated/prisma/enums";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import { KYC_DOCUMENT_LABELS } from "@/lib/status";
import { cn } from "@/lib/utils";
import { deleteCommissionRuleAction, saveCommissionRuleAction, savePlanAction, updatePlatformSettingsAction } from "@/server/actions/admin";

type Result = { ok: boolean; message: string };

function useSave() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(res.message);
        after?.();
      } else toast.error(res.message);
      router.refresh();
    });
  return { pending, run };
}

// ── Platform settings ─────────────────────────────────────────────────────────

export type SettingsForm = {
  defaultCommissionPercent: string;
  listingFee: string;
  listingFeeCurrency: string;
  inspectionWindowDays: string;
  offerExpiryHours: string;
  minOfferPercent: string;
  reservationMinutes: string;
  signatureThresholdUsd: string;
  secureCourierThresholdUsd: string;
  requiredKycDocuments: KycDocumentType[];
};

export function PlatformSettingsForm({ initial }: { initial: SettingsForm }) {
  const [form, setForm] = useState(initial);
  const { pending, run } = useSave();
  const set = (k: keyof SettingsForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });
  const numeric = (k: keyof SettingsForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value.replace(/[^\d.]/g, "") });

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updatePlatformSettingsAction(form));
      }}
    >
      <fieldset className="grid gap-5 md:grid-cols-3">
        <legend className="mb-4 text-[12px] tracking-[0.08em] text-muted uppercase">Fees</legend>
        <Field label="Default commission (%)" htmlFor="commission" hint="Applies when no seller or category rule matches.">
          <Input id="commission" inputMode="decimal" value={form.defaultCommissionPercent} onChange={numeric("defaultCommissionPercent")} />
        </Field>
        <Field label="Listing fee" htmlFor="fee" hint="Charged once when a piece is first published. 0 to disable.">
          <div className="flex gap-2">
            <Input id="fee" inputMode="decimal" value={form.listingFee} onChange={numeric("listingFee")} />
            <NativeSelect aria-label="Listing fee currency" className="w-24" value={form.listingFeeCurrency} onChange={set("listingFeeCurrency")}>
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </NativeSelect>
          </div>
        </Field>
        <Field label="Inspection window (days)" htmlFor="inspection" hint="Funds release to jewelers this long after delivery.">
          <Input id="inspection" inputMode="numeric" value={form.inspectionWindowDays} onChange={numeric("inspectionWindowDays")} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-5 md:grid-cols-3">
        <legend className="mb-4 text-[12px] tracking-[0.08em] text-muted uppercase">Offers &amp; checkout</legend>
        <Field label="Offer expiry (hours)" htmlFor="expiry">
          <Input id="expiry" inputMode="numeric" value={form.offerExpiryHours} onChange={numeric("offerExpiryHours")} />
        </Field>
        <Field label="Lowest offer (% of price)" htmlFor="minoffer" hint="Offers below this are declined automatically.">
          <Input id="minoffer" inputMode="decimal" value={form.minOfferPercent} onChange={numeric("minOfferPercent")} />
        </Field>
        <Field label="Cart hold (minutes)" htmlFor="reservation" hint="How long stock is held during checkout.">
          <Input id="reservation" inputMode="numeric" value={form.reservationMinutes} onChange={numeric("reservationMinutes")} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-5 md:grid-cols-2">
        <legend className="mb-4 text-[12px] tracking-[0.08em] text-muted uppercase">Delivery security (USD)</legend>
        <Field label="Signature required above" htmlFor="signature" hint="Buyers can't waive signature-on-delivery above this value.">
          <Input id="signature" inputMode="decimal" value={form.signatureThresholdUsd} onChange={numeric("signatureThresholdUsd")} />
        </Field>
        <Field label="Secure courier only above" htmlFor="courier" hint="Only armoured courier services are offered above this value.">
          <Input id="courier" inputMode="decimal" value={form.secureCourierThresholdUsd} onChange={numeric("secureCourierThresholdUsd")} />
        </Field>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-[12px] tracking-[0.08em] text-muted uppercase">Required jeweler documents</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(KYC_DOCUMENT_LABELS) as KycDocumentType[]).map((t) => (
            <label key={t} className="flex items-center gap-3 rounded-[3px] border border-line px-3.5 py-2.5 text-[14px] text-ink-soft">
              <Checkbox
                checked={form.requiredKycDocuments.includes(t)}
                onCheckedChange={(v) => setForm({ ...form, requiredKycDocuments: v ? [...form.requiredKycDocuments, t] : form.requiredKycDocuments.filter((x) => x !== t) })}
              />
              {KYC_DOCUMENT_LABELS[t]}
            </label>
          ))}
        </div>
        <p className="mt-2 text-[12.5px] text-muted">Applies to new applications. Jewelers already approved aren&rsquo;t asked again.</p>
      </fieldset>

      <Button type="submit" pending={pending}>
        Save settings
      </Button>
    </form>
  );
}

// ── Commission rules ──────────────────────────────────────────────────────────

export type RuleRow = {
  id: string;
  name: string;
  scope: "CATEGORY" | "SELLER";
  categoryId: string;
  sellerId: string;
  target: string;
  ratePercent: string;
  priority: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  window: string;
};

const blankRule: Omit<RuleRow, "id" | "target" | "window"> & { id?: string } = { name: "", scope: "CATEGORY", categoryId: "", sellerId: "", ratePercent: "", priority: "0", isActive: true, startsAt: "", endsAt: "" };

export function CommissionRules({ rules, categories, sellers }: { rules: RuleRow[]; categories: { id: string; label: string }[]; sellers: { id: string; label: string }[] }) {
  const { pending, run } = useSave();
  const [editing, setEditing] = useState<typeof blankRule | null>(null);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-[11px] tracking-[0.1em] text-muted uppercase">
              <th className="py-2.5 pr-3 font-medium">Rule</th>
              <th className="py-2.5 pr-3 font-medium">Applies to</th>
              <th className="py-2.5 pr-3 text-right font-medium">Rate</th>
              <th className="py-2.5 pr-3 text-right font-medium">Priority</th>
              <th className="py-2.5 pr-3 font-medium">Window</th>
              <th className="py-2.5 pr-3 font-medium">Status</th>
              <th className="py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-muted">
                  No rules — every sale uses the default commission.
                </td>
              </tr>
            )}
            {rules.map((r) => (
              <tr key={r.id} className="border-b border-line/70">
                <td className="py-3 pr-3 text-ink">{r.name}</td>
                <td className="py-3 pr-3 text-ink-soft">
                  <span className="mr-1.5 rounded-full bg-parchment px-2 py-0.5 text-[11px] text-muted">{r.scope === "CATEGORY" ? "Category" : "Jeweler"}</span>
                  {r.target}
                </td>
                <td className="py-3 pr-3 text-right font-medium tabular text-ink">{r.ratePercent}%</td>
                <td className="py-3 pr-3 text-right tabular text-ink-soft">{r.priority}</td>
                <td className="py-3 pr-3 text-[12.5px] text-ink-soft">{r.window}</td>
                <td className={cn("py-3 pr-3 text-[12.5px]", r.isActive ? "text-moss" : "text-muted")}>{r.isActive ? "Active" : "Paused"}</td>
                <td className="py-3 text-right whitespace-nowrap">
                  <button type="button" className="p-1.5 text-muted hover:text-ink" aria-label={`Edit ${r.name}`} onClick={() => setEditing({ ...r })}>
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="p-1.5 text-muted hover:text-rosewood disabled:opacity-40"
                    aria-label={`Delete ${r.name}`}
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(`Delete “${r.name}”? New orders will fall back to the next matching rule.`)) run(() => deleteCommissionRuleAction(r.id));
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button className="mt-4" variant="ghost" size="sm" onClick={() => setEditing({ ...blankRule })}>
        <Plus /> Add a rule
      </Button>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          {editing && (
            <form
              className="flex min-h-0 flex-col"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => saveCommissionRuleAction({ ...editing, startsAt: editing.startsAt || undefined, endsAt: editing.endsAt || undefined }), () => setEditing(null));
              }}
            >
              <DialogHeader>
                <DialogTitle>{editing.id ? "Edit commission rule" : "New commission rule"}</DialogTitle>
              </DialogHeader>
              <DialogBody className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" htmlFor="rname" className="sm:col-span-2">
                  <Input id="rname" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="High jewelry — reduced rate" />
                </Field>
                <Field label="Applies to" htmlFor="rscope">
                  <NativeSelect id="rscope" value={editing.scope} onChange={(e) => setEditing({ ...editing, scope: e.target.value as "CATEGORY" | "SELLER" })}>
                    <option value="CATEGORY">A category</option>
                    <option value="SELLER">A jeweler</option>
                  </NativeSelect>
                </Field>
                {editing.scope === "CATEGORY" ? (
                  <Field label="Category" htmlFor="rcat">
                    <NativeSelect id="rcat" value={editing.categoryId} onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}>
                      <option value="">Choose…</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                ) : (
                  <Field label="Jeweler" htmlFor="rseller">
                    <NativeSelect id="rseller" value={editing.sellerId} onChange={(e) => setEditing({ ...editing, sellerId: e.target.value })}>
                      <option value="">Choose…</option>
                      {sellers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                )}
                <Field label="Commission (%)" htmlFor="rrate">
                  <Input id="rrate" inputMode="decimal" value={editing.ratePercent} onChange={(e) => setEditing({ ...editing, ratePercent: e.target.value.replace(/[^\d.]/g, "") })} />
                </Field>
                <Field label="Priority" htmlFor="rprio" hint="Higher wins when rules overlap.">
                  <Input id="rprio" inputMode="numeric" value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: e.target.value.replace(/\D/g, "") })} />
                </Field>
                <Field label="Starts" htmlFor="rstart" optional>
                  <Input id="rstart" type="date" value={editing.startsAt} onChange={(e) => setEditing({ ...editing, startsAt: e.target.value })} />
                </Field>
                <Field label="Ends" htmlFor="rend" optional>
                  <Input id="rend" type="date" value={editing.endsAt} onChange={(e) => setEditing({ ...editing, endsAt: e.target.value })} />
                </Field>
                <label className="flex items-center justify-between gap-3 text-[14px] text-ink-soft sm:col-span-2">
                  Rule is active <Switch checked={editing.isActive} onCheckedChange={(v) => setEditing({ ...editing, isActive: v })} />
                </label>
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" pending={pending}>
                  {editing.id ? "Save rule" : "Add rule"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Subscription plans ────────────────────────────────────────────────────────

export type PlanRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  commissionDiscountPercent: string;
  featuredSlots: string;
  homepagePlacement: boolean;
  listingFeeWaived: boolean;
  features: string;
  isActive: boolean;
  subscribers: number;
  effectiveCommission: string;
};

export function PlanEditor({ plans }: { plans: PlanRow[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {plans.map((p) => (
        <PlanCard key={p.id} plan={p} />
      ))}
    </div>
  );
}

function PlanCard({ plan }: { plan: PlanRow }) {
  const [form, setForm] = useState(plan);
  const { pending, run } = useSave();
  const dirty = JSON.stringify(form) !== JSON.stringify(plan);
  return (
    <form
      className="flex flex-col gap-4 rounded-[3px] border border-line bg-ivory p-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(() =>
          savePlanAction({
            id: form.id,
            name: form.name,
            description: form.description,
            price: form.price,
            commissionDiscountPercent: form.commissionDiscountPercent,
            featuredSlots: form.featuredSlots,
            homepagePlacement: form.homepagePlacement,
            listingFeeWaived: form.listingFeeWaived,
            features: form.features.split("\n").map((f) => f.trim()).filter(Boolean),
            isActive: form.isActive,
          }),
        );
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="caps text-ink">{plan.code}</p>
        <p className="text-[12.5px] text-muted">
          {plan.subscribers} {plan.subscribers === 1 ? "jeweler" : "jewelers"} · {plan.effectiveCommission} effective
        </p>
      </div>
      <Field label="Name" htmlFor={`${plan.id}-name`}>
        <Input id={`${plan.id}-name`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Price / mo (${plan.currency})`} htmlFor={`${plan.id}-price`}>
          <Input id={`${plan.id}-price`} inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^\d.]/g, "") })} />
        </Field>
        <Field label="Commission cut (pts)" htmlFor={`${plan.id}-disc`}>
          <Input id={`${plan.id}-disc`} inputMode="decimal" value={form.commissionDiscountPercent} onChange={(e) => setForm({ ...form, commissionDiscountPercent: e.target.value.replace(/[^\d.]/g, "") })} />
        </Field>
        <Field label="Featured slots" htmlFor={`${plan.id}-slots`}>
          <Input id={`${plan.id}-slots`} inputMode="numeric" value={form.featuredSlots} onChange={(e) => setForm({ ...form, featuredSlots: e.target.value.replace(/\D/g, "") })} />
        </Field>
        <div className="flex flex-col justify-end gap-2 pb-1 text-[13px] text-ink-soft">
          <label className="flex items-center justify-between gap-2">
            Homepage <Switch checked={form.homepagePlacement} onCheckedChange={(v) => setForm({ ...form, homepagePlacement: v })} />
          </label>
          <label className="flex items-center justify-between gap-2">
            No listing fee <Switch checked={form.listingFeeWaived} onCheckedChange={(v) => setForm({ ...form, listingFeeWaived: v })} />
          </label>
        </div>
      </div>
      <Field label="Features" htmlFor={`${plan.id}-features`} hint="One per line, shown on the plan picker.">
        <Textarea id={`${plan.id}-features`} rows={4} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
      </Field>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
        <label className="flex items-center gap-2 text-[13px] text-ink-soft">
          <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} /> Offered to jewelers
        </label>
        <Button type="submit" size="sm" variant={dirty ? "primary" : "outline"} pending={pending} disabled={!dirty}>
          Save plan
        </Button>
      </div>
    </form>
  );
}
