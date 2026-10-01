import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SocialIcon } from "@/components/brand/trust";
import { footerNav, siteConfig } from "@/config/site";
import { NewsletterForm } from "./newsletter-form";

export function SiteFooter() {
  return (
    <footer className="bg-greige">
      <div className="shell grid gap-12 py-16 md:grid-cols-[1.2fr_repeat(3,minmax(0,0.8fr))_1.4fr] md:gap-10">
        <div className="flex flex-col items-start">
          <Logo />
          <p className="mt-5 max-w-[16rem] text-[13.5px] leading-relaxed text-ink-soft">
            Fine, high and vintage jewelry from verified independent jewelers.
          </p>
          <div className="mt-6 flex gap-4 text-ink-soft">
            {(["instagram", "pinterest", "tiktok"] as const).map((name) => (
              <a key={name} href={siteConfig.social[name]} className="hover:text-ink" aria-label={name} rel="noreferrer" target="_blank">
                <SocialIcon name={name} />
              </a>
            ))}
          </div>
        </div>

        {footerNav.map((group) => (
          <div key={group.title}>
            <h3 className="caps mb-4 text-ink">{group.title}</h3>
            <ul className="space-y-2.5">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[14px] text-ink-soft transition-colors hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h3 className="caps mb-4 text-ink">Join the list</h3>
          <p className="mb-4 text-[14px] leading-relaxed text-ink-soft">New arrivals from our jewelers, private sales and the occasional buying guide.</p>
          <NewsletterForm />
        </div>
      </div>
      <div className="border-t border-line-strong/50">
        <div className="shell flex flex-col gap-2 py-5 text-[12.5px] text-muted md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {siteConfig.name}. Prices exclude taxes and duties, calculated at checkout.</p>
          <div className="flex gap-5">
            <Link href="/help/terms" className="hover:text-ink">Terms</Link>
            <Link href="/help/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/sell" className="hover:text-ink">Sell on {siteConfig.name}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
