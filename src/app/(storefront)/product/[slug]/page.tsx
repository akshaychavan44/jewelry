import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/catalog/product-card";
import { CertificateList } from "@/components/product/certificates";
import { ProductGallery } from "@/components/product/gallery";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { ReviewsSection } from "@/components/product/reviews";
import { ScaleVisualizer } from "@/components/product/scale-visualizer";
import { VendorCard } from "@/components/product/vendor-card";
import { Stars } from "@/components/ui/display";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/menus";
import { GEMSTONES, METALS, STONE_SHAPES, metalLabel } from "@/lib/jewelry";
import { formatMoney } from "@/lib/money";
import { countryName, REGION_LABELS } from "@/lib/regions";
import { METHOD_LABELS } from "@/lib/shipping";
import { humanize } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { track } from "@/server/services/analytics";
import { getWishlistProductIds } from "@/server/services/catalog";
import { getPriceContext } from "@/server/services/currency";
import { getProductDetail, getRelatedProducts } from "@/server/services/product";

type Props = { params: Promise<{ slug: string }> };

async function viewerCountry() {
  const user = await getCurrentUser();
  if (user) {
    const address = await db.address.findFirst({ where: { userId: user.id, type: "SHIPPING", isDefault: true }, select: { country: true } });
    if (address) return address.country;
    if (user.country) return user.country;
  }
  const ctx = await getPriceContext();
  return ({ GBP: "GB", INR: "IN", EUR: "FR", AED: "AE", AUD: "AU", CAD: "CA", SGD: "SG", JPY: "JP", CHF: "CH" } as Record<string, string>)[ctx.currency] ?? "US";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await db.product.findUnique({ where: { slug: (await params).slug }, select: { title: true, shortDescription: true, images: { take: 1, select: { url: true } } } });
  if (!product) return {};
  return { title: product.title, description: product.shortDescription ?? undefined, openGraph: { images: product.images.map((i) => i.url) } };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [ctx, user, country] = await Promise.all([getPriceContext(), getCurrentUser(), viewerCountry()]);
  const detail = await getProductDetail(slug, ctx, country);
  if (!detail) notFound();
  const { product, variants, certificates, shipping } = detail;

  const [related, saved, following] = await Promise.all([
    getRelatedProducts(product.id, product.sellerId, product.categoryId, ctx),
    getWishlistProductIds(user?.id),
    user ? db.favoriteStore.findUnique({ where: { userId_sellerId: { userId: user.id, sellerId: product.sellerId } } }) : null,
  ]);
  await track("PRODUCT_VIEW", { userId: user?.id, productId: product.id, sellerId: product.sellerId, path: `/product/${slug}` });

  const category = product.category;
  const specs: [string, string | null | undefined][] = [
    ["Metal", metalLabel(product.primaryMetal, product.metalColor)],
    ["Hallmark", METALS[product.primaryMetal].fineness],
    ["Gemstone", product.primaryGemstone !== "NONE" ? GEMSTONES[product.primaryGemstone] : null],
    ["Total carat weight", product.totalCaratWeight ? `${product.totalCaratWeight.toFixed(2)} ct` : null],
    ["Shape", product.stoneShape ? STONE_SHAPES[product.stoneShape] : null],
    ["Dimensions", product.widthMm && product.heightMm ? `${product.widthMm} × ${product.heightMm}${product.depthMm ? ` × ${product.depthMm}` : ""} mm` : null],
    ["Weight", product.weightGrams ? `${product.weightGrams} g` : null],
    ["Condition", product.condition === "NEW" ? "New" : `${humanize(product.condition)}${product.conditionGrade ? ` · ${humanize(product.conditionGrade)}` : ""}`],
    ["Era", product.era],
    ["Craft", [product.isHandcrafted && "Handcrafted", product.isOneOfAKind && "One of a kind", product.isMadeToOrder && "Made to order"].filter(Boolean).join(" · ") || null],
    ["SKU", variants[0]?.sku],
  ];

  return (
    <div className="pb-24 md:pb-8">
      {product.status !== "SOLD" && user?.id !== product.seller.user.id && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-4 border-t border-line bg-porcelain/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
          <p className="min-w-0 flex-1 truncate text-[12px] text-ink-soft">Listed by {product.seller.storeName}</p>
          <a href="#product-contact" className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-ink px-5 text-[13px] font-medium text-ivory">Contact jeweler</a>
        </div>
      )}
      <div className="shell pt-6">
        <nav aria-label="Breadcrumb" className="mb-6 text-[12.5px] text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-ink">Home</Link>
            </li>
            {category.parent && (
              <li className="flex items-center gap-1.5">
                <span aria-hidden>/</span>
                <Link href={`/shop/${category.parent.slug}`} className="hover:text-ink">{category.parent.name}</Link>
              </li>
            )}
            <li className="flex items-center gap-1.5">
              <span aria-hidden>/</span>
              <Link href={`/shop/${category.slug}`} className="hover:text-ink">{category.name}</Link>
            </li>
          </ol>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
          <div className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            <ProductGallery images={product.images.map((i) => ({ url: i.url, alt: i.alt, angle: i.angle }))} title={product.title} />
            {product.widthMm && product.heightMm && <ScaleVisualizer widthMm={product.widthMm} heightMm={product.heightMm} depthMm={product.depthMm} label={product.title} />}
          </div>

          <div>
            <Link href={`/jewelers/${product.seller.slug}`} className="text-[11px] font-medium tracking-[0.18em] text-muted uppercase hover:text-ink">
              {product.seller.storeName}
            </Link>
            <h1 className="display-lg mt-2 text-ink">{product.title}</h1>
            {product.shortDescription && <p className="mt-3 text-[15.5px] leading-relaxed text-ink-soft">{product.shortDescription}</p>}
            {detail.rating.count > 0 && (
              <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-[13px] text-ink-soft hover:text-ink">
                <Stars rating={detail.rating.average} size={13} /> {detail.rating.average.toFixed(1)} · {detail.rating.count} reviews
              </a>
            )}

            <div className="mt-5">
              <VendorCard seller={product.seller} following={!!following} />
            </div>

            <div className="mt-8">
              <PurchasePanel
                product={{
                  id: product.id,
                  title: product.title,
                  sellerName: product.seller.storeName,
                  publicPhone: product.seller.locations.find((location) => location.phone?.trim())?.phone ?? null,
                  sizingMode: product.sizingMode,
                  ringSizeMin: product.ringSizeMin,
                  ringSizeMax: product.ringSizeMax,
                  engravingEnabled: product.engravingEnabled,
                  engravingMaxChars: product.engravingMaxChars,
                  isOneOfAKind: product.isOneOfAKind,
                  acceptsOffers: product.acceptsOffers && product.seller.acceptsOffers,
                  livePrice: product.pricingMode === "METAL_SPOT",
                  sold: product.status === "SOLD",
                  productionDays: product.productionDays,
                  handlingDays: product.seller.handlingDays,
                  shipsFrom: `${product.seller.city ?? ""}, ${countryName(product.shipsFromCountry)}`.replace(/^, /, ""),
                }}
                variants={variants}
                engravingFee={detail.engravingFee ? formatMoney(detail.engravingFee.amountMinor, detail.engravingFee.currency) : null}
                resizingFee={detail.resizingFee ? formatMoney(detail.resizingFee.amountMinor, detail.resizingFee.currency) : null}
                shipping={shipping ? { label: METHOD_LABELS[shipping.method].label, price: shipping.price.amountMinor === 0 ? "complimentary" : formatMoney(shipping.price.amountMinor, shipping.price.currency), minDays: shipping.minDays, maxDays: shipping.maxDays, international: shipping.international } : null}
                saved={saved.has(product.id)}
                isOwner={user?.id === product.seller.user.id}
                signedIn={!!user}
              />
            </div>

            <div className="mt-10 space-y-6">
              <CertificateList certificates={certificates} metal={product.primaryMetal} />
            </div>

            <Accordion type="multiple" defaultValue={["description", "details"]} className="mt-8 border-t border-line">
              <AccordionItem value="description">
                <AccordionTrigger>Description</AccordionTrigger>
                <AccordionContent>
                  <div className="prose-loupe">
                    {product.description.split("\n\n").map((p) => (
                      <p key={p.slice(0, 24)}>{p}</p>
                    ))}
                  </div>
                  {product.conditionNotes && <p className="mt-4 text-[14px] text-ink-soft"><span className="text-ink">Condition notes:</span> {product.conditionNotes}</p>}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="details">
                <AccordionTrigger>Details &amp; dimensions</AccordionTrigger>
                <AccordionContent>
                  <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2.5 text-[14px]">
                    {specs.filter(([, v]) => v).map(([label, value]) => (
                      <div key={label} className="contents">
                        <dt className="text-muted">{label}</dt>
                        <dd className={label === "SKU" || label === "Hallmark" ? "font-mono text-[13px] text-ink" : "text-ink"}>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="shipping">
                <AccordionTrigger>How to buy &amp; delivery</AccordionTrigger>
                <AccordionContent className="space-y-3 text-[14px] leading-relaxed text-ink-soft">
                  <p>
                    This piece is crafted and listed directly by <strong>{product.seller.storeName}</strong> located in {product.seller.city ? `${product.seller.city}, ` : ""}{countryName(product.shipsFromCountry)}.
                  </p>
                  <p>
                    Payment methods, insured dispatch options, custom sizing, delivery estimates, return policies, and warranties are handled directly between you and the jeweler.
                  </p>
                  <p>
                    Use the inquiry buttons above or visit the jeweler&rsquo;s profile to message them directly, ask technical questions, or book an appointment.
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="care">
                <AccordionTrigger>Care &amp; maintenance</AccordionTrigger>
                <AccordionContent className="space-y-3 text-[14px] leading-relaxed text-ink-soft">
                  <p>
                    Fine jewelry is crafted to last generations with proper care. Store pieces individually in a soft pouch to avoid scratching, remove before intense activity, swimming, or applying perfumes, and have gemstone claws checked periodically by a professional goldsmith.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>

      <div className="shell mt-24 border-t border-line pt-16">
        <ReviewsSection detail={detail} />
      </div>

      {related.fromSeller.length > 0 && (
        <section className="shell mt-24" aria-labelledby="more-from">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 id="more-from" className="display-md text-ink">
              More from {product.seller.storeName}
            </h2>
            <Link href={`/jewelers/${product.seller.slug}`} className="link-quiet text-[14px] text-ink">
              Visit the atelier
            </Link>
          </div>
          <ProductGrid products={related.fromSeller} savedIds={saved} />
        </section>
      )}
      {related.similar.length > 0 && (
        <section className="shell mt-24 mb-16" aria-labelledby="similar">
          <h2 id="similar" className="display-md mb-8 text-ink">
            You may also like
          </h2>
          <ProductGrid products={related.similar} savedIds={saved} />
        </section>
      )}
    </div>
  );
}
