import { PageHeader } from "@/components/account/page-header";
import { Stars, EmptyState } from "@/components/ui/display";
import { JewelerReviewResponse } from "@/components/account/jeweler-review-form";
import { requireSeller } from "@/server/auth/session";
import { jewelerReviews } from "@/server/services/discovery";
import { formatDate } from "@/lib/format";
export default async function Reviews() {
  const { seller } = await requireSeller(); const reviews = await jewelerReviews(seller.id);
  return <><PageHeader title="Customer Reviews" description="Read customer feedback, add a public reply, or report a concern to the admin." />{!reviews.length ? <EmptyState title="No customer reviews yet">Customer reviews of your business will appear here and on your public profile.</EmptyState> : <div className="grid grid-cols-2 gap-5">{reviews.map(r => <article key={r.id} className="rounded border border-line bg-porcelain p-6"><Stars rating={r.rating} /><p className="mt-3 text-xs text-muted">{r.authorName?.split(" ")[0] ?? "Customer"} · {formatDate(r.createdAt)}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{r.body}</p>{r.reportedReason && <p className="mt-3 text-xs text-muted">Report awaiting admin review</p>}<JewelerReviewResponse id={r.id} reply={r.sellerReply} /></article>)}</div>}</>;
}
