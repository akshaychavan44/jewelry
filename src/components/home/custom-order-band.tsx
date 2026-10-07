"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./custom-order-band.module.css";

const STEPS = [
  { step: "01", title: "Your Idea", body: "Share your story, a sketch or inspiration. Our jewelers will guide you from concept to creation.", image: "/media/bespoke-step-sketch.jpg", alt: "Hand-drawn jewelry concept sketch" },
  { step: "02", title: "Their Craft", body: "Get matched with independent jewelers who bring your idea to life with expert craftsmanship.", image: "/media/bespoke-step-craft-circle.jpg", alt: "Jeweler setting diamonds into a floral gold setting" },
  { step: "03", title: "One of One", body: "A piece that's uniquely yours, crafted with care, expertise and a story to tell.", image: "/media/bespoke-step-finished-circle.jpg", alt: "Finished gold and diamond teardrop pendant" },
];

export function CustomOrderBand() {
  const scene = useRef<HTMLElement>(null);
  const [entered, setEntered] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const target = scene.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setEntered(true);
        observer.disconnect();
      }
    }, { threshold: .22 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="bespoke" ref={scene} className={styles.scene} data-entered={entered && loaded} aria-labelledby="bespoke-heading">
      <div className={styles.photograph}>
        <Image src="/media/bespoke-scene-v2.png" alt="Gold floral diamond necklace with a pear-shaped pendant on flowing champagne silk" fill loading="eager" sizes="100vw" className={styles.necklace} onLoad={() => setLoaded(true)} />
      </div>
      <div className={styles.wash} aria-hidden="true" />
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Bespoke <span /></p>
        <h2 id="bespoke-heading">Imagined by you.<br />Crafted by them.</h2>
        <p className={styles.description}>From an idea to something entirely yours.<br />Connect with jewelers who bring custom pieces to life.</p>
        <Link href="/custom-orders" className={styles.cta}>Start your piece <ArrowRight size={19} strokeWidth={1.5} /></Link>
      </div>
      <div className={styles.annotations} aria-label="Make it yours">
        <div className={styles.stone}><h3>Stone</h3><p>Choose a gemstone<br />with meaning.</p><svg viewBox="0 0 120 70" aria-hidden="true"><path d="M2 2 H34 L117 67" /><circle cx="2" cy="2" r="2" /></svg></div>
        <div className={styles.metal}><h3>Metal</h3><p>Select your<br />metal finish.</p><svg viewBox="0 0 100 65" aria-hidden="true"><path d="M2 2 L73 62 H97" /><circle cx="97" cy="62" r="2" /></svg></div>
        <div className={styles.craft}><h3>Craft</h3><p>Personalize<br />every detail.</p><svg viewBox="0 0 100 65" aria-hidden="true"><path d="M2 2 L73 62 H97" /><circle cx="97" cy="62" r="2" /></svg></div>
      </div>
      <div className={styles.shimmer} aria-hidden="true" />
      <svg className={styles.journey} viewBox="0 0 1200 180" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <path className={styles.trajectory} pathLength="1" d="M-10 65 C155 -70 268 100 420 91 S570 11 690 122 S900 37 1050 57 S1190 16 1210 -5" />
        <g className={styles.nodes}><circle cx="266" cy="39" r="6" /><circle cx="594" cy="90" r="6" /><circle cx="1006" cy="55" r="6" /><circle cx="266" cy="39" r="2" /><circle cx="594" cy="90" r="2" /><circle cx="1006" cy="55" r="2" /></g>
      </svg>
      <ol className={styles.steps}>
        {STEPS.map(({step,title,body,image,alt}) => (
          <li key={step} className={styles.step}>
            <div className={styles.stepCopy}><span className={styles.number}>{step}</span><h3>{title}</h3><span className={styles.rule} aria-hidden="true" /><p>{body}</p></div>
            <div className={styles.circle}><Image src={image} alt={alt} fill sizes="(min-width: 1100px) 230px, (min-width: 768px) 170px, 140px" className={styles.stepImage} /><span aria-hidden="true" /></div>
          </li>
        ))}
      </ol>
    </section>
  );
}
