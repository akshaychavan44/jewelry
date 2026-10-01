import type { Metadata } from "next";
import { PolicyLayout } from "@/components/help/policy-layout";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <PolicyLayout
      current="/help/privacy"
      title="Privacy"
      updated="September 2026"
      sample
      intro="We collect what we need to run a safe marketplace for valuable things — and no more. We don't sell personal data, and our analytics don't use tracking cookies."
    >
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account:</strong> name, email, password (stored only as a one-way hash) or your Google / Apple sign-in, preferred currency and country.
        </li>
        <li>
          <strong>Orders:</strong> shipping and billing addresses, what you bought, messages with jewelers, offers, reviews and any return or dispute details.
        </li>
        <li>
          <strong>Payments:</strong> card details go directly to Stripe, our payment processor. We only ever see the card brand, last four digits and expiry.
        </li>
        <li>
          <strong>For jewelers:</strong> business registration, tax ID, bank details and identity documents for verification. Tax IDs and bank numbers are encrypted at rest,
          documents are stored privately, and only our verification team can open them — every view is logged.
        </li>
      </ul>

      <h2>Analytics without tracking cookies</h2>
      <p>
        To understand which pages and pieces people look at, we record anonymous page views with a visitor identifier that is hashed and changes every day. It can&rsquo;t be
        used to follow you across days or across other websites. We don&rsquo;t use advertising trackers.
      </p>

      <h2>Who sees your information</h2>
      <ul>
        <li>
          <strong>The jeweler you buy from</strong> receives your name, shipping address and phone number to deliver your order, and your messages to them.
        </li>
        <li>
          <strong>Service providers</strong> who help us run Loupe — payment processing, insured shipping, tax calculation, file storage and email — under contracts that limit
          use to that purpose.
        </li>
        <li>
          <strong>Authorities</strong>, when required by law, or to prevent fraud and protect our buyers and jewelers.
        </li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        Order and payment records are kept for as long as tax and anti-money-laundering rules require — typically seven to ten years. Verification documents are kept for the
        life of a seller account and a limited period afterwards. Everything else is deleted or anonymised when you close your account.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Update your details, addresses and saved cards at any time in your account.</li>
        <li>Ask for a copy of your data, a correction, or deletion — write to privacy@loupe.example.</li>
        <li>Unsubscribe from marketing emails with one click; order and security emails will still arrive.</li>
      </ul>
    </PolicyLayout>
  );
}
