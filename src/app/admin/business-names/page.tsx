import { PageHeader } from "@/components/account/page-header";
import { BusinessNameReview } from "@/components/admin/business-name-review";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";
import type { NameChange } from "@/server/services/jeweler-directory";

export default async function BusinessNames() {
  await requireAdmin();
  const rows = await db.$queryRaw<(NameChange & { storeName: string })[]>`SELECT n.*, s."storeName" FROM "BusinessNameChange" n JOIN "SellerProfile" s ON s."id" = n."sellerId" WHERE n."status" = 'PENDING' ORDER BY n."createdAt" ASC`;
  return <><PageHeader title="Business name changes" description="Review requested changes to approved business identities." />
    {!rows.length && <p className="rounded border border-line p-6 text-muted">No business name changes awaiting review.</p>}
    <div className="space-y-6">{rows.map((r) => <section key={r.id} className="rounded border border-line bg-porcelain p-6"><p className="text-sm text-muted">Current name: {r.storeName}</p><h2 className="mt-2 font-display text-2xl">Requested: {r.requestedName}</h2><p className="mt-3 whitespace-pre-wrap text-sm">{r.reason}</p><BusinessNameReview id={r.id} /></section>)}</div>
  </>;
}
