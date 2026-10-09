import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { METALS } from "@/lib/jewelry";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ProductCard as ProductCardData } from "@/server/services/catalog";
import { WishlistButton } from "./save-buttons";

export function ProductCard({
  product: p,
  saved = false,
  priority,
  className,
  sizes = "(min-width: 1024px) 33vw, 50vw",
}: {
  product: ProductCardData;
  saved?: boolean;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  const flag = p.sold
    ? "Sold"
    : p.isOneOfAKind
      ? "One of a kind"
      : p.livePrice
        ? "Live Gold Price"
        : p.condition !== "NEW"
          ? (p.era ?? p.condition.replace("_", "-").toLowerCase())
          : null;

  const discountPercent =
    p.compareAt && p.compareAt.amountMinor > p.price.amountMinor
      ? Math.round(((p.compareAt.amountMinor - p.price.amountMinor) / p.compareAt.amountMinor) * 100)
      : null;

  return (
    <article className={cn("relative flex h-full flex-col overflow-hidden rounded-lg bg-porcelain", className)}>
      <Link href={`/product/${p.slug}`} className="flex h-full flex-col outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/50">
        {/* ── Product Media Frame ── */}
        <div className="relative aspect-[3/2] overflow-hidden bg-sand">
          {p.image.url?.trim() ? (
            <Image
              src={p.image.url}
              alt={p.image.alt}
              fill
              priority={priority}
              sizes={sizes}
              className={cn(
                "object-contain",
                p.sold && "grayscale-[35%]",
              )}
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center p-4 text-center text-[13px] text-muted">
              Photograph coming soon
            </span>
          )}

          {/* Bottom-Left Status Pill */}
          {flag && (
            <span
              className={cn(
                "absolute bottom-2.5 left-2.5 rounded-[2px] px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] uppercase backdrop-blur-md shadow-xs",
                p.sold
                  ? "bg-ink/80 text-white"
                  : "bg-white/90 text-[#865d2a] border border-[#e8dfcf]",
              )}
            >
              {flag}
            </span>
          )}
        </div>

        {/* ── Product Information ── */}
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          {/* Product Title */}
          <h3 className="line-clamp-2 min-h-[2.6em] font-display text-[18px] leading-snug text-ink sm:text-[21px]">
            {p.title}
          </h3>

          {/* Price & Discount Bar */}
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            {p.sold ? (
              <span className="text-[14px] font-medium text-muted">Sold Out</span>
            ) : (
              <>
                <p className="text-[18px] font-semibold tracking-tight text-ink tabular-nums sm:text-[20px]">
                  {p.livePrice && <span className="text-[12px] font-normal text-muted">from </span>}
                  {formatMoney(p.price.amountMinor, p.price.currency)}
                </p>

                {p.compareAt && p.compareAt.amountMinor > p.price.amountMinor && (
                  <s className="text-[13px] text-muted/80 tabular-nums">
                    {formatMoney(p.compareAt.amountMinor, p.compareAt.currency)}
                  </s>
                )}

                {discountPercent && (
                  <span className="rounded-[2px] bg-[#f5ebe0] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#96632c]">
                    {discountPercent}% OFF
                  </span>
                )}
              </>
            )}
          </div>
          <p className="mt-1.5 truncate text-[12px] text-muted sm:text-[14px]">{METALS[p.metal].label} · {p.seller.name}</p>
          <span className="mt-4 flex min-h-11 items-center justify-center gap-3 rounded-lg border border-gold/65 px-3 py-2 text-[11px] font-medium tracking-[0.07em] text-gold-deep sm:text-[12px]">
            VIEW DETAILS <ArrowRight className="size-4" aria-hidden />
          </span>
        </div>
      </Link>

      {/* Top-Right Wishlist Action */}
      {!p.sold && (
        <WishlistButton
          productId={p.id}
          saved={saved}
          className="absolute top-3 right-3 z-10 flex size-10 items-center justify-center rounded-full bg-porcelain/95 p-2"
        />
      )}
    </article>
  );
}

export function ProductGrid({
  products,
  savedIds,
  className,
  columns = "default",
}: {
  products: ProductCardData[];
  savedIds?: Set<string>;
  className?: string;
  columns?: "default" | "six" | "three";
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 sm:gap-6",
        columns === "six" && "sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
        columns === "default" && "sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
        columns === "three" && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} saved={savedIds?.has(p.id)} priority={i < 4} />
      ))}
    </div>
  );
}
