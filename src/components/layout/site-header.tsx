import { mainCategories } from "@/config/site";
import { getCurrentUser } from "@/server/auth/session";
import { getCategoryTree } from "@/server/services/catalog";
import { getDisplayCurrency } from "@/server/services/currency";
import { HeaderClient } from "./header-client";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const [tree, currency] = await Promise.all([getCategoryTree(), getDisplayCurrency()]);

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
    />
  );
}
