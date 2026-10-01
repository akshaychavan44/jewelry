import type Stripe from "stripe";
import { db } from "@/server/db";
import { markOrderPaid, markPaymentFailed } from "@/server/services/checkout";
import { stripe } from "@/server/services/payments";

// Stripe → Loupe. Signature-verified; every handler is idempotent because
// Stripe retries deliveries.
export async function POST(req: Request) {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !secret) return new Response("Stripe not configured", { status: 501 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object;
      const orderId = pi.metadata.orderId;
      if (orderId) {
        const pm = typeof pi.payment_method === "string" ? await s.paymentMethods.retrieve(pi.payment_method).catch(() => null) : null;
        await markOrderPaid(orderId, {
          providerRef: pi.id,
          chargeId: typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id,
          methodSummary: pm?.card ? `${pm.card.brand.toUpperCase()} •••• ${pm.card.last4}` : null,
        });
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object;
      await markPaymentFailed(pi.id, pi.last_payment_error?.message);
      break;
    }
    case "account.updated": {
      const account = event.data.object;
      await db.sellerProfile.updateMany({
        where: { stripeAccountId: account.id },
        data: { stripeChargesEnabled: account.charges_enabled, stripePayoutsEnabled: account.payouts_enabled, stripeDetailsSubmitted: account.details_submitted },
      });
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      for (const refund of charge.refunds?.data ?? []) {
        await db.refund.updateMany({ where: { providerRefundId: refund.id }, data: { status: refund.status === "succeeded" ? "SUCCEEDED" : refund.status === "failed" ? "FAILED" : "PENDING" } });
      }
      break;
    }
  }
  return Response.json({ received: true });
}
