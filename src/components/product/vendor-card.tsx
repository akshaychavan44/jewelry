import { ArrowUpRight, MapPin } from "lucide-react";
import Link from "next/link";
import { FollowStoreButton } from "@/components/catalog/save-buttons";
import { TopRated, VerifiedJeweler } from "@/components/brand/trust";
import { Monogram, Stars } from "@/components/ui/display";
import { formatResponseTime } from "@/lib/format";
import { countryName } from "@/lib/regions";

type Seller = {
  id: string;
  slug: string;
  storeName: string;
  tagline: string | null;
  logoUrl: string | null;
  city: string | null;
  country: string;
  foundedYear: number | null;
  isTopRated: boolean;
  ratingAverage: number;
  ratingCount: number;
  salesCount: number;
  responseTimeMinutes: number | null;
  locations: { name: string; city: string }[];
};

export function VendorCard({ seller, following }: { seller: Seller; following: boolean }) {
  return (
    <section aria-label="About the jeweler" className="rounded-xl border border-line bg-porcelain p-4 sm:p-5">
      <p className="eyebrow mb-3">Your jeweler · listed by</p>
      <div className="flex items-start gap-4">
        <Monogram name={seller.storeName} src={seller.logoUrl} size={56} />
        <div className="min-w-0 flex-1">
          <Link href={`/jewelers/${seller.slug}`} className="font-display text-[22px] leading-tight text-ink hover:text-sage-deep">
            {seller.storeName}
          </Link>
          <p className="mt-0.5 text-[13px] text-muted">
            {[seller.city, countryName(seller.country)].filter(Boolean).join(", ")}
            {seller.foundedYear && ` · since ${seller.foundedYear}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            <VerifiedJeweler />
            {seller.isTopRated && <TopRated />}
          </div>
        </div>
      </div>
      {seller.ratingCount > 0 && <p className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-ink-soft"><Stars rating={seller.ratingAverage} size={12} /> {seller.ratingAverage.toFixed(1)} · {seller.ratingCount} reviews</p>}
      {seller.locations.length > 0 && (
        <p className="mt-4 flex items-start gap-2 text-[13px] text-ink-soft">
          <MapPin className="mt-0.5 size-3.5 shrink-0" /> Visit: {seller.locations.map((l) => `${l.name}, ${l.city}`).join(" · ")}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/jewelers/${seller.slug}`} className="mr-auto inline-flex min-h-9 items-center gap-2 text-[13px] font-medium text-ink hover:text-gold-deep">
          View jeweler profile <ArrowUpRight className="size-4" aria-hidden />
        </Link>
        <FollowStoreButton sellerId={seller.id} following={following} />
      </div>
      {seller.responseTimeMinutes !== null && <p className="mt-3 text-[12px] text-muted">Usually replies {formatResponseTime(seller.responseTimeMinutes)}</p>}
    </section>
  );
}
