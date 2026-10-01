"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { addOfferToCartAction, type ActionResult } from "@/server/actions/cart";
import { respondToOfferAction } from "@/server/actions/product";

/** Negotiation controls for one side of an offer. */
export function OfferActions({
  offerId,
  as,
  canRespond,
  canWithdraw,
  canCheckout,
  currency,
  currentMinor,
  listMinor,
}: {
  offerId: string;
  as: "BUYER" | "SELLER";
  canRespond: boolean;
  canWithdraw: boolean;
  canCheckout: boolean;
  currency: string;
  currentMinor: number;
  listMinor: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  const exec = (fn: () => Promise<ActionResult>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(res.message);
        after?.();
        if (res.href) router.push(res.href);
        router.refresh();
      } else toast.error(res.message);
    });

  return (
    <div className="flex flex-wrap gap-2">
      {canCheckout && (
        <Button size="sm" pending={pending} onClick={() => exec(() => addOfferToCartAction(offerId))}>
          Checkout at agreed price
        </Button>
      )}
      {canRespond && (
        <>
          <Button size="sm" pending={pending} onClick={() => exec(() => respondToOfferAction(offerId, as, "ACCEPT"))}>
            Accept {formatMoney(currentMinor, currency)}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                Counter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Make a counter-offer</DialogTitle>
                <DialogDescription>
                  Current offer {formatMoney(currentMinor, currency)} · list price {formatMoney(listMinor, currency)}
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-4">
                <Field label={`Amount (${currency})`} htmlFor="counter-amount" hint={as === "SELLER" ? "Above the buyer's offer and below your list price." : "Above your previous offer and below the list price."}>
                  <input id="counter-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} className="h-12 w-full rounded-[2px] border border-line bg-porcelain px-4 font-display text-[22px] outline-none focus:border-sage" />
                </Field>
                <Field label="Message" htmlFor="counter-message" optional>
                  <Textarea id="counter-message" value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-20" />
                </Field>
              </DialogBody>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button pending={pending} disabled={!amount} onClick={() => exec(() => respondToOfferAction(offerId, as, "COUNTER", Number(amount), message || undefined), () => setOpen(false))}>
                  Send counter-offer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button size="sm" variant="ghost" pending={pending} onClick={() => exec(() => respondToOfferAction(offerId, as, "DECLINE"))}>
            Decline
          </Button>
        </>
      )}
      {canWithdraw && (
        <Button size="sm" variant="ghost" pending={pending} onClick={() => exec(() => respondToOfferAction(offerId, as, "WITHDRAW"))}>
          Withdraw offer
        </Button>
      )}
    </div>
  );
}
