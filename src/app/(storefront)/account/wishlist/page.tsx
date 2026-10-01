import { Heart } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/account/page-header";
import { ProductGrid } from "@/components/catalog/product-card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/display";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { cardSelect, toCard } from "@/server/services/catalog";
import { getPriceContext } from "@/server/services/currency";

export default async function WishlistPage() {
  const user = await requireUser("/account/wishlist");
  const [ctx, items] = await Promise.all([
    getPriceContext(),
    db.wishlistItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { product: { select: cardSelect } } }),
  ]);
  const products = items.map((i) => toCard(i.product, ctx));
  return (
    <>
      <PageHeader title="Wishlist" description="Pieces you've saved. One-of-a-kind items can sell at any time." />
      {products.length === 0 ? (
        <EmptyState icon={<Heart />} title="Nothing saved yet" action={<Link href="/shop" className={buttonVariants()}>Browse jewelry</Link>}>
          Tap the heart on any piece to keep it here.
        </EmptyState>
      ) : (
        <ProductGrid products={products} savedIds={new Set(products.map((p) => p.id))} columns="three" />
      )}
    </>
  );
}
