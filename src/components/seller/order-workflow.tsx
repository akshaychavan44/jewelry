"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import type { Carrier, FulfillmentStatus } from "@/generated/prisma/enums";
import { CARRIERS } from "@/lib/shipping";
import { advanceOrderAction } from "@/server/actions/seller";

export function OrderWorkflow({ sellerOrderId, status, defaultCarrier, needsProduction }: { sellerOrderId: string; status: FulfillmentStatus; defaultCarrier: Carrier; needsProduction: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [shipOpen, setShipOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [carrier, setCarrier] = useState<Carrier>(defaultCarrier);
  const [tracking, setTracking] = useState("");
  const [note, setNote] = useState("");

  const go = (to: FulfillmentStatus, extra: Parameters<typeof advanceOrderAction>[2] = {}, done?: () => void) =>
    start(async () => {
      const res = await advanceOrderAction(sellerOrderId, to, extra);
      if (res.ok) {
        toast.success(res.message);
        done?.();
        router.refresh();
      } else toast.error(res.message);
    });

  return (
    <div className="flex flex-wrap gap-2">
      {status === "PENDING" && (
        <Button pending={pending} onClick={() => go("PROCESSING", { note: "Accepted by the jeweler." })}>
          Accept order
        </Button>
      )}
      {status === "PROCESSING" && needsProduction && (
        <Button variant="outline" pending={pending} onClick={() => go("IN_PRODUCTION", { note: "Sizing and finishing in the workshop." })}>
          Start production
        </Button>
      )}
      {(status === "PROCESSING" || status === "IN_PRODUCTION") && (
        <Dialog open={shipOpen} onOpenChange={setShipOpen}>
          <DialogTrigger asChild>
            <Button>Mark as shipped</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ship this order</DialogTitle>
              <DialogDescription>Leave tracking blank to generate an insured, signature-required label with Loupe&rsquo;s carrier rates.</DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <Field label="Carrier" htmlFor="ship-carrier">
                <NativeSelect id="ship-carrier" value={carrier} onChange={(e) => setCarrier(e.target.value as Carrier)}>
                  {(Object.keys(CARRIERS) as Carrier[]).map((c) => (
                    <option key={c} value={c}>
                      {CARRIERS[c].label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Tracking number" htmlFor="ship-tracking" optional hint="Already shipped with your own account? Paste the tracking number.">
                <Input id="ship-tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} className="font-mono" />
              </Field>
              <Field label="Note to the buyer" htmlFor="ship-note" optional>
                <Textarea id="ship-note" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20" />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShipOpen(false)}>
                Cancel
              </Button>
              <Button pending={pending} onClick={() => go("SHIPPED", { carrier, trackingNumber: tracking, note }, () => setShipOpen(false))}>
                {tracking ? "Save tracking" : "Generate label & ship"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {status === "SHIPPED" && (
        <Button variant="outline" pending={pending} onClick={() => go("DELIVERED", { note: "Delivery confirmed." })}>
          Confirm delivery
        </Button>
      )}
      {["PENDING", "PROCESSING", "IN_PRODUCTION"].includes(status) && (
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost">Cancel & refund</Button>
          </DialogTrigger>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Cancel this order?</DialogTitle>
              <DialogDescription>The buyer is refunded in full and stock is returned to the listing.</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <Field label="Reason for the buyer" htmlFor="cancel-note">
                <Textarea id="cancel-note" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20" />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCancelOpen(false)}>
                Keep order
              </Button>
              <Button variant="danger" pending={pending} onClick={() => go("CANCELLED", { note: note || "Cancelled by the jeweler." }, () => setCancelOpen(false))}>
                Cancel & refund
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
