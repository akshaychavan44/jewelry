"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./story.module.css";

export function StoryEntrance({ children }: { children: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let entered = false;
    const reveal = () => {
      entered = true;
      section.dataset.entered = "true";
      observer.disconnect();
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.18) reveal();
    }, { threshold: [0, 0.18] });
    const syncMotion = () => { if (motion.matches) reveal(); };
    section.dataset.entered = motion.matches ? "true" : "false";
    if (!motion.matches) observer.observe(section);
    else entered = true;
    section.addEventListener("focusin", reveal);
    motion.addEventListener("change", syncMotion);
    return () => {
      observer.disconnect();
      section.removeEventListener("focusin", reveal);
      motion.removeEventListener("change", syncMotion);
      if (!entered) delete section.dataset.entered;
    };
  }, []);
  return <section ref={sectionRef} id="our-story" aria-labelledby="story-heading" className={styles.story}>{children}</section>;
}