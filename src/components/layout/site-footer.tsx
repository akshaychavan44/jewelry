import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SocialIcon } from "@/components/brand/trust";
import { footerNav, siteConfig } from "@/config/site";
import { NewsletterForm } from "./newsletter-form";
import { FooterBackToTop } from "./footer-back-to-top";
import styles from "./footer.module.css";

export function SiteFooter() {
  return (
    <footer id="site-footer" className={styles.footer}>
      <Image src="/media/footer-jewelry.webp" alt="" fill sizes="100vw" className={styles.background} />
      <div className={styles.content}>
        <section className={styles.newsletter} aria-labelledby="newsletter-heading">
          <h2 id="newsletter-heading">Join the list</h2>
          <p>New arrivals from our jewelers, private sales and<br className={styles.desktopBreak} /> the occasional buying guide.</p>
          <NewsletterForm />
        </section>
        <div className={styles.columns}>
          <div className={styles.brand}>
            <Logo className={styles.logo} />
            <p>Fine, high and vintage jewelry from verified independent jewelers.</p>
            <div className={styles.socials}>
              {(["instagram", "pinterest", "tiktok"] as const).map((name) => (
                <a key={name} href={siteConfig.social[name]} aria-label={name} rel="noreferrer" target="_blank"><SocialIcon name={name} /></a>
              ))}
            </div>
          </div>
          {footerNav.map((group) => (
            <nav key={group.title} aria-label={`Footer ${group.title}`} className={styles.navigation}>
              <h3>{group.title}</h3>
              <ul>{group.links.map((link) => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}</ul>
            </nav>
          ))}
        </div>
        <div className={styles.wordmark} aria-hidden="true"><span>{siteConfig.name}</span><p>{siteConfig.descriptor}</p></div>
        <div className={styles.bottom}>
          <p>© {new Date().getFullYear()} {siteConfig.name}. Prices exclude taxes and duties, calculated at checkout.</p>
          <div className={styles.legal}>
            <Link href="/help/terms">Terms</Link>
            <Link href="/help/privacy">Privacy</Link>
            <Link href="/sell">Sell on {siteConfig.name}</Link>
            <FooterBackToTop />
          </div>
        </div>
      </div>
    </footer>
  );
}
