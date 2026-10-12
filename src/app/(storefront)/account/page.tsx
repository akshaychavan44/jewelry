import Link from "next/link";
import { PageHeader, StatCard } from "@/components/account/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { myReviews } from "@/server/services/discovery";
export default async function AccountOverview() {
  const user = await requireUser("/account");
  const [requests, pieces, stores, reviews] = await Promise.all([db.customRequest.count({ where: { buyerId: user.id } }), db.wishlistItem.count({ where: { userId: user.id } }), db.favoriteStore.count({ where: { userId: user.id } }), myReviews(user.id)]);
  return <><PageHeader eyebrow="Your account" title={`Welcome, ${user.name?.split(" ")[0] ?? "there"}`} description="Your custom requests, favorite jewelers and saved pieces in one place." /><div className="grid grid-cols-4 gap-4"><StatCard label="Custom requests" value={requests} href="/account/custom-requests" /><StatCard label="Saved jewelers" value={stores} href="/account/favorite-stores" /><StatCard label="Saved pieces" value={pieces} href="/account/wishlist" /><StatCard label="My reviews" value={reviews.length} href="/account/reviews" /></div><div className="mt-8 grid grid-cols-2 gap-6"><section className="rounded border border-line bg-porcelain p-8"><p className="eyebrow">Find your maker</p><h2 className="mt-3 font-display text-3xl">Discover independent jewelers</h2><p className="my-4 text-sm leading-relaxed text-ink-soft">Explore their work, visit their profiles and contact them through their preferred channels.</p><Link href="/jewelers" className={buttonVariants({ variant: "outline" })}>Explore jewelers</Link></section><section className="rounded border border-line bg-parchment p-8"><p className="eyebrow">Something personal</p><h2 className="mt-3 font-display text-3xl">Bring your jewelry idea to life</h2><p className="my-4 text-sm leading-relaxed text-ink-soft">Choose a jeweler, send a design brief and track your request. Your jeweler contacts you separately.</p><Link href="/custom-orders" className={buttonVariants()}>Start a custom request</Link></section></div></>;
}
