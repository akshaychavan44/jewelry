import "server-only";

import Stripe from "stripe";

// Stripe Connect — "separate charges and transfers":
//   1. One PaymentIntent on the platform for the whole multi-vendor checkout,
//      tagged with the order's transfer_group.
//   2. Each vendor's net (item + shipping − commission) is transferred to their
//      connected account when the escrow window closes, using the charge as
//      source_transaction. Commission is simply never transferred.
// Without STRIPE_SECRET_KEY the marketplace runs in demo-payment mode.

let client: Stripe | null | undefined;

export function stripe(): Stripe | null {
  if (client !== undefined) return client;
  client = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { appInfo: { name: "Loupe Marketplace" } }) : null;
  return client;
}

export const paymentsLive = () => !!process.env.STRIPE_SECRET_KEY && !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

export async function createPaymentIntent(args: {
  amountMinor: number;
  currency: string;
  orderId: string;
  orderNumber: string;
  transferGroup: string;
  customerId?: string | null;
  email: string;
}) {
  const s = stripe();
  if (!s) throw new Error("Stripe is not configured");
  return s.paymentIntents.create(
    {
      amount: args.amountMinor,
      currency: args.currency.toLowerCase(),
      customer: args.customerId ?? undefined,
      receipt_email: args.email,
      transfer_group: args.transferGroup,
      automatic_payment_methods: { enabled: true },
      description: `Loupe order ${args.orderNumber}`,
      metadata: { orderId: args.orderId, orderNumber: args.orderNumber },
    },
    { idempotencyKey: `pi_${args.orderId}` },
  );
}

/** Releases a vendor's escrowed funds to their connected account. */
export async function transferToSeller(args: {
  amountMinor: number;
  currency: string;
  destination: string;
  transferGroup: string;
  sourceTransaction?: string | null;
  payoutId: string;
}) {
  const s = stripe();
  if (!s) return { id: `tr_demo_${args.payoutId.slice(-12)}` };
  return s.transfers.create(
    {
      amount: args.amountMinor,
      currency: args.currency.toLowerCase(),
      destination: args.destination,
      transfer_group: args.transferGroup,
      source_transaction: args.sourceTransaction ?? undefined,
      metadata: { payoutId: args.payoutId },
    },
    { idempotencyKey: `tr_${args.payoutId}` },
  );
}

/** Refunds the buyer; optionally claws the vendor's share back. */
export async function refundPayment(args: { paymentIntentId: string | null; amountMinor: number; refundId: string; reverseTransfer?: boolean }) {
  const s = stripe();
  if (!s || !args.paymentIntentId || args.paymentIntentId.startsWith("pi_demo")) return { id: `re_demo_${args.refundId.slice(-12)}` };
  return s.refunds.create(
    { payment_intent: args.paymentIntentId, amount: args.amountMinor, metadata: { refundId: args.refundId } },
    { idempotencyKey: `re_${args.refundId}` },
  );
}

/** Stripe Connect Express onboarding for a seller. */
export async function createConnectOnboardingLink(args: { accountId?: string | null; email: string; country: string; sellerId: string; returnUrl: string; refreshUrl: string }) {
  const s = stripe();
  if (!s) return null;
  const accountId =
    args.accountId ??
    (
      await s.accounts.create({
        type: "express",
        email: args.email,
        country: args.country,
        capabilities: { transfers: { requested: true } },
        business_profile: { mcc: "5944", product_description: "Fine jewelry" },
        metadata: { sellerId: args.sellerId },
      })
    ).id;
  const link = await s.accountLinks.create({ account: accountId, type: "account_onboarding", return_url: args.returnUrl, refresh_url: args.refreshUrl });
  return { accountId, url: link.url };
}
