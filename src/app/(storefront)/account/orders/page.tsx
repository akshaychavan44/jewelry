import { Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/account/page-header";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, StatusBadge } from "@/components/ui/display";
import { formatDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { FULFILLMENT_STATUS } from "@/lib/status";
import { cn, firstParam, num, type SearchParams } from "@/lib/utils";
import { requireUser } from "@/server/auth/session";
import { getBuyerOrders } from "@/server/services/account";

const FILTERS = [
  ["all", "All"],
  ["open", "In progress"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled & refunded"],
] as const;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser("/account/orders");
  const status = (firstParam((await searchParams).status) ?? "all") as (typeof FILTERS)[number][0];
  const orders = await getBuyerOrders(user.id, FILTERS.some(([k]) => k === status) ? status : "all");

  return (
    <>
      <PageHeader title="Orders" description="Every jeweler ships separately — track each parcel, download invoices and arrange returns." />
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map(([key, label]) => (
          <Link key={key} href={key === "all" ? "/account/orders" : `/account/orders?status=${key}`} className={cn("rounded-full border px-3.5 py-1 text-[13px]", status === key ? "border-ink bg-ink text-ivory" : "border-line text-ink-soft hover:border-ink/40")}>
            {label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={<Package />} title="No orders here" action={<Link href="/shop" className={buttonVariants()}>Browse jewelry</Link>} />
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="rounded-[3px] border border-line bg-porcelain">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]">
                  <span className="font-mono text-ink">{o.orderNumber}</span>
                  <span className="text-muted">Placed {formatDate(o.placedAt ?? o.createdAt)}</span>
                  <span className="tabular text-ink-soft">{formatMoney(num(o.totalMinor), o.currency)}</span>
                </div>
                <Link href={`/account/orders/${o.orderNumber}`} className="caps text-[10.5px] text-ink underline-offset-4 hover:underline">
                  View & track →
                </Link>
              </div>
              <ul className="divide-y divide-line">
                {o.sellerOrders.map((so) => (
                  <li key={so.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <div className="flex -space-x-3">
                      {so.items.slice(0, 3).map((i) => (
                        <div key={i.id} className="relative size-14 overflow-hidden border-2 border-porcelain bg-sand">
                          {i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="56px" className="object-cover" />}
                        </div>
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] text-ink">{so.items.map((i) => i.title).join(", ")}</p>
                      <p className="text-[12.5px] text-muted">
                        {so.seller.storeName} · <span className="font-mono">{so.reference}</span>
                      </p>
                    </div>
                    <StatusBadge status={so.status} map={FULFILLMENT_STATUS} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
