import type { Metadata } from "next";
import Link from "next/link";
import { PolicyLayout } from "@/components/help/policy-layout";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Terms of Service" };

export default async function TermsPage() {
  return (
    <PolicyLayout
      current="/help/terms"
      title="Terms of Service"
      updated="October 2026"
      sample
      intro={`${siteConfig.name} is a software platform and directory connecting clients with verified independent jewelers. Jewelers subscribe to list their businesses and showcase their jewelry pieces. All transactions, discussions, payments, delivery, warranties, returns, and disputes are handled directly and independently between the jeweler and the customer.`}
    >
      <h2>1. The Loupe Platform Model</h2>
      <p>
        {siteConfig.name} operates exclusively as a discovery directory and software service. We provide tools for jewelers to publish their business profiles, display jewelry pieces, and receive direct inquiries from prospective clients. {siteConfig.name} is not a broker, auctioneer, retailer, payment intermediary, or escrow provider.
      </p>

      <h2>2. Independent Jeweler Relationship</h2>
      <p>
        Each jeweler listed on {siteConfig.name} is an independent business enterprise. When you browse a showcase, request a quote, or contact a jeweler, any subsequent dealings, quotes, purchases, agreements, invoices, payment transfers, shipping, delivery, warranties, and returns are entered into solely and directly between you and the respective jeweler.
      </p>

      <h2>3. Direct Transactions &amp; Communication</h2>
      <ul>
        <li>
          <strong>No Platform Checkout:</strong> {siteConfig.name} does not process retail customer payments or hold customer funds in escrow. All transactions are agreed upon and settled directly between you and the jeweler.
        </li>
        <li>
          <strong>Direct Contact Permitted:</strong> Customers and jewelers are actively encouraged to communicate directly via telephone, email, messaging, website, or in-person showroom appointments.
        </li>
        <li>
          <strong>Pricing &amp; Estimates:</strong> Prices displayed on listings and live metal spot indications serve as guide prices provided by the respective jeweler. The final price and invoice terms are determined directly by the jeweler.
        </li>
      </ul>

      <h2>4. Jeweler Subscriptions &amp; Listings</h2>
      <ul>
        <li>
          <strong>Listing Fees:</strong> Jewelers pay a periodic subscription membership fee to list their business and showcase pieces on {siteConfig.name}.
        </li>
        <li>
          <strong>0% Sales Commission:</strong> {siteConfig.name} charges no commission on sales between jewelers and their customers. Jewelers retain 100% of their direct sales.
        </li>
        <li>
          <strong>Business Verification:</strong> Jewelers must submit valid business registration, identity credentials, and authentic workshop information to receive a verified listing badge.
        </li>
        <li>
          <strong>Listing Accuracy:</strong> Jewelers represent and warrant that all pieces, specifications, precious metal purities, gemstone reports, and provenance details displayed on their showcase are accurate and truthful.
        </li>
      </ul>

      <h2>5. Shipping, Warranties, Returns &amp; Disputes</h2>
      <p>
        Because all transactions take place directly between jewelers and their clients:
      </p>
      <ul>
        <li>Each jeweler establishes and manages their own shipping methods, insurance coverage, lead times, and customs procedures.</li>
        <li>Each jeweler provides their own warranty, care, resizing, and return policies.</li>
        <li>Any concerns, return requests, repair claims, or transaction disputes must be addressed and resolved directly with the jeweler from whom you purchased the piece.</li>
      </ul>

      <h2>6. Account &amp; Acceptable Use</h2>
      <p>
        Users and jewelers must provide accurate contact information and maintain the security of their accounts. Unlawful conduct, fraudulent claims, impersonation, or harassment will result in immediate termination of directory access.
      </p>

      <h2>7. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, {siteConfig.name} disclaims all warranties, express or implied, regarding jewelry pieces, gemstone certifications, or jeweler performance. {siteConfig.name} is not liable for any direct or indirect damages, losses, or disputes arising from transactions between customers and jewelers.
      </p>

      <h2>8. Contact &amp; Questions</h2>
      <p>
        For inquiries regarding these terms or directory subscriptions, contact our concierge team at <a href={`mailto:${siteConfig.supportEmail}`} className="underline">{siteConfig.supportEmail}</a>.
      </p>
    </PolicyLayout>
  );
}
