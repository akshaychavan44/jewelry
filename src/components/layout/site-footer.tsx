import { getCurrentUser } from "@/server/auth/session";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SocialIcon } from "@/components/brand/trust";
import { footerNav, siteConfig } from "@/config/site";
import { NewsletterForm } from "./newsletter-form";
import { FooterBackToTop } from "./footer-back-to-top";
import styles from "./footer.module.css";
import { getAccountView } from "@/server/account-view";

export async function SiteFooter({ staticNavigation = false }: { staticNavigation?: boolean } = {}) {
  const user = staticNavigation ? null : await getCurrentUser();
  const isJeweler = user?.role === "SELLER" && await getAccountView(user.role) === "seller";
  return (
    <footer id="site-footer" className={styles.footer}>
      <Image src="/media/footer-jewelry.webp" alt="" fill sizes="100vw" className={styles.background} />
      <div className={styles.content}>
        <section className={styles.newsletter} aria-labelledby="newsletter-heading">
          <h2 id="newsletter-heading">Join the list</h2>
          <p>New arrivals from our jewelers, featured ateliers and<br className={styles.desktopBreak} /> jewelry buying guides.</p>
          <NewsletterForm />
        </section>
        <div className={styles.columns}>
          <div className={styles.brand}>
            <Logo className={styles.logo} />
            <p>Fine, high and vintage jewelry from independent jewelers.</p>
            <div className={styles.socials}>
              {(["instagram", "pinterest", "tiktok"] as const).filter(name => /^https:\/\//.test(siteConfig.social[name])).map((name) => (
                <a key={name} href={siteConfig.social[name]} aria-label={name} rel="noreferrer" target="_blank"><SocialIcon name={name} /></a>
              ))}
            </div>
          </div>
          {footerNav.map((group) => (
            <nav key={group.title} aria-label={`Footer ${group.title}`} className={styles.navigation}>
              <h3>{group.title}</h3>
              <ul>{group.links.filter(link => !isJeweler || link.href !== "/jeweler/login").map((link) => <li key={link.href}><Link href={isJeweler && link.href === "/sell" ? "/seller" : link.href}>{isJeweler && link.href === "/sell" ? "My Dashboard" : link.label}</Link></li>)}</ul>
            </nav>
          ))}
        </div>
        <div className={styles.wordmark} aria-hidden="true"><Image src="/brand/jewelrex-logo.png" alt="" width={1984} height={793} unoptimized className="block h-auto w-full max-w-[960px] object-contain mx-auto" /></div>
        <div className={styles.bottom}>
          <p>© {new Date().getFullYear()} {siteConfig.name}. An independent jewelry directory & showcase. All purchases and arrangements are made directly with each jeweler.</p>
          <div className={styles.legal}>
            <Link href="/help/terms">Terms</Link>
            <Link href="/help/privacy">Privacy</Link>
            <Link href={isJeweler ? "/seller" : "/sell"}>{isJeweler ? "My Dashboard" : "List your business"}</Link>
            <FooterBackToTop />
          </div>
        </div>
      </div>
    </footer>
  );
}
