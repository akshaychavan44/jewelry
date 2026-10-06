import Image from "next/image";
import Link from "next/link";
import { Hallmark, LabMark } from "@/components/brand/hallmark";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ProductCard as ProductCardData } from "@/server/services/catalog";
import { WishlistButton } from "./save-buttons";

export function ProductCard({ product: p, saved = false, priority, className, sizes = "(min-width: 1280px) 16vw, (min-width: 768px) 25vw, 50vw" }: { product: ProductCardData; saved?: boolean; priority?: boolean; className?: string; sizes?: string }) {
  const flag = p.sold ? "Sold" : p.isOneOfAKind ? "One of a kind" : p.livePrice ? "Live gold price" : p.condition !== "NEW" ? (p.era ?? p.condition.replace("_", "-").toLowerCase()) : null;
  return (
    <article className={cn("group relative", className)}>
      <Link href={`/product/${p.slug}`} className="block outline-none focus-visible:ring-2 focus-visible:ring-sage/40">
        <div className="relative aspect-[4/5] overflow-hidden bg-sand">
          {p.image.url?.trim() ? (
            <Image src={p.image.url} alt={p.image.alt} fill priority={priority} sizes={sizes} className={cn("object-cover transition duration-700 ease-silk group-hover:scale-[1.03]", p.sold && "grayscale-[35%]")} />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center p-4 text-center text-[13px] text-muted">Photograph coming soon</span>
          )}
          {p.hoverImage?.url?.trim() && (
            <Image src={p.hoverImage.url} alt="" fill sizes={sizes} className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          )}
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
            <Hallmark metal={p.metal} tone="glass" />
            {p.labs[0] && <LabMark lab={p.labs[0]} tone="glass" />}
          </div>
          {flag && (
            <span className={cn("absolute bottom-2.5 left-2.5 rounded-full px-2.5 py-1 text-[10px] font-medium tracking-[0.12em] uppercase backdrop-blur-sm", p.sold ? "bg-ink/80 text-ivory" : "bg-ivory/85 text-ink-soft")}>
              {flag}
            </span>
          )}
        </div>
        <div className="mt-3.5 px-1 text-center">
          <p className="truncate text-[10.5px] font-medium tracking-[0.16em] text-muted uppercase">{p.seller.name}</p>
          <h3 className="mt-1 line-clamp-2 text-[14.5px] leading-snug text-ink">{p.title}</h3>
          <p className="tabular mt-1.5 text-[14px] text-ink-soft">
            {p.sold ? (
              <span className="text-muted">Sold</span>
            ) : (
              <>
                {p.livePrice && <span className="text-muted">from </span>}
                {formatMoney(p.price.amountMinor, p.price.currency)}
                {p.compareAt && p.compareAt.amountMinor > p.price.amountMinor && (
                  <s className="ml-2 text-muted">{formatMoney(p.compareAt.amountMinor, p.compareAt.currency)}</s>
                )}
              </>
            )}
          </p>
        </div>
      </Link>
      {!p.sold && <WishlistButton productId={p.id} saved={saved} className="absolute top-2.5 right-2.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100" />}
    </article>
  );
}

export function ProductGrid({ products, savedIds, className, columns = "default" }: { products: ProductCardData[]; savedIds?: Set<string>; className?: string; columns?: "default" | "six" | "three" }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6",
        columns === "six" && "md:grid-cols-3 xl:grid-cols-6",
        columns === "default" && "md:grid-cols-3 xl:grid-cols-4",
        columns === "three" && "md:grid-cols-3",
        className,
      )}
    >
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} saved={savedIds?.has(p.id)} priority={i < 4} />
      ))}
    </div>
  );
}
