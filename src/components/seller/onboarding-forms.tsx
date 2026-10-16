"use client";

import { CheckCircle2, FileUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Field, FormError } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { KycDocumentType } from "@/lib/domain-enums";
import { CURRENCIES, SUPPORTED_CURRENCIES } from "@/lib/money";
import { COUNTRY_CODES, countryName } from "@/lib/regions";
import { cn } from "@/lib/utils";
import { uploadFormImages } from "@/lib/image-upload-client";
import { uploadKycDocuments } from "@/lib/kyc-upload-client";
import {
  saveBusinessAction,
  saveStoreProfileAction,
  type StepState,
  submitApplicationAction,
} from "@/server/actions/onboarding";

type Store = {
  socials?: Record<string, string>;
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
  userId,
  action: submit = saveStoreProfileAction,
  submitLabel = "Save and continue",
}: {
  store: Store;
  userId: string;
  action?: (state: StepState, formData: FormData) => Promise<StepState>;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<StepState>({});
  const err = (k: string) => state.fieldErrors?.[k];
  const ra = store.returnAddress;

  const [values, setValues] = useState<Record<string, string>>(() => ({
    storeName: store.storeName ?? "",
    tagline: store.tagline ?? "",
    bio: store.bio ?? "",
    country: store.country ?? "US",
    city: store.city ?? "",
    defaultCurrency: store.defaultCurrency ?? "INR",
    foundedYear: store.foundedYear ? String(store.foundedYear) : "",
    specialties: store.specialties?.join(", ") ?? "",
    ra_line1: ra?.line1 ?? "",
    ra_line2: ra?.line2 ?? "",
    ra_city: ra?.city ?? "",
    ra_region: ra?.region ?? "",
    ra_postalCode: ra?.postalCode ?? "",
    ra_phone: ra?.phone ?? "",
    instagram: store.socials?.instagram ?? "",
    facebook: store.socials?.facebook ?? "",
    youtube: store.socials?.youtube ?? "",
    whatsapp: store.socials?.whatsapp ?? "",
    publicEmail: store.socials?.publicEmail ?? "",
    maps: store.socials?.maps ?? "",
  }));

  // Restore draft from storage on mount if available
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`loupe_onboarding_store_profile:${userId}`) || localStorage.getItem(`loupe_onboarding_store_profile:${userId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setValues((prev) => {
            const next = { ...prev };
            for (const [k, v] of Object.entries(parsed)) {
              if (typeof v === "string" && v) {
                next[k] = v;
              }
            }
            return next;
          });
        }
      }
    } catch {}
  }, [userId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      try {
        sessionStorage.setItem(`loupe_onboarding_store_profile:${userId}`, JSON.stringify(next));
        localStorage.setItem(`loupe_onboarding_store_profile:${userId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
    if (state.fieldErrors?.[name]) {
      setState((prev) => {
        if (!prev.fieldErrors) return prev;
        const nextErrors = { ...prev.fieldErrors };
        delete nextErrors[name];
        return { ...prev, fieldErrors: nextErrors };
      });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const errors: Record<string, string[]> = {};
    if (!values.storeName || values.storeName.trim().length < 2) {
      errors.storeName = ["Enter your store name (at least 2 characters)."];
    }
    if (!values.city || values.city.trim().length < 2) {
      errors.city = ["Enter your city."];
    }
    if (!values.ra_line1 || values.ra_line1.trim().length < 3) {
      errors.ra_line1 = ["Enter the return street address."];
    }
    if (!values.ra_city || values.ra_city.trim().length < 2) {
      errors.ra_city = ["Enter the return city."];
    }
    if (!values.ra_postalCode || values.ra_postalCode.trim().length < 2) {
      errors.ra_postalCode = ["Enter the return postal code."];
    }

    if (Object.keys(errors).length > 0) {
      setState({
        ok: false,
        message: "Please fill in all required fields before continuing.",
        fieldErrors: errors,
      });

      const firstKey = Object.keys(errors)[0];
      const el = document.getElementById(firstKey);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    const formElement = e.currentTarget;
    const formData = new FormData(formElement);

    startTransition(async () => {
      try {
        await uploadFormImages(formData, { logo: "STORE_BRANDING", banner: "STORE_BRANDING" });
        const res = await submit({}, formData);
        setState(res);
        if (res.ok) {
          try {
            sessionStorage.removeItem(`loupe_onboarding_store_profile:${userId}`);
            localStorage.removeItem(`loupe_onboarding_store_profile:${userId}`);
          } catch {}
          router.push("/seller/onboarding?step=2");
        } else {
          if (res.values) {
            setValues((prev) => ({ ...prev, ...res.values }));
          }
          if (res.fieldErrors && Object.keys(res.fieldErrors).length > 0) {
            const firstKey = Object.keys(res.fieldErrors)[0];
            const el = document.getElementById(firstKey);
            if (el) {
              el.focus();
              el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }
        }
      } catch (err) {
        setState({
          ok: false,
          message: err instanceof Error ? err.message : "Failed to save profile. Please try again.",
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2" noValidate>
      {state.ok ? <p className="rounded-[2px] bg-moss-mist px-4 py-2.5 text-[13.5px] text-moss sm:col-span-2">{state.message}</p> : <FormError message={state.message} />}
      <Field label="Store name" htmlFor="storeName" error={err("storeName")} className="sm:col-span-2">
        <Input id="storeName" name="storeName" value={values.storeName} onChange={handleChange} aria-invalid={!!err("storeName")} required />
      </Field>
      <Field label="Tagline" htmlFor="tagline" optional hint="One line shown under your name, e.g. “Hand-set bridal diamonds from Paris”." className="sm:col-span-2">
        <Input id="tagline" name="tagline" value={values.tagline} onChange={handleChange} maxLength={120} />
      </Field>
      <Field label="Your story" htmlFor="bio" optional className="sm:col-span-2">
        <Textarea id="bio" name="bio" value={values.bio} onChange={handleChange} className="min-h-32" />
      </Field>
      <Field label="Logo" htmlFor="logo" optional hint={store.logoUrl ? "Uploaded — choose a file to replace it." : "Square PNG, JPG or SVG."}>
        <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="h-auto py-2 file:mr-3 file:border-0 file:bg-parchment file:px-3 file:py-1.5" />
      </Field>
      <Field label="Banner" htmlFor="banner" optional hint={store.bannerUrl ? "Uploaded — choose a file to replace it." : "Wide image of your work or workshop."}>
        <Input id="banner" name="banner" type="file" accept="image/png,image/jpeg,image/webp" className="h-auto py-2 file:mr-3 file:border-0 file:bg-parchment file:px-3 file:py-1.5" />
      </Field>
      <Field label="Operating country" htmlFor="country" error={err("country")}>
        <NativeSelect id="country" name="country" value={values.country} onChange={handleChange}>
          {COUNTRY_CODES.map((c) => (
            <option key={c} value={c}>
              {countryName(c)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="City" htmlFor="city" error={err("city")}>
        <Input id="city" name="city" value={values.city} onChange={handleChange} aria-invalid={!!err("city")} required />
      </Field>
      <Field label="Default currency" htmlFor="defaultCurrency" hint="Used for custom request budgets.">
        <NativeSelect id="defaultCurrency" name="defaultCurrency" value={values.defaultCurrency} onChange={handleChange}>
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c} — {CURRENCIES[c].name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Founded" htmlFor="foundedYear" optional>
        <Input id="foundedYear" name="foundedYear" inputMode="numeric" value={values.foundedYear} onChange={handleChange} />
      </Field>
      <Field label="Specialities" htmlFor="specialties" optional hint="Comma-separated, e.g. Bridal, Art Deco, Coloured gemstones" className="sm:col-span-2">
        <Input id="specialties" name="specialties" value={values.specialties} onChange={handleChange} />
      </Field>

      <fieldset className="grid gap-5 border-t border-line pt-6 sm:col-span-2 sm:grid-cols-2">
        <legend className="caps mb-1 text-ink">Business / Atelier Address</legend>
        <p className="text-[13px] text-muted sm:col-span-2">Your workshop or showroom address for customer visits, inquiries, and direct correspondence.</p>
        <Field label="Street address" htmlFor="ra_line1" error={err("ra_line1")} className="sm:col-span-2">
          <Input id="ra_line1" name="ra_line1" value={values.ra_line1} onChange={handleChange} aria-invalid={!!err("ra_line1")} required />
        </Field>
        <Field label="Suite / floor" htmlFor="ra_line2" optional>
          <Input id="ra_line2" name="ra_line2" value={values.ra_line2} onChange={handleChange} />
        </Field>
        <Field label="City" htmlFor="ra_city" error={err("ra_city")}>
          <Input id="ra_city" name="ra_city" value={values.ra_city} onChange={handleChange} aria-invalid={!!err("ra_city")} required />
        </Field>
        <Field label="State / region" htmlFor="ra_region" optional>
          <Input id="ra_region" name="ra_region" value={values.ra_region} onChange={handleChange} />
        </Field>
        <Field label="Postal code" htmlFor="ra_postalCode" error={err("ra_postalCode")}>
          <Input id="ra_postalCode" name="ra_postalCode" value={values.ra_postalCode} onChange={handleChange} aria-invalid={!!err("ra_postalCode")} required />
        </Field>
        <Field label="Business phone" htmlFor="ra_phone" optional>
          <Input id="ra_phone" name="ra_phone" type="tel" value={values.ra_phone} onChange={handleChange} />
        </Field>
      </fieldset>
      <fieldset className="grid gap-5 border-t border-line pt-6 sm:col-span-2 sm:grid-cols-2"><legend className="caps text-ink">Social & contact links</legend><p className="text-sm text-muted sm:col-span-2">Optional. These links appear on your business profile after approval and can be edited in My Business.</p>{[
        ["instagram", "Instagram", "url", "https://instagram.com/yourbusiness"], ["facebook", "Facebook", "url", "https://facebook.com/yourbusiness"], ["youtube", "YouTube", "url", "https://youtube.com/@yourbusiness"], ["whatsapp", "WhatsApp", "tel", "+91 9876543210"], ["publicEmail", "Public contact email", "email", "hello@yourbusiness.com"], ["maps", "Google Maps", "url", "https://maps.app.goo.gl/…"]
      ].map(([key, label, type, placeholder]) => <Field key={key} label={label} htmlFor={key} optional error={err(key)}><Input id={key} name={key} type={type} placeholder={placeholder} value={values[key] ?? ""} onChange={handleChange} aria-invalid={!!err(key)} /></Field>)}</fieldset>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" pending={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
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

export function BusinessForm({
  values,
  uploaded,
  userId,
}: {
  values: {
    legalBusinessName?: string | null;
    businessType?: string | null;
    registrationNumber?: string | null;
    taxIdLast4?: string | null;
    website?: string | null;
  };
  uploaded: Partial<Record<KycDocumentType, string>>;
  userId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<StepState>({});
  const err = (k: string) => state.fieldErrors?.[k];
  const [bizValues, setBizValues] = useState({
    legalBusinessName: values.legalBusinessName ?? "",
    businessType: values.businessType ?? "COMPANY",
    registrationNumber: values.registrationNumber ?? "",
    taxId: "",
    website: values.website ?? "",
  });

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`loupe_onboarding_biz_profile:${userId}`) || localStorage.getItem(`loupe_onboarding_biz_profile:${userId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setBizValues((prev) => {
            const next = { ...prev };
            for (const [k, v] of Object.entries(parsed)) {
              if (typeof v === "string" && v) {
                (next as Record<string, string>)[k] = v;
              }
            }
            return next;
          });
        }
      }
    } catch {}
  }, [userId]);

  const handleBizChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBizValues((prev) => {
      const next = { ...prev, [name]: value };
      try {
        sessionStorage.setItem(`loupe_onboarding_biz_profile:${userId}`, JSON.stringify(next));
        localStorage.setItem(`loupe_onboarding_biz_profile:${userId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
    if (state.fieldErrors?.[name]) {
      setState((prev) => {
        if (!prev.fieldErrors) return prev;
        const nextErrors = { ...prev.fieldErrors };
        delete nextErrors[name];
        return { ...prev, fieldErrors: nextErrors };
      });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const errors: Record<string, string[]> = {};
    if (!bizValues.legalBusinessName || bizValues.legalBusinessName.trim().length < 2) {
      errors.legalBusinessName = ["Enter the registered business name."];
    }
    if (!bizValues.registrationNumber || bizValues.registrationNumber.trim().length < 3) {
      errors.registrationNumber = ["Enter the registration number."];
    }
    if (!values.taxIdLast4 && (!bizValues.taxId || !bizValues.taxId.trim())) {
      errors.taxId = ["Enter your tax ID (VAT, GST, EIN…)."];
    }

    if (Object.keys(errors).length > 0) {
      setState({
        ok: false,
        message: "Please fill in all required fields before continuing.",
        fieldErrors: errors,
      });
      const firstKey = Object.keys(errors)[0];
      const el = document.getElementById(firstKey);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    const formElement = e.currentTarget;
    const formData = new FormData(formElement);

    startTransition(async () => {
      try {
        await uploadKycDocuments(formData);
        const res = await saveBusinessAction({}, formData);
        setState(res);
        if (res.ok) {
          try {
            sessionStorage.removeItem(`loupe_onboarding_biz_profile:${userId}`);
            localStorage.removeItem(`loupe_onboarding_biz_profile:${userId}`);
          } catch {}
          router.push("/seller/onboarding?step=3");
        } else {
          if (res.values) {
            setBizValues((prev) => ({
              ...prev,
              legalBusinessName: res.values?.legalBusinessName ?? prev.legalBusinessName,
              businessType: res.values?.businessType ?? prev.businessType,
              registrationNumber: res.values?.registrationNumber ?? prev.registrationNumber,
              website: res.values?.website ?? prev.website,
            }));
          }
          if (res.fieldErrors && Object.keys(res.fieldErrors).length > 0) {
            const firstKey = Object.keys(res.fieldErrors)[0];
            const el = document.getElementById(firstKey);
            if (el) {
              el.focus();
              el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }
        }
      } catch (err) {
        setState({
          ok: false,
          message: err instanceof Error ? err.message : "Failed to save verification. Please try again.",
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2" noValidate>
      <FormError message={state.message} />
      <Field label="Registered business name" htmlFor="legalBusinessName" error={err("legalBusinessName")} className="sm:col-span-2">
        <Input id="legalBusinessName" name="legalBusinessName" value={bizValues.legalBusinessName} onChange={handleBizChange} aria-invalid={!!err("legalBusinessName")} required />
      </Field>
      <Field label="Business type" htmlFor="businessType">
        <NativeSelect id="businessType" name="businessType" value={bizValues.businessType} onChange={handleBizChange}>
          <option value="INDIVIDUAL">Individual</option>
          <option value="SOLE_PROPRIETOR">Sole proprietor</option>
          <option value="PARTNERSHIP">Partnership</option>
          <option value="COMPANY">Company</option>
        </NativeSelect>
      </Field>
      <Field label="Registration number" htmlFor="registrationNumber" error={err("registrationNumber")}>
        <Input id="registrationNumber" name="registrationNumber" value={bizValues.registrationNumber} onChange={handleBizChange} aria-invalid={!!err("registrationNumber")} required />
      </Field>
      <Field label="Tax ID" htmlFor="taxId" error={err("taxId")} hint={values.taxIdLast4 ? `On file: ••••${values.taxIdLast4}. Leave blank to keep it.` : "Encrypted at rest — only the last four digits are ever shown."}>
        <Input id="taxId" name="taxId" type="password" autoComplete="off" value={bizValues.taxId} onChange={handleBizChange} aria-invalid={!!err("taxId")} required={!values.taxIdLast4} />
      </Field>
      <Field label="Website" htmlFor="website" optional error={err("website")}>
        <Input id="website" name="website" type="url" placeholder="https://" value={bizValues.website} onChange={handleBizChange} />
      </Field>

      <fieldset className="grid gap-3 border-t border-line pt-6 sm:col-span-2">
        <legend className="caps mb-2 text-ink">Documents</legend>
        {DOCS.map((d) => (
          <div key={d.type} className="space-y-1">
            <label
              className={cn(
                "flex flex-wrap items-center gap-4 rounded-[3px] border border-dashed bg-ivory px-4 py-3.5 transition-colors",
                err(`doc_${d.type}`) ? "border-rosewood/60 bg-rosewood/5" : "border-line-strong",
              )}
            >
              {uploaded[d.type] ? <CheckCircle2 className="size-5 text-moss" strokeWidth={1.5} /> : <FileUp className="size-5 text-muted" strokeWidth={1.5} />}
              <span className="min-w-48 flex-1">
                <span className="block text-[14px] text-ink">
                  {d.label} {!d.required ? <span className="text-muted">(optional)</span> : <span className="text-rosewood">*</span>}
                </span>
                <span className="block text-[12.5px] text-muted">{uploaded[d.type] ? `Uploaded: ${uploaded[d.type]}` : d.hint}</span>
              </span>
              <input type="file" name={`doc_${d.type}`} accept="image/jpeg,image/png,image/webp" className="max-w-56 text-[12.5px] file:mr-3 file:rounded-[2px] file:border-0 file:bg-parchment file:px-3 file:py-1.5" />
            </label>
            {err(`doc_${d.type}`) && <p className="text-[12px] text-rosewood">{err(`doc_${d.type}`)?.[0]}</p>}
          </div>
        ))}
        <p className="text-[12.5px] text-muted">JPG, PNG or WebP images up to 12 MB. Documents are stored privately and seen only by Loupe&rsquo;s verification team.</p>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Link
          href="/seller/onboarding?step=1"
          className="inline-flex h-11 items-center justify-center rounded-[2px] border border-line bg-porcelain px-6 text-[11.5px] font-semibold tracking-[0.1em] text-ink uppercase transition-colors hover:bg-parchment"
        >
          Back
        </Link>
        <Button type="submit" size="lg" pending={isPending}>
          {isPending ? "Uploading…" : "Save and continue"}
        </Button>
      </div>
    </form>
  );
}

export function SubmitApplicationForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<StepState>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formElement = e.currentTarget;
    const formData = new FormData(formElement);
    startTransition(async () => {
      try {
        const res = await submitApplicationAction({}, formData);
        setState(res);
        if (res.ok) {
          router.push("/seller");
          router.refresh();
        }
      } catch (err) {
        setState({
          ok: false,
          message: err instanceof Error ? err.message : "Failed to submit application. Please try again.",
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormError message={state.message} />
      <label className="flex items-start gap-3 rounded-[3px] border border-line bg-ivory p-4 text-[14px] leading-relaxed text-ink-soft">
        <input type="checkbox" name="agree" className="mt-1 size-4 accent-[#7b8069]" required />
        <span>
          Your shop will be listed immediately. The verified badge appears after admin approval. I confirm that our business details and contact links are accurate. I understand that all customer inquiries, consultations, bespoke commissions, transactions, fulfillment, returns, and dispute handling are conducted directly and independently between our atelier and the customer.
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/seller/onboarding?step=2"
          className="inline-flex h-11 items-center justify-center rounded-[2px] border border-line bg-porcelain px-6 text-[11.5px] font-semibold tracking-[0.1em] text-ink uppercase transition-colors hover:bg-parchment"
        >
          Back
        </Link>
        <Button type="submit" size="lg" pending={isPending}>
          {isPending ? "Submitting…" : "Submit and list my shop"}
        </Button>
      </div>
    </form>
  );
}
