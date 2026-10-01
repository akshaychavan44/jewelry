import { notFound } from "next/navigation";
import { PageHeader } from "@/components/account/page-header";
import { CertificateManager } from "@/components/seller/certificate-manager";
import { ProductEditor } from "@/components/seller/product-editor";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";
import { editorCategories, editorInclude, toEditorState } from "@/server/services/listing-editor";
import { getFxRates, getSpotRates } from "@/server/services/market";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { seller } = await requireSeller();
  const product = await db.product.findFirst({ where: { id, sellerId: seller.id, deletedAt: null }, include: editorInclude });
  if (!product) notFound();
  const [categories, spot, fx] = await Promise.all([editorCategories(), getSpotRates(), getFxRates()]);
  const prefix = product.variants[0]?.sku.replace(/-[A-Z]$/, "") ?? "LP";

  return (
    <>
      <PageHeader eyebrow="Edit listing" title={product.title} description={`${product.variants.length} SKUs · priced in ${product.currency}`} />
      <div className="mb-6">
        <CertificateManager
          productId={product.id}
          variants={product.variants.map((v) => ({ id: v.id, sku: v.sku, title: v.title }))}
          certificates={product.certificates.map((c) => ({ id: c.id, lab: c.lab, reportNumber: c.reportNumber, status: c.status, variantSku: c.variant?.sku ?? null, hasFile: !!c.fileId }))}
        />
      </div>
      <ProductEditor initial={toEditorState(product)} categories={categories} currency={product.currency} skuPrefix={prefix} spot={spot} fx={fx} status={product.status} slug={product.slug} />
    </>
  );
}
