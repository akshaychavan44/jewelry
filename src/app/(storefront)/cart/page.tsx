import { ShieldCheck, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CartLineActions } from "@/components/cart/cart-line-actions";
import { LineSummary } from "@/components/cart/line-summary";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, Monogram } from "@/components/ui/display";
import { formatDateRange } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { countryName } from "@/lib/regions";
import { cn, num, pluralize } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { buildCartView, loadCart } from "@/server/services/cart";
import { getPriceContext } from "@/server/services/currency";

export const metadata: Metadata = { title: "Your cart" };

async function destinationFor(userId?: string, currency?: string) {
  if (userId) {
    const addr = await db.address.findFirst({ where: { userId, type: "SHIPPING" }, orderBy: { isDefault: "desc" }, select: { country: true } });
    if (addr) return addr.country;
  }
  return ({ GBP: "GB", INR: "IN", EUR: "FR", AED: "AE", AUD: "AU", CAD: "CA", SGD: "SG", JPY: "JP", CHF: "CH" } as Record<string, string>)[currency ?? ""] ?? "US";
}

export default async function CartPage() {
  const [user, ctx] = await Promise.all([getCurrentUser(), getPriceContext()]);
  const [cart, settings] = await Promise.all([loadCart(user?.id), db.platformSettings.findUnique({ where: { id: "platform" } })]);
  const destination = await destinationFor(user?.id, ctx.currency);
  const view = await buildCartView(cart, ctx, destination, num(settings?.secureCourierThresholdUsd ?? 2_500_000));

  if (!view.groups.length) {
    return (
      <div className="shell py-20">
        <EmptyState
          icon={<ShoppingBag />}
          title="Your cart is empty"
          action={
            <Link href="/shop" className={buttonVariants()}>
              Browse jewelry
            </Link>
          }
        >
          Pieces you add from any jeweler appear here, grouped by who will ship them.
        </EmptyState>
      </div>
    );
  }

  const estShipping = view.groups.reduce((n, g) => n + (g.options[0]?.price.amountMinor ?? 0), 0);

  return (
    <div className="shell pt-10 pb-24">
      <h1 className="display-lg text-ink">Your cart</h1>
      <p className="mt-2 text-[14px] text-ink-soft">
        {pluralize(view.itemCount, "piece")} from {pluralize(view.groups.length, "jeweler")}. Each jeweler ships separately, fully insured.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {view.groups.map((g) => {
            const cheapest = g.options[0];
            return (
              <section key={g.seller.id} aria-label={`From ${g.seller.name}`} className="rounded-[3px] border border-line bg-porcelain">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Monogram name={g.seller.name} size={36} />
                    <div>
                      <p className="text-[11px] tracking-[0.12em] text-muted uppercase">Sold &amp; shipped by</p>
                      <Link href={`/jewelers/${g.seller.slug}`} className="text-[15px] text-ink hover:underline">
                        {g.seller.name}
                      </Link>
                    </div>
                  </div>
                  <p className="text-[13px] text-muted">
                    From {g.seller.city}, {countryName(g.seller.country)}
                  </p>
                </header>
                <ul className="divide-y divide-line">
                  {g.lines.map((line) => (
                    <li key={line.id} className="px-5 py-5">
                      <LineSummary line={line}>
                        <CartLineActions itemId={line.id} quantity={line.quantity} max={line.maxQuantity} />
                      </LineSummary>
                    </li>
                  ))}
                </ul>
                <footer className={cn("border-t border-line px-5 py-3.5 text-[13px]", g.shipsToDestination ? "bg-parchment/50 text-ink-soft" : "bg-rosewood-mist text-rosewood")}>
                  {g.shipsToDestination && cheapest ? (
                    <>
                      To {countryName(destination)}: {cheapest.isFree ? "complimentary" : formatMoney(cheapest.price.amountMinor, cheapest.price.currency)} {cheapest.label.toLowerCase()} · arrives {formatDateRange(cheapest.window.from, cheapest.window.to)}
                      {g.options.length > 1 && <span className="text-muted"> · {g.options.length - 1} more options at checkout</span>}
                    </>
                  ) : (
                    <>{g.seller.name} doesn&rsquo;t ship to {countryName(destination)}. Choose another delivery address at checkout.</>
                  )}
                </footer>
              </section>
            );
          })}
        </div>

        <aside className="h-fit space-y-5 rounded-[3px] border border-line bg-porcelain p-6 lg:sticky lg:top-28">
          <h2 className="caps text-ink">Summary</h2>
          <dl className="space-y-2.5 text-[14px]">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Subtotal</dt>
              <dd className="tabular text-ink">{formatMoney(view.subtotal.amountMinor, view.subtotal.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Insured shipping (est.)</dt>
              <dd className="tabular text-ink">{estShipping ? formatMoney(estShipping, ctx.currency) : "Complimentary"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Taxes &amp; duties</dt>
              <dd className="text-muted">At checkout</dd>
            </div>
          </dl>
          <div className="flex justify-between border-t border-line pt-4">
            <span className="text-[15px] text-ink">Estimated total</span>
            <span className="tabular font-display text-[24px] text-ink">{formatMoney(view.subtotal.amountMinor + estShipping, ctx.currency)}</span>
          </div>
          <Link href={user ? "/checkout" : "/login?callbackUrl=/checkout"} className={cn(buttonVariants({ size: "lg" }), "w-full", view.hasIssues && "pointer-events-none opacity-50")} aria-disabled={view.hasIssues}>
            {user ? "Checkout securely" : "Sign in to checkout"}
          </Link>
          {view.hasIssues && <p className="text-[13px] text-rosewood">Remove unavailable pieces to continue.</p>}
          <p className="flex gap-2.5 text-[12.5px] leading-relaxed text-muted">
            <ShieldCheck className="size-4 shrink-0 text-sage-deep" strokeWidth={1.5} />
            Your payment is held by Loupe and released to each jeweler only after you&rsquo;ve received and approved your piece.
          </p>
        </aside>
      </div>
    </div>
  );
}
