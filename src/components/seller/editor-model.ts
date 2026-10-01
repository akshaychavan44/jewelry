// Listing-editor form model — shared by the client editor and server pages.
import type { Gemstone, MakingChargeType, MetalColor, MetalType, PricingMode, ProductCondition, ShippingRegion, SizingMode, StoneShape } from "@/generated/prisma/enums";

export type VariantRow = {
  key: string;
  id?: string;
  sku: string;
  title: string;
  metalType: MetalType;
  metalColor: MetalColor | "";
  gemstone: Gemstone | "";
  caratWeight: string;
  stoneQuality: string;
  ringSize: string;
  chainLengthMm: string;
  price: string;
  compareAt: string;
  stock: string;
  lowStockThreshold: string;
  allowBackorder: boolean;
  isActive: boolean;
  metalWeightGrams: string;
  makingChargeType: MakingChargeType | "";
  makingChargeValue: string;
  stonePrice: string;
};

export type EditorState = {
  id?: string;
  title: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  condition: ProductCondition;
  conditionGrade: string;
  conditionNotes: string;
  era: string;
  isHandcrafted: boolean;
  isOneOfAKind: boolean;
  isMadeToOrder: boolean;
  productionDays: string;
  primaryMetal: MetalType;
  metalColor: MetalColor | "";
  primaryGemstone: Gemstone;
  totalCaratWeight: string;
  stoneShape: StoneShape | "";
  widthMm: string;
  heightMm: string;
  depthMm: string;
  weightGrams: string;
  pricingMode: PricingMode;
  acceptsOffers: boolean;
  offerFloor: string;
  sizingMode: SizingMode;
  ringSizeMin: string;
  ringSizeMax: string;
  resizingFee: string;
  engravingEnabled: boolean;
  engravingMaxChars: string;
  engravingFee: string;
  shipsTo: ShippingRegion[];
  returnWindowDays: string;
  warrantyMonths: string;
  tags: string;
  images: { url: string; alt: string; angle: string }[];
  variants: VariantRow[];
};

let seq = 0;
const newKey = () => `v${Date.now().toString(36)}${seq++}`;

export function blankVariant(prefix: string, i: number, metal: MetalType = "GOLD_18K"): VariantRow {
  return {
    key: newKey(),
    sku: `${prefix}-${String(i + 1).padStart(3, "0")}`,
    title: "",
    metalType: metal,
    metalColor: "",
    gemstone: "",
    caratWeight: "",
    stoneQuality: "",
    ringSize: "",
    chainLengthMm: "",
    price: "",
    compareAt: "",
    stock: "1",
    lowStockThreshold: "1",
    allowBackorder: false,
    isActive: true,
    metalWeightGrams: "",
    makingChargeType: "PERCENT",
    makingChargeValue: "",
    stonePrice: "",
  };
}

