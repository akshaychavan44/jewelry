"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import styles from "./collection-showcase.module.css";

const collections = [
  {
    id: "diamonds", name: "Diamonds in bloom", category: "The occasion edit",
    description: "Light-catching diamonds and sculptural necklaces. For the evenings you want to remember.",
    href: "/shop/necklaces", cta: "Discover necklaces", caption: "A little brilliance. An unforgettable entrance.",
    editorial: "/media/collections/bloom-necklace.png", editorialAlt: "Floral diamond necklace with gold leaf links arranged on ivory silk",
    detail: "/media/collections/bloom-earrings.png", detailAlt: "Matching floral diamond drop earrings in yellow gold",
  },
  {
    id: "forever", name: "The forever edit", category: "Rings with meaning",
    description: "From a quiet promise to a grand proposal. Discover rings made for your next chapter.",
    href: "/shop/rings", cta: "Discover rings", caption: "For the beginning of everything.",
    editorial: "/media/collections/forever-solitaire.png", editorialAlt: "Round diamond solitaire engagement ring on a cream pedestal",
    detail: "/media/collections/forever-bands.png", detailAlt: "Coordinating polished gold and diamond wedding bands on champagne fabric",
  },
  {
    id: "everyday", name: "Everyday radiance", category: "The bracelet edit",
    description: "A flash of gold, a delicate line of diamonds. Beautiful details to make every day your own.",
    href: "/shop/bracelets", cta: "Discover bracelets", caption: "Small rituals. Beautiful details.",
    editorial: "/media/collections/everyday-bracelet.png", editorialAlt: "Delicate gold bead bracelet with bezel-set diamonds on warm travertine",
    detail: "/media/collections/everyday-hoops-chain.png", detailAlt: "Minimal gold hoop earrings and a fine pendant chain on ivory stone",
  },
] as const;

export function CollectionShowcase() {
  const [selected, setSelected] = useState(0);
  const collection = collections[selected];

  return (
    <section id="collections" className={styles.section} aria-labelledby="collections-heading">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>The Loupe edit</p>
          <h2 id="collections-heading">Find a little <em>extraordinary.</em></h2>
        </div>
        <Link href="/shop" className={styles.all}>Explore all jewelry <ArrowUpRight size={17} aria-hidden /></Link>
      </header>
      <div className={styles.layout}>
        <div className={styles.list} aria-label="Choose a jewelry edit">
          {collections.map((item, index) => (
            <button key={item.id} type="button" className={styles.choice}
              aria-pressed={selected === index} aria-controls="collection-preview"
              onClick={() => setSelected(index)}>
              <span className={styles.number}>0{index + 1}</span>
              <span className={styles.choiceCopy}>
                <span className={styles.name}>{item.name}</span>
                <span className={styles.category}>{item.category}</span>
                <span className={styles.description}>{item.description}</span>
              </span>
              <ArrowRight className={styles.arrow} size={22} aria-hidden />
            </button>
          ))}
          <p className={styles.note}>Distinctive pieces. Independent perspectives.</p>
        </div>
        <div id="collection-preview" className={styles.preview} aria-label={`${collection.name} preview`}>
          <div key={collection.id} className={styles.images}>
            <div className={styles.editorial}>
              <Image src={collection.editorial} alt={collection.editorialAlt} fill
                sizes="(max-width: 700px) 52vw, (max-width: 1000px) 55vw, 36vw" />
              <div className={styles.shade} aria-hidden />
              <p className={styles.caption}>{collection.caption}</p>
            </div>
            <Link href={collection.href} className={styles.detail} aria-label={collection.cta}>
              <Image src={collection.detail} alt={collection.detailAlt} fill
                sizes="(max-width: 700px) 40vw, (max-width: 1000px) 35vw, 24vw" />
              <span className={styles.detailLabel}>In the details <ArrowUpRight size={18} aria-hidden /></span>
            </Link>
          </div>
          <div className={styles.previewFooter}>
            <p aria-live="polite" aria-atomic="true"><span className={styles.counter}>0{selected + 1} / 03</span> {collection.name}</p>
            <Link href={collection.href}>{collection.cta} <ArrowRight size={18} aria-hidden /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
