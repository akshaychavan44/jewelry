import { PageHeader } from "@/components/account/page-header";
import { blankVariant } from "@/components/seller/editor-model";
import { ProductEditor } from "@/components/seller/product-editor";
import { regionForCountry } from "@/lib/regions";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";
import { editorCategories } from "@/server/services/listing-editor";
import { getFxRates, getSpotRates } from "@/server/services/market";

export default async function NewListingPage() {
  const { seller } = await requireSeller();
  const [categories, spot, fx, rates] = await Promise.all([
    editorCategories(),
    getSpotRates(),
    getFxRates(),
    db.shippingRate.findMany({ where: { sellerId: seller.id, isActive: true }, select: { zone: true } }),
  ]);
  const prefix = seller.storeName.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "LP";
  const count = await db.product.count({ where: { sellerId: seller.id } });
  const shipsTo = [...new Set(rates.map((r) => (r.zone === "DOMESTIC" ? regionForCountry(seller.country) : r.zone)))];

  return (
    <>
      <PageHeader eyebrow="Listings" title="New listing" description={`Priced in ${seller.defaultCurrency}. Buyers see converted prices in their own currency.`} />
      <ProductEditor
        currency={seller.defaultCurrency}
        skuPrefix={`${prefix}-${String(count + 1).padStart(3, "0")}`}
        spot={spot}
        fx={fx}
        status={null}
        slug={null}
        categories={categories}
        initial={{
          title: "",
          categoryId: "",
          shortDescription: "",
          description: "",
          condition: "NEW",
          conditionGrade: "",
          conditionNotes: "",
          era: "",
          isHandcrafted: true,
          isOneOfAKind: false,
          isMadeToOrder: false,
          productionDays: "0",
          primaryMetal: "GOLD_18K",
          metalColor: "YELLOW",
          primaryGemstone: "NONE",
          totalCaratWeight: "",
          stoneShape: "",
          widthMm: "",
          heightMm: "",
          depthMm: "",
          weightGrams: "",
          pricingMode: "FIXED",
          acceptsOffers: seller.acceptsOffers,
          offerFloor: "",
          sizingMode: "NONE",
          ringSizeMin: "4",
          ringSizeMax: "10",
          resizingFee: "",
          engravingEnabled: false,
          engravingMaxChars: "20",
          engravingFee: "",
          shipsTo: shipsTo.length ? shipsTo : [regionForCountry(seller.country)],
          returnWindowDays: "",
          warrantyMonths: "12",
          tags: "",
          images: [],
          variants: [blankVariant(`${prefix}-${String(count + 1).padStart(3, "0")}`, 0)],
        }}
      />
    </>
  );
}
