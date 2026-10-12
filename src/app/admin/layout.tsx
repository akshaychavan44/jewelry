import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { DashboardNav, type NavItem } from "@/components/layout/dashboard-nav";
import { DashboardAccountMenu } from "@/components/layout/dashboard-account-menu";
import { requireAdmin } from "@/server/auth/session";
import { getAdminQueues } from "@/server/services/admin";

export const metadata: Metadata = { title: { default: "Admin console", template: "%s · Loupe admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const q = await getAdminQueues();

  const items: NavItem[] = [
    { href: "/admin", label: "Platform overview", icon: "analytics", exact: true },
    { href: "/admin/kyc", label: "Jeweler verification", icon: "kyc", badge: q.kyc },
    { href: "/admin/business-names", label: "Business name changes", icon: "kyc" },
    { href: "/admin/certificates", label: "Certificates", icon: "verified", badge: q.certificates },
    { href: "/admin/reviews", label: "Review moderation", icon: "reviews" },
    { href: "/admin/users", label: "Users", icon: "users" },
    { href: "/admin/monetization", label: "Listing Plans & Billing", icon: "monetization" },
    { href: "/admin/audit", label: "Audit log", icon: "audit" },
  ];


  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="flex min-w-0 flex-col border-b border-line bg-parchment/50 lg:sticky lg:top-0 lg:h-dvh lg:overflow-hidden lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 lg:block">
          <Logo compact />
          <p className="caps text-[10px] text-muted lg:mt-1">Admin console</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <DashboardNav items={items} />
        </div>
        <div className="hidden space-y-2 border-t border-line px-5 py-4 text-[13px] lg:block">
          <Link href="/" className="block text-ink-soft hover:text-ink">
            Back to Loupe
          </Link>
        </div>
        <DashboardAccountMenu name={admin.name} email={admin.email} image={admin.image} label="Admin account" settingsHref="/account/settings" />
      </aside>
      <main className="min-w-0 px-4 py-8 md:px-10">{children}</main>
    </div>
  );
}
