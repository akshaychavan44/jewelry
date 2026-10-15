"use client";
import { useActionState } from "react";
import Link from "next/link";
import { uploadFormImages } from "@/lib/image-upload-client";
import { saveShowcaseAction, type ShowcaseState } from "@/server/actions/showcase";
import { Field, FormError } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { METALS, GEMSTONES } from "@/lib/jewelry";
import type { Gemstone, MetalType } from "@/lib/domain-enums";
type Piece = { id: string; title: string; description: string; categoryId: string; primaryMetal: MetalType; primaryGemstone: Gemstone; price: number; status: string; images: { url: string }[]; showOnProfile: boolean; showOnWebsite: boolean };
export function ShowcaseForm({ piece, categories, currency }: { piece?: Piece; categories: { id: string; name: string }[]; currency: string }) {
  const [state, action] = useActionState<ShowcaseState, FormData>(async (previous, form) => {
    try {
      const files = form.getAll("images").filter((file): file is File => file instanceof File && file.size > 0);
      if (files.length > 6 || files.reduce((sum, file) => sum + file.size, 0) > 24 * 1024 * 1024) return { message: "Choose up to six images, totaling no more than 24 MB." };
      await uploadFormImages(form, { images: "PRODUCT_MEDIA" });
      return await saveShowcaseAction(previous, form);
    } catch (error) { return { message: error instanceof Error ? error.message : "Unable to upload your images." }; }
  }, {});
  return <form action={action} className="space-y-8 rounded-[3px] border border-line bg-porcelain p-8">
    <FormError message={!state.ok ? state.message : undefined} />
    {state.ok && <div role="status" className="rounded border border-sage/30 bg-sage-mist p-4 text-sm text-sage-deep">{state.message} <Link href="/seller/products" className="ml-2 underline">Back to My Jewelry</Link></div>}
    {(piece?.id || state.productId) && <input type="hidden" name="id" value={piece?.id || state.productId} />}
    <div><p className="eyebrow">The piece</p><div className="mt-4 grid grid-cols-2 gap-5">
      <Field label="Jewelry name" htmlFor="title" className="col-span-2"><Input id="title" name="title" defaultValue={piece?.title} required maxLength={150} /></Field>
      <Field label="Description" htmlFor="description" className="col-span-2" hint="Describe the design, craftsmanship and details customers should know."><Textarea id="description" name="description" defaultValue={piece?.description} required minLength={20} maxLength={5000} className="min-h-32" /></Field>
      <Field label="Category" htmlFor="categoryId"><NativeSelect id="categoryId" name="categoryId" defaultValue={piece?.categoryId ?? ""} required><option value="">Choose a category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect></Field>
      <Field label={`Guide price (${currency})`} htmlFor="price" hint="Customers agree the final price directly with you."><Input id="price" name="price" type="number" step="0.01" min="0.01" defaultValue={piece?.price} required /></Field>
      <Field label="Metal" htmlFor="metal"><NativeSelect id="metal" name="metal" defaultValue={piece?.primaryMetal}>{Object.entries(METALS).map(([key, metal]) => <option key={key} value={key}>{metal.label}</option>)}</NativeSelect></Field>
      <Field label="Stone" htmlFor="gemstone"><NativeSelect id="gemstone" name="gemstone" defaultValue={piece?.primaryGemstone ?? "NONE"}>{Object.entries(GEMSTONES).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</NativeSelect></Field>
    </div></div>
    <div className="border-t border-line pt-6"><p className="eyebrow">Photography</p>{!!piece?.images.length && <div className="my-4 flex gap-3">{piece.images.map(i => <img key={i.url} src={i.url} alt={piece.title} className="size-20 rounded object-cover" />)}</div>}<Field label="Jewelry photos" htmlFor="images" hint="JPEG, PNG, WebP or AVIF. Up to six photos, 24 MB total. Selecting new photos replaces the current set."><Input id="images" name="images" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" /></Field></div>
    <fieldset className="border-t border-line pt-6"><legend className="font-display text-xl">Where should this piece appear?</legend><p className="mb-4 text-sm text-muted">Choose each location independently. Both can be turned off.</p><div className="grid grid-cols-2 gap-4">{[["showOnProfile", "My public profile", "In the showcase on your business profile.", piece?.showOnProfile ?? true], ["showOnWebsite", "Loupe listings & jeweler directory", "In jewelry search, collections and directory previews.", piece?.showOnWebsite ?? true]].map(([name, label, hint, checked]) => <label key={String(name)} className="flex cursor-pointer gap-3 rounded border border-line p-4"><input type="checkbox" name={String(name)} defaultChecked={Boolean(checked)} className="mt-1 accent-[#876038]" /><span><span className="block text-sm font-medium">{String(label)}</span><span className="mt-1 block text-xs text-muted">{String(hint)}</span></span></label>)}</div><label className="mt-5 flex items-center gap-3 text-sm"><input type="checkbox" name="draft" defaultChecked={piece?.status === "DRAFT"} />Keep as draft (private everywhere)</label></fieldset>
    <div className="flex items-center gap-5"><SubmitButton pendingLabel="Saving…">Save jewelry</SubmitButton><Link href="/seller/products" className="text-sm underline">Cancel</Link></div>
  </form>;
}
