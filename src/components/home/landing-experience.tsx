import type { ReactNode } from "react";
import styles from "./landing.module.css";

export function LandingExperience({ children }: { children: ReactNode }) {
  return <div className={styles.page}>{children}</div>;
}