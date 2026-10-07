import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gem, LockKeyhole, ShieldCheck } from "lucide-react";
import styles from "./static-hero.module.css";

export function StaticHero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <Image src="/media/static-landing-hero.png" alt="Gold and diamond jewelry arranged on cream silk and travertine" fill priority sizes="100vw" className={styles.photo} />
      <div className={styles.content}>
        <p className={styles.eyebrow}>Exceptional pieces. Trusted jewelers.</p>
        <h1 id="hero-heading" className={styles.heading}>Fine jewelry.<br />A personal<br /><span>discovery.</span></h1>
        <p className={styles.description}>Discover remarkable pieces from independent jewelers. Compare with confidence. Find something that feels like you.</p>
        <div className={styles.actions}>
          <Link href="/shop" className={styles.primary}>Explore jewelry <ArrowRight size={20} aria-hidden /></Link>
          <Link href="/jewelers" className={styles.secondary}>Meet the jewelers</Link>
        </div>
        <ul className={styles.trust} aria-label="Shop with confidence">
          <li><ShieldCheck aria-hidden />Verified jewelers</li>
          <li><Gem aria-hidden />Certified quality</li>
          <li><LockKeyhole aria-hidden />Secure checkout</li>
        </ul>
      </div>
    </section>
  );
}