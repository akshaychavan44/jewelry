"use client";

import { Info, MessageCircle, Send, ShieldCheck, Sparkles, Store } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { WishlistButton } from "@/components/catalog/save-buttons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FormError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/menus";
import type { EngravingStyle, MetalColor, MetalType, SizingMode } from "@/generated/prisma/enums";
import { chainLengthLabel, METAL_SWATCH, METALS, metalLabel, ringSizesBetween, RING_SIZES } from "@/lib/jewelry";
import { formatMoney, toMajor } from "@/lib/money";
import { cn } from "@/lib/utils";
import { askJewelerAction, makeOfferAction } from "@/server/actions/product";
import type { VariantOption } from "@/server/services/product";
import { EngravingField } from "./engraving";
import { RingSizePicker } from "./ring-size";
import { DirectContact } from "./direct-contact";

export type PanelProduct = {
  id: string;
  title: string;
  sellerName: string;
  publicPhone?: string | null;
  sizingMode: SizingMode;
  ringSizeMin: number | null;
  ringSizeMax: number | null;
  engravingEnabled: boolean;
  engravingMaxChars: number | null;
  isOneOfAKind: boolean;
  acceptsOffers: boolean;
  livePrice: boolean;
  sold: boolean;
  productionDays: number;
  handlingDays: number;
  shipsFrom: string;
};

type Props = {
  product: PanelProduct;
  variants: VariantOption[];
  engravingFee: string | null;
  resizingFee: string | null;
  shipping: { label: string; price: string; minDays: number; maxDays: number; international: boolean } | null;
  saved: boolean;
  isOwner: boolean;
  signedIn: boolean;
};

const metalKey = (v: { metalType: MetalType; metalColor: MetalColor | null }) => `${v.metalType}|${v.metalColor ?? ""}`;
const uniq = <T,>(xs: T[]) => [...new Set(xs)];

export function PurchasePanel({ product, variants, engravingFee, resizingFee, saved, isOwner, signedIn }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [inquiryPending, startInquiry] = useTransition();
  const [inquiryError, setInquiryError] = useState<string>();

  const axes = useMemo(
    () => ({
      metal: uniq(variants.map(metalKey)),
      carat: uniq(variants.map((v) => v.caratWeight).filter((x): x is number => x !== null)),
      ringSize: uniq(variants.map((v) => v.ringSize).filter((x): x is number => x !== null)).sort((a, b) => a - b),
      chain: uniq(variants.map((v) => v.chainLengthMm).filter((x): x is number => x !== null)).sort((a, b) => a - b),
    }),
    [variants],
  );
  const titleOnly = variants.length > 1 && axes.metal.length <= 1 && axes.carat.length <= 1 && axes.ringSize.length <= 1 && axes.chain.length <= 1;
  const initial = variants.find((v) => v.available) ?? variants[0];

  const [sel, setSel] = useState({
    id: initial?.id ?? "",
    metal: initial ? metalKey(initial) : "",
    carat: initial?.caratWeight ?? null,
    ringSize: initial?.ringSize ?? null,
    chain: initial?.chainLengthMm ?? null,
  });
  const [madeToSize, setMadeToSize] = useState<number | null>(null);
  const [engraving, setEngraving] = useState({ enabled: false, text: "", style: "SCRIPT" as EngravingStyle });

  const matches = (v: VariantOption, s: Partial<typeof sel>) =>
    (axes.metal.length <= 1 || metalKey(v) === s.metal) &&
    (axes.carat.length <= 1 || v.caratWeight === s.carat) &&
    (axes.ringSize.length <= 1 || v.ringSize === s.ringSize) &&
    (axes.chain.length <= 1 || v.chainLengthMm === s.chain);

  const variant = titleOnly ? (variants.find((v) => v.id === sel.id) ?? initial) : (variants.find((v) => matches(v, sel)) ?? null);

  const axisValue = (v: VariantOption, key: string) =>
    key === "metal" ? metalKey(v) : key === "carat" ? v.caratWeight : key === "ringSize" ? v.ringSize : v.chainLengthMm;

  const choose = (patch: Partial<typeof sel>) => {
    const next = { ...sel, ...patch };
    if (variants.some((v) => matches(v, next))) return setSel(next);
    const honours = (v: VariantOption) => Object.entries(patch).every(([k, val]) => axisValue(v, k) === val);
    const fallback = variants.find((v) => honours(v) && v.available) ?? variants.find(honours);
    if (fallback) setSel({ id: fallback.id, metal: metalKey(fallback), carat: fallback.caratWeight, ringSize: fallback.ringSize, chain: fallback.chainLengthMm });
  };
  const optionAvailable = (patch: Partial<typeof sel>) => variants.some((v) => v.available && matches(v, { ...sel, ...patch }));

  const needsSize = product.sizingMode === "MADE_TO_SIZE";
  const ringOptions = needsSize ? ringSizesBetween(product.ringSizeMin, product.ringSizeMax) : [];
  const unavailableSizes = new Set(axes.ringSize.filter((s) => !optionAvailable({ ringSize: s })));

  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    const specsList: string[] = [];
    if (variant) {
      specsList.push(`Option: ${variant.title}`);
      if (variant.metalType) specsList.push(`Metal: ${metalLabel(variant.metalType, variant.metalColor)}`);
    }
    if (needsSize && madeToSize) specsList.push(`Requested size: US ${madeToSize}`);
    if (engraving.enabled && engraving.text) specsList.push(`Engraving (${engraving.style}): "${engraving.text}"`);

    const fullMessage = specsList.length > 0
      ? `${inquiryMessage.trim()}\n\n[Piece Inquired: ${product.title} · Specs: ${specsList.join(", ")}]`
      : inquiryMessage.trim();

    setInquiryError(undefined);
    startInquiry(async () => {
      try {
        const res = await askJewelerAction({ productId: product.id, message: fullMessage.slice(0, 2000) });
        if (res.ok) {
          toast.success(res.message, { action: res.href ? { label: "Open conversation", onClick: () => router.push(res.href!) } : undefined });
          setInquiryMessage("");
          setInquiryOpen(false);
        } else if (res.requiresAuth) router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
        else setInquiryError(res.message);
      } catch { setInquiryError("Unable to send your inquiry right now. Please try again."); }
    });
  };

  return (
    <div className="space-y-6">
      {/* Price */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          {product.sold ? (
            <p className="font-display text-[30px] text-muted">Sold / Archived</p>
          ) : variant ? (
            <p className="tabular font-display text-[32px] leading-none text-ink">
              {formatMoney(variant.price.amountMinor, variant.price.currency)}
              {variant.compareAt && variant.compareAt.amountMinor > variant.price.amountMinor && (
                <s className="ml-3 text-[20px] text-muted">{formatMoney(variant.compareAt.amountMinor, variant.compareAt.currency)}</s>
              )}
            </p>
          ) : (
            <p className="text-[15px] text-muted">Choose an available configuration</p>
          )}
          <p className="mt-2 text-[12.5px] text-muted">
            Listed price · Confirm the final price and availability with the jeweler.
          </p>
        </div>
        {variant?.breakdown && (
          <Popover>
            <PopoverTrigger className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gold/40 bg-gold-mist/60 px-3 py-1.5 text-[12px] text-gold-deep">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-gold" />
              </span>
              Live gold price <Info className="size-3.5" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <p className="caps mb-3 text-ink">How this price is built</p>
              <dl className="space-y-2 text-[13.5px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">
                    {METALS[variant.metalType].label} · {variant.breakdown.weightGrams} g × {formatMoney(variant.breakdown.perGram.amountMinor, variant.breakdown.perGram.currency, { exact: true })}/g
                  </dt>
                  <dd className="tabular">{formatMoney(variant.breakdown.metalValue.amountMinor, variant.breakdown.metalValue.currency)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">Making charge</dt>
                  <dd className="tabular">{formatMoney(variant.breakdown.makingCharge.amountMinor, variant.breakdown.makingCharge.currency)}</dd>
                </div>
                {variant.breakdown.stones.amountMinor > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-soft">Stones</dt>
                    <dd className="tabular">{formatMoney(variant.breakdown.stones.amountMinor, variant.breakdown.stones.currency)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3 border-t border-line pt-2 font-medium">
                  <dt>Today&rsquo;s estimate</dt>
                  <dd className="tabular">{formatMoney(variant.price.amountMinor, variant.price.currency)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[12px] text-muted">Calculated from the spot rate every 15 minutes as a transparent guide.</p>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Options */}
      {titleOnly && (
        <OptionRow label="Option">
          {variants.map((v) => (
            <Chip key={v.id} active={v.id === sel.id} disabled={!v.available} onClick={() => setSel((s) => ({ ...s, id: v.id }))}>
              {v.title}
            </Chip>
          ))}
        </OptionRow>
      )}

      {axes.metal.length > 1 && (
        <OptionRow label="Metal" value={variant ? metalLabel(variant.metalType, variant.metalColor) : undefined}>
          {axes.metal.map((key) => {
            const [type, color] = key.split("|") as [MetalType, MetalColor | ""];
            const swatch = METALS[type].family === "platinum" ? METAL_SWATCH.PLATINUM : METALS[type].family === "silver" ? METAL_SWATCH.SILVER : METAL_SWATCH[(color || "YELLOW") as MetalColor];
            return (
              <button
                key={key}
                type="button"
                onClick={() => choose({ metal: key })}
                aria-pressed={sel.metal === key}
                aria-label={metalLabel(type, color || null)}
                className={cn("flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-[13px] transition-colors", sel.metal === key ? "border-ink" : "border-line hover:border-ink/40", !optionAvailable({ metal: key }) && "opacity-45")}
              >
                <span className="size-6 rounded-full border border-black/10" style={{ background: swatch }} aria-hidden />
                <span className="font-mono text-[11px] text-gold-deep">{METALS[type].fineness}</span>
                {METALS[type].family === "gold" ? `${color ? color.charAt(0) + color.slice(1).toLowerCase() : ""} gold` : METALS[type].label}
              </button>
            );
          })}
        </OptionRow>
      )}

      {axes.carat.length > 1 && (
        <OptionRow label="Centre stone">
          {axes.carat.map((c) => (
            <Chip key={c} active={sel.carat === c} disabled={!optionAvailable({ carat: c })} onClick={() => choose({ carat: c })}>
              {c.toFixed(2)} ct
            </Chip>
          ))}
        </OptionRow>
      )}

      {axes.chain.length > 1 && (
        <OptionRow label="Chain length">
          {axes.chain.map((mm) => (
            <Chip key={mm} active={sel.chain === mm} disabled={!optionAvailable({ chain: mm })} onClick={() => choose({ chain: mm })}>
              {chainLengthLabel(mm)}
            </Chip>
          ))}
        </OptionRow>
      )}

      {axes.ringSize.length > 1 && (
        <RingSizePicker sizes={RING_SIZES.filter((r) => axes.ringSize.includes(r.us))} value={sel.ringSize} onChange={(s) => choose({ ringSize: s })} unavailable={unavailableSizes} />
      )}

      {needsSize && !product.sold && (
        <div>
          <RingSizePicker sizes={ringOptions} value={madeToSize} onChange={setMadeToSize} />
          <p className="mt-2 text-[12.5px] text-muted">
            Made to your size by {product.sellerName}
            {resizingFee ? ` · sizing ${resizingFee}` : " · bespoke sizing available"}.
          </p>
        </div>
      )}

      {product.engravingEnabled && product.engravingMaxChars && !product.sold && (
        <EngravingField
          enabled={engraving.enabled}
          onToggle={(enabled) => setEngraving((e) => ({ ...e, enabled }))}
          text={engraving.text}
          onText={(text) => setEngraving((e) => ({ ...e, text }))}
          style={engraving.style}
          onStyle={(style) => setEngraving((e) => ({ ...e, style }))}
          maxChars={product.engravingMaxChars}
          feeLabel={engravingFee ?? "available on request"}
        />
      )}

      {/* Availability & actions */}
      {!product.sold && (
        <div className="space-y-3">
          {variant && (
            <p className="text-[13px] text-ink-soft">
              {!variant.available ? (
                <span className="text-rosewood">Inquire for availability or re-commission</span>
              ) : variant.madeToOrder ? (
                <>Made to order · crafted in approximately {product.productionDays + product.handlingDays} working days</>
              ) : product.isOneOfAKind ? (
                <>One of a kind — crafted individually</>
              ) : variant.stock <= 2 ? (
                <span className="text-amber">Limited showcase availability</span>
              ) : (
                <>Available for direct inquiry</>
              )}
            </p>
          )}
          {isOwner ? (
            <p className="rounded-[2px] border border-line bg-parchment px-4 py-3 text-[14px] text-ink-soft">
              This is your listing in the showcase. Manage it from your jeweler dashboard.
            </p>
          ) : (
            <>
              <div id="product-contact" className="scroll-mt-28 space-y-3 rounded-xl border border-line bg-porcelain p-4 sm:p-5">
                <p className="text-[15px] font-medium text-ink">Interested in this piece?</p>
                <p className="text-[13px] leading-relaxed text-ink-soft">Speak directly with {product.sellerName} about availability, sizing, payment and delivery.</p>
                <DirectContact phone={product.publicPhone} title={product.title} />
              </div>
              <div className="flex gap-2">
                <Dialog open={inquiryOpen} onOpenChange={setInquiryOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" variant="subtle" className="min-w-0 flex-1 normal-case tracking-normal" onClick={(event) => {
                      if (!signedIn) {
                        event.preventDefault();
                        router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
                      }
                    }}>
                      <Send className="size-4" /> Send inquiry
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Inquire with {product.sellerName}</DialogTitle>
                      <DialogDescription>
                        Direct message regarding {product.title}. The jeweler will reply to your account messages.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSendInquiry}>
                      <DialogBody className="space-y-4">
                        <FormError message={inquiryError} />
                        <Field label="Your message or question" htmlFor="inquiry-message">
                          <Textarea
                            id="inquiry-message"
                            value={inquiryMessage}
                            onChange={(e) => setInquiryMessage(e.target.value)}
                            required
                            maxLength={1800}
                            minLength={5}
                            disabled={inquiryPending}
                            placeholder="I'm interested in this piece. Could we arrange a viewing, discuss delivery to my city, or confirm details?"
                            className="min-h-28"
                          />
                        </Field>
                        <p className="text-[12.5px] text-muted">
                          Purchases, custom sizing, payments, and delivery are arranged directly between you and {product.sellerName}.
                        </p>
                      </DialogBody>
                      <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setInquiryOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" pending={inquiryPending}>
                          Send direct inquiry
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <WishlistButton productId={product.id} saved={saved} variant="full" className="w-auto px-4" />
              </div>

              <div>
                {product.acceptsOffers && variant?.available ? (
                  <OfferDialog product={product} variant={variant} signedIn={signedIn} loginHref={`/login?callbackUrl=${encodeURIComponent(pathname)}`} />
                ) : null}
              </div>
            </>
          )}
        </div>
      )}

      <ul className="space-y-3 border-t border-line pt-6 text-[13.5px] text-ink-soft">
        <li className="flex gap-3">
          <Store className="mt-0.5 size-4 shrink-0 text-ink" strokeWidth={1.5} />
          <span>
            Crafted &amp; listed by <span className="text-ink font-medium">{product.sellerName}</span> in {product.shipsFrom}.
          </span>
        </li>
        <li className="flex gap-3">
          <MessageCircle className="mt-0.5 size-4 shrink-0 text-ink" strokeWidth={1.5} />
          <span>Direct transaction — payments, delivery, returns, and warranties are handled directly with the jeweler.</span>
        </li>
        <li className="flex gap-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ink" strokeWidth={1.5} />
          <span>Verified jeweler credentials and business registration.</span>
        </li>
      </ul>
    </div>
  );
}

function OptionRow({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-[13px] text-ink">
        {label}
        {value && <span className="text-muted"> · {value}</span>}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn("min-h-10 rounded-[2px] border px-4 text-[13.5px] transition-colors", active ? "border-ink bg-ink text-ivory" : "border-line bg-porcelain text-ink hover:border-ink/40", disabled && !active && "text-muted line-through decoration-muted/50")}
    >
      {children}
    </button>
  );
}

function OfferDialog({ product, variant, signedIn, loginHref }: { product: PanelProduct; variant: VariantOption; signedIn: boolean; loginHref: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const list = toMajor(variant.price.amountMinor, variant.price.currency);
  const suggestions = [0.9, 0.93, 0.95].map((f) => Math.round((list * f) / 10) * 10);

  if (!signedIn) {
    return (
      <Button variant="outline" size="lg" onClick={() => router.push(loginHref)}>
        Propose budget / offer
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg">
          Propose budget / offer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Propose offer to {product.sellerName}</DialogTitle>
          <DialogDescription>
            {product.title} · listed guide price {formatMoney(variant.price.amountMinor, variant.price.currency)}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await makeOfferAction({ productId: product.id, variantId: variant.id, amount: Number(amount), message: message || undefined });
              if (res.ok) {
                toast.success(res.message, { action: res.href ? { label: "View offers", onClick: () => router.push(res.href!) } : undefined });
                setOpen(false);
              } else toast.error(res.message);
            });
          }}
        >
          <DialogBody className="space-y-5">
            <Field label={`Your proposed price (${variant.price.currency})`} htmlFor="offer-amount" hint="Send your proposed budget directly to the jeweler for consideration.">
              <input
                id="offer-amount"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                className="h-14 w-full rounded-[2px] border border-line bg-porcelain px-4 font-display text-[26px] outline-none focus:border-sage"
                placeholder={String(suggestions[1])}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => setAmount(String(s))} className="rounded-full border border-line px-3 py-1 text-[13px] text-ink-soft hover:border-ink/40">
                  {formatMoney(s * 100, variant.price.currency)}
                </button>
              ))}
            </div>
            <Field label="Message to the jeweler" htmlFor="offer-message" optional>
              <Textarea id="offer-message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={600} placeholder="Notes on timing, sizing, or terms to discuss directly with the jeweler." className="min-h-24" />
            </Field>
            <p className="text-[12.5px] text-muted">
              The jeweler will review your proposal directly. If agreed, you arrange purchase, payment, and delivery directly with them.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" pending={pending} disabled={!amount}>
              Send offer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
