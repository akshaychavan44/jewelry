import type { Metadata } from "next";
import { ListingPage } from "@/components/catalog/listing-page";
import { firstParam, type SearchParams } from "@/lib/utils";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { getPausedSellerIds } from "@/server/services/jeweler-directory";

export const metadata: Metadata = {
  title: "Shop fine jewelry",
  description: "Rings, necklaces, earrings, bracelets, high jewelry and vintage pieces from verified independent jewelers.",
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const slug = firstParam(sp.seller);
  const seller = slug ? await db.sellerProfile.findFirst({ where: { slug, verificationStatus: "APPROVED", id: { notIn: await getPausedSellerIds() } }, select: { id: true, storeName: true } }) : null;
  if (slug && !seller) notFound();
  return (
    <ListingPage
      searchParams={sp}
      sellerId={seller?.id}
      title={seller ? `Jewelry from ${seller.storeName}` : "Find a piece that feels like you."}
      description="Discover fine jewelry from independent ateliers. Meet the maker, explore the details, and make it yours directly with the jeweler."
      basePath="/shop"
      breadcrumbs={[{ href: "/shop", label: "Shop" }]}
    />
  );
}
