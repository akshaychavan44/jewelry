import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "404 — This piece is still being crafted | Jewelrex",
  description: "The page you're looking for seems unfinished. Let's take you back to something beautiful.",
};

export default function NotFound() {
  return (
    <>
      <SiteHeader staticNavigation />
      <main id="main" className={styles.pageWrapper}>
        {/* Hidden SVG Filter for continuous liquid molten lava drift */}
        <svg
          aria-hidden="true"
          style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
        >
          <defs>
            <filter id="molten-lava-flow" x="0%" y="0%" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.018 0.035"
                numOctaves="3"
                result="noise"
                seed="7"
              >
                <animate
                  attributeName="baseFrequency"
                  dur="10s"
                  values="0.018 0.035; 0.024 0.048; 0.014 0.028; 0.018 0.035"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="10"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>

        <div className={styles.shellGrid}>
          {/* Left: Typography & CTAs */}
          <div className={styles.textContent}>
            <div className={styles.numeral404} aria-label="404">
              404
            </div>

            <div className={styles.ornament} aria-hidden="true">
              <span className={styles.ornamentLine} />
              <span className={styles.diamondGlyph} />
              <span className={styles.ornamentLine} />
            </div>

            <h1 className={styles.headline}>This piece is still being crafted.</h1>

            <p className={styles.subtext}>
              The page you’re looking for seems unfinished. Let’s take you back to something beautiful.
            </p>

            <div className={styles.buttonRow}>
              <Link href="/" className={styles.primaryCta}>
                <span>Back to Home</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="/shop" className={styles.secondaryCta}>
                <span>Explore Jewelry</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Right: HD Molten Gold Ring with Floating Fluid Lava */}
          <div className={styles.visualFrame}>
            {/* Stationary crisp base image */}
            <Image
              src="/media/molten-gold-404.jpg"
              alt="Sculpted molten gold statement ring on dark volcanic rock"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className={styles.baseImage}
            />

            {/* Fluid lava displacement layer */}
            <Image
              src="/media/molten-gold-404.jpg"
              alt=""
              aria-hidden="true"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className={styles.fluidLavaLayer}
            />

            {/* Molten liquid shimmering heat wave */}
            <div className={styles.lavaShimmerWave} aria-hidden="true" />

            {/* Breathing thermal molten glow */}
            <div className={styles.lavaHeatGlow} aria-hidden="true" />

            {/* Floating gold spark embers */}
            <div className={styles.emberContainer} aria-hidden="true">
              <span className={`${styles.ember} ${styles.ember1}`} />
              <span className={`${styles.ember} ${styles.ember2}`} />
              <span className={`${styles.ember} ${styles.ember3}`} />
              <span className={`${styles.ember} ${styles.ember4}`} />
              <span className={`${styles.ember} ${styles.ember5}`} />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter staticNavigation />
    </>
  );
}
