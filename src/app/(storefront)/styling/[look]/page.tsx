import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { stylingLooks } from "@/config/styling";
import { ListingPage } from "@/components/catalog/listing-page";
import { getCategoryBySlug } from "@/server/services/catalog";
import type { SearchParams } from "@/lib/utils";

type Props = { params: Promise<{ look: string }>; searchParams: Promise<SearchParams> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).look;
  const current = stylingLooks.find((item) => item.slug === slug);
  return { title: current?.title ?? "Styling inspiration", description: current?.description };
}

export default async function StylingEdit({ params, searchParams }: Props) {
  const slug = (await params).look;
  const edit = stylingLooks.find((item) => item.slug === slug);
  if (!edit) notFound();
  const category = await getCategoryBySlug(edit.category);
  if (!category) notFound();
  return <>
    <section className="shell pt-8 sm:pt-12" aria-labelledby="edit-title"><div className="grid overflow-hidden rounded-lg bg-parchment md:grid-cols-2"><div className="relative aspect-[4/3] bg-sand md:aspect-auto md:min-h-96"><Image src={edit.image} alt={`${edit.occasion} jewelry inspiration`} fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" /></div><div className="flex flex-col justify-center p-6 sm:p-10 lg:p-14"><Link href="/styling" className="eyebrow mb-5 text-gold-deep">The Loupe edit · {edit.occasion}</Link><h1 id="edit-title" className="display-lg text-ink">{edit.title}</h1><p className="mt-4 text-[16px] leading-relaxed text-ink-soft">{edit.description}</p><p className="mt-6 border-t border-line pt-6 text-[14px] leading-relaxed text-ink-soft">{edit.tip}</p><a href="#edit-pieces" className="mt-6 inline-flex min-h-11 w-fit items-center rounded-full border border-gold px-6 text-[13px] font-medium text-gold-deep">Explore the pieces ↓</a></div></div></section>
    <div id="edit-pieces" className="scroll-mt-24"><ListingPage headingLevel={2} searchParams={await searchParams} title="Discover the pieces" description="Explore current listings. Confirm sizing, availability and purchase arrangements directly with the jeweler." categoryIds={[category.id, ...category.children.map((child) => child.id)]} basePath={`/styling/${edit.slug}`} breadcrumbs={[{ href: "/styling", label: "Styling" }, { href: `/styling/${edit.slug}`, label: edit.occasion }]} /></div>
  </>;
}
