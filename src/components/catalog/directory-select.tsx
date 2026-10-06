"use client";

import { ArrowDownUp, ChevronDown, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./jewelers-directory.module.css";

export function DirectorySelect({ name, value, children }: { name: "country" | "sort"; value: string; children: ReactNode }) {
  const Icon = name === "country" ? MapPin : ArrowDownUp;
  return (
    <label className={styles.selectControl}>
      <Icon size={15} aria-hidden />
      <select key={value} name={name} form="jewelers-search" defaultValue={value} aria-label={name === "country" ? "Location" : "Sort jewelers"} onChange={(event) => event.currentTarget.form?.requestSubmit()}>
        {children}
      </select>
      <ChevronDown size={13} aria-hidden />
    </label>
  );
}
