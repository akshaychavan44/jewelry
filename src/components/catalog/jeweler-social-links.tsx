"use client";

import { recordContactClick, type ContactChannel } from "@/lib/contact-analytics";
import { Globe, Mail, MapPin, MessageCircle } from "lucide-react";
import { Facebook, Instagram, Youtube } from "@/components/brand/social-icons";
import type { DirectorySettings } from "@/server/services/jeweler-directory";

export function JewelerSocialLinks({ settings, website, sellerId }: { sellerId?: string; settings: DirectorySettings; website?: string | null }) {
  const links = [
    { label: "Instagram", href: settings.instagram, icon: Instagram },
    { label: "Facebook", href: settings.facebook, icon: Facebook },
    { label: "YouTube", href: settings.youtube, icon: Youtube },
    { label: "Website", href: website, icon: Globe },
    { label: "WhatsApp", href: settings.whatsapp ? `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}` : "", icon: MessageCircle },
    { label: "Email", href: settings.publicEmail ? `mailto:${settings.publicEmail}` : "", icon: Mail },
    { label: "Directions", href: settings.maps, icon: MapPin },
  ].filter((link) => link.href && /^(https?:\/\/|mailto:)/i.test(link.href));
  if (!links.length) return null;
  return <div className="flex flex-wrap gap-2" aria-label="Business social and contact links">{links.map(({ label, href, icon: Icon }) => <a key={label} href={href!} onClick={() => sellerId && recordContactClick(sellerId, label.toLowerCase() as ContactChannel)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-[3px] border border-line bg-porcelain px-3 py-2 text-xs text-ink transition-colors hover:border-ink/40 focus-visible:outline-2 focus-visible:outline-sage"><Icon size={16} aria-hidden />{label}<span className="sr-only"> (opens in a new tab)</span></a>)}</div>;
}
