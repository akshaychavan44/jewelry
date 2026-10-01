import { Bell } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PageHeader, StatCard } from "@/components/account/page-header";
import { StatusBadge } from "@/components/ui/display";
import { timeAgo } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { FULFILLMENT_STATUS } from "@/lib/status";
import { num } from "@/lib/utils";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { getAccountBadges } from "@/server/services/account";

export default async function AccountOverview() {
  const user = await requireUser("/account");
  const [badges, recent, notifications, wishlistCount, customOpen] = await Promise.all([
    getAccountBadges(user.id),
    db.sellerOrder.findMany({
      where: { order: { buyerId: user.id, status: { not: "PENDING_PAYMENT" } } },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { order: { select: { orderNumber: true } }, seller: { select: { storeName: true } }, items: { take: 1, select: { title: true, imageUrl: true } } },
    }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.wishlistItem.count({ where: { userId: user.id } }),
    db.customRequest.count({ where: { buyerId: user.id, status: { in: ["OPEN", "QUOTED", "ACCEPTED", "IN_PRODUCTION"] } } }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Your account" title={`Good to see you, ${user.name?.split(" ")[0] ?? "there"}`} description="Orders, offers and conversations with your jewelers, all in one place." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="In progress" value={badges.openOrders} hint="orders on their way" href="/account/orders?status=open" />
        <StatCard label="Offers" value={badges.offers} hint="awaiting your reply" href="/account/offers" />
        <StatCard label="Unread" value={badges.unread} hint="messages" href="/account/messages" />
        <StatCard label="Saved" value={wishlistCount} hint={`${customOpen} custom request${customOpen === 1 ? "" : "s"} open`} href="/account/wishlist" />
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[1.5fr_1fr]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="caps text-ink">Recent orders</h2>
            <Link href="/account/orders" className="link-quiet text-[13px] text-ink">
              All orders
            </Link>
          </div>
          <ul className="divide-y divide-line rounded-[3px] border border-line bg-porcelain">
            {recent.length === 0 && <li className="px-5 py-8 text-center text-[14px] text-muted">No orders yet.</li>}
            {recent.map((so) => (
              <li key={so.id}>
                <Link href={`/account/orders/${so.order.orderNumber}`} className="flex items-center gap-4 px-5 py-4 hover:bg-parchment/40">
                  <div className="relative size-14 shrink-0 overflow-hidden bg-sand">{so.items[0]?.imageUrl && <Image src={so.items[0].imageUrl} alt="" fill sizes="56px" className="object-cover" />}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] text-ink">{so.items[0]?.title}</p>
                    <p className="text-[12.5px] text-muted">
                      {so.seller.storeName} · <span className="font-mono">{so.reference}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={so.status} map={FULFILLMENT_STATUS} />
                    <p className="mt-1 text-[12.5px] text-muted tabular">{formatMoney(num(so.totalMinor), so.currency)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="caps mb-4 text-ink">Notifications</h2>
          <ul className="space-y-2">
            {notifications.length === 0 && <li className="text-[14px] text-muted">You&rsquo;re all caught up.</li>}
            {notifications.map((n) => (
              <li key={n.id}>
                <Link href={n.href ?? "#"} className="flex gap-3 rounded-[3px] border border-line bg-porcelain px-4 py-3 hover:border-line-strong">
                  <Bell className={n.readAt ? "mt-0.5 size-4 shrink-0 text-muted" : "mt-0.5 size-4 shrink-0 text-gold"} strokeWidth={1.5} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] text-ink">{n.title}</span>
                    {n.body && <span className="block truncate text-[12.5px] text-muted">{n.body}</span>}
                  </span>
                  <span className="shrink-0 text-[12px] text-muted">{timeAgo(n.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
