import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";
import { PageHeader } from "@/components/account/page-header";
import { ShowcaseForm } from "@/components/seller/showcase-form";
export default async function NewJewelry() {
  const { seller } = await requireSeller();
  const categories = await db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return <><PageHeader title="Add jewelry" description="Create a showcase listing. Customers contact you directly about purchases." /><ShowcaseForm categories={categories} currency={seller.defaultCurrency} /></>;
}
