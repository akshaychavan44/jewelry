import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/account/page-header";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { StatTile } from "@/components/charts/charts";
import { Card, StatusBadge, Table, Td, Th } from "@/components/ui/display";
import { formatDate, timeAgo } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { FULFILLMENT_STATUS, PAYOUT_STATUS } from "@/lib/status";
import { firstParam, type SearchParams } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";
import { listPayouts, PAYOUT_VIEWS, type PayoutView } from "@/server/services/admin";

export const metadata: Metadata = { title: "Payouts" };

export default async function PayoutsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const param = firstParam((await searchParams).view);
  const view: PayoutView = param && param in PAYOUT_VIEWS ? (param as PayoutView) : "hold";
  const [{ rows, counts, totals }, settings] = await Promise.all([listPayouts(view), db.platformSettings.findUniqueOrThrow({ where: { id: "platform" }, select: { inspectionWindowDays: true } })]);
  const usd = (m: number) => `≈ ${formatMoney(m, "USD", { compact: m >= 1_000_000_00 })}`;

  return (
    <>
      <PageHeader
        eyebrow="Escrow"
        title="Payouts"
        description={`Buyer funds are held until ${settings.inspectionWindowDays} days after delivery, then transferred to each jeweler automatically. Disputes and suspensions put payouts on hold.`}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile label="In inspection window" value={usd(totals.held)} hint={`${counts.held} payouts`} />
        <StatTile label="On hold" value={usd(totals.hold)} hint={`${counts.hold} payouts · disputes & suspensions`} />
        <StatTile label="Paid out, all time" value={usd(totals.released)} hint="USD at today's rates" />
      </div>
      <FilterTabs label="Payout status" active={view} tabs={(Object.keys(PAYOUT_VIEWS) as PayoutView[]).map((v) => ({ value: v, label: PAYOUT_VIEWS[v].label, href: `/admin/payouts?view=${v}`, count: counts[v] }))} />
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Jeweler</Th>
              <Th>Order</Th>
              <Th className="text-right">Amount</Th>
              <Th>Status</Th>
              <Th>{view === "released" ? "Paid" : "Release"}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <Td colSpan={5} className="py-10 text-center text-muted">
                  Nothing in this state.
                </Td>
              </tr>
            )}
            {rows.map((p) => (
              <tr key={p.id}>
                <Td>
                  <Link href={`/admin/kyc/${p.seller.id}`} className="text-[14px] hover:underline">
                    {p.seller.storeName}
                  </Link>
                </Td>
                <Td>
                  <Link href={`/admin/orders/${p.sellerOrder.order.orderNumber}`} className="font-mono text-[13px] hover:underline">
                    {p.sellerOrder.reference}
                  </Link>
                  <span className="mt-0.5 block">
                    <StatusBadge status={p.sellerOrder.status} map={FULFILLMENT_STATUS} />
                  </span>
                </Td>
                <Td className="text-right font-medium tabular">{formatMoney(p.amountMinor, p.currency, { exact: true })}</Td>
                <Td>
                  <StatusBadge status={p.status} map={PAYOUT_STATUS} />
                  {p.holdReason && <span className="mt-1 block text-[12px] text-muted">{p.holdReason}</span>}
                </Td>
                <Td className="text-[13px] whitespace-nowrap text-ink-soft">
                  {p.releasedAt ? (
                    <>
                      {formatDate(p.releasedAt)}
                      {p.providerTransferId && <span className="block font-mono text-[11.5px] text-muted">{p.providerTransferId}</span>}
                    </>
                  ) : p.releaseAfter ? (
                    `${p.releaseAfter.getTime() < Date.now() ? "Due" : "Scheduled"} ${timeAgo(p.releaseAfter)}`
                  ) : p.sellerOrder.deliveredAt ? (
                    `Delivered ${formatDate(p.sellerOrder.deliveredAt)}`
                  ) : (
                    "After delivery"
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
