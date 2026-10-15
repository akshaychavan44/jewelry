import Link from "next/link";
import Image from "next/image";
import { countryName } from "@/lib/regions";
import { DirectContact } from "@/components/product/direct-contact";
import { PageHeader } from "@/components/account/page-header";
import { Monogram } from "@/components/ui/display";
import { JewelerSocialLinks } from "@/components/catalog/jeweler-social-links";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";
import { getDirectorySettings } from "@/server/services/jeweler-directory";

export default async function ProfilePreview() {
  const { seller } = await requireSeller();
  const [settings, location, address] = await Promise.all([getDirectorySettings(seller.id), db.storeLocation.findFirst({ where: { sellerId: seller.id }, orderBy: { id: "asc" } }), seller.returnAddressId ? db.address.findUnique({ where: { id: seller.returnAddressId } }) : null]);
  return <><PageHeader title="Profile preview" description="A private preview of your saved business information." /><Link href="/seller/settings" className="mb-6 inline-block text-sm underline">Back to My Business</Link><article className="space-y-6 rounded-[3px] border border-line bg-porcelain p-6 sm:p-9">{seller.bannerUrl && <div className="relative h-48 overflow-hidden"><Image src={seller.bannerUrl} alt="" fill sizes="(max-width: 768px) 100vw, 800px" className="object-cover" /></div>}<div className="flex items-center gap-5"><Monogram name={seller.storeName} src={seller.logoUrl} size={80} /><div><h2 className="display-md">{seller.storeName}</h2><p className="mt-2 text-muted">{seller.city}, {countryName(seller.country)}{seller.foundedYear && ` \u00b7 Est. ${seller.foundedYear}`}</p></div></div><p className="font-display text-2xl">{seller.tagline}</p><p className="whitespace-pre-wrap text-ink-soft">{seller.bio}</p><p className="text-sm text-muted">{seller.specialties.join(" · ")}</p><JewelerSocialLinks settings={settings} website={seller.website} />{location && <div className="space-y-2 border-t border-line pt-5 text-sm text-ink-soft"><p>{[location.line1, location.line2 ?? address?.line2, location.city, location.region ?? address?.region, location.postalCode].filter(Boolean).join(", ")}</p><p>{location.hours}</p><DirectContact phone={location.phone} whatsapp={settings.whatsapp} title={`the collection at ${seller.storeName}`} /></div>}<p className="text-xs text-muted">{settings.isPaused ? "Your listing is paused. This preview is visible only to you." : "Your listing is live."}</p></article></>;
}
