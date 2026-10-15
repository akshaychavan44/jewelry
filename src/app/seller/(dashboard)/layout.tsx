import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { DashboardNav, type NavItem } from "@/components/layout/dashboard-nav";

import { requireSeller } from "@/server/auth/session";
import { DashboardAccountMenu } from "@/components/layout/dashboard-account-menu";
import { getDirectorySettings, inquiryStatusesForSeller } from "@/server/services/jeweler-directory";
import { db } from "@/server/db";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const { seller, user } = await requireSeller();
  const [settings, requests, unread] = await Promise.all([getDirectorySettings(seller.id), inquiryStatusesForSeller(seller.id), db.notification.count({ where: { userId: user.id, type: "CUSTOM_REQUEST", readAt: null } })]);
  const items: NavItem[] = [
    { href: "/seller", label: "Overview", icon: "overview", exact: true },
    { href: "/seller/analytics", label: "Analytics", icon: "analytics" },
    { href: "/seller/notifications", label: "Notifications", icon: "notifications", badge: unread },
    { href: "/seller/settings", label: "My Business", icon: "stores" },
    { href: "/seller/products", label: "My Jewelry", icon: "products" },
    { href: "/seller/reviews", label: "Reviews", icon: "reviews" },
    { href: "/seller/custom-requests", label: "Custom Requests", icon: "custom", badge: requests.filter((r) => r.inquiryStatus === "NEW" && r.status !== "CANCELLED").length },
  ];
  return <div className="min-h-dvh bg-ivory lg:grid lg:grid-cols-[250px_1fr]">
    <aside className="flex min-w-0 flex-col border-b border-line bg-parchment/50 lg:sticky lg:top-0 lg:h-dvh lg:overflow-hidden lg:border-r lg:border-b-0">
      <div className="px-5 pt-6 pb-3"><Logo compact /><p className="caps mt-3 text-[10px] text-muted">Manage your business</p></div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5"><DashboardNav items={items} /></div>
      <div className="flex flex-wrap gap-4 border-t border-line px-5 py-5 text-sm lg:flex-col">
        {!settings.isPaused && <Link href={`/jewelers/${seller.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-ink-soft"><ExternalLink size={15} />View public profile</Link>}
        <Link href="/" className="text-ink-soft">Back to Loupe</Link>
      </div>
      <DashboardAccountMenu name={user.name} email={user.email} image={user.image} label="Jeweler account" settingsHref="/seller/account" />
    </aside>
    <main className="min-w-0 px-4 py-8 sm:px-8 lg:px-12"><div className="mx-auto max-w-5xl">{seller.verificationStatus === "PENDING" && <p role="status" className="mb-6 rounded border border-line bg-porcelain p-4 text-sm text-ink-soft">{settings.isPaused ? "Your shop is paused." : "Your shop is live."} Verification is pending. Your verified badge will appear after admin approval.</p>}{children}</div></main>
  </div>;
}
