import { Sparkles } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/account/page-header";
import { QuoteButtons } from "@/components/account/quote-buttons";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, Monogram, StatusBadge } from "@/components/ui/display";
import { formatDate } from "@/lib/format";
import { GEMSTONES, METALS } from "@/lib/jewelry";
import { formatMoney } from "@/lib/money";
import { CUSTOM_REQUEST_STATUS } from "@/lib/status";
import { num } from "@/lib/utils";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";

export default async function CustomRequestsPage() {
  const user = await requireUser("/account/custom-requests");
  const requests = await db.customRequest.findMany({
    where: { buyerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      seller: { select: { storeName: true } },
      category: { select: { name: true } },
      quotes: { orderBy: { createdAt: "asc" }, include: { seller: { select: { storeName: true, slug: true, logoUrl: true } } } },
    },
  });

  return (
    <>
      <PageHeader
        title="Custom Commissions"
        description="Bespoke commissions — collaborate directly with verified jewelers from concept to finished piece."
        action={
          <Link href="/custom-orders" className={buttonVariants({ size: "sm" })}>
            New request
          </Link>
        }
      />
      {requests.length === 0 ? (
        <EmptyState icon={<Sparkles />} title="No commissions yet" action={<Link href="/custom-orders" className={buttonVariants()}>Start a request</Link>}>
          Describe the piece you have in mind and jewelers who take commissions will quote.
        </EmptyState>
      ) : (
        <ul className="space-y-5">
          {requests.map((r) => (
            <li key={r.id} className="rounded-[3px] border border-line bg-porcelain">
              <div className="border-b border-line px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[12px] text-muted">{r.reference}</p>
                    <h2 className="font-display text-[21px] text-ink">{r.title}</h2>
                    <p className="mt-0.5 text-[13px] text-muted">
                      {r.seller ? `Sent to ${r.seller.storeName}` : "Open to all jewelers who take commissions"} · {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} map={CUSTOM_REQUEST_STATUS} />
                </div>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{r.description}</p>
                <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-ink-soft">
                  <div>Budget: <span className="text-ink">{r.budgetMinMinor ? `${formatMoney(num(r.budgetMinMinor), r.currency)} – ` : "up to "}{formatMoney(num(r.budgetMaxMinor), r.currency)}</span></div>
                  {r.metalPreference && <div>Metal: <span className="text-ink">{METALS[r.metalPreference].label}</span></div>}
                  {r.gemstonePreference && <div>Stone: <span className="text-ink">{GEMSTONES[r.gemstonePreference]}</span></div>}
                  {r.ringSize && <div>Size: <span className="text-ink">US {r.ringSize}</span></div>}
                  {r.neededBy && <div>Needed by: <span className="text-ink">{formatDate(r.neededBy)}</span></div>}
                </dl>
              </div>
              {r.quotes.length > 0 ? (
                <ul className="divide-y divide-line">
                  {r.quotes.map((q) => (
                    <li key={q.id} className="flex flex-wrap gap-4 px-5 py-4">
                      <Monogram name={q.seller.storeName} src={q.seller.logoUrl} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <Link href={`/jewelers/${q.seller.slug}`} className="text-[14.5px] text-ink hover:underline">
                            {q.seller.storeName}
                          </Link>
                          <p className="font-display text-[22px] text-ink">{formatMoney(num(q.amountMinor), q.currency)}</p>
                        </div>
                        <p className="text-[12.5px] text-muted">
                          {q.leadTimeDays} days to make · {q.depositPercent}% deposit{q.validUntil ? ` · valid until ${formatDate(q.validUntil)}` : ""} · {q.status.toLowerCase()}
                        </p>
                        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{q.message}</p>
                        {q.status === "PENDING" && ["OPEN", "QUOTED"].includes(r.status) && (
                          <div className="mt-3">
                            <QuoteButtons quoteId={q.id} />
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-4 text-[13.5px] text-muted">Waiting for quotes — jewelers usually reply within 48 hours.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
