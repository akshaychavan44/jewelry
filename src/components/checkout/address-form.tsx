"use client";

import { useActionState, useEffect } from "react";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { COUNTRY_CODES, countryName } from "@/lib/regions";
import { type AddressFormState, saveAddressAction } from "@/server/actions/checkout";

export type AddressValue = {
  id?: string;
  label?: string | null;
  fullName?: string;
  company?: string | null;
  line1?: string;
  line2?: string | null;
  city?: string;
  region?: string | null;
  postalCode?: string;
  country?: string;
  phone?: string | null;
  isDefault?: boolean;
};

export function AddressForm({ initial, onSaved, submitLabel = "Save address", defaultCountry = "US" }: { initial?: AddressValue; onSaved?: (id: string) => void; submitLabel?: string; defaultCountry?: string }) {
  const [state, action] = useActionState<AddressFormState, FormData>(saveAddressAction, {});
  useEffect(() => {
    if (state.ok && state.addressId) onSaved?.(state.addressId);
  }, [state, onSaved]);
  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <Field label="Full name" htmlFor="fullName" error={err("fullName")}>
        <Input id="fullName" name="fullName" autoComplete="name" defaultValue={initial?.fullName} aria-invalid={!!err("fullName")} />
      </Field>
      <Field label="Phone" htmlFor="phone" hint="For the courier, if a signature is needed." error={err("phone")}>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={initial?.phone ?? ""} aria-invalid={!!err("phone")} />
      </Field>
      <Field label="Address" htmlFor="line1" error={err("line1")} className="sm:col-span-2">
        <Input id="line1" name="line1" autoComplete="address-line1" defaultValue={initial?.line1} aria-invalid={!!err("line1")} />
      </Field>
      <Field label="Apartment, suite, floor" htmlFor="line2" optional className="sm:col-span-2">
        <Input id="line2" name="line2" autoComplete="address-line2" defaultValue={initial?.line2 ?? ""} />
      </Field>
      <Field label="City" htmlFor="city" error={err("city")}>
        <Input id="city" name="city" autoComplete="address-level2" defaultValue={initial?.city} aria-invalid={!!err("city")} />
      </Field>
      <Field label="State / region" htmlFor="region" optional>
        <Input id="region" name="region" autoComplete="address-level1" defaultValue={initial?.region ?? ""} />
      </Field>
      <Field label="Postal code" htmlFor="postalCode" error={err("postalCode")}>
        <Input id="postalCode" name="postalCode" autoComplete="postal-code" defaultValue={initial?.postalCode} aria-invalid={!!err("postalCode")} />
      </Field>
      <Field label="Country" htmlFor="country" error={err("country")}>
        <NativeSelect id="country" name="country" autoComplete="country" defaultValue={initial?.country ?? defaultCountry}>
          {COUNTRY_CODES.map((c) => (
            <option key={c} value={c}>
              {countryName(c)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Label" htmlFor="label" optional>
        <Input id="label" name="label" placeholder="Home, Studio…" defaultValue={initial?.label ?? ""} />
      </Field>
      <label className="flex items-center gap-3 self-end pb-3 text-[14px] text-ink-soft">
        <input type="checkbox" name="isDefault" defaultChecked={initial?.isDefault} className="size-4 accent-[#7b8069]" /> Use as my default address
      </label>
      <div className="sm:col-span-2">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        {state.message && !state.ok && <p className="mt-2 text-[13px] text-rosewood">{state.message}</p>}
      </div>
    </form>
  );
}
