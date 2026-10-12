import { notFound } from "next/navigation";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";
import { jewelryVisibility } from "@/server/services/discovery";
import { toMajor } from "@/lib/money";
import { num } from "@/lib/utils";
import { PageHeader } from "@/components/account/page-header";
import { ShowcaseForm } from "@/components/seller/showcase-form";
export default async function EditJewelry({ params }: { params: Promise<{ id: string }> }) {
  const { seller } = await requireSeller(); const { id } = await params;
  const [p, categories, settings] = await Promise.all([db.product.findFirst({ where: { id, sellerId: seller.id, deletedAt: null }, include: { images: { orderBy: { position: "asc" } } } }), db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }), jewelryVisibility()]);
  if (!p) notFound(); const v = settings.find(s => s.productId === id);
  return <><PageHeader title="Edit jewelry" description="Update the piece and choose exactly where it appears." /><ShowcaseForm categories={categories} currency={p.currency} piece={{ ...p, price: toMajor(num(p.basePriceMinor), p.currency), showOnProfile: v?.showOnProfile ?? true, showOnWebsite: v?.showOnWebsite ?? true }} /></>;
}
