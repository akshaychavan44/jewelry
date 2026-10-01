import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { DashboardNav, type NavItem } from "@/components/layout/dashboard-nav";
import { Monogram } from "@/components/ui/display";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  // Every dashboard route requires an APPROVED store; others land on onboarding.
  const { seller, user } = await requireSeller({ verified: true });
  const [pending, offers, returns, participations] = await Promise.all([
    db.sellerOrder.count({ where: { sellerId: seller.id, status: { in: ["PENDING", "PROCESSING", "IN_PRODUCTION"] }, order: { paymentStatus: "SUCCEEDED" } } }),
    db.offer.count({ where: { sellerId: seller.id, status: { in: ["PENDING", "COUNTERED"] }, lastActor: "BUYER" } }),
    db.returnRequest.count({ where: { sellerId: seller.id, status: { in: ["REQUESTED", "IN_TRANSIT", "LABEL_ISSUED"] } } }),
    db.conversationParticipant.findMany({ where: { userId: user.id }, select: { conversationId: true, lastReadAt: true } }),
  ]);
  const unread = participations.length
    ? await db.message.count({ where: { senderId: { not: user.id }, OR: participations.map((p) => ({ conversationId: p.conversationId, createdAt: { gt: p.lastReadAt ?? new Date(0) } })) } })
    : 0;

  const items: NavItem[] = [
    { href: "/seller", label: "Overview", icon: "analytics", exact: true },
    { href: "/seller/orders", label: "Orders", icon: "orders", badge: pending },
    { href: "/seller/products", label: "Listings", icon: "products" },
    { href: "/seller/offers", label: "Offers", icon: "offers", badge: offers },
    { href: "/seller/messages", label: "Messages", icon: "messages", badge: unread },
    { href: "/seller/returns", label: "Returns", icon: "returns", badge: returns },
    { href: "/seller/custom-requests", label: "Commissions", icon: "custom" },
    { href: "/seller/reviews", label: "Reviews", icon: "reviews" },
    { href: "/seller/pricing", label: "Live metal pricing", icon: "pricing" },
    { href: "/seller/integrations", label: "POS & inventory sync", icon: "integrations" },
    { href: "/seller/payouts", label: "Payouts", icon: "payouts" },
    { href: "/seller/settings", label: "Store settings", icon: "settings" },
  ];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="min-w-0 border-b border-line bg-parchment/50 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 lg:block">
          <Logo compact />
          <p className="caps text-[10px] text-muted lg:mt-1">Seller studio</p>
        </div>
        <div className="mx-5 mb-4 flex items-center gap-3 rounded-[3px] border border-line bg-porcelain px-3 py-2.5">
          <Monogram name={seller.storeName} src={seller.logoUrl} size={34} />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] text-ink">{seller.storeName}</p>
            <p className="text-[11.5px] text-moss">● Verified · live</p>
          </div>
        </div>
        <div className="px-4 pb-4">
          <DashboardNav items={items} />
        </div>
        <div className="hidden space-y-2 border-t border-line px-5 py-4 text-[13px] lg:block">
          <Link href={`/jewelers/${seller.slug}`} className="flex items-center gap-2 text-ink-soft hover:text-ink">
            <ExternalLink className="size-3.5" /> View storefront
          </Link>
          <Link href="/" className="block text-ink-soft hover:text-ink">
            Back to Loupe
          </Link>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-8 md:px-10">{children}</main>
    </div>
  );
}
