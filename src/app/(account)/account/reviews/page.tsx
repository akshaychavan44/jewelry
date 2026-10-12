import Link from "next/link";
import { PageHeader } from "@/components/account/page-header";
import { EmptyState } from "@/components/ui/display";
import { JewelerReviewForm, DeleteJewelerReview } from "@/components/account/jeweler-review-form";
import { requireUser } from "@/server/auth/session";
import { myReviews } from "@/server/services/discovery";
export default async function MyReviews() {
  const user = await requireUser("/account/reviews"); const reviews = await myReviews(user.id);
  return <><PageHeader title="My Reviews" description="Share honest feedback and manage the reviews you have written." />{!reviews.length ? <EmptyState title="No reviews yet">Visit a <Link href="/jewelers" className="underline">jeweler’s profile</Link> to review your experience.</EmptyState> : <div className="space-y-6">{reviews.map(r => <article key={r.id}><Link href={`/jewelers/${r.slug}`} className="mb-3 block font-display text-2xl">{r.storeName}</Link>{r.status === "HIDDEN" && <p className="mb-3 text-sm text-muted">This review has been hidden by moderation.</p>}<JewelerReviewForm sellerId={r.sellerId} rating={r.rating} body={r.body} />{r.sellerReply && <p className="mt-3 text-sm text-ink-soft">Jeweler’s reply: {r.sellerReply}</p>}<DeleteJewelerReview id={r.id} /></article>)}</div>}</>;
}
