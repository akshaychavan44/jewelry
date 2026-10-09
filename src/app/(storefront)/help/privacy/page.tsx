import type { Metadata } from "next";
import { PolicyLayout } from "@/components/help/policy-layout";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <PolicyLayout
      current="/help/privacy"
      title="Privacy Policy"
      updated="October 2026"
      sample
      intro={`At ${siteConfig.name}, we value transparency. We collect only what is necessary to operate our independent jeweler directory and showcase software. We never sell personal data.`}
    >
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Customer Account Details:</strong> Name, email address, password hash, saved jewelers, and wishlist items.
        </li>
        <li>
          <strong>Inquiries &amp; Messages:</strong> Direct messages, custom commission briefs, and inquiries you send to jewelers to facilitate communication.
        </li>
        <li>
          <strong>Jeweler Business Records:</strong> Atelier name, showroom address, business registration, tax ID, and identity verification documents submitted to earn the Verified Jeweler badge.
        </li>
        <li>
          <strong>Jeweler Subscription Billing:</strong> For jewelers paying listing subscription fees, card details are processed directly by Stripe. We do not store raw card numbers.
        </li>
      </ul>

      <h2>Analytics without tracking cookies</h2>
      <p>
        To understand which showcase categories and pieces receive interest, we record anonymous, cookie-less page views. We do not track you across third-party websites or sell behavioral profiles to advertisers.
      </p>

      <h2>Who sees your information</h2>
      <ul>
        <li>
          <strong>Jewelers you contact:</strong> When you send an inquiry, custom request, or message, the respective jeweler receives your name, message text, and contact information to respond directly to you.
        </li>
        <li>
          <strong>Infrastructure Providers:</strong> Secure hosting, encrypted cloud database storage, and email delivery providers operating under strict confidentiality contracts.
        </li>
        <li>
          <strong>Legal Compliance:</strong> When required by law or to protect against fraudulent impersonation.
        </li>
      </ul>

      <h2>Your rights &amp; choices</h2>
      <ul>
        <li>You may update your profile, notifications, and saved items in your account settings at any time.</li>
        <li>To request a copy of your stored data or request account deletion, write to privacy@loupe.example.</li>
      </ul>
    </PolicyLayout>
  );
}
