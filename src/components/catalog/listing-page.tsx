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
import { type ActiveChip, ActiveFilters, MobileFilters, SortSelect } from "./filters";
import { Gem, Sparkles } from "lucide-react";
import { stylingLooks } from "@/config/styling";
import { convertMinor, formatMoney, toMajor } from "@/lib/money";
import { ShopDiscovery } from "./discovery";

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
  headingLevel = 1,
}: {
  searchParams: SearchParams;
  title: string;
  description?: string | null;
  category?: Category | null;
  subcategories?: { slug: string; name: string }[];
  categoryIds?: string[];
  basePath: string;
  breadcrumbs?: { href: string; label: string }[];
  headingLevel?: 1 | 2;
}) {
  const filters = parseListingParams(searchParams);
  const isShop = basePath === "/shop";
  const Heading = headingLevel === 2 ? "h2" : "h1";
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
  const budgetLimits = [500, 1500, 5000].map((usd) => {
    const converted = toMajor(convertMinor(usd * 100, "USD", ctx.currency, ctx.rates, "display"), ctx.currency);
    const step = converted >= 10000 ? 5000 : converted >= 1000 ? 500 : 100;
    return Math.max(step, Math.round(converted / step) * step);
  });
  const budgetHref = (max: number) => {
    const p = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) if (typeof value === "string" && key !== "page") p.set(key, value);
    p.set("price", `0-${max}`);
    return `${basePath}?${p}`;
  };

  return (
    <div className="shell pt-6 pb-24 sm:pt-8">
      {/* ── Breadcrumb ── */}
      <nav aria-label="Breadcrumb" className="mb-4 text-[12px] text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="transition-colors hover:text-ink">Home</Link>
          </li>
          {breadcrumbs.map((b) => (
            <li key={b.href} className="flex items-center gap-1.5">
              <span className="text-muted/60" aria-hidden>/</span>
              <Link href={b.href} className="transition-colors hover:text-ink">{b.label}</Link>
            </li>
          ))}
        </ol>
      </nav>

      {/* ── Header Area ── */}
      <header className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          {isShop && <p className="eyebrow mb-3 text-gold-deep">Independent jewelry, thoughtfully discovered</p>}
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <Heading className={isShop ? "display-lg max-w-[20ch]" : "display-lg max-w-[28ch]"}>
              {filters.q ? <>Results for &ldquo;{filters.q}&rdquo;</> : title}
            </Heading>
            <span className="text-[13px] text-muted">
              {pluralize(result.total, "Design")}
            </span>
          </div>
          {description && !filters.q && (
            <p className="intro-copy mt-3">
              {description}
            </p>
          )}
        </div>

        <Link
          href="/custom-orders"
          className="inline-flex items-center gap-2 text-[12.5px] font-medium text-[#8c6530] underline underline-offset-4 transition-colors hover:text-[#6e4d20]"
        >
          <Sparkles className="size-3.5" /> Looking for bespoke / custom design?
        </Link>
      </header>

      {isShop && <div className="mb-8 space-y-5 border-y border-line py-5">
        <nav aria-label="Jewelry categories" className="flex flex-wrap gap-2">
          {[['/shop', 'All jewelry'], ['/shop/rings', 'Rings'], ['/shop/necklaces', 'Necklaces'], ['/shop/earrings', 'Earrings'], ['/shop/bracelets', 'Bracelets'], ['/shop/vintage', 'Vintage']].map(([href, label]) => <Link key={href} href={href} aria-current={href === basePath ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-5 text-[13px] ${href === basePath ? "border-gold text-gold-deep" : "border-line text-ink-soft hover:border-gold"}`}>{label}</Link>)}
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
          <nav aria-label="Shop by occasion" className="flex flex-wrap items-center gap-x-5 gap-y-2"><span className="text-[11px] tracking-[0.1em] text-muted uppercase">For the moment</span>{stylingLooks.map((look) => <Link key={look.slug} href={`/styling/${look.slug}`} className="inline-flex min-h-9 items-center text-[13px] text-ink-soft underline decoration-line underline-offset-4 hover:decoration-gold">{look.occasion}</Link>)}<Link href="/custom-orders" className="inline-flex min-h-9 items-center text-[13px] text-ink-soft underline decoration-line underline-offset-4">A personal gift</Link></nav>
          <nav aria-label="Shop by budget" className="flex flex-wrap items-center gap-2"><span className="mr-2 text-[11px] tracking-[0.1em] text-muted uppercase">Your budget</span>{budgetLimits.map((max) => <Link key={max} href={budgetHref(max)} className={`inline-flex min-h-9 items-center rounded-full border px-3 text-[12px] ${filters.price?.max === max && filters.price.min === 0 ? "border-gold bg-gold-mist text-gold-deep" : "border-line text-ink-soft hover:border-gold"}`}>Under {formatMoney(max * 100, ctx.currency)}</Link>)}</nav>
        </div>
      </div>}

      {/* ── Quick Subcategory Chips ── */}
      {subcategories.length > 0 && (
        <div className="scrollbar-none -mx-4 mb-7 flex items-center gap-2 overflow-x-auto px-4 py-1">
          <Link
            href={basePath}
            className="shrink-0 rounded-full border border-[#8e6530] bg-[#8e6530] px-4 py-1.5 text-[12.5px] font-medium text-white transition-all shadow-xs"
          >
            All {category?.name ?? "Designs"}
          </Link>
          {subcategories.map((s) => (
            <Link
              key={s.slug}
              href={`/shop/${s.slug}`}
              className="shrink-0 rounded-full border border-[#decbb0] bg-white px-4 py-1.5 text-[12.5px] font-medium text-[#383025] transition-all hover:border-[#8e6530] hover:text-[#8e6530] shadow-xs"
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      {/* ── Layout Grid: Filters Sidebar + Product Grid ── */}
      <div>
        <div>
          {/* Top Bar: Mobile Filters + Sort Options */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <MobileFilters groups={groups} activeCount={activeFilterCount(filters)} />
              <p className="text-[13.5px] font-medium text-ink-soft">
                Showing {result.items.length} of {pluralize(result.total, "piece")}
              </p>
            </div>
            <SortSelect options={SORTS} />
          </div>

          {/* Active Filter Chips */}
          {chips.length > 0 && (
            <div className="mb-6">
              <ActiveFilters chips={chips} />
            </div>
          )}

          {/* Product Grid / Empty State */}
          {result.items.length ? (
            <>
              <ProductGrid
                products={result.items}
                savedIds={saved}
                columns="three"
              />
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
      {isShop && !filters.q && filters.page === 1 && activeFilterCount(filters) === 0 && <ShopDiscovery />}
    </div>
  );
}
