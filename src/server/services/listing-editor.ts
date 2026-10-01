import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { toMajor } from "@/lib/money";
import { num } from "@/lib/utils";
import { db } from "@/server/db";
import type { EditorState, VariantRow } from "@/components/seller/editor-model";

export const editorInclude = {
  images: { orderBy: { position: "asc" } },
  variants: { orderBy: { position: "asc" } },
  certificates: { include: { variant: { select: { sku: true } } }, orderBy: { createdAt: "asc" } },
} satisfies Prisma.ProductInclude;

type EditorProduct = Prisma.ProductGetPayload<{ include: typeof editorInclude }>;

const str = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));

/** Product record → form state (money in major units of the listing currency). */
export function toEditorState(p: EditorProduct): EditorState {
  const major = (m: bigint | number | null | undefined) => (m === null || m === undefined ? "" : String(toMajor(num(m), p.currency)));
  return {
    id: p.id,
    title: p.title,
    categoryId: p.categoryId,
    shortDescription: p.shortDescription ?? "",
    description: p.description,
    condition: p.condition,
    conditionGrade: p.conditionGrade ?? "",
    conditionNotes: p.conditionNotes ?? "",
    era: p.era ?? "",
    isHandcrafted: p.isHandcrafted,
    isOneOfAKind: p.isOneOfAKind,
    isMadeToOrder: p.isMadeToOrder,
    productionDays: String(p.productionDays),
    primaryMetal: p.primaryMetal,
    metalColor: p.metalColor ?? "",
    primaryGemstone: p.primaryGemstone,
    totalCaratWeight: str(p.totalCaratWeight),
    stoneShape: p.stoneShape ?? "",
    widthMm: str(p.widthMm),
    heightMm: str(p.heightMm),
    depthMm: str(p.depthMm),
    weightGrams: str(p.weightGrams),
    pricingMode: p.pricingMode,
    acceptsOffers: p.acceptsOffers,
    offerFloor: major(p.offerFloorMinor),
    sizingMode: p.sizingMode,
    ringSizeMin: str(p.ringSizeMin),
    ringSizeMax: str(p.ringSizeMax),
    resizingFee: major(p.resizingFeeMinor),
    engravingEnabled: p.engravingEnabled,
    engravingMaxChars: str(p.engravingMaxChars),
    engravingFee: major(p.engravingFeeMinor),
    shipsTo: p.shipsTo,
    returnWindowDays: str(p.returnWindowDays),
    warrantyMonths: String(p.warrantyMonths),
    tags: p.tags.join(", "),
    images: p.images.map((i) => ({ url: i.url, alt: i.alt ?? "", angle: i.angle ?? "" })),
    variants: p.variants.map(
      (v): VariantRow => ({
        key: v.id,
        id: v.id,
        sku: v.sku,
        title: v.title,
        metalType: v.metalType,
        metalColor: v.metalColor ?? "",
        gemstone: v.gemstone ?? "",
        caratWeight: str(v.caratWeight),
        stoneQuality: v.stoneQuality ?? "",
        ringSize: str(v.ringSize),
        chainLengthMm: str(v.chainLengthMm),
        price: major(v.priceMinor),
        compareAt: major(v.compareAtPriceMinor),
        stock: String(v.stockQuantity),
        lowStockThreshold: String(v.lowStockThreshold),
        allowBackorder: v.allowBackorder,
        isActive: v.isActive,
        metalWeightGrams: str(v.metalWeightGrams),
        makingChargeType: v.makingChargeType ?? "",
        makingChargeValue: v.makingChargeValue === null ? "" : v.makingChargeType === "PERCENT" ? String(v.makingChargeValue) : String(toMajor(v.makingChargeValue, p.currency)),
        stonePrice: major(v.stonePriceMinor),
      }),
    ),
  };
}

export async function editorCategories() {
  const cats = await db.category.findMany({ where: { isActive: true }, include: { parent: { select: { name: true } } }, orderBy: [{ parentId: "asc" }, { position: "asc" }] });
  return cats.map((c) => ({ id: c.id, label: c.parent ? `${c.parent.name} › ${c.name}` : c.name })).sort((a, b) => a.label.localeCompare(b.label));
}
