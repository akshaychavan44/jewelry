"use client";

import { useActionState } from "react";
import { Field, FormError } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { GEMSTONES, METAL_OPTIONS, METALS } from "@/lib/jewelry";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import { type CustomRequestState, createCustomRequestAction } from "@/server/actions/account";

export function CustomRequestForm({
  categories,
  currency,
  sellerSlug,
  sellerName,
  jewelers,
}: {
  categories: { id: string; name: string }[];
  currency: string;
  sellerSlug?: string;
  sellerName?: string;
  jewelers?: { id: string; storeName: string; slug: string; city?: string | null }[];
}) {
  const [state, action] = useActionState<CustomRequestState, FormData>(createCustomRequestAction, {});
  if (state.ok) {
    return <p className="rounded-[3px] border border-sage/30 bg-sage-mist px-5 py-4 text-[14.5px] text-sage-deep">{state.message}</p>;
  }
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2" noValidate>
      <FormError message={state.message} />
      {sellerName && <p className="rounded-[2px] bg-parchment px-4 py-2.5 text-[13.5px] text-ink-soft sm:col-span-2">This request is pre-addressed to {sellerName}.</p>}
      <Field label="What would you like made?" htmlFor="title" error={err("title")} className="sm:col-span-2">
        <Input id="title" name="title" placeholder="e.g. A remake of my grandmother's sapphire ring" aria-invalid={!!err("title")} />
      </Field>
      <Field label="Describe it" htmlFor="description" hint="Stones, shape, size, how it will be worn, anything you're attached to." error={err("description")} className="sm:col-span-2">
        <Textarea id="description" name="description" className="min-h-36 resize-none" aria-invalid={!!err("description")} />
      </Field>
      <Field label="Category" htmlFor="categoryId" optional>
        <NativeSelect id="categoryId" name="categoryId" defaultValue="">
          <option value="">Not sure</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Needed by" htmlFor="neededBy" optional>
        <Input id="neededBy" name="neededBy" type="date" />
      </Field>
      <Field label="Metal" htmlFor="metal" optional>
        <NativeSelect id="metal" name="metal" defaultValue="">
          <option value="">No preference</option>
          {METAL_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {METALS[m].label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Main stone" htmlFor="gemstone" optional>
        <NativeSelect id="gemstone" name="gemstone" defaultValue="">
          <option value="">No preference</option>
          {(Object.keys(GEMSTONES) as (keyof typeof GEMSTONES)[]).filter((g) => g !== "NONE").map((g) => (
            <option key={g} value={g}>
              {GEMSTONES[g]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid grid-cols-[5.5rem_1fr] gap-3">
        <Field label="Currency" htmlFor="currency">
          <NativeSelect id="currency" name="currency" defaultValue={currency}>
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Budget from" htmlFor="budgetMin" optional>
          <Input id="budgetMin" name="budgetMin" inputMode="decimal" />
        </Field>
      </div>
      <Field label="Budget up to" htmlFor="budgetMax" error={err("budgetMax")}>
        <Input id="budgetMax" name="budgetMax" inputMode="decimal" aria-invalid={!!err("budgetMax")} />
      </Field>
      <Field label="Ring size (US)" htmlFor="ringSize" optional>
        <Input id="ringSize" name="ringSize" inputMode="decimal" placeholder="e.g. 6.5" />
      </Field>
      <Field label="Choose jeweler" htmlFor="sellerSlug" optional>
        <NativeSelect id="sellerSlug" name="sellerSlug" defaultValue={sellerSlug || ""}>
          <option value="">Any verified jeweler (Open request)</option>
          {jewelers?.map((j) => (
            <option key={j.slug} value={j.slug}>
              {j.storeName} {j.city ? `(${j.city})` : ""}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="flex items-end sm:col-span-2">
        <SubmitButton size="lg" pendingLabel="Sending…">
          Send request
        </SubmitButton>
      </div>
    </form>
  );
}
