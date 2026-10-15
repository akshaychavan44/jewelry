import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { DashboardNav, type NavItem } from "@/components/layout/dashboard-nav";
import { DashboardAccountMenu } from "@/components/layout/dashboard-account-menu";
import { requireUser } from "@/server/auth/session";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { TrustBar } from "@/components/layout/bars";

export const metadata: Metadata = {
  title: { default: "My Account", template: "%s · Loupe" },
  robots: { index: false },
};

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  if (user.role !== "ADMIN") {
    return (
      <div className="storefront min-h-dvh">
        <a href="#account-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory">
          Skip to account content
        </a>
        <SiteHeader />
        <main id="account-content" className="mx-auto min-h-[60vh] max-w-7xl px-8 py-10 lg:px-12">{children}</main>
        <TrustBar />
        <SiteFooter />
      </div>
    );
  }
  const items: NavItem[] = [
    { href: "/account", label: "Overview", icon: "overview", exact: true },
    { href: "/account/custom-requests", label: "Custom requests", icon: "custom" },
    { href: "/account/reviews", label: "My Reviews", icon: "reviews" },
    { href: "/account/wishlist", label: "Saved pieces", icon: "wishlist" },
    { href: "/account/favorite-stores", label: "Saved jewelers", icon: "stores" },
  ];
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      <a href="#account-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory">
        Skip to account content
      </a>
      <aside className="flex min-w-0 flex-col border-b border-line bg-parchment/50 lg:sticky lg:top-0 lg:h-dvh lg:overflow-hidden lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 lg:block">
          <Logo compact />
          <p className="caps text-[10px] text-muted lg:mt-1">Customer account</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <DashboardNav items={items} />
        </div>
        <div className="space-y-3 border-t border-line px-5 py-4 text-[13px]">
          <Link href="/" className="block text-ink-soft hover:text-ink">Back to Loupe</Link>
        </div>
        <DashboardAccountMenu name={user.name} email={user.email} image={user.image} label="Customer account" settingsHref="/account/settings" />
      </aside>
      <main id="account-content" className="min-w-0 px-4 py-8 md:px-10">{children}</main>
    </div>
  );
}
