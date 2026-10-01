"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { cancelSellerOrderAction, createReviewAction, createServiceRequestAction, openDisputeAction, requestReturnAction } from "@/server/actions/account";
import type { ActionResult } from "@/server/actions/cart";
import { messageAboutOrderAction } from "@/server/actions/orders";

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const exec = (fn: () => Promise<ActionResult>, onDone?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(res.message, res.href ? { action: { label: "Open", onClick: () => router.push(res.href!) } } : undefined);
        onDone?.();
        router.refresh();
      } else toast.error(res.message);
    });
  return { pending, exec };
}

type Item = { id: string; title: string; reviewed: boolean; personalised: boolean };

export function SellerOrderActions(props: {
  sellerOrderId: string;
  status: string;
  canReturn: boolean;
  returnDeadline: string | null;
  canDispute: boolean;
  items: Item[];
}) {
  const { pending, exec } = useAction();
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="subtle"
        size="sm"
        disabled={pending}
        onClick={() =>
          exec(async () => {
            const res = await messageAboutOrderAction(props.sellerOrderId);
            if (res.ok && res.href) router.push(res.href);
            return res;
          })
        }
      >
        Message jeweler
      </Button>
      {props.status === "PENDING" && (
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => confirm("Cancel this part of your order? You'll be refunded in full.") && exec(() => cancelSellerOrderAction(props.sellerOrderId))}>
          Cancel
        </Button>
      )}
      {props.canReturn && <ReturnDialog sellerOrderId={props.sellerOrderId} items={props.items} deadline={props.returnDeadline} />}
      {props.canDispute && <DisputeDialog sellerOrderId={props.sellerOrderId} />}
    </div>
  );
}

function ReturnDialog({ sellerOrderId, items, deadline }: { sellerOrderId: string; items: Item[]; deadline: string | null }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(items.map((i) => i.id));
  const [reason, setReason] = useState("CHANGED_MIND");
  const [details, setDetails] = useState("");
  const { pending, exec } = useAction();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="subtle" size="sm">
          Return
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a return</DialogTitle>
          <DialogDescription>
            Your prepaid, insured label will send the piece straight back to the jeweler{deadline ? ` · window closes ${deadline}` : ""}.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-[12px] tracking-[0.06em] text-ink-soft uppercase">Pieces</legend>
            {items.map((i) => (
              <label key={i.id} className="flex items-center gap-3 text-[14px] text-ink">
                <input type="checkbox" className="size-4 accent-[#7b8069]" checked={selected.includes(i.id)} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, i.id] : s.filter((x) => x !== i.id)))} />
                {i.title}
                {i.personalised && <span className="text-[12px] text-muted">(personalised — faulty items only)</span>}
              </label>
            ))}
          </fieldset>
          <Field label="Reason" htmlFor="return-reason">
            <NativeSelect id="return-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="CHANGED_MIND">I changed my mind</option>
              <option value="WRONG_SIZE">Wrong size</option>
              <option value="NOT_AS_DESCRIBED">Not as described</option>
              <option value="DAMAGED">Arrived damaged</option>
              <option value="AUTHENTICITY_CONCERN">Authenticity concern</option>
              <option value="ARRIVED_LATE">Arrived too late</option>
              <option value="OTHER">Something else</option>
            </NativeSelect>
          </Field>
          <Field label="Details" htmlFor="return-details" optional>
            <Textarea id="return-details" value={details} onChange={(e) => setDetails(e.target.value)} className="min-h-24" />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button pending={pending} disabled={!selected.length} onClick={() => exec(() => requestReturnAction({ sellerOrderId, itemIds: selected, reason, details }), () => setOpen(false))}>
            Request return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DisputeDialog({ sellerOrderId }: { sellerOrderId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("NOT_AS_DESCRIBED");
  const [description, setDescription] = useState("");
  const { pending, exec } = useAction();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Report a problem
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open a case with Loupe</DialogTitle>
          <DialogDescription>We&rsquo;ll hold the jeweler&rsquo;s payment and mediate. Most cases are resolved within five working days.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5">
          <Field label="What happened?" htmlFor="dispute-reason">
            <NativeSelect id="dispute-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="NOT_AS_DESCRIBED">Not as described</option>
              <option value="AUTHENTICITY">Authenticity or certificate concern</option>
              <option value="ITEM_NOT_RECEIVED">Item not received</option>
              <option value="DAMAGED_IN_TRANSIT">Damaged in transit</option>
              <option value="RETURN_REFUSED">Return refused</option>
              <option value="REFUND_NOT_RECEIVED">Refund not received</option>
              <option value="OTHER">Something else</option>
            </NativeSelect>
          </Field>
          <Field label="Describe the problem" htmlFor="dispute-description" hint="Include what you expected, what arrived, and what would put it right.">
            <Textarea id="dispute-description" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-32" />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="dark" pending={pending} onClick={() => exec(() => openDisputeAction({ sellerOrderId, reason, description }), () => setOpen(false))}>
            Open case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReviewDialog({ orderItemId, title }: { orderItemId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const { pending, exec } = useAction();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="link" className="text-[13px]">
          Write a review
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review {title}</DialogTitle>
          <DialogDescription>Reviews appear with a verified-purchase badge.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5">
          <div className="flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} stars`} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)}>
                <Star className={cn("size-7", (hover || rating) >= n ? "fill-gold text-gold" : "text-line-strong")} strokeWidth={1.2} />
              </button>
            ))}
          </div>
          <Field label="Headline" htmlFor="review-title" optional>
            <Input id="review-title" value={heading} onChange={(e) => setHeading(e.target.value)} maxLength={80} />
          </Field>
          <Field label="Your review" htmlFor="review-body" hint="How does it look, feel and wear? How was the jeweler?">
            <Textarea id="review-body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-32" />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button pending={pending} onClick={() => exec(() => createReviewAction({ orderItemId, rating, title: heading, body }), () => setOpen(false))}>
            Post review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ServiceDialog({ orderItemId, title, trigger = "Repair or resize" }: { orderItemId: string; title: string; trigger?: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("RESIZING");
  const [description, setDescription] = useState("");
  const { pending, exec } = useAction();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="link" className="text-[13px]">
          {trigger}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a service</DialogTitle>
          <DialogDescription>{title} — the jeweler who made it will look after it.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5">
          <Field label="Service" htmlFor="service-type">
            <NativeSelect id="service-type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="RESIZING">Resizing</option>
              <option value="REPAIR">Repair</option>
              <option value="STONE_TIGHTENING">Stone check & tightening</option>
              <option value="CLEANING_POLISHING">Cleaning & polishing</option>
              <option value="RHODIUM_PLATING">Rhodium plating</option>
              <option value="RESTRINGING">Restringing</option>
              <option value="APPRAISAL">Valuation for insurance</option>
              <option value="ENGRAVING">Engraving</option>
            </NativeSelect>
          </Field>
          <Field label="What needs doing?" htmlFor="service-description">
            <Textarea id="service-description" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-28" />
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button pending={pending} onClick={() => exec(() => createServiceRequestAction({ orderItemId, type, description }), () => setOpen(false))}>
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
