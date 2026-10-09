import { MapPin, MessageCircle } from "lucide-react";
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
    <section aria-label="About the jeweler" className="rounded-[3px] border border-line bg-porcelain p-5">
      <p className="eyebrow mb-4">Crafted &amp; Listed by</p>
      <div className="flex items-start gap-4">
        <Monogram name={seller.storeName} src={seller.logoUrl} size={56} />
        <div className="min-w-0 flex-1">
          <Link href={`/jewelers/${seller.slug}`} className="font-display text-[22px] leading-tight text-ink hover:text-sage-deep">
            {seller.storeName}
          </Link>
          <p className="mt-0.5 text-[13px] text-muted">
            {seller.city}, {countryName(seller.country)}
            {seller.foundedYear && ` · since ${seller.foundedYear}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            <VerifiedJeweler />
            {seller.isTopRated && <TopRated />}
          </div>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-line py-4 text-center">
        <div>
          <dt className="text-[11px] tracking-[0.08em] text-muted uppercase">Rating</dt>
          <dd className="mt-1 flex items-center justify-center gap-1 text-[14px] text-ink">
            {seller.ratingCount > 0 ? (
              <>
                <Stars rating={seller.ratingAverage} size={11} label={false} /> {seller.ratingAverage.toFixed(1)}
              </>
            ) : (
              "New"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] tracking-[0.08em] text-muted uppercase">Pieces</dt>
          <dd className="mt-1 text-[14px] text-ink">{seller.salesCount || "Showcase"}</dd>
        </div>
        <div>
          <dt className="text-[11px] tracking-[0.08em] text-muted uppercase">Replies</dt>
          <dd className="mt-1 text-[14px] text-ink">{formatResponseTime(seller.responseTimeMinutes).replace("within ", "< ")}</dd>
        </div>
      </dl>
      {seller.locations.length > 0 && (
        <p className="mt-4 flex items-start gap-2 text-[13px] text-ink-soft">
          <MapPin className="mt-0.5 size-3.5 shrink-0" /> Visit: {seller.locations.map((l) => `${l.name}, ${l.city}`).join(" · ")}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/jewelers/${seller.slug}`} className="inline-flex h-9 items-center gap-2 rounded-[2px] border border-ink/70 px-4 caps text-[10.5px] text-ink hover:bg-ink hover:text-ivory">
          Visit the atelier
        </Link>
        <FollowStoreButton sellerId={seller.id} following={following} />
      </div>
      <p className="mt-4 flex items-center gap-2 text-[12.5px] text-muted">
        <MessageCircle className="size-3.5" /> Usually replies {formatResponseTime(seller.responseTimeMinutes)}
      </p>
    </section>
  );
}
