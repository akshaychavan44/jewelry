"use client";

import { CreditCard, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addDemoCardAction, removeCardAction, setDefaultCardAction } from "@/server/actions/account";

type Card = { id: string; brand: string | null; last4: string | null; expMonth: number | null; expYear: number | null; isDefault: boolean; provider: string };

export function CardList({ cards, demo }: { cards: Card[]; demo: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => ReturnType<typeof removeCardAction>) =>
    start(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      router.refresh();
    });
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line rounded-[3px] border border-line bg-porcelain">
        {cards.length === 0 && <li className="px-5 py-6 text-[14px] text-muted">No saved cards.</li>}
        {cards.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <span className="grid h-9 w-14 place-items-center rounded-[4px] border border-line bg-ivory">
              <CreditCard className="size-4 text-ink-soft" strokeWidth={1.5} />
            </span>
            <div className="flex-1">
              <p className="text-[14.5px] text-ink">
                {c.brand?.toUpperCase()} •••• {c.last4}
                {c.isDefault && <span className="ml-2 rounded-full bg-sage-mist px-2 py-0.5 text-[11px] text-sage-deep">Default</span>}
                {c.provider === "DEMO" && <span className="ml-2 text-[11px] text-muted">test card</span>}
              </p>
              <p className="text-[12.5px] text-muted">
                Expires {String(c.expMonth).padStart(2, "0")}/{c.expYear}
              </p>
            </div>
            {!c.isDefault && (
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => setDefaultCardAction(c.id))}>
                Make default
              </Button>
            )}
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => removeCardAction(c.id))}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
      {demo ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="subtle" size="sm" disabled={pending} onClick={() => run(() => addDemoCardAction("visa"))}>
            <Plus /> Add a test card
          </Button>
          <p className="text-[12.5px] text-muted">Demo mode — real cards are added through Stripe once keys are configured.</p>
        </div>
      ) : (
        <p className="text-[13px] text-muted">New cards are saved securely by Stripe when you check out. Card numbers never touch Loupe&rsquo;s servers.</p>
      )}
    </div>
  );
}
