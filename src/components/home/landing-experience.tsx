"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./landing.module.css";

export function LandingExperience({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Disable browser auto-scroll restoration so refresh always starts at the top of the landing page
    if (typeof window !== "undefined") {
      if ("scrollRestoration" in history) {
        history.scrollRestoration = "manual";
      }
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }

    const root = rootRef.current;
    if (!root) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sections = Array.from(root.children).filter((node): node is HTMLElement => node instanceof HTMLElement && node.tagName === "SECTION" && node.getAttribute("aria-labelledby") !== "hero-heading");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).dataset.reveal = "visible";
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.04, rootMargin: "0px 0px 40px 0px" });
    const revealAll = () => { if (motion.matches) sections.forEach((section) => { section.dataset.reveal = "visible"; }); };
    sections.forEach((section) => {
      section.dataset.reveal = !motion.matches && section.getBoundingClientRect().top > window.innerHeight ? "pending" : "visible";
      observer.observe(section);
    });
    const focus = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement) {
        const section = event.target.closest<HTMLElement>("[data-reveal]");
        if (section) section.dataset.reveal = "visible";
      }
    };
    root.addEventListener("focusin", focus);
    motion.addEventListener("change", revealAll);
    return () => {
      observer.disconnect();
      sections.forEach((section) => { delete section.dataset.reveal; });
      root.removeEventListener("focusin", focus);
      motion.removeEventListener("change", revealAll);
    };
  }, []);
  return <div ref={rootRef} className={styles.page}>{children}</div>;
}
