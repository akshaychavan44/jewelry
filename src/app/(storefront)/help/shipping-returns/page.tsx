import type { Metadata } from "next";
import Link from "next/link";
import { PolicyLayout } from "@/components/help/policy-layout";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Direct Purchasing & Jeweler Policies | Loupe",
  description: "How shipping, delivery, payments, returns, and warranties work directly between clients and independent jewelers.",
};

export default function ShippingReturnsPage() {
  return (
    <PolicyLayout
      current="/help/shipping-returns"
      title="Direct Purchasing & Jeweler Policies"
      updated="October 2026"
      sample
      intro={`${siteConfig.name} is a directory and showcase platform connecting customers directly with independent jewelers. All discussions, purchases, payments, shipping, delivery, returns, and warranties are handled directly between you and the jeweler.`}
    >
      <h2>1. Direct Inquiries &amp; Consultations</h2>
      <p>
        When you discover a piece you love or wish to commission custom jewelry, you contact the jeweler directly through {siteConfig.name}&rsquo;s inquiry system, telephone, email, website, or showroom. You can discuss:
      </p>
      <ul>
        <li>Exact dimensions, ring sizing, and metal customization.</li>
        <li>Gemstone origins, grading reports, and laser inscriptions.</li>
        <li>Bespoke commissions, sketches, and 3D CAD designs.</li>
        <li>Showroom viewings and in-person appointments.</li>
      </ul>

      <h2>2. Direct Payments &amp; Invoicing</h2>
      <p>
        {siteConfig.name} does not process customer retail transactions, hold buyer funds, or charge buyer transaction fees. When you agree to purchase a piece:
      </p>
      <ul>
        <li>The jeweler issues an invoice or payment request directly to you.</li>
        <li>Payment methods (e.g. secure credit card terminal, bank wire transfer, or in-store payment) are agreed upon directly with the jeweler.</li>
        <li>Always ensure you review the jeweler&rsquo;s sales agreement and invoice prior to payment.</li>
      </ul>

      <h2>3. Shipping, Logistics &amp; Insurance</h2>
      <p>
        Each jeweler arranges delivery directly from their workshop or atelier to your address:
      </p>
      <ul>
        <li>
          <strong>Insured Transit:</strong> Independent jewelers typically utilize insured, signature-on-delivery couriers (or specialist armored carriers for high jewelry).
        </li>
        <li>
          <strong>Lead Times:</strong> In-stock pieces generally dispatch quickly, while made-to-order or custom-sized pieces depend on the jeweler&rsquo;s workshop schedule.
        </li>
        <li>
          <strong>International Duties &amp; Taxes:</strong> Customs requirements, import duties, and local taxes depend on the destination country and are arranged directly with the jeweler or carrier.
        </li>
      </ul>

      <h2>4. Returns, Resizing &amp; Warranties</h2>
      <p>
        Policies regarding returns, resizing, and warranty coverage are set independently by each atelier:
      </p>
      <ul>
        <li>
          <strong>Return Windows:</strong> Each jeweler indicates their return policy on their profile. Many accept returns on ready-to-wear pieces, while bespoke or personalized items are typically final sale unless defective.
        </li>
        <li>
          <strong>Resizing &amp; Adjustments:</strong> Many jewelers offer complimentary or low-cost ring sizing and minor adjustments.
        </li>
        <li>
          <strong>Warranties:</strong> Manufacturing warranties and care guarantees are provided directly by the maker.
        </li>
      </ul>

      <h2>5. Questions &amp; Support</h2>
      <p>
        If you have questions about a specific piece or order, reach out to the jeweler via your <Link href="/account/messages" className="underline">Loupe messages</Link> or the contact details on their atelier profile.
      </p>
    </PolicyLayout>
  );
}
