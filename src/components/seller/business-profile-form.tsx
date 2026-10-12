"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Globe } from "lucide-react";
import { Facebook, Instagram, Youtube } from "@/components/brand/social-icons";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import type { DirectoryProfileInput } from "@/lib/jeweler-profile";
import type { StepState } from "@/server/actions/onboarding";
import { saveDirectoryProfileAction, setDirectoryPausedAction } from "@/server/actions/jeweler-profile";

export function ListingVisibility({ paused }: { paused: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return <Button variant="outline" size="sm" pending={pending} onClick={() => start(async () => {
    try {
      const result = await setDirectoryPausedAction(!paused);
      if (result.ok) { toast.success(result.message); router.refresh(); }
      else toast.error(result.message);
    } catch { toast.error("Could not update your listing. Please try again."); }
  })}>{paused ? "Resume my listing" : "Pause my listing"}</Button>;
}

export function BusinessProfileForm({ initial }: { initial: DirectoryProfileInput }) {
  const [state, action, pending] = useActionState<StepState, FormData>(saveDirectoryProfileAction, {});
  const err = (key: string) => state.fieldErrors?.[key];
  const fields = (items: { key: keyof DirectoryProfileInput; label: string; optional?: boolean; placeholder?: string; type?: string }[]) => items.map(({ key, label, optional, placeholder, type }) => <Field key={key} label={label} htmlFor={key} optional={optional} error={err(key)}>
    <Input id={key} name={key} type={type} defaultValue={String(initial[key])} placeholder={placeholder} aria-invalid={!!err(key)} aria-describedby={err(key) ? `${key}-error` : undefined} readOnly={key === "storeName"} />
  </Field>);
  return <form action={action} className="space-y-6">
    {state.message && <p role={state.ok ? "status" : "alert"} className={`rounded border px-4 py-3 text-sm ${state.ok ? "border-sage/30 bg-sage-mist text-sage-deep" : "border-rosewood/30 text-rosewood"}`}>{state.message}</p>}
    <fieldset disabled={pending} className="rounded-[3px] border border-line bg-porcelain p-5 sm:p-7">
      <legend className="px-2 font-display text-2xl text-ink">Business details</legend>
      <div className="grid gap-5 sm:grid-cols-2">
        {fields([{ key: "storeName", label: "Business name" }, { key: "city", label: "City" }])}
        <p className="text-xs text-muted sm:col-span-2">Use Change business name below to request admin approval.</p>
        <Field label="Business logo" htmlFor="logo" optional hint="JPG, PNG or WebP, up to 6 MB."><Input id="logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp" className="py-2 text-sm" /></Field>
        {fields([{ key: "specialties", label: "Specialties", optional: true, placeholder: "Gold, Diamond, Bridal" }])}
        <Field label="Short introduction" htmlFor="tagline" optional error={err("tagline")} className="sm:col-span-2"><Input id="tagline" name="tagline" defaultValue={initial.tagline} maxLength={120} placeholder="A sentence about your business" /></Field>
        <Field label="About your business" htmlFor="bio" optional error={err("bio")} className="sm:col-span-2"><Textarea id="bio" name="bio" defaultValue={initial.bio} maxLength={1500} /></Field>
        {fields([{ key: "address", label: "Business address" }, { key: "hours", label: "Opening hours", optional: true, placeholder: "Mon–Sat, 10am–7pm" }])}
      </div>
    </fieldset>
    <fieldset disabled={pending} className="rounded-[3px] border border-line bg-porcelain p-5 sm:p-7">
      <legend className="px-2 font-display text-2xl text-ink">Contact details</legend>
      <p className="mb-5 text-sm text-muted">Customers can see these details without signing in. Use your business contact information.</p>
      <div className="grid gap-5 sm:grid-cols-2">{fields([
        { key: "phone", label: "Business phone", optional: true, type: "tel", placeholder: "+91 9876543210" },
        { key: "whatsapp", label: "WhatsApp number", optional: true, type: "tel", placeholder: "+91 9876543210" },
        { key: "publicEmail", label: "Public business email", optional: true, type: "email" },
        { key: "maps", label: "Google Maps link", optional: true, type: "url", placeholder: "https://maps.app.goo.gl/…" },
      ])}</div>
    </fieldset>
    <fieldset disabled={pending} className="rounded-[3px] border border-line bg-porcelain p-5 sm:p-7">
      <legend className="px-2 font-display text-2xl text-ink">Social links</legend>
      <p className="mb-5 text-sm text-muted">Paste your full profile links. Only links you add will appear on your public profile.</p>
      <div className="grid gap-5 sm:grid-cols-2">{[
        { key: "instagram", label: "Instagram", icon: Instagram, placeholder: "https://www.instagram.com/yourbusiness/" },
        { key: "facebook", label: "Facebook", icon: Facebook, placeholder: "https://www.facebook.com/yourbusiness" },
        { key: "youtube", label: "YouTube", icon: Youtube, placeholder: "https://www.youtube.com/@yourbusiness" },
        { key: "website", label: "Website", icon: Globe, placeholder: "https://yourbusiness.com" },
      ].map(({ key, label, icon: Icon, placeholder }) => <Field key={key} label={<span className="inline-flex items-center gap-2"><Icon size={15} aria-hidden />{label}</span>} htmlFor={key} optional error={err(key)}>
        <Input id={key} name={key} type="url" defaultValue={initial[key as "instagram" | "facebook" | "youtube" | "website"]} placeholder={placeholder} aria-invalid={!!err(key)} aria-describedby={err(key) ? `${key}-error` : undefined} />
      </Field>)}</div>
    </fieldset>
    <label className="flex items-start gap-3 rounded-[3px] border border-line bg-porcelain p-5 text-sm text-ink-soft"><input name="acceptsCustomOrders" type="checkbox" defaultChecked={initial.acceptsCustomOrders} disabled={pending} className="mt-1 size-4 accent-[#7b8069]" /><span><strong className="block text-ink">Accept custom jewelry requests</strong>Customers can select your business when submitting their ideas.</span></label>
    <SubmitButton size="lg" pendingLabel="Saving…">Save changes</SubmitButton>
  </form>;
}
