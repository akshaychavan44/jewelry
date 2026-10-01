import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/account/page-header";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { Card, Pagination, StatusBadge, Table, Td, Th } from "@/components/ui/display";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { FULFILLMENT_STATUS, PAYMENT_STATUS } from "@/lib/status";
import { firstParam, type SearchParams } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/session";
import { listOrders } from "@/server/services/admin";

export const metadata: Metadata = { title: "Orders" };

const PAYMENT_TABS = [
  { value: "ALL", label: "All orders" },
  { value: "SUCCEEDED", label: "Paid" },
  { value: "PARTIALLY_REFUNDED", label: "Partially refunded" },
  { value: "REFUNDED", label: "Refunded" },
] as const;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = firstParam(sp.q)?.trim() || undefined;
  const payment = PAYMENT_TABS.find((t) => t.value === firstParam(sp.payment)?.toUpperCase())?.value ?? "ALL";
  const page = Math.max(1, Number(firstParam(sp.page)) || 1);
  const { rows, total, pageCount } = await listOrders({ q, payment: payment === "ALL" ? undefined : payment, page });
  const href = (over: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, payment: payment === "ALL" ? undefined : payment, ...over })) if (v !== undefined && v !== "") params.set(k, String(v));
    return `/admin/orders${params.size ? `?${params}` : ""}`;
  };

  return (
    <>
      <PageHeader eyebrow="Commerce" title="Orders" description={`${total.toLocaleString("en-US")} orders. Each order splits into one shipment per jeweler, settled separately.`} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <FilterTabs label="Payment status" active={payment} tabs={PAYMENT_TABS.map((t) => ({ value: t.value, label: t.label, href: href({ payment: t.value === "ALL" ? undefined : t.value, page: undefined }) }))} />
        <form className="mb-5" action="/admin/orders">
          {payment !== "ALL" && <input type="hidden" name="payment" value={payment} />}
          <Input name="q" defaultValue={q} placeholder="Order number or email" aria-label="Search orders" className="h-10 w-64" />
        </form>
      </div>
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Buyer</Th>
              <Th>Jewelers</Th>
              <Th className="text-right">Total</Th>
              <Th>Payment</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <Td colSpan={5} className="py-10 text-center text-muted">
                  No orders match {q ? `“${q}”` : "this filter"}.
                </Td>
              </tr>
            )}
            {rows.map((o) => (
              <tr key={o.id} className="hover:bg-parchment/40">
                <Td>
                  <Link href={`/admin/orders/${o.orderNumber}`} className="font-mono text-[13px] text-ink hover:underline">
                    {o.orderNumber}
                  </Link>
                  <span className="block text-[12px] text-muted">{formatDate(o.placedAt ?? o.createdAt)}</span>
                </Td>
                <Td className="text-[13.5px]">
                  <span className="block text-ink">{o.buyer.name ?? "—"}</span>
                  <span className="text-[12.5px] text-muted">{o.email}</span>
                </Td>
                <Td>
                  <ul className="space-y-1">
                    {o.sellerOrders.map((so) => (
                      <li key={so.id} className="flex flex-wrap items-center gap-2 text-[13px] text-ink-soft">
                        {so.seller.storeName} <StatusBadge status={so.status} map={FULFILLMENT_STATUS} />
                      </li>
                    ))}
                  </ul>
                </Td>
                <Td className="text-right tabular">{formatMoney(o.totalMinor, o.currency, { exact: true })}</Td>
                <Td>
                  <StatusBadge status={o.paymentStatus} map={PAYMENT_STATUS} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <div className="mt-6">
        <Pagination page={page} pageCount={pageCount} hrefFor={(p) => href({ page: p })} />
      </div>
    </>
  );
}
