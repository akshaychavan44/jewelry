import { Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/account/page-header";
import { FollowStoreButton } from "@/components/catalog/save-buttons";
import { VerifiedJeweler } from "@/components/brand/trust";
import { EmptyState, Monogram, Stars } from "@/components/ui/display";
import { countryName } from "@/lib/regions";
import { pluralize } from "@/lib/utils";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";

export default async function FavoriteStoresPage() {
  const user = await requireUser("/account/favorite-stores");
  const favourites = await db.favoriteStore.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { seller: { select: { id: true, slug: true, storeName: true, tagline: true, city: true, country: true, logoUrl: true, bannerUrl: true, ratingAverage: true, ratingCount: true, activeListingCount: true } } },
  });
  return (
    <>
      <PageHeader title="Favourite jewelers" description="Jewelers you follow. New pieces from them appear in your notifications." />
      {favourites.length === 0 ? (
        <EmptyState icon={<Store />} title="You're not following anyone yet" action={<Link href="/jewelers" className="link-quiet text-[14px] text-ink">Discover jewelers</Link>} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {favourites.map(({ seller: s }) => (
            <div key={s.id} className="overflow-hidden rounded-[3px] border border-line bg-porcelain">
              <div className="relative h-28 bg-sand">{s.bannerUrl && <Image src={s.bannerUrl} alt="" fill sizes="400px" className="object-cover" />}</div>
              <div className="flex items-start gap-3 p-5">
                <Monogram name={s.storeName} src={s.logoUrl} size={48} className="-mt-10 border-2 border-porcelain bg-ivory" />
                <div className="min-w-0 flex-1">
                  <Link href={`/jewelers/${s.slug}`} className="font-display text-[20px] text-ink hover:underline">
                    {s.storeName}
                  </Link>
                  <p className="text-[13px] text-muted">
                    {s.city}, {countryName(s.country)} · {pluralize(s.activeListingCount, "piece")}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <VerifiedJeweler compact />
                    {s.ratingCount > 0 && (
                      <span className="flex items-center gap-1 text-[12.5px] text-ink-soft">
                        <Stars rating={s.ratingAverage} size={11} label={false} /> {s.ratingAverage.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
                <FollowStoreButton sellerId={s.id} following />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
