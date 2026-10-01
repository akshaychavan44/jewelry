import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingPage } from "@/components/catalog/listing-page";
import type { SearchParams } from "@/lib/utils";
import { getCategoryBySlug } from "@/server/services/catalog";

type Props = { params: Promise<{ category: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategoryBySlug((await params).category);
  if (!category) return {};
  return { title: category.name, description: category.description ?? undefined };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const category = await getCategoryBySlug((await params).category);
  if (!category || !category.isActive) notFound();

  const categoryIds = [category.id, ...category.children.map((c) => c.id)];
  const breadcrumbs = [
    { href: "/shop", label: "Shop" },
    ...(category.parent ? [{ href: `/shop/${category.parent.slug}`, label: category.parent.name }] : []),
    { href: `/shop/${category.slug}`, label: category.name },
  ];

  return (
    <ListingPage
      searchParams={await searchParams}
      title={category.name}
      description={category.description ?? category.parent?.description}
      category={category}
      subcategories={category.children}
      categoryIds={categoryIds}
      basePath={`/shop/${category.slug}`}
      breadcrumbs={breadcrumbs}
    />
  );
}
