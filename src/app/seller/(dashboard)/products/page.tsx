import Link from "next/link";
import { PageHeader } from "@/components/account/page-header";
import { EmptyState } from "@/components/ui/display";
import { buttonVariants } from "@/components/ui/button";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";
import { jewelryVisibility } from "@/server/services/discovery";
import { formatMoney } from "@/lib/money";
import { num } from "@/lib/utils";
import { ArchivePiece } from "@/components/seller/archive-piece";
export default async function MyJewelry() {
  const { seller } = await requireSeller();
  const [pieces, settings] = await Promise.all([db.product.findMany({ where: { sellerId: seller.id, deletedAt: null }, include: { images: { orderBy: { position: "asc" } } }, orderBy: { updatedAt: "desc" } }), jewelryVisibility()]);
  return <><PageHeader title="My Jewelry" description="Manage your pieces and choose where customers can discover them." action={<Link href="/seller/products/new" className={buttonVariants()}>Add jewelry</Link>} />{!pieces.length ? <EmptyState title="Your showcase starts here" action={<Link href="/seller/products/new" className={buttonVariants()}>Add your first piece</Link>}>Upload photos, describe your jewelry and choose its visibility.</EmptyState> : <div className="space-y-3">{pieces.map(p => { const v = settings.find(s => s.productId === p.id); const active = p.status === "ACTIVE"; return <article key={p.id} className="flex items-center gap-5 rounded-[3px] border border-line bg-porcelain p-5">{p.images[0] ? <img src={p.images[0].url} alt={p.title} className="size-24 rounded object-cover" /> : <div className="size-24 bg-parchment" />}<div className="min-w-0 flex-1"><h2 className="font-display text-xl">{p.title}</h2><p className="mt-1 text-sm text-muted">{formatMoney(num(p.basePriceMinor), p.currency)} · {p.status.toLowerCase()}</p><div className="mt-3 flex gap-3 text-xs"><span className="rounded-full bg-parchment px-3 py-1">Profile: {active && (v?.showOnProfile ?? true) ? "Shown" : "Hidden"}</span><span className="rounded-full bg-parchment px-3 py-1">Website: {active && (v?.showOnWebsite ?? true) ? "Shown" : "Hidden"}</span></div></div><Link href={`/seller/products/${p.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Edit & visibility</Link>{active && <ArchivePiece id={p.id} />}</article>; })}</div>}</>;
}
