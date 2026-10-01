import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { formatMoney } from "@/lib/money";
import { num } from "@/lib/utils";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { loadCart } from "@/server/services/cart";
import { addressSnapshot, buildQuote, CheckoutError } from "@/server/services/checkout";
import { getPriceContext } from "@/server/services/currency";
import { track } from "@/server/services/analytics";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const cart = await loadCart(user.id);
  if (!cart?.items.length) redirect("/cart");

  const [ctx, addresses, cards, settings] = await Promise.all([
    getPriceContext(),
    db.address.findMany({ where: { userId: user.id, type: "SHIPPING" }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),
    db.paymentMethod.findMany({ where: { userId: user.id }, orderBy: { isDefault: "desc" } }),
    db.platformSettings.findUniqueOrThrow({ where: { id: "platform" } }),
  ]);

  const initial = addresses[0] ?? null;
  let quote = null;
  let error: string | null = null;
  if (initial) {
    try {
      quote = (await buildQuote({ userId: user.id, destination: addressSnapshot(initial), selections: { shipping: {}, signature: {}, dutiesMode: "DDP" }, ctx })).quote;
    } catch (e) {
      if (e instanceof CheckoutError) error = e.message;
      else throw e;
    }
  }
  await track("CHECKOUT_STARTED", { userId: user.id });

  return (
    <>
      <h1 className="display-lg mb-8 text-ink">Checkout</h1>
      <CheckoutFlow
        addresses={addresses.map((a) => ({ id: a.id, label: a.label, fullName: a.fullName, company: a.company, line1: a.line1, line2: a.line2, city: a.city, region: a.region, postalCode: a.postalCode, country: a.country, phone: a.phone, isDefault: a.isDefault }))}
        initialAddressId={initial?.id ?? null}
        initialQuote={quote}
        initialError={error}
        cards={cards.map((c) => ({ id: c.id, brand: c.brand, last4: c.last4, expMonth: c.expMonth, expYear: c.expYear, isDefault: c.isDefault }))}
        stripeKey={process.env.STRIPE_SECRET_KEY ? (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null) : null}
        signatureThresholdLabel={formatMoney(num(settings.signatureThresholdUsd), "USD")}
      />
    </>
  );
}
