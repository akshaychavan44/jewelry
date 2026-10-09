"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PublicContactInput } from "@/lib/public-contact";
import { savePublicContact } from "@/server/actions/public-contact";

export function PublicContactForm({ initial }: { initial: PublicContactInput }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <form className="grid gap-5 sm:grid-cols-2" onSubmit={(event) => {
      event.preventDefault();
      setError(undefined);
      start(async () => {
        try {
          const result = await savePublicContact(form);
          if (!result.ok) { setError(result.message); return; }
          toast.success(result.message);
          router.refresh();
        } catch { setError("Unable to save right now. Please try again."); }
      });
    }}>
      <div className="sm:col-span-2"><FormError message={error} /></div>
      <Field label="Showroom name" htmlFor="contact-name"><Input id="contact-name" value={form.name} required maxLength={120} disabled={pending} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Public phone / WhatsApp" htmlFor="contact-phone" optional hint="Country code required. Customers can call or contact this number on WhatsApp."><Input id="contact-phone" type="tel" value={form.phone} placeholder="+91 98765 43210" maxLength={30} disabled={pending} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label="Public showroom address" htmlFor="contact-address"><Input id="contact-address" value={form.line1} required maxLength={200} disabled={pending} onChange={(e) => setForm({ ...form, line1: e.target.value })} /></Field>
      <Field label="City" htmlFor="contact-city"><Input id="contact-city" value={form.city} required maxLength={100} disabled={pending} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
      <Field label="Opening hours" htmlFor="contact-hours" optional><Input id="contact-hours" value={form.hours} maxLength={200} placeholder="Mon–Sat, 10am–6pm" disabled={pending} onChange={(e) => setForm({ ...form, hours: e.target.value })} /></Field>
      <label className="flex items-center gap-3 text-[14px] text-ink-soft"><input type="checkbox" checked={form.appointmentOnly} disabled={pending} onChange={(e) => setForm({ ...form, appointmentOnly: e.target.checked })} className="size-4 accent-[#93691f]" /> Visits by appointment only</label>
      <div className="sm:col-span-2"><Button type="submit" pending={pending}>Save public contact</Button><p className="mt-3 text-[12px] leading-relaxed text-muted">These details are visible on your jeweler profile and product pages. Leave the number blank to offer account inquiries only.</p></div>
    </form>
  );
}
