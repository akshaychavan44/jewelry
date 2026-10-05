import { ArrowRight, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import styles from "./landing.module.css";

const worlds = [
  { title: "The necklace vault", label: "A little brilliance, every day", href: "/shop/necklaces", image: "/media/necklaces.jpg", alt: "A diamond necklace displayed in the golden vault from the Loupe film" },
  { title: "The bridal corner", label: "For your forever", href: "/shop/rings", image: "/media/bridal.jpg", alt: "Gold and diamond rings on cream display stands from the Loupe film" },
  { title: "The extraordinary", label: "Discover high jewelry", href: "/shop/high-jewelry", image: "/media/atelier.jpg", alt: "The cream and gold Loupe atelier entrance from the film" },
];

export function LandingCollections({ categories }: { categories: { slug: string; name: string; count: number }[] }) {
  return (
    <section id="collections" className={styles.collections} aria-labelledby="collections-heading">
      <div className="shell">
        <div className={styles.heading}>
          <p className="eyebrow">The Loupe collection</p>
          <h2 id="collections-heading">Beautiful things.<br /><span>Meaningful beginnings.</span></h2>
          <p>A piece for your everyday. A treasure for your forever.<br className="hidden sm:block" /> Discover the world of independent fine jewelry.</p>
        </div>
        <div className={styles.worlds}>
          {worlds.map((world, i) => (
            <Link key={world.href} href={world.href} className={styles.world}>
              <div className={styles.worldImage}>
                <Image src={world.image} alt={world.alt} fill sizes="(min-width: 768px) 30vw, 100vw" className="object-cover" />
                <span className={styles.number}>0{i + 1}</span>
              </div>
              <div className={styles.worldCaption}>
                <div><p className="eyebrow">{world.label}</p><h3>{world.title}</h3></div>
                <ArrowUpRight size={22} strokeWidth={1} aria-hidden />
              </div>
            </Link>
          ))}
        </div>
        <nav className={styles.categories} aria-label="Jewelry collections">
          {categories.map((c) => <Link key={c.slug} href={`/shop/${c.slug}`}>{c.name}<ArrowUpRight size={12} aria-hidden /></Link>)}
        </nav>
      </div>
    </section>
  );
}

export function CollectionInvitation() {
  return (
    <div className={styles.invitation}>
      <div className={styles.invitationPanel}>
        <p className="eyebrow">Find your next treasure</p>
        <h3 className={styles.invitationTitle}>Begin with the<br />pieces you love.</h3>
        <nav className={styles.invitationLinks} aria-label="Find your next treasure">
          <Link href="/shop/rings">Explore rings <ArrowUpRight size={20} strokeWidth={1.3} aria-hidden /></Link>
          <Link href="/shop/necklaces">Discover necklaces <ArrowUpRight size={20} strokeWidth={1.3} aria-hidden /></Link>
          <Link href="/shop/vintage">Find an heirloom <ArrowUpRight size={20} strokeWidth={1.3} aria-hidden /></Link>
        </nav>
      </div>
      <Link href="/shop" className={styles.invitationImage} aria-label="Explore the full jewelry collection">
        <Image src="/media/pieces-to-fall-for.png" alt="A sculptural gold ring, pearl strand and diamond pendant arranged on softly folded ivory silk" fill sizes="(min-width: 768px) 58vw, 100vw" className={styles.invitationPhoto} />
        <span className={styles.imageArrow}><ArrowRight size={22} strokeWidth={1.3} aria-hidden /></span>
      </Link>
    </div>
  );
}
