import { ArrowRight, ArrowUpRight, BadgeCheck, Gem, MessageSquare, Search, ShieldCheck, Star, Tag } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DirectorySelect } from "@/components/catalog/directory-select";
import { FollowStoreButton } from "@/components/catalog/save-buttons";
import styles from "@/components/catalog/jewelers-directory.module.css";
import { EmptyState, Monogram } from "@/components/ui/display";
import { countryName } from "@/lib/regions";
import { firstParam, pluralize, type SearchParams } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { DIRECTORY_SORTS, type DirectorySort, listJewelers } from "@/server/services/sellers";

export const metadata: Metadata = {
  title: "Independent Jewelers Directory | Loupe",
  description: "Browse verified independent ateliers, goldsmiths, and heritage jewelry houses — connect directly with the makers.",
};

const categories = [
  { slug: "", name: "All Jewelers" },
  { slug: "rings", name: "Rings" },
  { slug: "necklaces", name: "Necklaces" },
  { slug: "earrings", name: "Earrings" },
  { slug: "bracelets", name: "Bracelets" },
  { slug: "high-jewelry", name: "High Jewelry" },
  { slug: "custom-orders", name: "Custom Orders" },
];

export default async function JewelersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = firstParam(sp.q)?.trim() || undefined;
  const country = firstParam(sp.country) || undefined;
  const categoryParam = firstParam(sp.category);
  const category = categories.some((item) => item.slug === categoryParam) ? categoryParam : undefined;
  const sortParam = firstParam(sp.sort) as DirectorySort | undefined;
  const sort = sortParam && sortParam in DIRECTORY_SORTS ? sortParam : "rating";
  const [{ sellers, countries }, user] = await Promise.all([listJewelers({ q, country, sort, category }), getCurrentUser()]);
  const favorites = user ? await db.favoriteStore.findMany({ where: { userId: user.id }, select: { sellerId: true } }) : [];
  const savedSellerIds = new Set(favorites.map((favorite) => favorite.sellerId));
  const categoryHref = (slug: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (country) params.set("country", country);
    if (sort !== "rating") params.set("sort", sort);
    if (slug) params.set("category", slug);
    return "/jewelers" + (params.size ? "?" + params.toString() : "");
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroImage} aria-hidden="true">
          <Image src="/media/story-solitaire.webp" alt="" fill priority sizes="(min-width: 768px) 70vw, 100vw" className={styles.heroPhoto} />
        </div>
        <div className={styles.heroWash} />
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Verified Directory</p>
          <h1>Independent Jewelers &amp; Ateliers</h1>
          <p className={styles.intro}>Discover master jewelers, bespoke goldsmiths, and heritage houses.<br className={styles.desktopBreak} /> Browse their showcases and connect directly.</p>
          <form id="jewelers-search" action="/jewelers" className={styles.search} role="search">
            <Search size={20} strokeWidth={1.5} aria-hidden />
            <label className="sr-only" htmlFor="jeweler-query">Search jewelers</label>
            <input id="jeweler-query" name="q" defaultValue={q} placeholder="Search jewelers, locations or styles…" />
            {category && <input type="hidden" name="category" value={category} />}
            <button type="submit" aria-label="Search jewelers"><Search size={20} strokeWidth={1.5} /></button>
          </form>
          <ul className={styles.assurances} aria-label="Our directory assurances">
            <li><ShieldCheck size={28} strokeWidth={1.3} /><span>Verified<br />jewelers</span></li>
            <li><Gem size={28} strokeWidth={1.3} /><span>Independent<br />showcases</span></li>
            <li><MessageSquare size={28} strokeWidth={1.3} /><span>Direct<br />contact</span></li>
          </ul>
        </div>
        <p className={styles.signature}>Real artisans.<br />Remarkable stories.</p>
      </header>

      <section className={styles.directory} aria-label="Find your jeweler">
        <div className={styles.toolbar}>
          <nav className={styles.categories} aria-label="Jeweler categories">
            {categories.map((item) => <Link key={item.slug} href={categoryHref(item.slug)} aria-current={(category ?? "") === item.slug ? "page" : undefined}>{item.name}</Link>)}
          </nav>
          <div className={styles.filters}>
            <DirectorySelect name="country" value={country ?? ""}>
              <option value="">All locations</option>
              {countries.map((item) => <option key={item.code} value={item.code}>{countryName(item.code)} ({item.count})</option>)}
            </DirectorySelect>
            <DirectorySelect name="sort" value={sort}>
              {Object.entries(DIRECTORY_SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </DirectorySelect>
          </div>
        </div>
        <div className={styles.results}>
          <p>{pluralize(sellers.length, "verified jeweler")}{q && <> for &ldquo;{q}&rdquo;</>}</p>
          {(q || country || category) && <Link href="/jewelers">Clear filters <span aria-hidden="true">×</span></Link>}
        </div>
        {sellers.length === 0 ? <EmptyState title="No jewelers match that search">Try another location or <Link href="/jewelers" className="underline underline-offset-4">browse all jewelers</Link>.</EmptyState> : (
          <div className={styles.grid}>
            {sellers.map((seller) => {
              const href = "/jewelers/" + seller.slug;
              const products = seller.products.filter((product) => product.images[0]?.url?.trim());
              return (
                <article key={seller.id} className={styles.card}>
                  <div className={styles.cover}>
                    <Link href={href} aria-label={"Visit " + seller.storeName} className={styles.coverLink}>
                      {seller.bannerUrl ? <Image src={seller.bannerUrl} alt={seller.storeName + " atelier and collection"} fill sizes="(min-width: 1100px) 25vw, (min-width: 640px) 50vw, 100vw" className={styles.coverImage} /> : <span className={styles.coverFallback}><Gem size={44} strokeWidth={.8} /></span>}
                    </Link>
                    <FollowStoreButton sellerId={seller.id} following={savedSellerIds.has(seller.id)} variant="icon" storeName={seller.storeName} className={styles.favorite} />
                  </div>
                  <div className={styles.cardBody}>
                    <Monogram name={seller.storeName} src={seller.logoUrl} size={52} className={styles.monogram} />
                    <h2><Link href={href}>{seller.storeName}</Link><BadgeCheck size={18} className={styles.verified} aria-label="Verified jeweler" /></h2>
                    <p className={styles.location}>{seller.city}, {countryName(seller.country)}{seller.foundedYear && <> <span>·</span> Est. {seller.foundedYear}</>}</p>
                    <div className={styles.details}>
                      <span className={styles.rating}><Star size={14} fill="currentColor" strokeWidth={1.5} />{seller.ratingCount ? <><strong>{seller.ratingAverage.toFixed(1)}</strong> <span>({seller.ratingCount})</span></> : <span>New atelier</span>}</span>
                      {seller.specialties[0] && <span className={styles.specialty} title={seller.specialties.join(" · ")}><Tag size={13} />{seller.specialties[0]}</span>}
                    </div>
                    {products.length > 0 ? <div className={styles.products}>
                      {products.slice(0, 3).map((product) => <Link key={product.slug} href={"/product/" + product.slug} className={styles.product} aria-label={product.title}><Image src={product.images[0].url} alt={product.title} fill sizes="90px" className="object-cover" /></Link>)}
                      {products.length > 3 && <Link href={href} className={styles.more} aria-label={"View all pieces from " + seller.storeName}>{seller.activeListingCount > 3 ? "+" + (seller.activeListingCount - 3) : <ArrowUpRight size={19} />}</Link>}
                    </div> : <p className={styles.tagline}>{seller.tagline ?? "Discover the story behind the atelier."}</p>}
                    <Link href={href} className={styles.collectionLink}>View atelier &amp; collection <ArrowRight size={15} /></Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
