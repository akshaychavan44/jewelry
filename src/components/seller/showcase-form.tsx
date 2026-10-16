"use client";
import { useState, useActionState } from "react";
import Link from "next/link";
import { uploadFormImages } from "@/lib/image-upload-client";
import { saveShowcaseAction, type ShowcaseState } from "@/server/actions/showcase";
import { Field, FormError } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { METALS, GEMSTONES } from "@/lib/jewelry";
import type { Gemstone, MakingChargeType, MetalType, PricingMode } from "@/lib/domain-enums";
import { cn } from "@/lib/utils";

type Piece = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  primaryMetal: MetalType;
  primaryGemstone: Gemstone;
  price: number;
  status: string;
  images: { url: string }[];
  showOnProfile: boolean;
  showOnWebsite: boolean;
  pricingMode?: PricingMode;
  metalWeightGrams?: number;
  makingChargeType?: MakingChargeType;
  makingChargeValue?: number;
  stoneCost?: number;
};

export function ShowcaseForm({ piece, categories, currency }: { piece?: Piece; categories: { id: string; name: string }[]; currency: string }) {
  const [pricingMode, setPricingMode] = useState<PricingMode>(piece?.pricingMode ?? "FIXED");
  const [selectedMetal, setSelectedMetal] = useState<MetalType>(piece?.primaryMetal ?? "GOLD_18K");

  const [state, action] = useActionState<ShowcaseState, FormData>(async (previous, form) => {
    try {
      const files = form.getAll("images").filter((file): file is File => file instanceof File && file.size > 0);
      if (files.length > 6 || files.reduce((sum, file) => sum + file.size, 0) > 24 * 1024 * 1024) return { message: "Choose up to six images, totaling no more than 24 MB." };
      await uploadFormImages(form, { images: "PRODUCT_MEDIA" });
      return await saveShowcaseAction(previous, form);
    } catch (error) { return { message: error instanceof Error ? error.message : "Unable to upload your images." }; }
  }, {});

  const spotMode = pricingMode === "METAL_SPOT";
  const metalInfo = METALS[selectedMetal];

  return <form action={action} className="space-y-8 rounded-[3px] border border-line bg-porcelain p-8">
    <FormError message={!state.ok ? state.message : undefined} />
    {state.ok && <div role="status" className="rounded border border-sage/30 bg-sage-mist p-4 text-sm text-sage-deep">{state.message} <Link href="/seller/products" className="ml-2 underline">Back to My Jewelry</Link></div>}
    {(piece?.id || state.productId) && <input type="hidden" name="id" value={piece?.id || state.productId} />}
    <input type="hidden" name="pricingMode" value={pricingMode} />

    <div>
      <p className="eyebrow">The piece</p>
      <div className="mt-4 grid grid-cols-2 gap-5">
        <Field label="Jewelry name" htmlFor="title" className="col-span-2">
          <Input id="title" name="title" defaultValue={piece?.title} required maxLength={150} />
        </Field>
        <Field label="Description" htmlFor="description" className="col-span-2" hint="Describe the design, craftsmanship and details customers should know.">
          <Textarea id="description" name="description" defaultValue={piece?.description} required minLength={20} maxLength={5000} className="min-h-32" />
        </Field>
        <Field label="Category" htmlFor="categoryId">
          <NativeSelect id="categoryId" name="categoryId" defaultValue={piece?.categoryId ?? ""} required>
            <option value="">Choose a category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Metal" htmlFor="metal">
          <NativeSelect id="metal" name="metal" value={selectedMetal} onChange={(e) => setSelectedMetal(e.target.value as MetalType)}>
            {Object.entries(METALS).map(([key, metal]) => <option key={key} value={key}>{metal.label}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Stone" htmlFor="gemstone">
          <NativeSelect id="gemstone" name="gemstone" defaultValue={piece?.primaryGemstone ?? "NONE"}>
            {Object.entries(GEMSTONES).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
          </NativeSelect>
        </Field>
      </div>
    </div>

    <div className="border-t border-line pt-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Pricing method</p>
          <p className="text-sm text-muted">Choose whether this piece has a fixed manual price or recalculates automatically with live metal spot rates.</p>
        </div>
        <div className="flex overflow-hidden rounded-full border border-line bg-parchment/60 p-0.5 text-xs font-medium" role="radiogroup" aria-label="Pricing mode">
          <button
            type="button"
            role="radio"
            aria-checked={!spotMode}
            onClick={() => setPricingMode("FIXED")}
            className={cn("rounded-full px-3.5 py-1.5 transition-colors", !spotMode ? "bg-ink text-ivory shadow-xs" : "text-ink-soft hover:text-ink")}
          >
            Fixed price
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={spotMode}
            onClick={() => setPricingMode("METAL_SPOT")}
            className={cn("rounded-full px-3.5 py-1.5 transition-colors", spotMode ? "bg-ink text-ivory shadow-xs" : "text-ink-soft hover:text-ink")}
          >
            Automatic metal price
          </button>
        </div>
      </div>

      {!spotMode ? (
        <div className="mt-5 grid grid-cols-2 gap-5">
          <Field label={`Guide price (${currency})`} htmlFor="price" hint="Customers agree the final price directly with you. Existing listings remain fixed unless switched to automatic.">
            <Input id="price" name="price" type="number" step="0.01" min="0.01" defaultValue={piece?.price} required={!spotMode} />
          </Field>
        </div>
      ) : (
        <div className="mt-5 space-y-5 rounded border border-line bg-parchment/30 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3 text-xs text-ink-soft">
            <span>
              <strong>Purity benchmark:</strong> {metalInfo?.label} · fineness {metalInfo?.fineness ?? "—"} ({metalInfo?.purity ? `${(metalInfo.purity * 100).toFixed(1)}% pure` : "unsupported for spot"})
            </span>
            <span className="text-[11px] text-muted">Recalculates automatically every 8 hours</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Net metal weight (grams)" htmlFor="metalWeightGrams" hint="Pure net weight, excluding stones.">
              <Input
                id="metalWeightGrams"
                name="metalWeightGrams"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={piece?.metalWeightGrams}
                required={spotMode}
                placeholder="e.g. 15.5"
              />
            </Field>

            <Field label="Making charge type" htmlFor="makingChargeType" hint="How your crafting fee is calculated.">
              <NativeSelect
                id="makingChargeType"
                name="makingChargeType"
                defaultValue={piece?.makingChargeType ?? "PERCENT"}
                required={spotMode}
              >
                <option value="PERCENT">% of metal value</option>
                <option value="FLAT">Flat fee ({currency})</option>
                <option value="PER_GRAM">Per gram ({currency} / g)</option>
              </NativeSelect>
            </Field>

            <Field label="Making charge value" htmlFor="makingChargeValue" hint="e.g. 12 for 12%, or fee in currency.">
              <Input
                id="makingChargeValue"
                name="makingChargeValue"
                type="number"
                step="0.01"
                min="0"
                defaultValue={piece?.makingChargeValue ?? 0}
                required={spotMode}
                placeholder="0"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={`Stone cost (${currency})`} htmlFor="stoneCost" hint="Cost of set stones, diamonds or gems. Defaults to zero.">
              <Input
                id="stoneCost"
                name="stoneCost"
                type="number"
                step="0.01"
                min="0"
                defaultValue={piece?.stoneCost ?? 0}
                placeholder="0.00"
              />
            </Field>
            <div className="flex flex-col justify-end">
              <p className="text-[11.5px] leading-relaxed text-muted">
                <strong>Pricing formula:</strong> (Pure-metal spot rate/g × purity fraction × net weight + making charge + stone cost) + 3% GST. Indian retail jewelry prices include 3% GST. Shipping is separate.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>

    <div className="border-t border-line pt-6">
      <p className="eyebrow">Photography</p>
      {!!piece?.images.length && <div className="my-4 flex gap-3">{piece.images.map(i => <img key={i.url} src={i.url} alt={piece.title} className="size-20 rounded object-cover" />)}</div>}
      <Field label="Jewelry photos" htmlFor="images" hint="JPEG, PNG, WebP or AVIF. Up to six photos, 24 MB total. Selecting new photos replaces the current set.">
        <Input id="images" name="images" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" />
      </Field>
    </div>

    <fieldset className="border-t border-line pt-6">
      <legend className="font-display text-xl">Where should this piece appear?</legend>
      <p className="mb-4 text-sm text-muted">Choose each location independently. Both can be turned off.</p>
      <div className="grid grid-cols-2 gap-4">
        {[["showOnProfile", "My public profile", "In the showcase on your business profile.", piece?.showOnProfile ?? true], ["showOnWebsite", "Loupe listings & jeweler directory", "In jewelry search, collections and directory previews.", piece?.showOnWebsite ?? true]].map(([name, label, hint, checked]) => (
          <label key={String(name)} className="flex cursor-pointer gap-3 rounded border border-line p-4">
            <input type="checkbox" name={String(name)} defaultChecked={Boolean(checked)} className="mt-1 accent-[#876038]" />
            <span>
              <span className="block text-sm font-medium">{String(label)}</span>
              <span className="mt-1 block text-xs text-muted">{String(hint)}</span>
            </span>
          </label>
        ))}
      </div>
      <label className="mt-5 flex items-center gap-3 text-sm">
        <input type="checkbox" name="draft" defaultChecked={piece?.status === "DRAFT"} />
        Keep as draft (private everywhere)
      </label>
    </fieldset>

    <div className="flex items-center gap-5">
      <SubmitButton pendingLabel="Saving…">Save jewelry</SubmitButton>
      <Link href="/seller/products" className="text-sm underline">Cancel</Link>
    </div>
  </form>;
}

