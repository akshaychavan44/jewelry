// URL ⇄ filter mapping for listing pages. Enum values travel as lowercase
// slugs (GOLD_18K ⇄ gold-18k) so URLs stay readable and shareable.
import {
  CertificateLab,
  Gemstone,
  MetalType,
  ProductCondition,
  ShippingRegion,
} from "@/generated/prisma/enums";
import type { ListingFilters, SortKey } from "@/server/services/catalog";
import { firstParam, listParam, type SearchParams } from "./utils";

export const toSlug = (value: string) => value.toLowerCase().replace(/_/g, "-");
const fromSlug = (slug: string) => slug.toUpperCase().replace(/-/g, "_");

function enumList<T extends string>(values: Record<string, T>, raw: string | string[] | undefined): T[] {
  const allowed = new Set(Object.values(values));
  return listParam(raw)
    .map(fromSlug)
    .filter((v): v is T => allowed.has(v as T));
}

function range(raw: string | string[] | undefined) {
  const value = firstParam(raw);
  if (!value) return undefined;
  const [a, b] = value.split("-");
  const min = a ? Number(a) : undefined;
  const max = b ? Number(b) : undefined;
  const clean = (n?: number) => (n !== undefined && Number.isFinite(n) && n >= 0 ? n : undefined);
  const out = { min: clean(min), max: clean(max) };
  return out.min === undefined && out.max === undefined ? undefined : out;
}

const SORT_KEYS: SortKey[] = ["featured", "newest", "price-asc", "price-desc", "rating", "popular"];

export function parseListingParams(sp: SearchParams): Omit<ListingFilters, "categoryIds" | "sellerId"> {
  const sort = firstParam(sp.sort) as SortKey | undefined;
  const page = Number(firstParam(sp.page) ?? 1);
  return {
    q: firstParam(sp.q)?.slice(0, 80) || undefined,
    metals: enumList(MetalType, sp.metal),
    gemstones: enumList(Gemstone, sp.gem),
    labs: enumList(CertificateLab, sp.cert),
    regions: enumList(ShippingRegion, sp.ship),
    conditions: enumList(ProductCondition, sp.condition),
    price: range(sp.price),
    carat: range(sp.carat),
    inStock: firstParam(sp.stock) === "1",
    offers: firstParam(sp.offers) === "1",
    sort: sort && SORT_KEYS.includes(sort) ? sort : "featured",
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}

/** Number of active filters (for the mobile "Filters (3)" button). */
export function activeFilterCount(f: ReturnType<typeof parseListingParams>) {
  return (
    (f.metals?.length ?? 0) +
    (f.gemstones?.length ?? 0) +
    (f.labs?.length ?? 0) +
    (f.regions?.length ?? 0) +
    (f.conditions?.length ?? 0) +
    (f.price ? 1 : 0) +
    (f.carat ? 1 : 0) +
    (f.inStock ? 1 : 0) +
    (f.offers ? 1 : 0)
  );
}
