"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Check, CreditCard, Lock, Plus, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { LineSummary } from "@/components/cart/line-summary";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/controls";
import { FormError } from "@/components/ui/field";
import { formatDateRange } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { countryName } from "@/lib/regions";
import { CARRIERS } from "@/lib/shipping";
import { cn } from "@/lib/utils";
import { placeOrderAction, quoteCheckoutAction } from "@/server/actions/checkout";
import type { CheckoutQuote, CheckoutSelections } from "@/server/services/checkout";
import { AddressForm, type AddressValue } from "./address-form";

type SavedCard = { id: string; brand: string | null; last4: string | null; expMonth: number | null; expYear: number | null; isDefault: boolean };

type Props = {
  addresses: (AddressValue & { id: string })[];
  initialAddressId: string | null;
  initialQuote: CheckoutQuote | null;
  initialError: string | null;
  cards: SavedCard[];
  stripeKey: string | null;
  signatureThresholdLabel: string;
};

function Step({ n, title, children, done }: { n: number; title: string; children: React.ReactNode; done?: boolean }) {
  return (
    <section className="rounded-[3px] border border-line bg-porcelain" aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="flex items-center gap-3 border-b border-line px-5 py-4 text-[15px] text-ink">
        <span className={cn("grid size-6 place-items-center rounded-full font-mono text-[11px]", done ? "bg-sage text-white" : "border border-ink/40 text-ink")}>{done ? <Check className="size-3.5" /> : n}</span>
        {title}
      </h2>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

export function CheckoutFlow({ addresses, initialAddressId, initialQuote, initialError, cards, stripeKey, signatureThresholdLabel }: Props) {
  const router = useRouter();
  const [addressId, setAddressId] = useState(initialAddressId);
  const [adding, setAdding] = useState(addresses.length === 0);
  const [quote, setQuote] = useState(initialQuote);
  const [error, setError] = useState(initialError);
  const [selections, setSelections] = useState<CheckoutSelections>(() => ({
    shipping: Object.fromEntries((initialQuote?.groups ?? []).map((g) => [g.sellerId, g.option.key])),
    signature: {},
    dutiesMode: "DDP",
  }));
  const [cardId, setCardId] = useState(cards.find((c) => c.isDefault)?.id ?? cards[0]?.id ?? null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [quoting, startQuote] = useTransition();
  const [placing, startPlace] = useTransition();
  const stripePromise = useMemo(() => (stripeKey ? loadStripe(stripeKey) : null), [stripeKey]);

  const requote = useCallback(
    (nextAddress: string | null, nextSel: CheckoutSelections) => {
      if (!nextAddress) return;
      startQuote(async () => {
        const res = await quoteCheckoutAction(nextAddress, nextSel);
        if (res.ok) {
          setQuote(res.quote);
          setError(null);
        } else {
          setError(res.message);
        }
      });
    },
    [],
  );

  const update = (patch: Partial<CheckoutSelections>) => {
    const next = { ...selections, ...patch };
    setSelections(next);
    requote(addressId, next);
  };

  const place = () => {
    if (!addressId || !quote) return;
    startPlace(async () => {
      const res = await placeOrderAction({ addressId, selections, paymentMethodId: cardId });
      if (!res.ok) {
        setError(res.message);
        toast.error(res.message);
        router.refresh();
        return;
      }
      if (res.status === "paid") {
        router.push(`/checkout/complete?order=${res.orderNumber}`);
      } else {
        setOrderNumber(res.orderNumber);
        setClientSecret(res.clientSecret);
      }
    });
  };

  const t = quote?.totals;
  const money = (minor: number) => formatMoney(minor, quote?.currency ?? "USD");

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <Step n={1} title="Delivery address" done={!!addressId && !adding}>
          {addresses.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Saved addresses">
              {addresses.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={addressId === a.id}
                  onClick={() => {
                    setAddressId(a.id);
                    setAdding(false);
                    requote(a.id, selections);
                  }}
                  className={cn("rounded-[3px] border p-4 text-left text-[13.5px] transition-colors", addressId === a.id ? "border-ink bg-ivory" : "border-line hover:border-ink/40")}
                >
                  <p className="flex items-center justify-between text-[14px] text-ink">
                    {a.label ?? a.fullName} {addressId === a.id && <Check className="size-4 text-sage-deep" />}
                  </p>
                  <p className="mt-1 text-ink-soft">
                    {a.fullName}
                    <br />
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}
                    <br />
                    {a.city} {a.postalCode} · {countryName(a.country)}
                  </p>
                </button>
              ))}
            </div>
          )}
          {adding ? (
            <div className={cn(addresses.length > 0 && "mt-6 border-t border-line pt-6")}>
              <AddressForm
                submitLabel="Use this address"
                onSaved={(id) => {
                  setAdding(false);
                  setAddressId(id);
                  router.refresh();
                  requote(id, selections);
                }}
              />
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="mt-4 inline-flex items-center gap-1.5 text-[14px] text-ink underline underline-offset-4">
              <Plus className="size-4" /> Add a new address
            </button>
          )}
        </Step>

        <Step n={2} title="Delivery from each jeweler" done={!!quote && !error}>
          {!quote ? (
            <p className="text-[14px] text-muted">Choose an address to see delivery options.</p>
          ) : (
            <div className={cn("space-y-8 transition-opacity", quoting && "opacity-60")}>
              {quote.groups.map((g) => (
                <div key={g.sellerId}>
                  <p className="mb-3 text-[12px] tracking-[0.12em] text-muted uppercase">
                    {g.sellerName} · ships from {g.sellerCity}, {countryName(g.sellerCountry)}
                  </p>
                  <ul className="mb-4 space-y-3">
                    {g.lines.map((l) => (
                      <li key={l.id}>
                        <LineSummary line={l} compact />
                      </li>
                    ))}
                  </ul>
                  <div className="space-y-2" role="radiogroup" aria-label={`Delivery from ${g.sellerName}`}>
                    {g.options.map((o) => (
                      <label key={o.key} className={cn("flex cursor-pointer items-center gap-4 rounded-[3px] border px-4 py-3 transition-colors", g.option.key === o.key ? "border-ink bg-ivory" : "border-line hover:border-ink/40")}>
                        <input type="radio" name={`ship-${g.sellerId}`} checked={g.option.key === o.key} onChange={() => update({ shipping: { ...selections.shipping, [g.sellerId]: o.key } })} className="size-4 accent-[#7b8069]" />
                        <span className="flex-1">
                          <span className="block text-[14px] text-ink">
                            {o.label}
                            {o.carrier && o.carrier !== "OTHER" && <span className="text-muted"> · {CARRIERS[o.carrier].label}</span>}
                          </span>
                          <span className="block text-[12.5px] text-muted">
                            Arrives {formatDateRange(o.window.from, o.window.to)} · {o.detail}
                          </span>
                        </span>
                        <span className="tabular text-[14px] text-ink">{o.isFree ? "Free" : formatMoney(o.price.amountMinor, o.price.currency)}</span>
                      </label>
                    ))}
                  </div>
                  <label className="mt-3 flex items-center justify-between gap-4 text-[13.5px] text-ink-soft">
                    <span>
                      Signature on delivery
                      {g.signatureForced && <span className="block text-[12px] text-muted">Required above {signatureThresholdLabel}</span>}
                    </span>
                    <Switch checked={g.signatureRequired} disabled={g.signatureForced} onCheckedChange={(v) => update({ signature: { ...selections.signature, [g.sellerId]: v } })} />
                  </label>
                </div>
              ))}
            </div>
          )}
        </Step>

        {quote?.hasInternational && (
          <Step n={3} title="Import duties">
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Duties">
              {(
                [
                  ["DDP", "Pay duties now", "Duties and import taxes are collected here — nothing to pay the courier."],
                  ["DAP", "Pay on arrival", "The courier collects duties and a handling fee before delivery."],
                ] as const
              ).map(([mode, title, body]) => (
                <label key={mode} className={cn("cursor-pointer rounded-[3px] border p-4", selections.dutiesMode === mode ? "border-ink bg-ivory" : "border-line hover:border-ink/40")}>
                  <span className="flex items-center gap-3 text-[14px] text-ink">
                    <input type="radio" name="duties" checked={selections.dutiesMode === mode} onChange={() => update({ dutiesMode: mode })} className="size-4 accent-[#7b8069]" />
                    {title}
                  </span>
                  <span className="mt-1 block pl-7 text-[12.5px] text-muted">{body}</span>
                </label>
              ))}
            </div>
          </Step>
        )}

        <Step n={quote?.hasInternational ? 4 : 3} title="Payment">
          {clientSecret && stripePromise ? (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "flat", variables: { colorPrimary: "#7b8069", colorBackground: "#fdfcf9", fontFamily: "Jost, system-ui, sans-serif", borderRadius: "2px" } } }}>
              <StripePayment orderNumber={orderNumber!} />
            </Elements>
          ) : stripeKey ? (
            <p className="flex items-center gap-2 text-[14px] text-ink-soft">
              <Lock className="size-4" /> You&rsquo;ll enter card, Apple Pay or bank details securely with Stripe after reviewing your order.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="rounded-[2px] border border-amber/30 bg-amber-mist px-4 py-3 text-[13px] text-amber">
                Demo payments are on — no card will be charged. Add Stripe keys to <span className="font-mono">.env</span> to take real payments.
              </p>
              {cards.map((c) => (
                <label key={c.id} className={cn("flex cursor-pointer items-center gap-4 rounded-[3px] border px-4 py-3", cardId === c.id ? "border-ink bg-ivory" : "border-line")}>
                  <input type="radio" name="card" checked={cardId === c.id} onChange={() => setCardId(c.id)} className="size-4 accent-[#7b8069]" />
                  <CreditCard className="size-4 text-ink-soft" />
                  <span className="flex-1 text-[14px] text-ink">
                    {c.brand?.toUpperCase()} •••• {c.last4}
                  </span>
                  <span className="text-[12.5px] text-muted">
                    {String(c.expMonth).padStart(2, "0")}/{String(c.expYear).slice(-2)}
                  </span>
                </label>
              ))}
            </div>
          )}
        </Step>
      </div>

      <aside className="h-fit rounded-[3px] border border-line bg-porcelain lg:sticky lg:top-24">
        <h2 className="caps border-b border-line px-5 py-4 text-ink">Order summary</h2>
        {t && quote ? (
          <div className={cn("space-y-4 px-5 py-5 transition-opacity", quoting && "opacity-60")}>
            {quote.groups.map((g) => (
              <div key={g.sellerId} className="text-[13px]">
                <p className="text-ink">{g.sellerName}</p>
                <dl className="mt-1 space-y-1 text-ink-soft">
                  <div className="flex justify-between"><dt>Items</dt><dd className="tabular">{money(g.totals.subtotalMinor)}</dd></div>
                  <div className="flex justify-between"><dt>{g.option.label}</dt><dd className="tabular">{g.totals.shippingMinor ? money(g.totals.shippingMinor) : "Free"}</dd></div>
                  {g.totals.insuranceMinor > 0 && <div className="flex justify-between"><dt>Insurance</dt><dd className="tabular">{money(g.totals.insuranceMinor)}</dd></div>}
                  <div className="flex justify-between"><dt>{g.taxLabel}{g.taxProvider === "estimate" && " (est.)"}</dt><dd className="tabular">{money(g.totals.taxMinor)}</dd></div>
                  {g.totals.dutiesMinor > 0 && <div className="flex justify-between"><dt>Import duties</dt><dd className="tabular">{money(g.totals.dutiesMinor)}</dd></div>}
                </dl>
              </div>
            ))}
            <div className="flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-[15px] text-ink">Total</span>
              <span className="tabular font-display text-[28px] text-ink">{money(t.totalMinor)}</span>
            </div>
            <FormError message={error} />
            {!clientSecret && (
              <Button size="lg" className="w-full" onClick={place} pending={placing} disabled={!addressId || !!error || quoting}>
                {stripeKey ? "Continue to payment" : `Place order · ${money(t.totalMinor)}`}
              </Button>
            )}
            <p className="flex gap-2.5 text-[12px] leading-relaxed text-muted">
              <ShieldCheck className="size-4 shrink-0 text-sage-deep" strokeWidth={1.5} />
              Funds are held by Loupe and released to each jeweler three days after you receive your piece.
            </p>
          </div>
        ) : (
          <div className="px-5 py-5">
            <FormError message={error} />
            {!error && <p className="text-[14px] text-muted">Add a delivery address to see your total.</p>}
          </div>
        )}
      </aside>
    </div>
  );
}

function StripePayment({ orderNumber }: { orderNumber: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setPending(true);
        const { error } = await stripe.confirmPayment({ elements, confirmParams: { return_url: `${window.location.origin}/checkout/complete?order=${orderNumber}` } });
        if (error) setMessage(error.message ?? "Payment failed. Try another method.");
        setPending(false);
      }}
      className="space-y-4"
    >
      <PaymentElement />
      <FormError message={message} />
      <Button type="submit" size="lg" className="w-full" pending={pending} disabled={!stripe}>
        Pay now
      </Button>
    </form>
  );
}
