"use client";
import { recordContactClick } from "@/lib/contact-analytics";
import { useState } from "react";
import Link from "next/link";
import type { SizingMode } from "@/generated/prisma/enums";
import type { VariantOption } from "@/server/services/product";
import { formatMoney } from "@/lib/money";
import { WishlistButton } from "@/components/catalog/save-buttons";
import { buttonVariants } from "@/components/ui/button";
import { DirectContact } from "./direct-contact";
export type PanelProduct = {
  id: string;
  title: string;
  sellerName: string;
  sellerId: string;
  sellerSlug: string;
  publicWhatsapp?: string | null;
  publicEmail?: string | null;
  publicPhone?: string | null;
  sizingMode: SizingMode;
  ringSizeMin: number | null;
  ringSizeMax: number | null;
  engravingEnabled: boolean;
  engravingMaxChars: number | null;
  isOneOfAKind: boolean;
  acceptsOffers: boolean;
  livePrice: boolean;
  sold: boolean;
  productionDays: number;
  handlingDays: number;
  shipsFrom: string;
};

type Props = {
  product: PanelProduct;
  variants: VariantOption[];
  engravingFee: string | null;
  resizingFee: string | null;
  shipping: { label: string; price: string; minDays: number; maxDays: number; international: boolean } | null;
  saved: boolean;
  isOwner: boolean;
  signedIn: boolean;
};


export function PurchasePanel({ product, variants, saved, isOwner }: Props) {
  const [selected, setSelected] = useState(variants[0]?.id ?? "");
  const variant = variants.find(v => v.id === selected) ?? variants[0];
  return <div className="space-y-6">
    {variant && <div><p className="text-xs uppercase tracking-widest text-muted">Guide price</p><p className="mt-2 font-display text-4xl">{formatMoney(variant.price.amountMinor, variant.price.currency)}</p><p className="mt-2 text-sm text-muted">Confirm the final price and availability with the jeweler.</p></div>}
    {variants.length > 1 && <label className="block text-sm">Available options<select className="mt-2 w-full rounded border border-line bg-porcelain p-3" value={selected} onChange={e => setSelected(e.target.value)}>{variants.map(v => <option key={v.id} value={v.id}>{v.title} — {formatMoney(v.price.amountMinor, v.price.currency)}</option>)}</select></label>}
    {product.sold && <p className="text-sm text-muted">Archived creation. Contact the jeweler about similar pieces.</p>}
    {isOwner ? <Link href={`/seller/products/${product.id}`} className={buttonVariants({ variant: "outline" })}>Manage this piece</Link> : <div id="product-contact" className="space-y-4 rounded border border-line bg-porcelain p-6"><h2 className="font-display text-xl">Interested in this piece?</h2><p className="text-sm leading-relaxed text-ink-soft">Contact {product.sellerName} directly about availability, sizing and a viewing.</p><DirectContact sellerId={product.sellerId} productId={product.id} phone={product.publicPhone} whatsapp={product.publicWhatsapp} title={product.title} />{product.publicEmail && <a href={`mailto:${product.publicEmail}?subject=${encodeURIComponent(product.title)}`} onClick={() => recordContactClick(product.sellerId, "email", product.id)} className="block text-sm underline">Email jeweler</a>}<Link href={`/jewelers/${product.sellerSlug}`} className="block text-sm underline">Visit jeweler profile</Link><WishlistButton productId={product.id} saved={saved} variant="full" /></div>}
    <p className="border-t border-line pt-5 text-sm leading-relaxed text-muted">Purchases, payment, delivery and returns are arranged directly with the jeweler.</p>
  </div>;
}
