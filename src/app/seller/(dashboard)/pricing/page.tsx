import Link from "next/link";
import { StatTile, TimeSeriesChart } from "@/components/charts/charts";
import { PageHeader } from "@/components/account/page-header";
import { RepriceButton } from "@/components/seller/reprice-button";
import { Card, CardHeader, Table, Td, Th } from "@/components/ui/display";
import { timeAgo } from "@/lib/format";
import { METALS, SPOT_METALS } from "@/lib/jewelry";
import { convertMinor, formatMoney } from "@/lib/money";
import { TROY_OUNCE_GRAMS } from "@/lib/pricing";
import { num } from "@/lib/utils";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";
import { getFxRates, getSpotHistory, getSpotQuotes } from "@/server/services/market";

export default async function SellerPricing() {
  const { seller } = await requireSeller();
  const currency = seller.defaultCurrency;
  const [quotes, fx, history, listings] = await Promise.all([
    getSpotQuotes(),
    getFxRates(),
    getSpotHistory("GOLD", 30),
    db.productVariant.findMany({
      where: { sellerId: seller.id, product: { pricingMode: "METAL_SPOT", deletedAt: null } },
      orderBy: { product: { title: "asc" } },
      include: { product: { select: { id: true, title: true, currency: true } } },
    }),
  ]);
  const perGram = (usd: number) => convertMinor(usd * 100, "USD", currency, fx, "exact");

  return (
    <>
      <PageHeader
        title="Live metal pricing"
        description="Listings priced by weight follow the spot market: weight × rate at purity + your making charge + stones, recalculated every 15 minutes and displayed dynamically on your showcases."
        action={<RepriceButton />}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {quotes.map((q) => (
          <StatTile key={q.metal} label={`${SPOT_METALS[q.metal].label} · per gram (pure)`} value={formatMoney(perGram(q.usdPerGram), currency, { exact: true })} delta={q.changePct} deltaLabel={`24h · ${formatMoney(Math.round(q.usdPerGram * TROY_OUNCE_GRAMS * 100), "USD")}/oz`} />
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader title="Gold, last 30 days" description={`Per gram of pure gold in ${currency}. 22k = 91.6%, 18k = 75% of this rate.`} />
        <div className="px-5 pt-4 pb-3">
          <TimeSeriesChart series={[{ name: "Gold", points: history.map((h) => ({ date: h.at.toISOString(), value: perGram(h.usdPerGram) })) }]} format={{ type: "money", currency }} caption="Gold spot price per gram, last 30 days" height={220} />
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Your live-priced SKUs" description={listings.length ? `${listings.length} SKUs` : undefined} />
        {listings.length === 0 ? (
          <p className="px-5 py-5 text-[14px] text-ink-soft">
            None yet. Choose <span className="text-ink">Live metal price</span> in the listing editor to price plain gold by weight.
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Listing</Th>
                <Th>SKU</Th>
                <Th>Metal</Th>
                <Th>Weight</Th>
                <Th>Making charge</Th>
                <Th>Price now</Th>
                <Th>Updated</Th>
              </tr>
            </thead>
            <tbody>
              {listings.map((v) => (
                <tr key={v.id}>
                  <Td>
                    <Link href={`/seller/products/${v.product.id}`} className="hover:underline">
                      {v.product.title}
                    </Link>
                  </Td>
                  <Td className="font-mono text-[12.5px]">{v.sku}</Td>
                  <Td>{METALS[v.metalType].label}</Td>
                  <Td>{v.metalWeightGrams} g</Td>
                  <Td>{v.makingChargeType === "PERCENT" ? `${v.makingChargeValue}%` : `${formatMoney(Math.round(v.makingChargeValue ?? 0), v.product.currency)}${v.makingChargeType === "PER_GRAM" ? "/g" : ""}`}</Td>
                  <Td className="font-medium">{formatMoney(num(v.priceMinor), v.product.currency)}</Td>
                  <Td className="text-muted">{timeAgo(v.priceComputedAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
