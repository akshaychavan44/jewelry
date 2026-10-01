"use client";

import { CheckCircle2, CreditCard, FileUp, Landmark } from "lucide-react";
import { useActionState, useState } from "react";
import { Field, FormError } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { KycDocumentType } from "@/generated/prisma/enums";
import { CURRENCIES, SUPPORTED_CURRENCIES } from "@/lib/money";
import { COUNTRY_CODES, countryName } from "@/lib/regions";
import { cn } from "@/lib/utils";
import {
  connectStripeAction,
  saveBankAction,
  saveBusinessAction,
  saveStoreProfileAction,
  type StepState,
  submitApplicationAction,
} from "@/server/actions/onboarding";

type Store = {
  storeName?: string;
  tagline?: string | null;
  bio?: string | null;
  country?: string;
  city?: string | null;
  defaultCurrency?: string;
  foundedYear?: number | null;
  specialties?: string[];
  logoUrl?: string | null;
  bannerUrl?: string | null;
  returnAddress?: { line1: string; line2: string | null; city: string; region: string | null; postalCode: string; phone: string | null } | null;
};

export function StoreProfileForm({
  store,
  action: submit = saveStoreProfileAction,
  submitLabel = "Save and continue",
}: {
  store: Store;
  action?: (state: StepState, formData: FormData) => Promise<StepState>;
  submitLabel?: string;
}) {
  const [state, action] = useActionState<StepState, FormData>(submit, {});
  const err = (k: string) => state.fieldErrors?.[k];
  const ra = store.returnAddress;
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2" noValidate>
      {state.ok ? <p className="rounded-[2px] bg-moss-mist px-4 py-2.5 text-[13.5px] text-moss sm:col-span-2">{state.message}</p> : <FormError message={state.message} />}
      <Field label="Store name" htmlFor="storeName" error={err("storeName")} className="sm:col-span-2">
        <Input id="storeName" name="storeName" defaultValue={store.storeName} aria-invalid={!!err("storeName")} />
      </Field>
      <Field label="Tagline" htmlFor="tagline" optional hint="One line shown under your name, e.g. “Hand-set bridal diamonds from Paris”." className="sm:col-span-2">
        <Input id="tagline" name="tagline" defaultValue={store.tagline ?? ""} maxLength={120} />
      </Field>
      <Field label="Your story" htmlFor="bio" optional className="sm:col-span-2">
        <Textarea id="bio" name="bio" defaultValue={store.bio ?? ""} className="min-h-32" />
      </Field>
      <Field label="Logo" htmlFor="logo" optional hint={store.logoUrl ? "Uploaded — choose a file to replace it." : "Square PNG, JPG or SVG."}>
        <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="h-auto py-2 file:mr-3 file:border-0 file:bg-parchment file:px-3 file:py-1.5" />
      </Field>
      <Field label="Banner" htmlFor="banner" optional hint={store.bannerUrl ? "Uploaded — choose a file to replace it." : "Wide image of your work or workshop."}>
        <Input id="banner" name="banner" type="file" accept="image/png,image/jpeg,image/webp" className="h-auto py-2 file:mr-3 file:border-0 file:bg-parchment file:px-3 file:py-1.5" />
      </Field>
      <Field label="Operating country" htmlFor="country" error={err("country")}>
        <NativeSelect id="country" name="country" defaultValue={store.country ?? "US"}>
          {COUNTRY_CODES.map((c) => (
            <option key={c} value={c}>
              {countryName(c)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="City" htmlFor="city" error={err("city")}>
        <Input id="city" name="city" defaultValue={store.city ?? ""} aria-invalid={!!err("city")} />
      </Field>
      <Field label="Default currency" htmlFor="defaultCurrency" hint="Your listings are priced in this currency; buyers see conversions.">
        <NativeSelect id="defaultCurrency" name="defaultCurrency" defaultValue={store.defaultCurrency ?? "USD"}>
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c} — {CURRENCIES[c].name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Founded" htmlFor="foundedYear" optional>
        <Input id="foundedYear" name="foundedYear" inputMode="numeric" defaultValue={store.foundedYear ?? ""} />
      </Field>
      <Field label="Specialities" htmlFor="specialties" optional hint="Comma-separated, e.g. Bridal, Art Deco, Coloured gemstones" className="sm:col-span-2">
        <Input id="specialties" name="specialties" defaultValue={store.specialties?.join(", ")} />
      </Field>

      <fieldset className="grid gap-5 border-t border-line pt-6 sm:col-span-2 sm:grid-cols-2">
        <legend className="caps mb-1 text-ink">Return address</legend>
        <p className="text-[13px] text-muted sm:col-span-2">Buyers&rsquo; prepaid return labels are addressed here — returns never go through a central warehouse.</p>
        <Field label="Street address" htmlFor="ra_line1" error={err("ra_line1")} className="sm:col-span-2">
          <Input id="ra_line1" name="ra_line1" defaultValue={ra?.line1} aria-invalid={!!err("ra_line1")} />
        </Field>
        <Field label="Suite / floor" htmlFor="ra_line2" optional>
          <Input id="ra_line2" name="ra_line2" defaultValue={ra?.line2 ?? ""} />
        </Field>
        <Field label="City" htmlFor="ra_city" error={err("ra_city")}>
          <Input id="ra_city" name="ra_city" defaultValue={ra?.city} />
        </Field>
        <Field label="State / region" htmlFor="ra_region" optional>
          <Input id="ra_region" name="ra_region" defaultValue={ra?.region ?? ""} />
        </Field>
        <Field label="Postal code" htmlFor="ra_postalCode" error={err("ra_postalCode")}>
          <Input id="ra_postalCode" name="ra_postalCode" defaultValue={ra?.postalCode} />
        </Field>
        <Field label="Phone for couriers" htmlFor="ra_phone" optional>
          <Input id="ra_phone" name="ra_phone" type="tel" defaultValue={ra?.phone ?? ""} />
        </Field>
      </fieldset>
      <div className="sm:col-span-2">
        <SubmitButton size="lg" pendingLabel="Saving…">
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}

const DOCS: { type: KycDocumentType; label: string; hint: string; required: boolean }[] = [
  { type: "TAX_REGISTRATION", label: "Tax registration", hint: "VAT, GST, EIN or equivalent certificate", required: true },
  { type: "BUSINESS_LICENSE", label: "Business licence", hint: "Company registration or trade licence", required: true },
  { type: "GOVERNMENT_ID", label: "Identity document", hint: "Passport or national ID of the owner or director", required: true },
  { type: "PROOF_OF_ADDRESS", label: "Proof of business address", hint: "Utility bill or bank statement under 3 months old", required: false },
];

export function BusinessForm({ values, uploaded }: { values: { legalBusinessName?: string | null; businessType?: string | null; registrationNumber?: string | null; taxIdLast4?: string | null; website?: string | null }; uploaded: Partial<Record<KycDocumentType, string>> }) {
  const [state, action] = useActionState<StepState, FormData>(saveBusinessAction, {});
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2" noValidate>
      <FormError message={state.message} />
      <Field label="Registered business name" htmlFor="legalBusinessName" error={err("legalBusinessName")} className="sm:col-span-2">
        <Input id="legalBusinessName" name="legalBusinessName" defaultValue={values.legalBusinessName ?? ""} aria-invalid={!!err("legalBusinessName")} />
      </Field>
      <Field label="Business type" htmlFor="businessType">
        <NativeSelect id="businessType" name="businessType" defaultValue={values.businessType ?? "COMPANY"}>
          <option value="INDIVIDUAL">Individual</option>
          <option value="SOLE_PROPRIETOR">Sole proprietor</option>
          <option value="PARTNERSHIP">Partnership</option>
          <option value="COMPANY">Company</option>
        </NativeSelect>
      </Field>
      <Field label="Registration number" htmlFor="registrationNumber" error={err("registrationNumber")}>
        <Input id="registrationNumber" name="registrationNumber" defaultValue={values.registrationNumber ?? ""} aria-invalid={!!err("registrationNumber")} />
      </Field>
      <Field label="Tax ID" htmlFor="taxId" error={err("taxId")} hint={values.taxIdLast4 ? `On file: ••••${values.taxIdLast4}. Leave blank to keep it.` : "Encrypted at rest — only the last four digits are ever shown."}>
        <Input id="taxId" name="taxId" type="password" autoComplete="off" aria-invalid={!!err("taxId")} />
      </Field>
      <Field label="Website" htmlFor="website" optional error={err("website")}>
        <Input id="website" name="website" type="url" placeholder="https://" defaultValue={values.website ?? ""} />
      </Field>

      <fieldset className="grid gap-3 border-t border-line pt-6 sm:col-span-2">
        <legend className="caps mb-2 text-ink">Documents</legend>
        {DOCS.map((d) => (
          <label key={d.type} className="flex flex-wrap items-center gap-4 rounded-[3px] border border-dashed border-line-strong bg-ivory px-4 py-3.5">
            {uploaded[d.type] ? <CheckCircle2 className="size-5 text-moss" strokeWidth={1.5} /> : <FileUp className="size-5 text-muted" strokeWidth={1.5} />}
            <span className="min-w-48 flex-1">
              <span className="block text-[14px] text-ink">
                {d.label} {!d.required && <span className="text-muted">(optional)</span>}
              </span>
              <span className="block text-[12.5px] text-muted">{uploaded[d.type] ? `Uploaded: ${uploaded[d.type]}` : d.hint}</span>
            </span>
            <input type="file" name={`doc_${d.type}`} accept="application/pdf,image/jpeg,image/png" className="max-w-56 text-[12.5px] file:mr-3 file:rounded-[2px] file:border-0 file:bg-parchment file:px-3 file:py-1.5" />
          </label>
        ))}
        <p className="text-[12.5px] text-muted">PDF, JPG or PNG up to 12 MB. Documents are stored privately and seen only by Loupe&rsquo;s verification team.</p>
      </fieldset>
      <div className="sm:col-span-2">
        <SubmitButton size="lg" pendingLabel="Uploading…">
          Save and continue
        </SubmitButton>
      </div>
    </form>
  );
}

export function PayoutForm({ stripeConnected, stripeLive, bank, country, currency }: { stripeConnected: boolean; stripeLive: boolean; bank: { holder?: string | null; bankName?: string | null; last4?: string | null } | null; country: string; currency: string }) {
  const [mode, setMode] = useState<"stripe" | "bank">(bank?.last4 ? "bank" : "stripe");
  const [state, action] = useActionState<StepState, FormData>(saveBankAction, {});
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Payout method">
        {(
          [
            ["stripe", CreditCard, "Stripe Connect", "Recommended. Automatic payouts in 45+ countries, identity handled by Stripe."],
            ["bank", Landmark, "Bank transfer", "Payouts to a business bank account in your currency."],
          ] as const
        ).map(([key, Icon, title, body]) => (
          <button key={key} type="button" role="radio" aria-checked={mode === key} onClick={() => setMode(key)} className={cn("rounded-[3px] border p-4 text-left transition-colors", mode === key ? "border-ink bg-ivory" : "border-line hover:border-ink/40")}>
            <Icon className="size-5 text-ink-soft" strokeWidth={1.4} />
            <span className="mt-2 block text-[14.5px] text-ink">{title}</span>
            <span className="mt-1 block text-[12.5px] text-muted">{body}</span>
          </button>
        ))}
      </div>

      {mode === "stripe" ? (
        <form action={connectStripeAction} className="rounded-[3px] border border-line bg-ivory p-5">
          {stripeConnected ? (
            <p className="mb-4 flex items-center gap-2 text-[14px] text-moss">
              <CheckCircle2 className="size-4" /> Stripe account connected.
            </p>
          ) : (
            <p className="mb-4 text-[14px] text-ink-soft">{stripeLive ? "You'll be taken to Stripe to confirm your identity and bank details, then brought back here." : "Stripe keys aren't configured, so a demo Connect account will be created for you."}</p>
          )}
          <SubmitButton pendingLabel="Connecting…">{stripeConnected ? "Continue" : "Connect with Stripe"}</SubmitButton>
        </form>
      ) : (
        <form action={action} className="grid gap-5 rounded-[3px] border border-line bg-ivory p-5 sm:grid-cols-2" noValidate>
          <FormError message={state.message} />
          {bank?.last4 && <p className="text-[13.5px] text-moss sm:col-span-2">On file: {bank.bankName} ••••{bank.last4}. Submit again to replace it.</p>}
          <Field label="Account holder" htmlFor="holder" error={err("holder")}>
            <Input id="holder" name="holder" defaultValue={bank?.holder ?? ""} />
          </Field>
          <Field label="Bank name" htmlFor="bankName" error={err("bankName")}>
            <Input id="bankName" name="bankName" defaultValue={bank?.bankName ?? ""} />
          </Field>
          <Field label="Account number / IBAN" htmlFor="accountNumber" error={err("accountNumber")}>
            <Input id="accountNumber" name="accountNumber" autoComplete="off" />
          </Field>
          <Field label="Routing / sort code / SWIFT / IFSC" htmlFor="routing" error={err("routing")}>
            <Input id="routing" name="routing" autoComplete="off" />
          </Field>
          <Field label="Bank country" htmlFor="country">
            <NativeSelect id="country" name="country" defaultValue={country}>
              {COUNTRY_CODES.map((c) => (
                <option key={c} value={c}>
                  {countryName(c)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Payout currency" htmlFor="currency">
            <NativeSelect id="currency" name="currency" defaultValue={currency}>
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </NativeSelect>
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton pendingLabel="Saving…">Save bank details</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}

export function SubmitApplicationForm() {
  const [state, action] = useActionState<StepState, FormData>(submitApplicationAction, {});
  return (
    <form action={action} className="space-y-5">
      <FormError message={state.message} />
      <label className="flex items-start gap-3 rounded-[3px] border border-line bg-ivory p-4 text-[14px] leading-relaxed text-ink-soft">
        <input type="checkbox" name="agree" className="mt-1 size-4 accent-[#7b8069]" />
        <span>
          I confirm every piece I list is described accurately — metal purity, stones, treatments and condition — and that certificates I attach belong to the piece. I&rsquo;ll ship insured, honour returns to my return address, and respond to disputes within 72 hours.
        </span>
      </label>
      <SubmitButton size="lg" pendingLabel="Submitting…">
        Submit for review
      </SubmitButton>
    </form>
  );
}
