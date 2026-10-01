import { Gem } from "lucide-react";
import { DashboardNav, type NavItem } from "@/components/layout/dashboard-nav";
import { requireUser } from "@/server/auth/session";
import { getAccountBadges } from "@/server/services/account";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  const badges = await getAccountBadges(user.id);
  const items: NavItem[] = [
    { href: "/account", label: "Overview", icon: "overview", exact: true },
    { href: "/account/orders", label: "Orders", icon: "orders", badge: badges.openOrders },
    { href: "/account/offers", label: "Offers", icon: "offers", badge: badges.offers },
    { href: "/account/messages", label: "Messages", icon: "messages", badge: badges.unread },
    { href: "/account/wishlist", label: "Wishlist", icon: "wishlist" },
    { href: "/account/favorite-stores", label: "Favourite jewelers", icon: "stores" },
    { href: "/account/custom-requests", label: "Custom requests", icon: "custom" },
    { href: "/account/warranty", label: "Warranty & repairs", icon: "warranty" },
    { href: "/account/addresses", label: "Addresses", icon: "addresses" },
    { href: "/account/payment-methods", label: "Payment methods", icon: "payments" },
    { href: "/account/settings", label: "Settings", icon: "settings" },
  ];
  return (
    <div className="shell grid gap-8 pt-8 pb-24 lg:grid-cols-[230px_1fr] lg:gap-12">
      <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
        <div className="mb-4 hidden items-center gap-3 lg:flex">
          <Gem className="size-4 text-gold" strokeWidth={1.4} />
          <p className="truncate text-[14px] text-ink">{user.name ?? user.email}</p>
        </div>
        <DashboardNav items={items} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
