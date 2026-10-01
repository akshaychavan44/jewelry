import type { Metadata } from "next";
import { ListingPage } from "@/components/catalog/listing-page";
import type { SearchParams } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Shop fine jewelry",
  description: "Rings, necklaces, earrings, bracelets, high jewelry and vintage pieces from verified independent jewelers.",
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <ListingPage
      searchParams={await searchParams}
      title="All jewelry"
      description="Every piece from every verified jeweler on Loupe — filter by metal, stone, certification and where it ships."
      basePath="/shop"
      breadcrumbs={[{ href: "/shop", label: "Shop" }]}
    />
  );
}
