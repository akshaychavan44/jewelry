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
      title="Find a piece that feels like you."
      description="Discover fine jewelry from independent ateliers. Meet the maker, explore the details, and make it yours directly with the jeweler."
      basePath="/shop"
      breadcrumbs={[{ href: "/shop", label: "Shop" }]}
    />
  );
}
