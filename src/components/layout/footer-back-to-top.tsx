"use client";
import { ArrowUp } from "lucide-react";
import styles from "./footer.module.css";
export function FooterBackToTop() {
  return <button type="button" className={styles.top} aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}><ArrowUp size={22} strokeWidth={1.5} aria-hidden /></button>;
}
