import { BusinessNameForm } from "@/components/seller/business-name-form";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/account/page-header";
import { BusinessProfileForm, ListingVisibility } from "@/components/seller/business-profile-form";
import { JewelerSocialLinks } from "@/components/catalog/jeweler-social-links";
import { buttonVariants } from "@/components/ui/button";
import { Monogram } from "@/components/ui/display";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";
import { getDirectorySettings, nameChanges } from "@/server/services/jeweler-directory";

export default async function MyBusiness() {
  const { seller } = await requireSeller();
  const [settings, locations] = await Promise.all([getDirectorySettings(seller.id), db.storeLocation.findMany({ where: { sellerId: seller.id }, orderBy: { id: "asc" }, take: 1 })]);
  const changes = await nameChanges(seller.id);
  const location = locations[0];
  return <>
    <PageHeader title="My Business" description="Keep your business details and social links up to date." />
    <section className="mb-7 flex flex-wrap items-center justify-between gap-5 rounded-[3px] border border-line bg-parchment/50 p-5">
      <div><p className="caps text-[11px] text-muted">Listing status</p><p className="mt-1 font-display text-2xl text-ink">{settings.isPaused ? "Paused" : "Live on Loupe"}</p><p className="mt-1 max-w-lg text-sm text-ink-soft">{settings.isPaused ? "Your profile is hidden and customers cannot send new requests. Existing requests remain available." : "Customers can discover your business and open your social and contact links."}</p></div>
      <div className="flex flex-wrap gap-3"><Link href="/seller/preview" className={buttonVariants({ variant: "subtle", size: "sm" })}>Preview profile</Link>{!settings.isPaused && <Link href={`/jewelers/${seller.slug}`} className={buttonVariants({ variant: "subtle", size: "sm" })}><ExternalLink size={15} />View public profile</Link>}<ListingVisibility paused={settings.isPaused} /></div>
    </section>
    <BusinessProfileForm initial={{ storeName: seller.storeName, tagline: seller.tagline ?? "", bio: seller.bio ?? "", city: seller.city ?? "", specialties: seller.specialties.join(", "), address: location?.line1 ?? "", hours: location?.hours ?? "", phone: location?.phone ?? "", whatsapp: settings.whatsapp, publicEmail: settings.publicEmail, maps: settings.maps, instagram: settings.instagram, facebook: settings.facebook, youtube: settings.youtube, website: seller.website ?? "", acceptsCustomOrders: seller.acceptsCustomOrders }} />
    <details className="mt-8 rounded border border-line bg-porcelain p-5"><summary className="cursor-pointer font-display text-xl">Change business name</summary><p className="my-4 text-sm text-muted">Admin approval is required. Your profile address stays the same after a name change.</p><BusinessNameForm pending={changes.some((r) => r.status === "PENDING")} /><ul className="mt-5 space-y-3">{changes.map((r) => <li key={r.id} className="border-t border-line pt-3 text-sm"><strong>{r.requestedName}</strong> · {r.status.toLowerCase()}{r.reviewNotes && <p className="mt-1 text-muted">{r.reviewNotes}</p>}</li>)}</ul></details>
    <section className="mt-8 rounded-[3px] border border-line bg-porcelain p-5"><p className="caps mb-4 text-xs text-muted">Saved profile preview</p><div className="mb-4 flex items-center gap-4"><Monogram name={seller.storeName} src={seller.logoUrl} size={48} /><div><p className="font-display text-xl">{seller.storeName}</p><p className="text-sm text-muted">{seller.city}</p></div></div><JewelerSocialLinks settings={settings} website={seller.website} /><p className="mt-4 text-xs text-muted">Save your changes to update this preview and your public profile.</p></section>
  </>;
}
