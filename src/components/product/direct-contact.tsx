"use client";

import { MessageCircle, Phone } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { contactLinks, whatsappInquiry } from "@/lib/jeweler-contact";

export function DirectContact({ phone, whatsapp, title }: { whatsapp?: string | null; phone?: string | null; title: string }) {
  const pathname = usePathname();
  const [url, setUrl] = useState(pathname);
  useEffect(() => { setUrl(new URL(pathname, window.location.origin).href); }, [pathname]);
  const links = contactLinks(phone);
  const whatsappLink = contactLinks(whatsapp)?.whatsapp;
  if (!links && !whatsappLink) return <p className="text-[12px] leading-relaxed text-muted">This jeweler has not shared a public contact number yet. Visit their profile for email, website and social links.</p>;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {whatsappLink && (
        <a href={whatsappInquiry(whatsappLink, title, url)} target="_blank" rel="noopener noreferrer"
          className={buttonVariants({ variant: "dark", size: "lg", className: "normal-case tracking-normal text-[14px]" })}>
          <MessageCircle aria-hidden /> WhatsApp jeweler
        </a>
      )}
      {links && <a href={links.call} className={buttonVariants({ variant: "outline", size: "lg", className: `normal-case tracking-normal text-[14px] ${whatsappLink ? "" : "sm:col-span-2"}` })}>
        <Phone aria-hidden /> Call jeweler
      </a>}
    </div>
  );
}
