import { CheckCircle2, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { formatDateRange } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { firstParam, num, type SearchParams } from "@/lib/utils";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { markOrderPaid } from "@/server/services/checkout";
import { stripe } from "@/server/services/payments";

export const metadata: Metadata = { title: "Order confirmed" };

export default async function CheckoutCompletePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const user = await requireUser("/account/orders");
  const orderNumber = firstParam(sp.order);
  if (!orderNumber) notFound();

  // Returning from Stripe: confirm the PaymentIntent directly so the page is
  // correct even before the webhook arrives (markOrderPaid is idempotent).
  const intentId = firstParam(sp.payment_intent);
  if (intentId && stripe()) {
    const intent = await stripe()!.paymentIntents.retrieve(intentId);
    const order = await db.order.findUnique({ where: { orderNumber }, select: { id: true, buyerId: true } });
    if (order?.buyerId === user.id && intent.status === "succeeded" && intent.metadata.orderId === order.id) {
      await markOrderPaid(order.id, { providerRef: intent.id, chargeId: typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge?.id });
    }
  }

  const order = await db.order.findUnique({
    where: { orderNumber },
    include: { sellerOrders: { include: { seller: { select: { storeName: true } }, items: true } } },
  });
  if (!order || order.buyerId !== user.id) notFound();
  const paid = order.paymentStatus === "SUCCEEDED";

  return (
    <div className="mx-auto max-w-2xl py-6 text-center">
      {paid ? <CheckCircle2 className="mx-auto size-12 text-sage" strokeWidth={1.2} /> : <Clock className="mx-auto size-12 text-amber" strokeWidth={1.2} />}
      <p className="eyebrow mt-6">{paid ? "Thank you" : "Almost there"}</p>
      <h1 className="display-lg mt-3 text-ink">{paid ? "Your order is confirmed" : "We're confirming your payment"}</h1>
      <p className="mt-4 text-[15.5px] text-ink-soft">
        Order <span className="font-mono text-ink">{order.orderNumber}</span> · {formatMoney(num(order.totalMinor), order.currency)}. A confirmation is on its way to {order.email}.
      </p>

      <ul className="mt-10 divide-y divide-line rounded-[3px] border border-line bg-porcelain text-left">
        {order.sellerOrders.map((so) => (
          <li key={so.id} className="px-5 py-4">
            <p className="text-[14px] text-ink">
              {so.seller.storeName} <span className="font-mono text-[12px] text-muted">{so.reference}</span>
            </p>
            <p className="mt-1 text-[13px] text-ink-soft">
              {so.items.map((i) => i.title).join(", ")} · estimated arrival {formatDateRange(so.estimatedDeliveryFrom, so.estimatedDeliveryTo)}
            </p>
          </li>
        ))}
      </ul>

      <p className="mx-auto mt-8 max-w-lg text-[14px] text-ink-soft">
        Each jeweler ships separately, fully insured. Your payment stays with Loupe until you&rsquo;ve received each piece — you&rsquo;ll have three days to raise anything before the jeweler is paid.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={`/account/orders/${order.orderNumber}`} className={buttonVariants({ size: "lg" })}>
          Track your order
        </Link>
        <Link href="/shop" className={buttonVariants({ size: "lg", variant: "outline" })}>
          Continue browsing
        </Link>
      </div>
    </div>
  );
}
