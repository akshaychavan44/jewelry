import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/account/page-header";
import { CommissionStatus, QuoteForm } from "@/components/seller/quote-form";
import { EmptyState, StatusBadge } from "@/components/ui/display";
import { formatDate, timeAgo } from "@/lib/format";
import { GEMSTONES, METALS } from "@/lib/jewelry";
import { formatMoney } from "@/lib/money";
import { CUSTOM_REQUEST_STATUS } from "@/lib/status";
import { num } from "@/lib/utils";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";

export default async function SellerCommissions() {
  const { seller } = await requireSeller();
  const [open, mine] = await Promise.all([
    db.customRequest.findMany({
      where: { status: { in: ["OPEN", "QUOTED"] }, OR: [{ sellerId: null }, { sellerId: seller.id }], buyer: { id: { not: seller.userId } } },
      orderBy: { createdAt: "desc" },
      include: { buyer: { select: { name: true, country: true } }, category: { select: { name: true } }, quotes: { where: { sellerId: seller.id } } },
    }),
    db.customRequest.findMany({
      where: { acceptedQuote: { sellerId: seller.id } },
      orderBy: { updatedAt: "desc" },
      include: { buyer: { select: { name: true } }, acceptedQuote: true },
    }),
  ]);

  return (
    <>
      <PageHeader title="Commissions" description={seller.acceptsCustomOrders ? "Requests sent to you, and open briefs any verified jeweler can quote on." : "You're not taking commissions — turn them on in store settings to quote."} />

      {mine.length > 0 && (
        <section className="mb-10">
          <h2 className="caps mb-3 text-ink">Your commissions</h2>
          <ul className="divide-y divide-line rounded-[3px] border border-line bg-porcelain">
            {mine.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-[14.5px] text-ink">{r.title}</p>
                  <p className="text-[12.5px] text-muted">
                    {r.buyer.name} · {r.acceptedQuote && `${formatMoney(num(r.acceptedQuote.amountMinor), r.acceptedQuote.currency)} · ${r.acceptedQuote.leadTimeDays} days`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={r.status} map={CUSTOM_REQUEST_STATUS} />
                  <CommissionStatus requestId={r.id} status={r.status} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="caps mb-3 text-ink">Open requests</h2>
      {open.length === 0 ? (
        <EmptyState icon={<Sparkles />} title="No open requests right now" />
      ) : (
        <ul className="space-y-4">
          {open.map((r) => {
            const quoted = r.quotes[0];
            return (
              <li key={r.id} className="rounded-[3px] border border-line bg-porcelain">
                <div className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-[20px] text-ink">{r.title}</p>
                      <p className="text-[12.5px] text-muted">
                        {r.buyer.name} · {timeAgo(r.createdAt)} · {r.sellerId ? "sent to you directly" : "open brief"}
                        {r.category && ` · ${r.category.name}`}
                      </p>
                    </div>
                    <p className="text-[13.5px] text-ink-soft">
                      Budget {r.budgetMinMinor ? `${formatMoney(num(r.budgetMinMinor), r.currency)} – ` : "up to "}
                      <span className="text-ink">{formatMoney(num(r.budgetMaxMinor), r.currency)}</span>
                    </p>
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{r.description}</p>
                  <p className="mt-2 text-[12.5px] text-muted">
                    {[r.metalPreference && METALS[r.metalPreference].label, r.gemstonePreference && GEMSTONES[r.gemstonePreference], r.ringSize && `size US ${r.ringSize}`, r.neededBy && `needed by ${formatDate(r.neededBy)}`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="border-t border-line px-5 py-4">
                  {quoted ? (
                    <p className="text-[13.5px] text-sage-deep">
                      You quoted {formatMoney(num(quoted.amountMinor), quoted.currency)} · {quoted.leadTimeDays} days · {quoted.status.toLowerCase()}
                    </p>
                  ) : seller.acceptsCustomOrders ? (
                    <QuoteForm requestId={r.id} currency={seller.defaultCurrency} />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
