import Link from "next/link";
import { StatTile } from "@/components/charts/charts";
import { PageHeader } from "@/components/account/page-header";
import { Card, StatusBadge, Table, Td, Th } from "@/components/ui/display";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { PAYOUT_STATUS } from "@/lib/status";
import { num } from "@/lib/utils";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";

export default async function SellerPayouts() {
  const { seller } = await requireSeller();
  const payouts = await db.payout.findMany({
    where: { sellerId: seller.id },
    orderBy: { createdAt: "desc" },
    take: 120,
    include: { sellerOrder: { select: { id: true, reference: true, status: true, deliveredAt: true } } },
  });
  const fees = await db.ledgerEntry.groupBy({ by: ["type"], where: { sellerId: seller.id, type: { in: ["LISTING_FEE", "SUBSCRIPTION_FEE"] } }, _sum: { amountUsdMinor: true } });

  // Totals per status and currency (payouts settle in the buyer's order currency).
  const totals = new Map<string, number>();
  for (const p of payouts) totals.set(`${p.status}:${p.currency}`, (totals.get(`${p.status}:${p.currency}`) ?? 0) + num(p.amountMinor));
  const line = (status: string) =>
    [...totals.entries()]
      .filter(([k]) => k.startsWith(`${status}:`))
      .map(([k, v]) => formatMoney(v, k.split(":")[1], { compact: v >= 1_000_000_00 }))
      .join(" · ") || "—";

  return (
    <>
      <PageHeader
        title="Payouts"
        description={`Funds are held by Loupe until three days after delivery, then transferred to your ${seller.payoutMethod === "STRIPE_CONNECT" ? "Stripe account" : "bank account"} automatically.`}
      />
      <div className="grid gap-3 md:grid-cols-4">
        <StatTile label="Held for inspection" value={line("PENDING")} />
        <StatTile label="On hold (return / case)" value={line("ON_HOLD")} />
        <StatTile label="Paid out" value={line("RELEASED")} />
        <StatTile label="Platform fees (USD)" value={formatMoney(fees.reduce((n, f) => n + num(f._sum.amountUsdMinor), 0), "USD")} hint="Listing & plan fees" />
      </div>
      <Card className="mt-6">
        <Table>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
              <Th>Release</Th>
              <Th>Transfer</Th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id}>
                <Td>
                  <Link href={`/seller/orders/${p.sellerOrder.id}`} className="font-mono text-[13px] hover:underline">
                    {p.sellerOrder.reference}
                  </Link>
                </Td>
                <Td className="font-medium">{formatMoney(num(p.amountMinor), p.currency)}</Td>
                <Td>
                  <StatusBadge status={p.status} map={PAYOUT_STATUS} />
                  {p.holdReason && <span className="ml-2 text-[12px] text-muted">{p.holdReason}</span>}
                </Td>
                <Td className="text-[13px] text-ink-soft">{p.releasedAt ? `Paid ${formatDate(p.releasedAt)}` : p.releaseAfter ? formatDate(p.releaseAfter) : "After delivery"}</Td>
                <Td className="font-mono text-[12px] text-muted">{p.providerTransferId ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
