import Link from "next/link";
import { ProductGrid } from "@/components/catalog/product-card";
import { EmptyState, Pagination } from "@/components/ui/display";
import type { Category } from "@/generated/prisma/client";
import { CERTIFICATION_FILTERS, GEMSTONES, LABS, METAL_OPTIONS, METALS } from "@/lib/jewelry";
import { activeFilterCount, parseListingParams, toSlug } from "@/lib/listing-params";
import { REGION_LABELS } from "@/lib/regions";
import { humanize, pluralize, type SearchParams } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/session";
import { getListingFacets, getWishlistProductIds, listProducts, SORTS } from "@/server/services/catalog";
import { getPriceContext } from "@/server/services/currency";
import { type ActiveChip, ActiveFilters, FilterSidebar, MobileFilters, SortSelect } from "./filters";
import { Gem } from "lucide-react";

const symbolFor = (currency: string) =>
  new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((p) => p.type === "currency")?.value ?? currency;

export async function ListingPage({
  searchParams,
  title,
  description,
  category,
  subcategories = [],
  categoryIds,
  basePath,
  breadcrumbs = [],
}: {
  searchParams: SearchParams;
  title: string;
  description?: string | null;
  category?: Category | null;
  subcategories?: { slug: string; name: string }[];
  categoryIds?: string[];
  basePath: string;
  breadcrumbs?: { href: string; label: string }[];
}) {
  const filters = parseListingParams(searchParams);
  const [ctx, user] = await Promise.all([getPriceContext(), getCurrentUser()]);
  const [result, facets, saved] = await Promise.all([
    listProducts({ ...filters, categoryIds }, ctx),
    getListingFacets(categoryIds),
    getWishlistProductIds(user?.id),
  ]);

  const count = (list: { value: string; count: number }[], v: string) => list.find((x) => x.value === v)?.count;
  const groups = {
    currencySymbol: symbolFor(ctx.currency),
    metals: METAL_OPTIONS.filter((m) => facets.metals.some((f) => f.value === m)).map((m) => ({ value: toSlug(m), label: METALS[m].label, count: count(facets.metals, m) })),
    gemstones: facets.gemstones.sort((a, b) => b.count - a.count).map((g) => ({ value: toSlug(g.value), label: GEMSTONES[g.value], count: g.count })),
    labs: CERTIFICATION_FILTERS.map((l) => ({ value: toSlug(l), label: LABS[l].name })),
    regions: Object.entries(REGION_LABELS).map(([value, label]) => ({ value: toSlug(value), label })),
    conditions: facets.conditions.map((c) => ({ value: toSlug(c.value), label: humanize(c.value), count: c.count })),
  };

  const chips: ActiveChip[] = [
    ...(filters.metals ?? []).map((m) => ({ key: "metal", value: toSlug(m), label: METALS[m].label })),
    ...(filters.gemstones ?? []).map((g) => ({ key: "gem", value: toSlug(g), label: GEMSTONES[g] })),
    ...(filters.labs ?? []).map((l) => ({ key: "cert", value: toSlug(l), label: LABS[l].name })),
    ...(filters.regions ?? []).map((r) => ({ key: "ship", value: toSlug(r), label: `Ships to ${REGION_LABELS[r]}` })),
    ...(filters.conditions ?? []).map((c) => ({ key: "condition", value: toSlug(c), label: humanize(c) })),
    ...(filters.price ? [{ key: "price", label: `${groups.currencySymbol}${filters.price.min ?? 0} – ${filters.price.max ? `${groups.currencySymbol}${filters.price.max}` : "any"}` }] : []),
    ...(filters.carat ? [{ key: "carat", label: `${filters.carat.min ?? 0} – ${filters.carat.max ?? "any"} ct` }] : []),
    ...(filters.inStock ? [{ key: "stock", label: "In stock" }] : []),
    ...(filters.offers ? [{ key: "offers", label: "Accepts offers" }] : []),
  ];

  const hrefFor = (page: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (typeof v === "string" && k !== "page") p.set(k, v);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="shell pt-8 pb-24">
      <nav aria-label="Breadcrumb" className="mb-6 text-[12.5px] text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-ink">Home</Link>
          </li>
          {breadcrumbs.map((b) => (
            <li key={b.href} className="flex items-center gap-1.5">
              <span aria-hidden>/</span>
              <Link href={b.href} className="hover:text-ink">{b.label}</Link>
            </li>
          ))}
        </ol>
      </nav>

      <header className="mb-8 max-w-3xl">
        <h1 className="display-lg text-ink">{filters.q ? <>Results for &ldquo;{filters.q}&rdquo;</> : title}</h1>
        {description && !filters.q && <p className="mt-3 max-w-[49ch] text-lg leading-relaxed text-ink-soft">{description}</p>}
      </header>

      {subcategories.length > 0 && (
        <div className="scrollbar-none -mx-4 mb-8 flex gap-2 overflow-x-auto px-4">
          <Link href={basePath} className="shrink-0 rounded-full border border-ink bg-ink px-4 py-1.5 text-[13px] text-ivory">
            All {category?.name.toLowerCase() ?? ""}
          </Link>
          {subcategories.map((s) => (
            <Link key={s.slug} href={`/shop/${s.slug}`} className="shrink-0 rounded-full border border-line bg-porcelain px-4 py-1.5 text-[13px] text-ink-soft hover:border-ink/40 hover:text-ink">
              {s.name}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[250px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <FilterSidebar groups={groups} />
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <MobileFilters groups={groups} activeCount={activeFilterCount(filters)} />
              <p className="text-[13.5px] text-muted">{pluralize(result.total, "piece")}</p>
            </div>
            <SortSelect options={SORTS} />
          </div>
          {chips.length > 0 && (
            <div className="mb-6">
              <ActiveFilters chips={chips} />
            </div>
          )}

          {result.items.length ? (
            <>
              <ProductGrid products={result.items} savedIds={saved} columns="three" className="xl:grid-cols-3" />
              <div className="mt-14">
                <Pagination page={result.page} pageCount={result.pageCount} hrefFor={hrefFor} />
              </div>
            </>
          ) : (
            <EmptyState icon={<Gem />} title="Nothing matches those filters">
              Try removing a filter or widening the price range. New pieces are listed every week.
            </EmptyState>
          )}
        </div>
      </div>
    </div>
  );
}
