"use client";

import { Minus, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { removeCartItemAction, updateCartItemAction } from "@/server/actions/cart";

export function CartLineActions({ itemId, quantity, max }: { itemId: string; quantity: number; max: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => ReturnType<typeof removeCartItemAction>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.message);
      router.refresh();
    });
  return (
    <div className={cn("flex items-center gap-4", pending && "opacity-50")}>
      {max > 1 ? (
        <div className="flex h-9 items-center rounded-[2px] border border-line">
          <button type="button" className="grid h-full w-9 place-items-center disabled:opacity-40" disabled={pending || quantity <= 1} onClick={() => run(() => updateCartItemAction(itemId, quantity - 1))} aria-label="Decrease quantity">
            <Minus className="size-3.5" />
          </button>
          <span className="w-6 text-center text-[14px] tabular" aria-live="polite">
            {quantity}
          </span>
          <button type="button" className="grid h-full w-9 place-items-center disabled:opacity-40" disabled={pending || quantity >= max} onClick={() => run(() => updateCartItemAction(itemId, quantity + 1))} aria-label="Increase quantity">
            <Plus className="size-3.5" />
          </button>
        </div>
      ) : (
        <span className="text-[13px] text-muted">Qty 1</span>
      )}
      <button type="button" onClick={() => run(() => removeCartItemAction(itemId))} disabled={pending} className="inline-flex items-center gap-1 text-[13px] text-ink-soft underline-offset-4 hover:text-ink hover:underline">
        <X className="size-3.5" /> Remove
      </button>
    </div>
  );
}
