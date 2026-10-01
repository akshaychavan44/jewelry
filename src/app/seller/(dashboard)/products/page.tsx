import { Gem, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/account/page-header";
import { Hallmark } from "@/components/brand/hallmark";
import { ListingRowActions } from "@/components/seller/listing-row-actions";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, StatusBadge, Table, Td, Th } from "@/components/ui/display";
import { formatMoney } from "@/lib/money";
import { PRODUCT_STATUS } from "@/lib/status";
import { cn, firstParam, num, type SearchParams } from "@/lib/utils";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";

const TABS = [
  ["all", "All"],
  ["ACTIVE", "Active"],
  ["DRAFT", "Drafts"],
  ["SOLD", "Sold"],
  ["ARCHIVED", "Archived"],
] as const;

export default async function SellerProducts({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { seller } = await requireSeller();
  const sp = await searchParams;
  const tab = (firstParam(sp.status) ?? "all") as (typeof TABS)[number][0];
  const q = firstParam(sp.q);
  const products = await db.product.findMany({
    where: {
      sellerId: seller.id,
      deletedAt: null,
      ...(tab !== "all" ? { status: tab } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { variants: { some: { sku: { contains: q, mode: "insensitive" } } } }] } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { images: { take: 1, orderBy: { position: "asc" } }, variants: { select: { stockQuantity: true, allowBackorder: true } }, _count: { select: { certificates: true } } },
  });

  return (
    <>
      <PageHeader
        title="Listings"
        description="Every piece in your store, with stock across all its SKUs."
        action={
          <Link href="/seller/products/new" className={buttonVariants({ size: "sm" })}>
            <Plus /> New listing
          </Link>
        }
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map(([key, label]) => (
            <Link key={key} href={key === "all" ? "/seller/products" : `/seller/products?status=${key}`} className={cn("rounded-full border px-3.5 py-1 text-[13px]", tab === key ? "border-ink bg-ink text-ivory" : "border-line text-ink-soft hover:border-ink/40")}>
              {label}
            </Link>
          ))}
        </div>
        <form action="/seller/products" className="flex gap-2">
          {tab !== "all" && <input type="hidden" name="status" value={tab} />}
          <input name="q" defaultValue={q} placeholder="Search title or SKU" className="h-9 w-56 rounded-[2px] border border-line bg-porcelain px-3 text-[13.5px] outline-none focus:border-sage" />
        </form>
      </div>

      {products.length === 0 ? (
        <EmptyState icon={<Gem />} title="No listings here" action={<Link href="/seller/products/new" className={buttonVariants()}>Create a listing</Link>} />
      ) : (
        <div className="rounded-[3px] border border-line bg-porcelain">
          <Table>
            <thead>
              <tr>
                <Th>Piece</Th>
                <Th>Price</Th>
                <Th>Stock</Th>
                <Th>Views</Th>
                <Th>Sold</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const stock = p.variants.reduce((n, v) => n + v.stockQuantity, 0);
                const backorder = p.variants.some((v) => v.allowBackorder);
                return (
                  <tr key={p.id} className="hover:bg-parchment/30">
                    <Td>
                      <Link href={`/seller/products/${p.id}`} className="flex items-center gap-3">
                        <span className="relative size-12 shrink-0 overflow-hidden bg-sand">{p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="48px" className="object-cover" />}</span>
                        <span className="min-w-0">
                          <span className="block max-w-xs truncate text-ink hover:underline">{p.title}</span>
                          <span className="mt-0.5 flex items-center gap-2 text-[12px] text-muted">
                            <Hallmark metal={p.primaryMetal} className="scale-90" /> {p.variants.length} SKU{p.variants.length === 1 ? "" : "s"}
                            {p._count.certificates > 0 && ` · ${p._count.certificates} report${p._count.certificates === 1 ? "" : "s"}`}
                            {p.pricingMode === "METAL_SPOT" && " · live price"}
                          </span>
                        </span>
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap">{formatMoney(num(p.basePriceMinor), p.currency)}</Td>
                    <Td className={stock === 0 && !backorder ? "text-rosewood" : ""}>{backorder && stock === 0 ? "Made to order" : stock}</Td>
                    <Td>{p.viewCount.toLocaleString("en-US")}</Td>
                    <Td>{p.salesCount}</Td>
                    <Td>
                      <StatusBadge status={p.status} map={PRODUCT_STATUS} />
                    </Td>
                    <Td className="text-right">
                      <ListingRowActions productId={p.id} status={p.status} slug={p.slug} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </>
  );
}
