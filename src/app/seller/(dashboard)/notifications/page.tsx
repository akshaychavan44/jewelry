import Link from "next/link";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/account/page-header";
import { EmptyState } from "@/components/ui/display";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/format";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";
import { markInquiryNotificationsReadAction } from "@/server/actions/inquiry-notifications";
import { inquiryEmailAvailable } from "@/server/services/inquiry-notifications";

export default async function InquiryNotifications() {
  const { user } = await requireSeller();
  const through = new Date();
  const notifications = await db.notification.findMany({ where: { userId: user.id, type: "CUSTOM_REQUEST", createdAt: { lte: through } }, orderBy: { createdAt: "desc" }, take: 100 });
  return <><PageHeader title="Enquiry notifications" description="New customer enquiries and updates for your business." action={notifications.some(n => !n.readAt) ? <form action={markInquiryNotificationsReadAction}><input type="hidden" name="through" value={through.toISOString()} /><SubmitButton variant="outline" pendingLabel="Updating…">Mark all as read</SubmitButton></form> : undefined} />
    <p className="mb-6 text-sm text-muted">{inquiryEmailAvailable() ? "Email alerts are enabled for new enquiries and status updates." : "Dashboard alerts are active. Email alerts will be available once Jewelrex’s email sender is configured."} Reading a notification does not change the enquiry’s status.</p>
    {!notifications.length ? <EmptyState icon={<Bell />} title="No enquiry notifications yet">New enquiries will appear here.</EmptyState> : <ul className="space-y-3">{notifications.map(n => <li key={n.id} className={`rounded border border-line p-5 ${n.readAt ? "bg-porcelain" : "bg-parchment"}`}><div className="flex flex-wrap items-start justify-between gap-3"><h2 className="text-sm font-medium">{!n.readAt && <span className="mr-2 inline-block size-2 rounded-full bg-sage" aria-label="Unread" />}{n.title}</h2><time dateTime={n.createdAt.toISOString()} className="text-xs text-muted">{formatDate(n.createdAt)}</time></div><p className="mt-2 break-words text-sm text-ink-soft">{n.body}</p><Link href="/seller/custom-requests" className="mt-3 inline-block text-sm underline">View custom enquiries</Link></li>)}</ul>}
    {notifications.length === 100 && <p className="mt-5 text-xs text-muted">Showing your latest 100 notifications.</p>}
  </>;
}
