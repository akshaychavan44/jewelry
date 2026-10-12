import Link from "next/link";
import { PageHeader, StatCard } from "@/components/account/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";
import { jewelerReviews } from "@/server/services/discovery";
import { getDirectorySettings, inquiryStatusesForSeller } from "@/server/services/jeweler-directory";
export default async function SellerHome() {
  const { seller } = await requireSeller();
  const [pieces, requests, reviews, settings] = await Promise.all([db.product.count({ where: { sellerId: seller.id, deletedAt: null, status: { not: "ARCHIVED" } } }), inquiryStatusesForSeller(seller.id), jewelerReviews(seller.id), getDirectorySettings(seller.id)]);
  const fresh = requests.filter(r => r.inquiryStatus === "NEW" && r.status !== "CANCELLED").length;
  return <><PageHeader eyebrow="Your jeweler dashboard" title={seller.storeName} description="Keep your showcase current and review customer requests and feedback." action={<Link href="/seller/products/new" className={buttonVariants()}>Add jewelry</Link>} /><div className="grid grid-cols-3 gap-4"><StatCard label="Jewelry pieces" value={pieces} href="/seller/products" /><StatCard label="New requests" value={fresh} hint="Awaiting your attention" href="/seller/custom-requests" /><StatCard label="Customer reviews" value={reviews.length} href="/seller/reviews" /></div><section className="mt-8 rounded border border-line bg-porcelain p-8"><p className="eyebrow">Your presence on Loupe</p><h2 className="mt-3 font-display text-3xl">{settings.isPaused ? "Your business listing is paused" : "Your business is discoverable"}</h2><p className="my-4 max-w-xl text-sm leading-relaxed text-ink-soft">Choose where each jewelry piece appears in My Jewelry. Keep your contact details current so customers can reach you directly.</p><div className="flex gap-4"><Link href="/seller/settings" className={buttonVariants({ variant: "outline" })}>Manage business</Link><Link href="/seller/preview" className="self-center text-sm underline">Preview profile</Link></div></section>{fresh > 0 && <Link href="/seller/custom-requests" className="mt-6 block rounded border border-gold/30 bg-parchment p-5 text-sm">{fresh} new custom {fresh === 1 ? "request needs" : "requests need"} your attention. View requests →</Link>}</>;
}
