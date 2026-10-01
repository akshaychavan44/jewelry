import { CardList } from "@/components/account/card-list";
import { PageHeader } from "@/components/account/page-header";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";

export default async function PaymentMethodsPage() {
  const user = await requireUser("/account/payment-methods");
  const cards = await db.paymentMethod.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
  return (
    <>
      <PageHeader title="Payment methods" description="Tokenised by Stripe — Loupe only ever stores the card brand, last four digits and expiry." />
      <CardList demo={!process.env.STRIPE_SECRET_KEY} cards={cards.map((c) => ({ id: c.id, brand: c.brand, last4: c.last4, expMonth: c.expMonth, expYear: c.expYear, isDefault: c.isDefault, provider: c.provider }))} />
    </>
  );
}
