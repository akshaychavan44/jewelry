import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { DashboardNav, type NavItem } from "@/components/layout/dashboard-nav";
import { Monogram } from "@/components/ui/display";
import { requireAdmin } from "@/server/auth/session";
import { getAdminQueues } from "@/server/services/admin";

export const metadata: Metadata = { title: { default: "Admin console", template: "%s · Loupe admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const q = await getAdminQueues();

  const items: NavItem[] = [
    { href: "/admin", label: "Platform overview", icon: "analytics", exact: true },
    { href: "/admin/kyc", label: "Jeweler verification", icon: "kyc", badge: q.kyc },
    { href: "/admin/certificates", label: "Certificates", icon: "verified", badge: q.certificates },
    { href: "/admin/users", label: "Users", icon: "users" },
    { href: "/admin/monetization", label: "Listing Plans & Billing", icon: "monetization" },
    { href: "/admin/audit", label: "Audit log", icon: "audit" },
  ];


  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="min-w-0 border-b border-line bg-parchment/50 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 lg:block">
          <Logo compact />
          <p className="caps text-[10px] text-muted lg:mt-1">Admin console</p>
        </div>
        <div className="mx-5 mb-4 flex items-center gap-3 rounded-[3px] border border-line bg-porcelain px-3 py-2.5">
          <Monogram name={admin.name ?? admin.email} size={34} />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] text-ink">{admin.name ?? admin.email}</p>
            <p className="text-[11.5px] text-muted">Marketplace operations</p>
          </div>
        </div>
        <div className="px-4 pb-4">
          <DashboardNav items={items} />
        </div>
        <div className="hidden space-y-2 border-t border-line px-5 py-4 text-[13px] lg:block">
          <Link href="/" className="block text-ink-soft hover:text-ink">
            Back to Loupe
          </Link>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-8 md:px-10">{children}</main>
    </div>
  );
}
