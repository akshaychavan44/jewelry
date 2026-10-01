import type { Metadata } from "next";
import Link from "next/link";
import { PolicyLayout } from "@/components/help/policy-layout";
import { formatMoney } from "@/lib/money";
import { num } from "@/lib/utils";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Shipping & returns", description: "Insured, signature-tracked delivery from every jeweler, duties paid at checkout, and returns sent straight back to the jeweler." };

export default async function ShippingReturnsPage() {
  const [settings, windows] = await Promise.all([
    db.platformSettings.findUniqueOrThrow({ where: { id: "platform" } }),
    db.sellerProfile.aggregate({ where: { verificationStatus: "APPROVED" }, _min: { returnWindowDays: true }, _max: { returnWindowDays: true } }),
  ]);
  const usd = (cents: bigint) => formatMoney(num(cents), "USD");
  const minWindow = windows._min.returnWindowDays ?? 14;
  const maxWindow = windows._max.returnWindowDays ?? 30;

  return (
    <PolicyLayout
      current="/help/shipping-returns"
      title="Shipping & returns"
      updated={new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(settings.updatedAt)}
      intro="Every piece ships directly from the jeweler who made or sourced it — insured, tracked and signed for. If it isn't right, it goes back to them, and we hold their payment until you're happy."
    >
      <h2>How delivery works</h2>
      <p>
        When your order includes pieces from more than one jeweler, each ships separately, with its own tracking number. You&rsquo;ll see every parcel on your order page as it
        moves, and we email you at each step.
      </p>
      <ul>
        <li>
          <strong>Every parcel is insured</strong> for its full value until you sign for it. If a parcel is lost or damaged in transit, the jeweler and our team handle the claim
          — you receive a replacement or a full refund.
        </li>
        <li>
          <strong>Signature on delivery</strong> is required for any piece over {usd(settings.signatureThresholdUsd)}. Below that, you can choose at checkout.
        </li>
        <li>
          <strong>Secure courier</strong> is used for orders over {usd(settings.secureCourierThresholdUsd)}: an armoured service with identity checks at the door.
        </li>
        <li>
          <strong>Delivery estimates</strong> include the jeweler&rsquo;s handling time, and any making or sizing days for made-to-order pieces, so the date you see at checkout
          is the date to expect.
        </li>
      </ul>

      <h2>Duties and taxes</h2>
      <p>
        For most international orders we collect import duties and sales tax at checkout, so there&rsquo;s nothing to pay on arrival and no surprise hold at customs. The
        estimate is itemised before you pay. Where a country doesn&rsquo;t allow duties to be prepaid, checkout tells you in advance and the carrier collects them on delivery.
      </p>

      <h2>Returns</h2>
      <p>
        Each jeweler sets a return window between {minWindow} and {maxWindow} days from delivery; you&rsquo;ll find it on the listing and on your order. To start a return,
        open the order and choose <strong>Return an item</strong>.
      </p>
      <ul>
        <li>
          Once the jeweler approves, you get a <strong>prepaid, insured return label</strong> addressed to the jeweler&rsquo;s own workshop — never to a warehouse.
        </li>
        <li>Pieces must come back unworn, in their original packaging, with any certificates and paperwork.</li>
        <li>
          <strong>Engraved, resized and made-to-order pieces</strong> can&rsquo;t be returned for a change of mind, but are always covered if they arrive damaged, don&rsquo;t
          match the description, or raise an authenticity concern.
        </li>
        <li>Refunds go back to your original payment method as soon as the jeweler confirms the piece has arrived. Your bank may take 5–10 days to show it.</li>
      </ul>

      <h2>Protected until you&rsquo;re happy</h2>
      <p>
        We hold the jeweler&rsquo;s payment until {settings.inspectionWindowDays} days after delivery. If something is wrong — the stone doesn&rsquo;t match its report, the
        piece was damaged, or a return is refused — open a case from your order within that time and our team will step in, review the evidence from both sides and, where
        it&rsquo;s warranted, refund you directly.
      </p>
      <p>
        Questions about a specific order? Message the jeweler from your <Link href="/account/orders">order page</Link> — they usually reply within a few hours.
      </p>
    </PolicyLayout>
  );
}
