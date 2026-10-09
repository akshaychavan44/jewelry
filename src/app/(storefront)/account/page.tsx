import { Bell, MessageSquare, Sparkles } from "lucide-react";
import Link from "next/link";
import { PageHeader, StatCard } from "@/components/account/page-header";
import { timeAgo } from "@/lib/format";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { getAccountBadges } from "@/server/services/account";

export default async function AccountOverview() {
  const user = await requireUser("/account");
  const [badges, recentConvos, customRequests, notifications, wishlistCount] = await Promise.all([
    getAccountBadges(user.id),
    db.conversation.findMany({
      where: { participants: { some: { userId: user.id } } },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: {
        seller: { select: { storeName: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    db.customRequest.findMany({
      where: { buyerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { seller: { select: { storeName: true } }, quotes: { select: { id: true, status: true } } },
    }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.wishlistItem.count({ where: { userId: user.id } }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Your account"
        title={`Good to see you, ${user.name?.split(" ")[0] ?? "there"}`}
        description="Your conversations, bespoke commissions, and saved pieces in one place."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Unread messages" value={badges.unread} hint="inquiries & messages" href="/account/messages" />
        <StatCard label="Custom requests" value={customRequests.length} hint="bespoke commissions" href="/account/custom-requests" />
        <StatCard label="Price inquiries" value={badges.offers} hint="pending response" href="/account/offers" />
        <StatCard label="Saved pieces" value={wishlistCount} hint="in your wishlist" href="/account/wishlist" />
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-8">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="caps text-ink">Recent conversations</h2>
              <Link href="/account/messages" className="link-quiet text-[13px] text-ink">
                All messages
              </Link>
            </div>
            <ul className="divide-y divide-line rounded-[3px] border border-line bg-porcelain">
              {recentConvos.length === 0 && (
                <li className="px-5 py-8 text-center text-[14px] text-muted">
                  No conversations yet. Inquire with any jeweler to get started.
                </li>
              )}
              {recentConvos.map((c) => (
                <li key={c.id}>
                  <Link href={`/account/messages/${c.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-parchment/40">
                    <div className="grid size-10 place-items-center rounded-full bg-sand text-ink">
                      <MessageSquare className="size-5 text-ink-soft" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-ink">{c.subject}</p>
                      <p className="truncate text-[12.5px] text-muted">
                        {c.seller?.storeName ? `With ${c.seller.storeName}` : "Inquiry"} · {c.messages[0]?.body ?? "No messages"}
                      </p>
                    </div>
                    <span className="text-[12px] text-muted">{timeAgo(c.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {customRequests.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="caps text-ink">Custom Commissions</h2>
                <Link href="/account/custom-requests" className="link-quiet text-[13px] text-ink">
                  All requests
                </Link>
              </div>
              <ul className="divide-y divide-line rounded-[3px] border border-line bg-porcelain">
                {customRequests.map((cr) => (
                  <li key={cr.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Sparkles className="size-5 text-gold-deep" />
                      <div>
                        <p className="text-[14px] font-medium text-ink">{cr.title}</p>
                        <p className="text-[12.5px] text-muted">
                          {cr.seller?.storeName ? `For ${cr.seller.storeName}` : "Open brief"} · {cr.quotes.length} quote{cr.quotes.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <Link href="/account/custom-requests" className="text-[13px] text-ink underline underline-offset-4">
                      View brief
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

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
