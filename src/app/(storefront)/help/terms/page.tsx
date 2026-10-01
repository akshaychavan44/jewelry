import type { Metadata } from "next";
import Link from "next/link";
import { PolicyLayout } from "@/components/help/policy-layout";
import { bpsToPercent } from "@/lib/money";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Terms of use" };

export default async function TermsPage() {
  const settings = await db.platformSettings.findUniqueOrThrow({ where: { id: "platform" } });
  return (
    <PolicyLayout
      current="/help/terms"
      title="Terms of use"
      updated="September 2026"
      sample
      intro="Loupe is a marketplace: independent jewelers list and sell their own pieces, and we run the platform, take payment on their behalf and step in when something goes wrong. These terms explain what that means for you."
    >
      <h2>1. Who you&rsquo;re buying from</h2>
      <p>
        Each piece is sold by the jeweler named on the listing (&ldquo;Sold &amp; shipped by&rdquo;). They&rsquo;re responsible for describing it accurately, shipping it as
        described and honouring their return policy. Every jeweler is verified by our team before they can sell, but they&rsquo;re independent businesses, not Loupe
        employees.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You must be 18 or over and give accurate details. Keep your password private; you&rsquo;re responsible for activity on your account.</li>
        <li>We may suspend accounts used for fraud, harassment, or to move transactions off the platform.</li>
      </ul>

      <h2>3. Prices, offers and payment</h2>
      <ul>
        <li>
          Prices are set by jewelers in their own currency and shown converted into yours; you pay the amount shown at checkout, including any duties and taxes itemised
          there.
        </li>
        <li>
          Weight-priced pieces follow the published live-pricing formula; the price is fixed at checkout. See the <Link href="/guides/gold-purity#live-pricing">gold guide</Link>.
        </li>
        <li>An accepted offer is a commitment to buy at that price within the time shown. Offers expire after {settings.offerExpiryHours} hours.</li>
        <li>Loupe collects payment on the jeweler&rsquo;s behalf and releases it to them after the inspection window described in our shipping &amp; returns policy.</li>
      </ul>

      <h2>4. Returns, disputes and refunds</h2>
      <p>
        Returns follow the jeweler&rsquo;s stated window and our <Link href="/help/shipping-returns">shipping &amp; returns policy</Link>. If you and a jeweler can&rsquo;t
        resolve a problem, either of you can ask us to review the case. Our decision may include a refund issued directly by Loupe. This doesn&rsquo;t affect your statutory
        rights as a consumer.
      </p>

      <h2>5. Selling on Loupe</h2>
      <ul>
        <li>Jewelers must pass business and identity verification and keep their details current.</li>
        <li>Listings must be accurate — including metal purity, stones, treatments and condition — and certificates must belong to the piece they&rsquo;re attached to.</li>
        <li>
          Loupe charges a commission on each sale ({bpsToPercent(settings.defaultCommissionBps)} by default, varying by category and plan), plus any listing or plan fees shown
          in the seller studio before they apply.
        </li>
        <li>We may pause listings or suspend a store, and hold payouts, while we investigate a complaint.</li>
      </ul>

      <h2>6. Content and conduct</h2>
      <p>
        Reviews, photos and messages must be honest and lawful. Don&rsquo;t share contact details to take a sale off-platform — it removes the buyer protection described
        above. You keep ownership of what you upload and give us a licence to display it on Loupe.
      </p>

      <h2>7. Liability</h2>
      <p>
        We run the marketplace with care, but we don&rsquo;t make or own the pieces sold on it. To the extent the law allows, our liability for any claim is limited to the
        amount you paid for the order concerned.
      </p>

      <h2>8. Changes and contact</h2>
      <p>We&rsquo;ll give notice in your account before material changes take effect. Questions about these terms: legal@loupe.example.</p>
    </PolicyLayout>
  );
}
