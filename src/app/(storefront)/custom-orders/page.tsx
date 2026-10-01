import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CustomRequestForm } from "@/components/account/custom-request-form";
import { buttonVariants } from "@/components/ui/button";
import { imagery } from "@/config/site";
import { firstParam, type SearchParams } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { getDisplayCurrency } from "@/server/services/currency";

export const metadata: Metadata = { title: "Custom orders", description: "Commission a bespoke piece from a verified jeweler." };

const STEPS = [
  ["Brief", "Tell us what you have in mind, your budget and any date that matters."],
  ["Quotes", "Jewelers who take commissions reply with a price, timeline and ideas."],
  ["Making", "Accept a quote, pay a deposit held by Loupe, and follow progress in your account."],
  ["Delivery", "Your piece arrives insured, with its certificate and a warranty from the maker."],
];

export default async function CustomOrdersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sellerSlug = firstParam((await searchParams).jeweler);
  const [user, currency, categories, seller] = await Promise.all([
    getCurrentUser(),
    getDisplayCurrency(),
    db.category.findMany({ where: { parentId: null }, orderBy: { position: "asc" }, select: { id: true, name: true } }),
    sellerSlug ? db.sellerProfile.findUnique({ where: { slug: sellerSlug }, select: { storeName: true, slug: true } }) : null,
  ]);

  return (
    <div className="shell grid gap-12 py-14 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
      <div>
        <p className="eyebrow mb-4">Bespoke</p>
        <h1 className="display-xl text-ink">A piece that begins with you</h1>
        <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-ink-soft">
          Remake an heirloom, set a stone you already own, or design something new. Our jewelers work in 22k temple gold, platinum, hand-engraved signets and everything between.
        </p>
        <div className="relative mt-10 aspect-[4/3] overflow-hidden bg-sand">
          <Image src={imagery.customOrder[0]} alt="A gold jewelry set beside its design sketch" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
        </div>
        <ol className="mt-10 grid gap-6 sm:grid-cols-2">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="border-t border-ink/15 pt-4">
              <span className="font-mono text-[12px] text-gold-deep">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="mt-1 font-display text-[20px] text-ink">{title}</h2>
              <p className="mt-1 text-[14px] text-ink-soft">{body}</p>
            </li>
          ))}
        </ol>
      </div>
      <div className="h-fit rounded-[3px] border border-line bg-porcelain p-6 md:p-8">
        <h2 className="display-sm mb-6 text-ink">Your brief</h2>
        {user ? (
          <CustomRequestForm categories={categories} currency={currency} sellerSlug={seller?.slug} sellerName={seller?.storeName} />
        ) : (
          <div className="space-y-4 text-[14.5px] text-ink-soft">
            <p>Sign in so jewelers can send you quotes and you can follow your commission from brief to delivery.</p>
            <Link href={`/login?callbackUrl=${encodeURIComponent(`/custom-orders${sellerSlug ? `?jeweler=${sellerSlug}` : ""}`)}`} className={buttonVariants()}>
              Sign in to continue
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
