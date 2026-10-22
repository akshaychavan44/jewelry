import Image from "next/image";
import Link from "next/link";
import { METALS } from "@/lib/jewelry";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ProductCard as ProductCardData } from "@/server/services/catalog";
import { WishlistButton } from "./save-buttons";
import styles from "./shop-editorial.module.css";

export function ProductCard({
  product: p,
  saved = false,
  priority,
  className,
  sizes = "(min-width: 1024px) 33vw, 50vw",
  showPrice = true,
  presentation = "portrait",
}: {
  product: ProductCardData;
  saved?: boolean;
  priority?: boolean;
  className?: string;
  sizes?: string;
  showPrice?: boolean;
  presentation?: "portrait" | "catalog";
}) {
  const flag = p.sold
    ? "Sold"
    : p.isOneOfAKind
      ? "One of a kind"
      : p.livePrice && showPrice
        ? "Live Gold Price"
        : p.condition !== "NEW"
          ? (p.era ?? p.condition.replace("_", "-").toLowerCase())
          : null;

  const discountPercent =
    p.compareAt && p.compareAt.amountMinor > p.price.amountMinor
      ? Math.round(((p.compareAt.amountMinor - p.price.amountMinor) / p.compareAt.amountMinor) * 100)
      : null;

  return (
    <article className={cn("relative min-w-0", className)}>
      <Link href={`/product/${p.slug}`} className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4 focus-visible:ring-offset-ivory">
        {/* ── Product Media Frame ── */}
        <div className={cn("relative overflow-hidden rounded-xl bg-sand", presentation === "catalog" ? "aspect-square" : "aspect-[3/4]")}>
          {p.image.url?.trim() ? (
            <Image
              src={p.image.url}
              alt={p.image.alt}
              fill
              loading={priority ? "eager" : "lazy"}
              sizes={sizes}
              className={cn(
                presentation === "catalog"
                  ? styles.catalogImage
                  : "object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-[1.03]",
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
                "absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-full px-2.5 py-1 text-[9px] font-medium tracking-[0.08em] uppercase backdrop-blur-md sm:text-[10px]",
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
        <div className="pt-3 sm:pt-3.5">
          {/* Product Title */}
          <h3 className={cn("line-clamp-2 font-sans text-[13px] leading-snug font-medium tracking-normal text-ink group-hover:text-gold-deep sm:text-[14px]", presentation === "catalog" && "min-h-[2.75em]")}>
            {p.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted sm:text-[12px]">{METALS[p.metal].label} · {p.seller.name}</p>

          {/* Price & Discount Bar */}
          {showPrice && (
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              {p.sold ? (
                <span className="text-[12px] text-muted sm:text-[13px]">Sold Out</span>
              ) : (
                <>
                  <p className="text-[12px] leading-relaxed text-ink-soft tabular-nums sm:text-[13px]">
                    {p.livePrice && <span className="text-muted">from </span>}
                    {formatMoney(p.price.amountMinor, p.price.currency)}
                  </p>

                  {p.compareAt && p.compareAt.amountMinor > p.price.amountMinor && (
                    <s className="text-[11px] text-muted/80 tabular-nums sm:text-[12px]">
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
          )}
        </div>
      </Link>

      {/* Top-Right Wishlist Action */}
      {!p.sold && (
        <WishlistButton
          productId={p.id}
          saved={saved}
          className="absolute top-2 right-2 z-10 size-11 bg-ink/55 text-white hover:bg-ink/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-60 sm:top-3 sm:right-3"
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
  showPrice = true,
}: {
  products: ProductCardData[];
  savedIds?: Set<string>;
  className?: string;
  columns?: "default" | "six" | "three";
  showPrice?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 items-start gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10",
        columns === "six" && "sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
        columns === "default" && "sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
        columns === "three" && "lg:grid-cols-3",
        className,
      )}
    >
      {products.map((p, i) => (
        <ProductCard
          key={p.id}
          product={p}
          saved={savedIds?.has(p.id)}
          priority={i < 4}
          showPrice={showPrice}
          sizes={columns === "six"
            ? "(min-width: 1280px) 16vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            : columns === "three"
              ? "(min-width: 1024px) 33vw, 50vw"
              : "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"}
        />
      ))}
    </div>
  );
}
