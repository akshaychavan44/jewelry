import type { Metadata } from "next";
import { CustomOrdersView } from "@/components/custom-orders/custom-orders-view";
import { firstParam, type SearchParams } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { getDisplayCurrency } from "@/server/services/currency";

export const metadata: Metadata = {
  title: "Custom Orders & Commissions | Loupe",
  description:
    "A piece that begins with you. Commission a bespoke piece from verified independent jewelers.",
};

export default async function CustomOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sellerSlug = firstParam((await searchParams).jeweler);
  const [user, currency, categories, seller] = await Promise.all([
    getCurrentUser(),
    getDisplayCurrency(),
    db.category.findMany({
      where: { parentId: null },
      orderBy: { position: "asc" },
      select: { id: true, name: true },
    }),
    sellerSlug
      ? db.sellerProfile.findUnique({
          where: { slug: sellerSlug },
          select: { storeName: true, slug: true },
        })
      : null,
  ]);

  return (
    <CustomOrdersView
      user={user}
      currency={currency}
      categories={categories}
      seller={seller}
      sellerSlug={sellerSlug}
    />
  );
}
