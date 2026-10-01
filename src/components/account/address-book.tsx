"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AddressForm, type AddressValue } from "@/components/checkout/address-form";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { countryName } from "@/lib/regions";
import { deleteAddressAction } from "@/server/actions/checkout";

export function AddressBook({ addresses }: { addresses: (AddressValue & { id: string })[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<(AddressValue & { id?: string }) | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {addresses.map((a) => (
          <div key={a.id} className="rounded-[3px] border border-line bg-porcelain p-5">
            <p className="flex items-center justify-between text-[14.5px] text-ink">
              {a.label ?? "Address"} {a.isDefault && <span className="rounded-full bg-sage-mist px-2.5 py-0.5 text-[11px] text-sage-deep">Default</span>}
            </p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
              {a.fullName}
              {a.company && <>, {a.company}</>}
              <br />
              {a.line1}
              {a.line2 && `, ${a.line2}`}
              <br />
              {a.city}
              {a.region && `, ${a.region}`} {a.postalCode}
              <br />
              {countryName(a.country)}
              {a.phone && <><br />{a.phone}</>}
            </p>
            <div className="mt-4 flex gap-4 text-[13px]">
              <button type="button" className="text-ink underline underline-offset-4" onClick={() => setEditing(a)}>
                Edit
              </button>
              <button
                type="button"
                className="text-ink-soft underline-offset-4 hover:underline"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await deleteAddressAction(a.id);
                    toast.success("Address removed.");
                    router.refresh();
                  })
                }
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setEditing({})} className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-[3px] border border-dashed border-line-strong text-[14px] text-ink-soft hover:border-ink/40 hover:text-ink">
          <Plus className="size-5" strokeWidth={1.4} /> Add an address
        </button>
      </div>
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit address" : "New address"}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {editing && (
              <AddressForm
                initial={editing}
                onSaved={() => {
                  setEditing(null);
                  toast.success("Address saved.");
                  router.refresh();
                }}
              />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
