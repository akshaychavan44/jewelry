"use client";
import { recordContactClick } from "@/lib/contact-analytics";
import { useState } from "react";
import Link from "next/link";
import type { SizingMode } from "@/lib/domain-enums";
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
    {variant && (
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs uppercase tracking-widest text-muted">
            {product.livePrice ? "Live metal price" : "Guide price"}
          </p>
          {product.livePrice && (
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900">
              Live spot benchmark
            </span>
          )}
          {variant.price.currency === "INR" && (
            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
              Inclusive of 3% GST
            </span>
          )}
        </div>
        <p className="mt-2 font-display text-4xl">{formatMoney(variant.price.amountMinor, variant.price.currency)}</p>
        <p className="mt-2 text-sm text-muted">
          {product.livePrice
            ? (variant.price.currency === "INR"
                ? "Calculated live from pure-metal spot rates, craftsman making charges, and 3% GST. Confirm final details with the jeweler."
                : "Calculated live from pure-metal spot rates and craftsman making charges. Confirm final details with the jeweler.")
            : "Confirm the final price and availability with the jeweler."}
        </p>
      </div>
    )}
    {variants.length > 1 && <label className="block text-sm">Available options<select className="mt-2 w-full rounded border border-line bg-porcelain p-3" value={selected} onChange={e => setSelected(e.target.value)}>{variants.map(v => <option key={v.id} value={v.id}>{v.title} — {formatMoney(v.price.amountMinor, v.price.currency)}</option>)}</select></label>}
    {product.sold && <p className="text-sm text-muted">Archived creation. Contact the jeweler about similar pieces.</p>}
    {isOwner ? <Link href={`/seller/products/${product.id}`} className={buttonVariants({ variant: "outline" })}>Manage this piece</Link> : <div id="product-contact" className="space-y-4 rounded border border-line bg-porcelain p-6"><h2 className="font-display text-xl">Interested in this piece?</h2><p className="text-sm leading-relaxed text-ink-soft">Contact {product.sellerName} directly about availability, sizing and a viewing.</p><DirectContact sellerId={product.sellerId} productId={product.id} phone={product.publicPhone} whatsapp={product.publicWhatsapp} title={product.title} />{product.publicEmail && <a href={`mailto:${product.publicEmail}?subject=${encodeURIComponent(product.title)}`} onClick={() => recordContactClick(product.sellerId, "email", product.id)} className="block text-sm underline">Email jeweler</a>}<Link href={`/jewelers/${product.sellerSlug}`} className="block text-sm underline">Visit jeweler profile</Link><WishlistButton productId={product.id} saved={saved} variant="full" /></div>}
    <p className="border-t border-line pt-5 text-sm leading-relaxed text-muted">Purchases, payment, delivery and returns are arranged directly with the jeweler.</p>
  </div>;
}
