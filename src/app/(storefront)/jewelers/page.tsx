import { Search } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { TopRated, VerifiedJeweler } from "@/components/brand/trust";
import { EmptyState, Monogram, Stars } from "@/components/ui/display";
import { NativeSelect } from "@/components/ui/input";
import { formatResponseTime } from "@/lib/format";
import { countryName } from "@/lib/regions";
import { firstParam, pluralize, type SearchParams } from "@/lib/utils";
import { DIRECTORY_SORTS, type DirectorySort, listJewelers } from "@/server/services/sellers";

export const metadata: Metadata = {
  title: "Our jewelers",
  description: "Independent ateliers, heritage houses and antique dealers — every one verified by Loupe.",
};

export default async function JewelersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = firstParam(sp.q)?.trim() || undefined;
  const country = firstParam(sp.country) || undefined;
  const sortParam = firstParam(sp.sort) as DirectorySort | undefined;
  const sort = sortParam && sortParam in DIRECTORY_SORTS ? sortParam : "rating";
  const { sellers, countries } = await listJewelers({ q, country, sort });

  return (
    <div className="shell pt-10 pb-24">
      <header className="mx-auto max-w-2xl text-center">
        <p className="eyebrow mb-4">The jewelers</p>
        <h1 className="display-xl text-ink">Every seller, known by name</h1>
        <p className="mt-5 text-[16px] leading-relaxed text-ink-soft">
          Family workshops, Fifth Avenue salons and Hatton Garden dealers. Each has passed business, identity and payout verification before listing a single piece.
        </p>
      </header>

      <form className="mx-auto mt-10 flex max-w-3xl flex-col gap-3 border-y border-line py-4 sm:flex-row sm:items-center" action="/jewelers">
        <label className="relative flex-1">
          <span className="sr-only">Search jewelers</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Search by name, city or speciality" className="h-11 w-full rounded-[2px] border border-line bg-porcelain pr-3 pl-10 text-[14.5px] outline-none focus:border-sage" />
        </label>
        <NativeSelect name="country" defaultValue={country ?? ""} className="sm:w-48" aria-label="Country">
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {countryName(c.code)} ({c.count})
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="sort" defaultValue={sort} className="sm:w-44" aria-label="Sort">
          {Object.entries(DIRECTORY_SORTS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <button type="submit" className="h-11 rounded-[2px] bg-sage px-6 caps text-white hover:bg-sage-deep">
          Search
        </button>
      </form>

      <p className="mt-8 mb-6 text-[13.5px] text-muted">{pluralize(sellers.length, "verified jeweler")}</p>

      {sellers.length === 0 ? (
        <EmptyState title="No jewelers match that search">Try another city or clear the country filter.</EmptyState>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          {sellers.map((s) => (
            <Link key={s.id} href={`/jewelers/${s.slug}`} className="group grid overflow-hidden border border-line bg-porcelain transition-shadow hover:shadow-soft sm:grid-cols-[1fr_1.1fr]">
              <div className="relative aspect-[4/3] bg-sand sm:aspect-auto">
                {s.bannerUrl && <Image src={s.bannerUrl} alt="" fill sizes="(min-width: 768px) 25vw, 100vw" className="object-cover transition-transform duration-700 ease-silk group-hover:scale-[1.03]" />}
              </div>
              <div className="flex flex-col p-6">
                <div className="flex items-center gap-3">
                  <Monogram name={s.storeName} src={s.logoUrl} size={44} />
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-[22px] leading-tight text-ink">{s.storeName}</h2>
                    <p className="text-[13px] text-muted">
                      {s.city}, {countryName(s.country)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-[14px] text-ink-soft">{s.tagline}</p>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                  <VerifiedJeweler />
                  {s.isTopRated && <TopRated />}
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-[12.5px]">
                  <div>
                    <dt className="text-muted">Rating</dt>
                    <dd className="flex items-center gap-1 text-ink">{s.ratingCount ? <><Stars rating={s.ratingAverage} size={10} label={false} /> {s.ratingAverage.toFixed(1)}</> : "New"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Replies</dt>
                    <dd className="text-ink">{formatResponseTime(s.responseTimeMinutes).replace("within ", "< ")}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Boutique</dt>
                    <dd className="text-ink">{s.locations.length ? s.locations.map((l) => l.city).join(", ") : "Online"}</dd>
                  </div>
                </dl>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                  {s.specialties.slice(0, 3).map((sp) => (
                    <span key={sp} className="rounded-full bg-parchment px-2.5 py-0.5 text-[11.5px] text-ink-soft">
                      {sp}
                    </span>
                  ))}
                </div>
                <p className="caps mt-4 text-[10.5px] text-ink-soft group-hover:text-ink">{pluralize(s.activeListingCount, "piece")} · Visit →</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
