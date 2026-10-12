import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";
import type { JewelerReview } from "@/server/services/discovery";
import { moderateJewelerReview } from "@/server/actions/jeweler-reviews";
import { PageHeader } from "@/components/account/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
export default async function ReviewModeration() {
  await requireAdmin();
  const reviews = await db.$queryRaw<JewelerReview[]>`SELECT r.*, s."storeName" FROM "JewelerReview" r JOIN "SellerProfile" s ON s."id" = r."sellerId" WHERE r."reportedReason" <> '' OR r."status" = 'HIDDEN' ORDER BY r."updatedAt" DESC`;
  return <><PageHeader title="Review Moderation" description="Review reported feedback. Only admins can hide customer reviews." />{!reviews.length && <p>No reported reviews.</p>}{reviews.map(r => <article key={r.id} className="mb-4 rounded border border-line bg-porcelain p-6"><h2>{r.storeName} · {r.rating} stars</h2><p className="my-3 whitespace-pre-wrap">{r.body}</p><p className="text-sm text-muted">Report: {r.reportedReason || "Previously hidden"}</p><form action={moderateJewelerReview} className="mt-4 flex gap-4"><input name="id" type="hidden" value={r.id} /><select name="status" defaultValue={r.status}><option value="PUBLISHED">Keep / restore published</option><option value="HIDDEN">Hide review</option></select><SubmitButton size="sm">Apply decision</SubmitButton></form></article>)}</>;
}
