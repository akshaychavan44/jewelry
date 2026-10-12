import Link from "next/link";
import { ArrowRight, Gem, Settings, Sparkles, Store } from "lucide-react";
import { PageHeader, StatCard } from "@/components/account/page-header";
import { Badge, Card, CardHeader, EmptyState, Table, Td, Th } from "@/components/ui/display";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { INQUIRY_LABELS } from "@/lib/jeweler-profile";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { myReviews } from "@/server/services/discovery";
import { inquiryStatusesForBuyer } from "@/server/services/jeweler-directory";

export const metadata = { title: "Account Overview" };

export default async function AccountOverview() {
  const user = await requireUser("/account");
  const [requests, pieces, stores, reviews, recentRequests, statuses] = await Promise.all([
    db.customRequest.count({ where: { buyerId: user.id } }),
    db.wishlistItem.count({ where: { userId: user.id } }),
    db.favoriteStore.count({ where: { userId: user.id } }),
    myReviews(user.id),
    db.customRequest.findMany({
      where: { buyerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { seller: { select: { storeName: true, slug: true } } },
    }),
    inquiryStatusesForBuyer(user.id),
  ]);
  const statusMap = new Map(statuses.map(request => [request.id, request.inquiryStatus]));
  const shortcuts = [
    { href: "/jewelers", icon: Store, label: "Find a jeweler" },
    { href: "/shop", icon: Gem, label: "Explore jewelry" },
    { href: "/custom-orders#request-brief", icon: Sparkles, label: "Start a custom request" },
    { href: "/account/settings", icon: Settings, label: "Manage account details" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Customer account"
        title="Account Overview"
        description={`Welcome back, ${user.name?.split(" ")[0] ?? "there"}. Manage your requests, saved favorites and reviews.`}
        action={<Link href="/custom-orders#request-brief" className={buttonVariants({ size: "sm" })}>New custom request</Link>}
      />

      <section aria-label="Quick actions" className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {shortcuts.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className="group flex items-center gap-3 rounded-[3px] border border-line bg-porcelain px-4 py-3.5 transition-colors hover:border-line-strong">
            <Icon className="size-5 shrink-0 text-muted" strokeWidth={1.5} aria-hidden />
            <span className="min-w-0 flex-1 text-[13.5px] text-ink">{label}</span>
            <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Custom requests" value={requests} href="/account/custom-requests" />
        <StatCard label="Saved jewelers" value={stores} href="/account/favorite-stores" />
        <StatCard label="Saved pieces" value={pieces} href="/account/wishlist" />
        <StatCard label="My reviews" value={reviews.length} href="/account/reviews" />
      </div>

      <Card className="mt-8">
        <CardHeader title="Recent custom requests" description="Your latest briefs and their current status." action={<Link href="/account/custom-requests" className="text-[13px] text-ink underline underline-offset-4">View all requests</Link>} />
        {recentRequests.length ? (
          <Table>
            <caption className="sr-only">Your five most recent custom requests</caption>
            <thead><tr><Th>Request</Th><Th>Jeweler</Th><Th>Status</Th><Th>Submitted</Th><Th><span className="sr-only">View request</span></Th></tr></thead>
            <tbody>
              {recentRequests.map(request => {
                const status = statusMap.get(request.id) ?? "NEW";
                const cancelled = request.status === "CANCELLED";
                return (
                  <tr key={request.id}>
                    <Td><p className="font-medium text-ink">{request.title}</p><p className="mt-0.5 font-mono text-[11px] text-muted">{request.reference}</p></Td>
                    <Td>{request.seller ? <Link href={`/jewelers/${request.seller.slug}`} className="hover:underline">{request.seller.storeName}</Link> : <span className="text-muted">No jeweler selected</span>}</Td>
                    <Td><Badge dot tone={cancelled ? "neutral" : status === "CLOSED" ? "success" : status === "CONTACTED" ? "info" : "gold"}>{cancelled ? "Cancelled" : INQUIRY_LABELS[status]}</Badge></Td>
                    <Td className="whitespace-nowrap text-muted">{formatDate(request.createdAt)}</Td>
                    <Td><Link href="/account/custom-requests" aria-label={`View request: ${request.title}`} className="inline-flex items-center gap-1.5 text-ink hover:underline">View <ArrowRight size={14} aria-hidden /></Link></Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : <EmptyState icon={<Sparkles />} title="No custom requests yet" action={<Link href="/custom-orders#request-brief" className={buttonVariants({ size: "sm" })}>Create your first request</Link>}>Choose a jeweler and share the piece you have in mind.</EmptyState>}
        <p className="border-t border-line px-5 py-3 text-[12px] text-muted">Your selected jeweler contacts you separately about design, pricing and delivery.</p>
      </Card>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Your saved collection" description="Keep the pieces and makers you love close." />
          <div className="divide-y divide-line px-5">
            {[{ href: "/account/wishlist", label: "Saved jewelry", count: pieces }, { href: "/account/favorite-stores", label: "Saved jewelers", count: stores }].map(item => (
              <Link key={item.href} href={item.href} className="group flex items-center justify-between gap-4 py-4 text-[13.5px] text-ink">
                <span>{item.label} <span className="ml-2 text-muted">({item.count})</span></span><ArrowRight size={15} className="text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Your reviews" description="Share your experience with independent jewelers." />
          <div className="px-5 py-5"><p className="mb-4 text-[13.5px] leading-relaxed text-ink-soft">{reviews.length ? `You have written ${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}. View your feedback and jeweler replies.` : "After interacting with a jeweler, visit their profile to leave an honest review."}</p><Link href="/account/reviews" className="inline-flex items-center gap-2 text-[13px] text-ink underline underline-offset-4">My reviews <ArrowRight size={14} aria-hidden /></Link></div>
        </Card>
      </div>
    </>
  );
}
