import Link from "next/link";
import { PageHeader } from "@/components/account/page-header";
import { EmptyState } from "@/components/ui/display";
import { buttonVariants } from "@/components/ui/button";
import { CancelInquiry } from "@/components/account/cancel-inquiry";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { num } from "@/lib/utils";
import { INQUIRY_LABELS } from "@/lib/jeweler-profile";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { inquiryStatusesForBuyer } from "@/server/services/jeweler-directory";
export default async function CustomRequests() {
  const user = await requireUser("/account/custom-requests");
  const [requests, statuses] = await Promise.all([db.customRequest.findMany({ where: { buyerId: user.id }, orderBy: { createdAt: "desc" }, include: { seller: { select: { storeName: true, slug: true } } } }), inquiryStatusesForBuyer(user.id)]);
  const statusMap = new Map(statuses.map(s => [s.id, s.inquiryStatus]));
  return <><PageHeader title="My Custom Requests" description="Requests sent to your chosen jewelers. Discuss design, quotes and delivery separately." action={<Link href="/custom-orders" className={buttonVariants()}>New request</Link>} />{!requests.length ? <EmptyState title="Your ideas start here" action={<Link href="/jewelers" className={buttonVariants()}>Find a jeweler</Link>}>Choose a jeweler and send them a custom jewelry brief.</EmptyState> : <div className="space-y-5">{requests.map(r => { const status = statusMap.get(r.id) ?? "NEW"; return <article key={r.id} className="rounded border border-line bg-porcelain p-6"><div className="flex items-start justify-between gap-5"><div><p className="text-xs text-muted">{r.reference} · {formatDate(r.createdAt)}</p><h2 className="mt-2 font-display text-2xl">{r.title}</h2><p className="mt-1 text-sm text-muted">{r.seller ? <>Sent to <Link href={`/jewelers/${r.seller.slug}`} className="underline">{r.seller.storeName}</Link></> : "Historical request — no jeweler selected"}</p></div><span className="rounded-full bg-parchment px-3 py-1 text-sm">{r.status === "CANCELLED" ? "Cancelled" : INQUIRY_LABELS[status]}</span></div><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed">{r.description}</p><div className="mt-4 flex flex-wrap gap-5 text-sm text-muted"><span>Budget: {formatMoney(num(r.budgetMaxMinor), r.currency)}</span>{r.neededBy && <span>Needed by: {formatDate(r.neededBy)}</span>}{r.ringSize && <span>Ring size: US {r.ringSize}</span>}</div>{!!r.referenceImageUrls.length && <div className="mt-4 flex gap-4">{r.referenceImageUrls.filter(url => /^(https?:\/\/|\/api\/files\/|\/uploads\/)/.test(url)).map((url, i) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-sm underline">Reference image {i + 1}</a>)}</div>}<div className="mt-5 flex items-center justify-between border-t border-line pt-4"><p className="text-xs text-muted">{status === "CONTACTED" ? "The jeweler has marked you as contacted." : status === "CLOSED" ? "This inquiry has been closed." : "Your chosen jeweler will contact you separately."}</p>{r.status !== "CANCELLED" && status !== "CLOSED" && <CancelInquiry id={r.id} />}</div></article>; })}</div>}</>;
}
