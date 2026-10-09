"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Switch } from "@/components/ui/controls";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type FacetOption = { value: string; label: string; count?: number };
export type FilterGroups = {
  metals: FacetOption[];
  gemstones: FacetOption[];
  labs: FacetOption[];
  regions: FacetOption[];
  conditions: FacetOption[];
  currencySymbol: string;
};

function useFilterNav() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const update = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    next.delete("page");
    const qs = next.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const values = (key: string) => (params.get(key) ?? "").split(",").filter(Boolean);
  const toggle = (key: string, value: string) =>
    update((p) => {
      const set = new Set(values(key));
      if (set.has(value)) set.delete(value);
      else set.add(value);
      if (set.size) p.set(key, [...set].join(","));
      else p.delete(key);
    });
  const set = (key: string, value: string | null) => update((p) => (value ? p.set(key, value) : p.delete(key)));

  return { params, pending, values, toggle, set, update };
}

function Group({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <fieldset className={cn("border-b border-line py-6 first:pt-0", className)}>
      <legend className="caps mb-4 text-ink">{title}</legend>
      {children}
    </fieldset>
  );
}

function CheckList({ name, options, nav }: { name: string; options: FacetOption[]; nav: ReturnType<typeof useFilterNav> }) {
  const selected = new Set(nav.values(name));
  return (
    <ul className="space-y-2.5">
      {options.map((o) => {
        const id = `${name}-${o.value}`;
        return (
          <li key={o.value} className="flex items-center gap-3">
            <Checkbox id={id} checked={selected.has(o.value)} onCheckedChange={() => nav.toggle(name, o.value)} />
            <label htmlFor={id} className="flex flex-1 cursor-pointer items-center justify-between text-[14px] text-ink-soft hover:text-ink">
              {o.label}
              {o.count !== undefined && <span className="text-[12px] text-muted">{o.count}</span>}
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function RangeInputs({ name, unit, placeholder, nav, step = "any" }: { name: string; unit: string; placeholder: [string, string]; nav: ReturnType<typeof useFilterNav>; step?: string }) {
  const current = (nav.params.get(name) ?? "").split("-");
  const [min, setMin] = useState(current[0] ?? "");
  const [max, setMax] = useState(current[1] ?? "");
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        nav.set(name, min || max ? `${min}-${max}` : null);
      }}
    >
      <label className="relative flex-1">
        <span className="sr-only">Minimum</span>
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-muted">{unit}</span>
        <input inputMode="decimal" step={step} value={min} onChange={(e) => setMin(e.target.value.replace(/[^\d.]/g, ""))} placeholder={placeholder[0]} className="h-10 w-full rounded-[2px] border border-line bg-porcelain pr-2 pl-8 text-[14px] outline-none focus:border-sage" />
      </label>
      <span className="text-muted">–</span>
      <label className="relative flex-1">
        <span className="sr-only">Maximum</span>
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-muted">{unit}</span>
        <input inputMode="decimal" step={step} value={max} onChange={(e) => setMax(e.target.value.replace(/[^\d.]/g, ""))} placeholder={placeholder[1]} className="h-10 w-full rounded-[2px] border border-line bg-porcelain pr-2 pl-8 text-[14px] outline-none focus:border-sage" />
      </label>
      <Button type="submit" size="sm" variant="subtle" className="h-10 px-3">
        Go
      </Button>
    </form>
  );
}

function FilterPanel({ groups, nav }: { groups: FilterGroups; nav: ReturnType<typeof useFilterNav> }) {
  return (
    <div className={cn("transition-opacity", nav.pending && "opacity-60")}>
      <Group title="Price">
        <RangeInputs name="price" unit={groups.currencySymbol} placeholder={["Min", "Max"]} nav={nav} />
      </Group>
      <Group title="Metal">
        <CheckList name="metal" options={groups.metals} nav={nav} />
      </Group>
      {groups.gemstones.length > 0 && (
        <Group title="Gemstone">
          <CheckList name="gem" options={groups.gemstones} nav={nav} />
        </Group>
      )}
      <Group title="Carat weight">
        <RangeInputs name="carat" unit="ct" placeholder={["0.5", "3"]} nav={nav} />
      </Group>
      <Group title="Certification">
        <CheckList name="cert" options={groups.labs} nav={nav} />
      </Group>
      {groups.conditions.length > 1 && (
        <Group title="Condition">
          <CheckList name="condition" options={groups.conditions} nav={nav} />
        </Group>
      )}
      <Group title="Ships to">
        <CheckList name="ship" options={groups.regions} nav={nav} />
      </Group>
      <Group title="Availability" className="border-b-0">
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-3 text-[14px] text-ink-soft">
            In stock only
            <Switch checked={nav.params.get("stock") === "1"} onCheckedChange={(v) => nav.set("stock", v ? "1" : null)} />
          </label>
          <label className="flex items-center justify-between gap-3 text-[14px] text-ink-soft">
            Accepts offers
            <Switch checked={nav.params.get("offers") === "1"} onCheckedChange={(v) => nav.set("offers", v ? "1" : null)} />
          </label>
        </div>
      </Group>
    </div>
  );
}

export function FilterSidebar({ groups }: { groups: FilterGroups }) {
  const nav = useFilterNav();
  return <FilterPanel groups={groups} nav={nav} />;
}

export function MobileFilters({ groups, activeCount }: { groups: FilterGroups; activeCount: number }) {
  const nav = useFilterNav();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="subtle" size="sm" className="rounded-full px-4">
          <SlidersHorizontal /> Filters{activeCount > 0 && ` (${activeCount})`}
        </Button>
      </DialogTrigger>
      <SheetContent side="left" title="Filter">
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <FilterPanel groups={groups} nav={nav} />
        </div>
      </SheetContent>
    </Dialog>
  );
}

export function SortSelect({ options }: { options: Record<string, string> }) {
  const nav = useFilterNav();
  return (
    <label className="flex items-center gap-2">
      <span className="hidden text-[13px] text-muted sm:inline">Sort by</span>
      <NativeSelect value={nav.params.get("sort") ?? "featured"} onChange={(e) => nav.set("sort", e.target.value === "featured" ? null : e.target.value)} className="h-9 w-48 text-[13.5px]" aria-label="Sort by">
        {Object.entries(options).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}

export type ActiveChip = { key: string; value?: string; label: string };

export function ActiveFilters({ chips }: { chips: ActiveChip[] }) {
  const nav = useFilterNav();
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={`${c.key}:${c.value ?? ""}`}
          type="button"
          onClick={() => (c.value ? nav.toggle(c.key, c.value) : nav.set(c.key, null))}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-porcelain px-3 py-1 text-[13px] text-ink-soft hover:border-ink/40 hover:text-ink"
        >
          {c.label} <X className="size-3.5" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => nav.update((p) => ["metal", "gem", "cert", "ship", "condition", "price", "carat", "stock", "offers"].forEach((k) => p.delete(k)))}
        className="text-[13px] text-ink underline underline-offset-4"
      >
        Clear all
      </button>
    </div>
  );
}
