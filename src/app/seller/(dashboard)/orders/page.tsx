import { Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/account/page-header";
import { EmptyState, StatusBadge, Table, Td, Th } from "@/components/ui/display";
import type { FulfillmentStatus } from "@/generated/prisma/enums";
import { formatDate, formatDateRange } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import type { AddressSnapshot } from "@/lib/order-math";
import { countryName } from "@/lib/regions";
import { METHOD_LABELS } from "@/lib/shipping";
import { FULFILLMENT_STATUS } from "@/lib/status";
import { cn, firstParam, num, type SearchParams } from "@/lib/utils";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";

const TABS: [string, string, FulfillmentStatus[] | null][] = [
  ["open", "To do", ["PENDING", "PROCESSING", "IN_PRODUCTION"]],
  ["shipped", "Shipped", ["SHIPPED"]],
  ["delivered", "Delivered", ["DELIVERED"]],
  ["closed", "Cancelled & refunded", ["CANCELLED", "REFUNDED"]],
  ["all", "All", null],
];

export default async function SellerOrders({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { seller } = await requireSeller();
  const tab = firstParam((await searchParams).tab) ?? "open";
  const statuses = TABS.find(([k]) => k === tab)?.[2] ?? null;
  const orders = await db.sellerOrder.findMany({
    where: { sellerId: seller.id, order: { paymentStatus: { not: "PENDING" } }, ...(statuses ? { status: { in: statuses } } : {}) },
    orderBy: { createdAt: tab === "open" ? "asc" : "desc" },
    take: 100,
    include: { order: { select: { orderNumber: true, shippingAddress: true } }, items: { select: { title: true, imageUrl: true, quantity: true, engravingText: true, ringSize: true } }, disputes: { where: { status: { notIn: ["RESOLVED", "CLOSED"] } }, select: { id: true } } },
  });

  return (
    <>
      <PageHeader title="Orders" description="Your part of each checkout — ship insured, signature required, to the address shown." />
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map(([key, label]) => (
          <Link key={key} href={`/seller/orders?tab=${key}`} className={cn("rounded-full border px-3.5 py-1 text-[13px]", tab === key ? "border-ink bg-ink text-ivory" : "border-line text-ink-soft hover:border-ink/40")}>
            {label}
          </Link>
        ))}
      </div>
      {orders.length === 0 ? (
        <EmptyState icon={<Package />} title="Nothing here" />
      ) : (
        <div className="rounded-[3px] border border-line bg-porcelain">
          <Table>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Pieces</Th>
                <Th>Ship to</Th>
                <Th>Service</Th>
                <Th>Due</Th>
                <Th>Your net</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((so) => {
                const to = so.order.shippingAddress as AddressSnapshot;
                return (
                  <tr key={so.id} className="hover:bg-parchment/30">
                    <Td>
                      <Link href={`/seller/orders/${so.id}`} className="font-mono text-[13px] text-ink hover:underline">
                        {so.reference}
                      </Link>
                      <p className="text-[12px] text-muted">{formatDate(so.createdAt)}</p>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <span className="relative size-10 shrink-0 overflow-hidden bg-sand">{so.items[0]?.imageUrl && <Image src={so.items[0].imageUrl} alt="" fill sizes="40px" className="object-cover" />}</span>
                        <span className="max-w-56">
                          <span className="block truncate">{so.items.map((i) => (i.quantity > 1 ? `${i.quantity}× ${i.title}` : i.title)).join(", ")}</span>
                          <span className="text-[12px] text-muted">
                            {[so.items.some((i) => i.engravingText) && "engraving", so.items.some((i) => i.ringSize) && "sizing", so.disputes.length > 0 && "open case"].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap">
                      {to.city}, {countryName(to.country)}
                    </Td>
                    <Td className="whitespace-nowrap">{METHOD_LABELS[so.shippingMethod].label}</Td>
                    <Td className="whitespace-nowrap text-[13px]">{formatDateRange(so.estimatedDeliveryFrom, so.estimatedDeliveryTo)}</Td>
                    <Td className="whitespace-nowrap">{formatMoney(num(so.sellerNetMinor), so.currency)}</Td>
                    <Td>
                      <StatusBadge status={so.status} map={FULFILLMENT_STATUS} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </>
  );
}
