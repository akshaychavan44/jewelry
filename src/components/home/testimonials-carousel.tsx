"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Stars } from "@/components/ui/display";
import { testimonials } from "@/config/site";
import styles from "./testimonials.module.css";

const photographs = [
  { src: "/media/story-solitaire.webp", alt: "Emerald-cut diamond solitaire on ivory silk" },
  { src: "/media/story-art-deco.webp", alt: "Art Deco diamond and sapphire cluster ring on cream stone" },
  { src: "/media/story-bracelet.webp", alt: "Gold diamond tennis bracelet on cream travertine" },
];

export function TestimonialsCarousel() {
  const [active, setActive] = useState(0);
  const [entered, setEntered] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const count = testimonials.length;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setEntered(true); observer.disconnect(); }
    }, { threshold: 0.1 });
    observer.observe(section);
    const resize = new ResizeObserver(() => {
      const track = trackRef.current;
      const first = track?.firstElementChild;
      if (!track || !(first instanceof HTMLElement)) return;
      const step = first.offsetWidth + parseFloat(getComputedStyle(track).columnGap);
      track.scrollTo({ left: activeRef.current * step, behavior: "instant" });
    });
    if (trackRef.current) resize.observe(trackRef.current);
    return () => { observer.disconnect(); resize.disconnect(); };
  }, []);

  function showStory(index: number) {
    const next = (index + count) % count;
    const track = trackRef.current;
    const first = track?.firstElementChild;
    if (!track || !(first instanceof HTMLElement)) return;
    const step = first.offsetWidth + parseFloat(getComputedStyle(track).columnGap);
    track.scrollTo({ left: next * step, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    setActive(next);
    activeRef.current = next;
  }

  return (
    <section ref={sectionRef} className={styles.section} data-entered={entered} aria-labelledby="kind-words" aria-roledescription="carousel" onFocusCapture={() => setEntered(true)}>
      <div className={styles.heading}>
        <h2 id="kind-words">Stories worth keeping.</h2>
        <div className={styles.arrows}>
          <button type="button" aria-label="Previous story" aria-controls="stories-track" onClick={() => showStory(active - 1)}><ChevronLeft size={26} strokeWidth={1.25} aria-hidden /></button>
          <button type="button" aria-label="Next story" aria-controls="stories-track" onClick={() => showStory(active + 1)}><ChevronRight size={26} strokeWidth={1.25} aria-hidden /></button>
        </div>
      </div>
      <div id="stories-track" ref={trackRef} className={styles.track} onScroll={(event) => {
        const track = event.currentTarget;
        const first = track.firstElementChild;
        if (!(first instanceof HTMLElement)) return;
        const step = first.offsetWidth + parseFloat(getComputedStyle(track).columnGap);
        const next = Math.round(track.scrollLeft / step) % count;
        if (activeRef.current !== next) { activeRef.current = next; setActive(next); }
      }}>
        {[...testimonials, ...testimonials].map((story, position) => {
          const index = position % count;
          const duplicate = position >= count;
          return (
            <figure key={`${story.name}-${position}`} className={`${styles.card} ${duplicate ? styles.duplicate : ""}`} data-active={index === active} aria-hidden={duplicate || undefined} aria-label={duplicate ? undefined : `Story ${index + 1} of ${count}`}>
              <div className={styles.photo}><Image src={photographs[index].src} alt={duplicate ? "" : photographs[index].alt} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 85vw" className={styles.image} /></div>
              <span className={styles.quoteMark} aria-hidden>&ldquo;</span>
              <blockquote>{story.quote}</blockquote>
              <Stars rating={5} size={18} className={styles.stars} />
              <figcaption><span className={styles.name}>{story.name}</span><span className={styles.detail}>{story.detail}</span></figcaption>
            </figure>
          );
        })}
      </div>
      <div className={styles.dots} aria-label="Choose a story">
        {testimonials.map((story, index) => <button key={story.name} type="button" aria-label={`Show ${story.name}'s story`} aria-pressed={active === index} aria-controls="stories-track" onClick={() => showStory(index)}><span aria-hidden /></button>)}
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">Story {active + 1} of {count}: {testimonials[active].name}</p>
    </section>
  );
}
