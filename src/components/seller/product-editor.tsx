"use client";

import { ArrowDown, ArrowUp, ImagePlus, Plus, Sparkles, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/controls";
import { Card, CardHeader } from "@/components/ui/display";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import type { ConditionGrade, Gemstone, MakingChargeType, MetalColor, MetalType, PricingMode, ProductCondition, ShippingRegion, SizingMode, StoneShape } from "@/generated/prisma/enums";
import { chainLengthLabel, GEMSTONES, METAL_COLORS, METAL_OPTIONS, METALS, STONE_SHAPES } from "@/lib/jewelry";
import { formatMoney, toMinor, type FxRates } from "@/lib/money";
import { computeSpotPrice, type SpotRatesUsd } from "@/lib/pricing";
import { REGION_LABELS } from "@/lib/regions";
import { cn } from "@/lib/utils";
import { saveListingAction, uploadProductImageAction } from "@/server/actions/seller";
import { blankVariant, type EditorState, type VariantRow } from "./editor-model";

const list = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

export function ProductEditor({
  initial,
  categories,
  currency,
  skuPrefix,
  spot,
  fx,
  status,
  slug,
}: {
  initial: EditorState;
  categories: { id: string; label: string }[];
  currency: string;
  skuPrefix: string;
  spot: SpotRatesUsd;
  fx: FxRates;
  status: string | null;
  slug: string | null;
}) {
  const router = useRouter();
  const [s, setS] = useState<EditorState>(initial);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [axes, setAxes] = useState({ metals: [] as string[], carats: "", sizes: "", chains: "" });
  const set = <K extends keyof EditorState>(k: K, v: EditorState[K]) => setS((prev) => ({ ...prev, [k]: v }));
  const setVariant = (key: string, patch: Partial<VariantRow>) => setS((prev) => ({ ...prev, variants: prev.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)) }));

  const livePreview = useMemo(
    () =>
      Object.fromEntries(
        s.variants.map((v) => {
          if (s.pricingMode !== "METAL_SPOT" || !v.metalWeightGrams || !v.makingChargeType) return [v.key, null];
          const b = computeSpotPrice(
            {
              metalType: v.metalType,
              metalWeightGrams: Number(v.metalWeightGrams),
              makingChargeType: v.makingChargeType,
              makingChargeValue: v.makingChargeType === "PERCENT" ? Number(v.makingChargeValue || 0) : toMinor(Number(v.makingChargeValue || 0), currency),
              stonePriceMinor: toMinor(Number(v.stonePrice || 0), currency),
              currency,
            },
            spot,
            fx,
          );
          return [v.key, b?.totalMinor ?? null];
        }),
      ),
    [s.variants, s.pricingMode, currency, spot, fx],
  );

  /** Cartesian product of the chosen axes, merged with existing SKUs. */
  const generate = () => {
    const metals = axes.metals.length ? axes.metals : [`${s.primaryMetal}|${s.metalColor}`];
    const carats = list(axes.carats).map(Number).filter((n) => n > 0);
    const sizes = list(axes.sizes).map(Number).filter((n) => n > 0);
    const chains = list(axes.chains).map(Number).filter((n) => n > 0);
    const combos: Partial<VariantRow>[] = [];
    for (const m of metals) for (const c of carats.length ? carats : [null]) for (const r of sizes.length ? sizes : [null]) for (const ch of chains.length ? chains : [null]) {
      const [metalType, metalColor] = m.split("|") as [MetalType, MetalColor | ""];
      combos.push({ metalType, metalColor, caratWeight: c ? String(c) : "", ringSize: r ? String(r) : "", chainLengthMm: ch ? String(ch) : "" });
    }
    if (combos.length > 120) return toast.error(`That would create ${combos.length} SKUs — keep it under 120, or use “Made to size” for ring sizes.`);
    const template = s.variants[0];
    const same = (a: Partial<VariantRow>, b: VariantRow) => a.metalType === b.metalType && (a.metalColor ?? "") === b.metalColor && (a.caratWeight ?? "") === b.caratWeight && (a.ringSize ?? "") === b.ringSize && (a.chainLengthMm ?? "") === b.chainLengthMm;
    const next = combos.map((c, i) => {
      const existing = s.variants.find((v) => same(c, v));
      return existing ?? { ...blankVariant(skuPrefix, s.variants.length + i, c.metalType), ...(template ? { price: template.price, stock: template.stock, metalWeightGrams: template.metalWeightGrams, makingChargeType: template.makingChargeType, makingChargeValue: template.makingChargeValue } : {}), ...c };
    });
    set("variants", next);
    toast.success(`${next.length} SKUs ready — review prices and stock.`);
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadProductImageAction(fd);
      if (res.ok && "url" in res && res.url) setS((prev) => ({ ...prev, images: [...prev.images, { url: res.url!, alt: prev.title, angle: "" }] }));
      else toast.error(res.message);
    }
    setUploading(false);
  };

  const moveImage = (i: number, d: -1 | 1) =>
    setS((prev) => {
      const imgs = [...prev.images];
      const j = i + d;
      if (j < 0 || j >= imgs.length) return prev;
      [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
      return { ...prev, images: imgs };
    });

  const save = (publish: boolean) =>
    start(async () => {
      const payload = {
        ...s,
        tags: list(s.tags).map((t) => t.toLowerCase()),
        metalColor: s.metalColor || null,
        stoneShape: s.stoneShape || null,
        conditionGrade: (s.conditionGrade || null) as ConditionGrade | null,
        variants: s.variants.map(({ key: _key, ...v }) => ({ ...v, metalColor: v.metalColor || null, gemstone: v.gemstone || null, makingChargeType: s.pricingMode === "METAL_SPOT" ? v.makingChargeType || null : null })),
      };
      const res = await saveListingAction(payload, publish);
      if (res.ok) {
        toast.success(res.message);
        if (!s.id && "productId" in res && res.productId) router.push(`/seller/products/${res.productId}`);
        else router.refresh();
      } else toast.error(res.message);
    });

  const spotMode = s.pricingMode === "METAL_SPOT";
  const numberCell = "h-9 w-full rounded-[2px] border border-line bg-ivory px-2 text-[13px] outline-none focus:border-sage";

  return (
    <div className="space-y-6 pb-28">
      <Card>
        <CardHeader title="The piece" />
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <Field label="Title" htmlFor="title" className="md:col-span-2">
            <Input id="title" value={s.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Emerald-Cut Solitaire on Pavé Band" />
          </Field>
          <Field label="Category" htmlFor="categoryId">
            <NativeSelect id="categoryId" value={s.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              <option value="">Choose…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Tags" htmlFor="tags" optional hint="Comma-separated: bridal, art deco, oval">
            <Input id="tags" value={s.tags} onChange={(e) => set("tags", e.target.value)} />
          </Field>
          <Field label="One-line summary" htmlFor="short" optional className="md:col-span-2">
            <Input id="short" value={s.shortDescription} maxLength={200} onChange={(e) => set("shortDescription", e.target.value)} />
          </Field>
          <Field label="Description" htmlFor="description" hint="Materials, provenance, how it's made, how it wears." className="md:col-span-2">
            <Textarea id="description" value={s.description} onChange={(e) => set("description", e.target.value)} className="min-h-40" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Photographs" description="First image leads. Include an on-hand shot and a close-up of the hallmark." />
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4">
          {s.images.map((img, i) => (
            <div key={`${img.url}-${i}`} className="rounded-[3px] border border-line bg-ivory">
              <div className="relative aspect-square overflow-hidden bg-sand">
                <Image src={img.url} alt={img.alt} fill sizes="200px" className="object-cover" />
                {i === 0 && <span className="absolute top-2 left-2 rounded-full bg-ivory/90 px-2 py-0.5 text-[10.5px] text-ink">Cover</span>}
              </div>
              <div className="space-y-1.5 p-2">
                <input value={img.angle} onChange={(e) => set("images", s.images.map((x, j) => (j === i ? { ...x, angle: e.target.value } : x)))} placeholder="Angle (front, on hand…)" className="h-8 w-full rounded-[2px] border border-line px-2 text-[12px]" />
                <input value={img.alt} onChange={(e) => set("images", s.images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} placeholder="Alt text" className="h-8 w-full rounded-[2px] border border-line px-2 text-[12px]" />
                <div className="flex justify-between text-muted">
                  <span className="flex gap-1">
                    <button type="button" onClick={() => moveImage(i, -1)} aria-label="Move earlier" className="p-1 hover:text-ink"><ArrowUp className="size-3.5" /></button>
                    <button type="button" onClick={() => moveImage(i, 1)} aria-label="Move later" className="p-1 hover:text-ink"><ArrowDown className="size-3.5" /></button>
                  </span>
                  <button type="button" onClick={() => set("images", s.images.filter((_, j) => j !== i))} aria-label="Remove photo" className="p-1 hover:text-rosewood"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
          <label className={cn("flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-[3px] border border-dashed border-line-strong text-[13px] text-ink-soft hover:border-ink/40", uploading && "opacity-60")}>
            <ImagePlus className="size-6" strokeWidth={1.3} />
            {uploading ? "Uploading…" : "Add photographs"}
            <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(e) => upload(e.target.files)} />
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader title="Materials & measurements" description="Used for filters, the hallmark mark and the actual-size view." />
        <div className="grid gap-5 p-5 md:grid-cols-4">
          <Field label="Primary metal" htmlFor="primaryMetal">
            <NativeSelect id="primaryMetal" value={s.primaryMetal} onChange={(e) => set("primaryMetal", e.target.value as MetalType)}>
              {METAL_OPTIONS.map((m) => (
                <option key={m} value={m}>{METALS[m].label}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Colour" htmlFor="metalColor" optional>
            <NativeSelect id="metalColor" value={s.metalColor} onChange={(e) => set("metalColor", e.target.value as MetalColor)}>
              <option value="">—</option>
              {(Object.keys(METAL_COLORS) as MetalColor[]).map((c) => (
                <option key={c} value={c}>{METAL_COLORS[c]}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Main stone" htmlFor="gem">
            <NativeSelect id="gem" value={s.primaryGemstone} onChange={(e) => set("primaryGemstone", e.target.value as Gemstone)}>
              {(Object.keys(GEMSTONES) as Gemstone[]).map((g) => (
                <option key={g} value={g}>{GEMSTONES[g]}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Shape" htmlFor="shape" optional>
            <NativeSelect id="shape" value={s.stoneShape} onChange={(e) => set("stoneShape", e.target.value as StoneShape)}>
              <option value="">—</option>
              {(Object.keys(STONE_SHAPES) as StoneShape[]).map((sh) => (
                <option key={sh} value={sh}>{STONE_SHAPES[sh]}</option>
              ))}
            </NativeSelect>
          </Field>
          {(
            [
              ["totalCaratWeight", "Total carats", "ct"],
              ["widthMm", "Width", "mm"],
              ["heightMm", "Height / drop", "mm"],
              ["depthMm", "Depth", "mm"],
              ["weightGrams", "Weight", "g"],
            ] as const
          ).map(([k, label, unit]) => (
            <Field key={k} label={`${label} (${unit})`} htmlFor={k} optional>
              <Input id={k} inputMode="decimal" value={s[k]} onChange={(e) => set(k, e.target.value)} />
            </Field>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Condition & craft" />
        <div className="grid gap-5 p-5 md:grid-cols-4">
          <Field label="Condition" htmlFor="condition">
            <NativeSelect id="condition" value={s.condition} onChange={(e) => set("condition", e.target.value as ProductCondition)}>
              <option value="NEW">New</option>
              <option value="PRE_OWNED">Pre-owned</option>
              <option value="VINTAGE">Vintage (20+ years)</option>
              <option value="ANTIQUE">Antique (100+ years)</option>
            </NativeSelect>
          </Field>
          {s.condition !== "NEW" && (
            <>
              <Field label="Grade" htmlFor="grade">
                <NativeSelect id="grade" value={s.conditionGrade} onChange={(e) => set("conditionGrade", e.target.value)}>
                  <option value="">—</option>
                  {["MINT", "EXCELLENT", "VERY_GOOD", "GOOD", "FAIR"].map((g) => (
                    <option key={g} value={g}>{g.replace("_", " ").toLowerCase()}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Era" htmlFor="era" optional>
                <Input id="era" value={s.era} onChange={(e) => set("era", e.target.value)} placeholder="Art Deco, c. 1925" />
              </Field>
              <Field label="Condition notes" htmlFor="cnotes" optional>
                <Input id="cnotes" value={s.conditionNotes} onChange={(e) => set("conditionNotes", e.target.value)} />
              </Field>
            </>
          )}
          <div className="flex flex-wrap items-center gap-6 md:col-span-4">
            {(
              [
                ["isHandcrafted", "Handcrafted"],
                ["isOneOfAKind", "One of a kind"],
                ["isMadeToOrder", "Made to order"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex items-center gap-3 text-[14px] text-ink-soft">
                <Switch checked={s[k]} onCheckedChange={(v) => set(k, v)} /> {label}
              </label>
            ))}
            <label className="flex items-center gap-3 text-[14px] text-ink-soft">
              Production time
              <input value={s.productionDays} onChange={(e) => set("productionDays", e.target.value.replace(/\D/g, ""))} className="h-9 w-16 rounded-[2px] border border-line px-2 text-[13px]" aria-label="Production days" /> days
            </label>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Pricing & SKUs"
          description={spotMode ? "Price = metal weight × today's spot rate (at purity) + your making charge + stones. Recalculated every 15 minutes." : "Each SKU is a stock-keeping combination buyers can choose."}
          action={
            <div className="flex overflow-hidden rounded-full border border-line text-[12.5px]" role="radiogroup" aria-label="Pricing mode">
              {(["FIXED", "METAL_SPOT"] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={s.pricingMode === m} onClick={() => set("pricingMode", m)} className={cn("px-3.5 py-1.5", s.pricingMode === m ? "bg-ink text-ivory" : "text-ink-soft hover:bg-parchment")}>
                  {m === "FIXED" ? "Fixed price" : "Live metal price"}
                </button>
              ))}
            </div>
          }
        />
        <div className="space-y-4 border-b border-line bg-parchment/40 p-5">
          <p className="caps flex items-center gap-2 text-[10.5px] text-ink"><Sparkles className="size-3.5 text-gold" /> Variant builder</p>
          <div className="flex flex-wrap gap-2">
            {METAL_OPTIONS.flatMap((m) => (METALS[m].family === "gold" ? (["YELLOW", "WHITE", "ROSE"] as MetalColor[]).map((c) => `${m}|${c}`) : [`${m}|NATURAL`])).slice(0, 18).map((key) => {
              const [m, c] = key.split("|") as [MetalType, MetalColor];
              const on = axes.metals.includes(key);
              return (
                <button key={key} type="button" onClick={() => setAxes((a) => ({ ...a, metals: on ? a.metals.filter((x) => x !== key) : [...a.metals, key] }))} className={cn("rounded-full border px-3 py-1 text-[12.5px]", on ? "border-ink bg-ink text-ivory" : "border-line bg-porcelain text-ink-soft")}>
                  {METALS[m].family === "gold" ? `${METALS[m].label.replace(" Gold", "")} ${METAL_COLORS[c].toLowerCase()}` : METALS[m].label}
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <Input value={axes.carats} onChange={(e) => setAxes((a) => ({ ...a, carats: e.target.value }))} placeholder="Carats: 1.0, 1.5, 2.0" aria-label="Carat options" />
            <Input value={axes.sizes} onChange={(e) => setAxes((a) => ({ ...a, sizes: e.target.value }))} placeholder="Stocked ring sizes: 5, 6, 7" aria-label="Ring size options" />
            <Input value={axes.chains} onChange={(e) => setAxes((a) => ({ ...a, chains: e.target.value }))} placeholder="Chain mm: 406, 457" aria-label="Chain length options" />
            <Button type="button" variant="dark" onClick={generate}>Generate SKUs</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] tracking-[0.08em] text-muted uppercase">
                <th className="px-3 py-2.5">SKU</th>
                <th className="px-3 py-2.5">Metal</th>
                <th className="px-3 py-2.5">Carat</th>
                <th className="px-3 py-2.5">Size</th>
                <th className="px-3 py-2.5">Chain</th>
                {spotMode ? (
                  <>
                    <th className="px-3 py-2.5">Metal g</th>
                    <th className="px-3 py-2.5">Making charge</th>
                    <th className="px-3 py-2.5">Stones</th>
                    <th className="px-3 py-2.5">Price now</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-2.5">Price ({currency})</th>
                    <th className="px-3 py-2.5">Compare at</th>
                  </>
                )}
                <th className="px-3 py-2.5">Stock</th>
                <th className="px-3 py-2.5">Backorder</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {s.variants.map((v) => (
                <tr key={v.key} className="border-b border-line/70 align-middle">
                  <td className="px-3 py-2"><input className={cn(numberCell, "w-28 font-mono uppercase")} value={v.sku} onChange={(e) => setVariant(v.key, { sku: e.target.value })} aria-label="SKU" /></td>
                  <td className="px-3 py-2">
                    <select className={cn(numberCell, "w-36")} value={`${v.metalType}|${v.metalColor}`} onChange={(e) => { const [metalType, metalColor] = e.target.value.split("|"); setVariant(v.key, { metalType: metalType as MetalType, metalColor: metalColor as MetalColor }); }} aria-label="Metal">
                      {METAL_OPTIONS.flatMap((m) => (METALS[m].family === "gold" ? ["YELLOW", "WHITE", "ROSE", ""] : ["NATURAL", ""]).map((c) => (
                        <option key={`${m}|${c}`} value={`${m}|${c}`}>{METALS[m].label}{c ? ` · ${c.toLowerCase()}` : ""}</option>
                      )))}
                    </select>
                  </td>
                  <td className="px-3 py-2"><input className={cn(numberCell, "w-16")} inputMode="decimal" value={v.caratWeight} onChange={(e) => setVariant(v.key, { caratWeight: e.target.value })} aria-label="Carat" /></td>
                  <td className="px-3 py-2"><input className={cn(numberCell, "w-14")} inputMode="decimal" value={v.ringSize} onChange={(e) => setVariant(v.key, { ringSize: e.target.value })} aria-label="Ring size" /></td>
                  <td className="px-3 py-2">
                    <input className={cn(numberCell, "w-16")} inputMode="numeric" value={v.chainLengthMm} onChange={(e) => setVariant(v.key, { chainLengthMm: e.target.value })} aria-label="Chain length mm" title={v.chainLengthMm ? chainLengthLabel(Number(v.chainLengthMm)) : undefined} />
                  </td>
                  {spotMode ? (
                    <>
                      <td className="px-3 py-2"><input className={cn(numberCell, "w-16")} inputMode="decimal" value={v.metalWeightGrams} onChange={(e) => setVariant(v.key, { metalWeightGrams: e.target.value })} aria-label="Metal weight grams" /></td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <select className={cn(numberCell, "w-20")} value={v.makingChargeType} onChange={(e) => setVariant(v.key, { makingChargeType: e.target.value as MakingChargeType })} aria-label="Making charge type">
                            <option value="PERCENT">%</option>
                            <option value="FLAT">Flat</option>
                            <option value="PER_GRAM">/ g</option>
                          </select>
                          <input className={cn(numberCell, "w-20")} inputMode="decimal" value={v.makingChargeValue} onChange={(e) => setVariant(v.key, { makingChargeValue: e.target.value })} aria-label="Making charge" />
                        </div>
                      </td>
                      <td className="px-3 py-2"><input className={cn(numberCell, "w-20")} inputMode="decimal" value={v.stonePrice} onChange={(e) => setVariant(v.key, { stonePrice: e.target.value })} aria-label="Stone price" /></td>
                      <td className="px-3 py-2 font-medium whitespace-nowrap text-ink">{livePreview[v.key] ? formatMoney(livePreview[v.key]!, currency) : "—"}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2"><input className={cn(numberCell, "w-24")} inputMode="decimal" value={v.price} onChange={(e) => setVariant(v.key, { price: e.target.value })} aria-label="Price" /></td>
                      <td className="px-3 py-2"><input className={cn(numberCell, "w-24")} inputMode="decimal" value={v.compareAt} onChange={(e) => setVariant(v.key, { compareAt: e.target.value })} aria-label="Compare-at price" /></td>
                    </>
                  )}
                  <td className="px-3 py-2"><input className={cn(numberCell, "w-16")} inputMode="numeric" value={v.stock} onChange={(e) => setVariant(v.key, { stock: e.target.value.replace(/\D/g, "") })} aria-label="Stock" /></td>
                  <td className="px-3 py-2"><Switch checked={v.allowBackorder} onCheckedChange={(b) => setVariant(v.key, { allowBackorder: b })} aria-label="Allow backorder" /></td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => set("variants", s.variants.filter((x) => x.key !== v.key))} disabled={s.variants.length === 1} className="p-1 text-muted hover:text-rosewood disabled:opacity-30" aria-label="Remove SKU"><Trash2 className="size-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4">
          <Button type="button" variant="ghost" size="sm" onClick={() => set("variants", [...s.variants, blankVariant(skuPrefix, s.variants.length, s.primaryMetal)])}>
            <Plus /> Add a SKU
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Sizing & engraving" />
          <div className="space-y-5 p-5">
            <Field label="Ring sizing" htmlFor="sizing">
              <NativeSelect id="sizing" value={s.sizingMode} onChange={(e) => set("sizingMode", e.target.value as SizingMode)}>
                <option value="NONE">Not a ring / one size</option>
                <option value="VARIANT">Stocked sizes (one SKU per size)</option>
                <option value="MADE_TO_SIZE">Made or resized to the buyer's size</option>
              </NativeSelect>
            </Field>
            {s.sizingMode === "MADE_TO_SIZE" && (
              <div className="grid grid-cols-3 gap-3">
                <Field label="From (US)" htmlFor="rmin"><Input id="rmin" inputMode="decimal" value={s.ringSizeMin} onChange={(e) => set("ringSizeMin", e.target.value)} /></Field>
                <Field label="To (US)" htmlFor="rmax"><Input id="rmax" inputMode="decimal" value={s.ringSizeMax} onChange={(e) => set("ringSizeMax", e.target.value)} /></Field>
                <Field label={`Fee (${currency})`} htmlFor="rfee" optional><Input id="rfee" inputMode="decimal" value={s.resizingFee} onChange={(e) => set("resizingFee", e.target.value)} /></Field>
              </div>
            )}
            <label className="flex items-center justify-between gap-3 text-[14px] text-ink-soft">
              Offer engraving <Switch checked={s.engravingEnabled} onCheckedChange={(v) => set("engravingEnabled", v)} />
            </label>
            {s.engravingEnabled && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Max characters" htmlFor="emax"><Input id="emax" inputMode="numeric" value={s.engravingMaxChars} onChange={(e) => set("engravingMaxChars", e.target.value)} /></Field>
                <Field label={`Fee (${currency})`} htmlFor="efee" optional hint="Leave empty for complimentary"><Input id="efee" inputMode="decimal" value={s.engravingFee} onChange={(e) => set("engravingFee", e.target.value)} /></Field>
              </div>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Offers, shipping & policy" />
          <div className="space-y-5 p-5">
            <label className="flex items-center justify-between gap-3 text-[14px] text-ink-soft">
              Accept offers <Switch checked={s.acceptsOffers} onCheckedChange={(v) => set("acceptsOffers", v)} />
            </label>
            {s.acceptsOffers && (
              <Field label={`Decline offers below (${currency})`} htmlFor="floor" optional hint="Private — buyers never see this number.">
                <Input id="floor" inputMode="decimal" value={s.offerFloor} onChange={(e) => set("offerFloor", e.target.value)} />
              </Field>
            )}
            <fieldset>
              <legend className="mb-2 text-[12px] tracking-[0.06em] text-ink-soft uppercase">Ships to</legend>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(REGION_LABELS) as ShippingRegion[]).map((r) => {
                  const on = s.shipsTo.includes(r);
                  return (
                    <button key={r} type="button" aria-pressed={on} onClick={() => set("shipsTo", on ? s.shipsTo.filter((x) => x !== r) : [...s.shipsTo, r])} className={cn("rounded-full border px-3 py-1 text-[12.5px]", on ? "border-ink bg-ink text-ivory" : "border-line text-ink-soft")}>
                      {REGION_LABELS[r]}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Return window (days)" htmlFor="rw" optional hint="Blank = store default"><Input id="rw" inputMode="numeric" value={s.returnWindowDays} onChange={(e) => set("returnWindowDays", e.target.value)} /></Field>
              <Field label="Warranty (months)" htmlFor="wm"><Input id="wm" inputMode="numeric" value={s.warrantyMonths} onChange={(e) => set("warrantyMonths", e.target.value)} /></Field>
            </div>
          </div>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ivory/95 backdrop-blur-sm lg:left-64">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-10">
          <p className="text-[13px] text-muted">
            {status ? <>Status: <span className="text-ink">{status.toLowerCase().replace("_", " ")}</span></> : "New listing"}
            {slug && status === "ACTIVE" && (
              <a href={`/product/${slug}`} target="_blank" rel="noreferrer" className="ml-3 underline underline-offset-4">View live</a>
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => save(false)} pending={pending}>{status === "ACTIVE" ? "Save changes" : "Save draft"}</Button>
            {status !== "ACTIVE" && <Button onClick={() => save(true)} pending={pending}>Save & publish</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
