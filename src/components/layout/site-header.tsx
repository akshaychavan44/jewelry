import { mainCategories } from "@/config/site";
import { getCurrentUser, getSellerForUser } from "@/server/auth/session";
import { getCategoryTree } from "@/server/services/catalog";
import { getDisplayCurrency } from "@/server/services/currency";
import { HeaderClient } from "./header-client";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const [tree, currency, seller] = await Promise.all([
    getCategoryTree(),
    getDisplayCurrency(),
    user?.role === "SELLER" ? getSellerForUser(user.id) : Promise.resolve(null),
  ]);

  const isApprovedJeweler = Boolean(
    (user?.role === "SELLER" && seller?.verificationStatus === "APPROVED") ||
    user?.role === "ADMIN"
  );

  const categories = mainCategories.map((c) => {
    const node = tree.find((t) => t.slug === c.slug);
    return {
      slug: c.slug,
      name: c.name,
      imageUrl: node?.imageUrl ?? null,
      children: (node?.children ?? []).map((ch) => ({ slug: ch.slug, name: ch.name })),
    };
  });

  return (
    <HeaderClient
      categories={categories}
      currency={currency}
      user={user ? { name: user.name, email: user.email, role: user.role } : null}
      isApprovedJeweler={isApprovedJeweler}
    />
  );
}
