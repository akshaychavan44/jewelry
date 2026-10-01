"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/controls";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { CURRENCIES, SUPPORTED_CURRENCIES } from "@/lib/money";
import { changePasswordAction, updateProfileAction } from "@/server/actions/account";

export function ProfileForm({ initial }: { initial: { name: string; phone: string; preferredCurrency: string; marketingOptIn: boolean; email: string } }) {
  const [form, setForm] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-5 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateProfileAction({ name: form.name, phone: form.phone, preferredCurrency: form.preferredCurrency, marketingOptIn: form.marketingOptIn });
          if (res.ok) toast.success(res.message);
          else toast.error(res.message);
        });
      }}
    >
      <Field label="Name" htmlFor="name">
        <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <Field label="Email" htmlFor="email" hint="Contact support to change your sign-in email.">
        <Input id="email" value={form.email} disabled />
      </Field>
      <Field label="Phone" htmlFor="phone" optional>
        <Input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </Field>
      <Field label="Shopping currency" htmlFor="currency">
        <NativeSelect id="currency" value={form.preferredCurrency} onChange={(e) => setForm({ ...form, preferredCurrency: e.target.value })}>
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c} — {CURRENCIES[c].name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <label className="flex items-center justify-between gap-4 rounded-[3px] border border-line px-4 py-3 text-[14px] text-ink-soft sm:col-span-2">
        New arrivals, private sales and buying guides by email
        <Switch checked={form.marketingOptIn} onCheckedChange={(v) => setForm({ ...form, marketingOptIn: v })} />
      </label>
      <div>
        <Button type="submit" pending={pending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="grid max-w-md gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await changePasswordAction({ current, next });
          if (res.ok) {
            toast.success(res.message);
            setCurrent("");
            setNext("");
          } else toast.error(res.message);
        });
      }}
    >
      {hasPassword && (
        <Field label="Current password" htmlFor="current">
          <Input id="current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
      )}
      <Field label="New password" htmlFor="new" hint="At least 8 characters, with a letter and a number.">
        <Input id="new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
      </Field>
      <div>
        <Button type="submit" variant="outline" pending={pending} disabled={!next}>
          {hasPassword ? "Change password" : "Set a password"}
        </Button>
      </div>
    </form>
  );
}
