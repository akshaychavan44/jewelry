import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ProductCard as ProductCardData } from "@/server/services/catalog";
import { ProductCard } from "./product-card";
import styles from "./shop-editorial.module.css";

// Collection photographs are inspiration, rather than individual product listings.
// Keep their destinations on the corresponding live collection or styling page.
const edits = [
  {
    href: "/styling/everyday",
    image: "/media/collections/everyday-hoops-chain.png",
    alt: "Gold hoops and a delicate pendant arranged on warm travertine",
    eyebrow: "The everyday edit",
    title: "Your everyday signature.",
    action: "Explore everyday jewelry",
  },
  {
    href: "/shop/earrings",
    image: "/media/collections/bloom-earrings.png",
    alt: "Floral gold and diamond drop earrings on ivory silk",
    eyebrow: "A little brilliance",
    title: "Made to turn heads.",
    action: "Discover earrings",
  },
  {
    href: "/shop/engagement-rings",
    image: "/media/collections/forever-solitaire.png",
    alt: "A gold diamond solitaire on a cream stone plinth",
    eyebrow: "For your forever",
    title: "A promise, beautifully made.",
    action: "Explore engagement rings",
  },
] as const;

export function ShopCollectionMosaic() {
  return (
    <section aria-labelledby="shop-edits-heading" className={styles.section}>
      <div className={styles.sectionHeading}>
        <p className="eyebrow text-gold-deep">The Jewelrex edit</p>
        <h2 id="shop-edits-heading">Find your next signature.</h2>
      </div>
      <div className={styles.mosaic}>
        {edits.map((edit, index) => (
          <Link key={edit.href} href={edit.href} className={`${styles.edit} ${index === 0 ? styles.leadEdit : styles.sideEdit}`}>
            <div className={styles.editImage}>
              <Image
                src={edit.image}
                alt={edit.alt}
                fill
                loading={index === 0 ? "eager" : "lazy"}
                sizes={index === 0 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw"}
                className={styles.photograph}
              />
            </div>
            <div className={styles.editCopy}>
              <span className={styles.eyebrow}>{edit.eyebrow}</span>
              <h3>{edit.title}</h3>
              <span className={styles.action}>{edit.action}<ArrowUpRight aria-hidden className="size-4 shrink-0" /></span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

const gridFeatures = [
  {
    href: "/styling/evening",
    image: "/media/collections/bloom-necklace.png",
    alt: "A floral diamond necklace on softly draped champagne silk",
    eyebrow: "The occasion edit",
    title: "An entrance to remember.",
    action: "Discover evening jewelry",
  },
  {
    href: "/shop/bracelets",
    image: "/media/collections/everyday-bracelet.png",
    alt: "A delicate gold bracelet styled on warm neutral stone",
    eyebrow: "Beautiful, every day",
    title: "The finishing touch.",
    action: "Explore bracelets",
  },
] as const;

export function ShopProductGrid({
  products,
  savedIds,
  editorial = false,
}: {
  products: ProductCardData[];
  savedIds?: Set<string>;
  editorial?: boolean;
}) {
  return (
    <div className={styles.productGrid}>
      {products.map((product, index) => {
        // After the fourth product, then every ten products: one product next to
        // a two-column feature on desktop; two product rows then a feature on mobile.
        const feature = editorial && index >= 3 && (index - 3) % 10 === 0
          ? gridFeatures[Math.floor((index - 3) / 10)]
          : null;
        return (
          <Fragment key={product.id}>
            <div className={styles.productSlot} style={{ order: index * 2 }}>
            <ProductCard
              product={product}
              saved={savedIds?.has(product.id)}
              priority={!editorial && index < 3}
              presentation="catalog"
              sizes="(min-width: 1320px) 403px, (min-width: 768px) 33vw, 50vw"
            />
            </div>
      {editorial && index === 2 && <Link href="/shop/rings" className={styles.ringFeature}>
        <div className={styles.ringCopy}>
          <span className={styles.eyebrow}>The ring edit</span>
          <h2>A little brilliance.<br />A lasting impression.</h2>
          <p>Discover rings to treasure, from everyday signatures to forever pieces.</p>
          <span className={styles.action}>Explore rings<ArrowUpRight aria-hidden className="size-4" /></span>
        </div>
        <div className={styles.ringImage}><Image src="/media/collections/forever-bands.png" alt="Gold and diamond rings resting on champagne silk" fill sizes="(min-width: 768px) 55vw, 100vw" /></div>
      </Link>}
            {feature && (
              <Link href={feature.href} className={styles.gridFeature} style={{ order: index * 2 + 1 }}>
                <div className={styles.featureCopy}>
                  <span className={styles.eyebrow}>{feature.eyebrow}</span>
                  <h3>{feature.title}</h3>
                  <span className={styles.action}>{feature.action}<ArrowUpRight aria-hidden className="size-4 shrink-0" /></span>
                </div>
                <div className={styles.featureImage}>
                  <Image src={feature.image} alt={feature.alt} fill sizes="(min-width: 768px) 35vw, 55vw" className={styles.photograph} />
                </div>
              </Link>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
