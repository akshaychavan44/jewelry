"use client";

import { ArrowDownUp, ChevronDown, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./jewelers-directory.module.css";

export function DirectorySelect({ name, value, children }: { name: "country" | "city" | "specialty" | "sort" | "radius"; value: string; children: ReactNode }) {
  const Icon = name === "country" ? MapPin : ArrowDownUp;
  return (
    <label className={styles.selectControl}>
      <Icon size={15} aria-hidden />
      <select key={value} name={name} form="jewelers-search" defaultValue={value} aria-label={{ country: "Country", city: "City", specialty: "Specialty", sort: "Sort jewelers", radius: "Distance" }[name]} onChange={(event) => { if (name === "country" && event.currentTarget.form) { const city = event.currentTarget.form.elements.namedItem("city"); if (city instanceof HTMLSelectElement) city.value = ""; } event.currentTarget.form?.requestSubmit(); }}>
        {children}
      </select>
      <ChevronDown size={13} aria-hidden />
    </label>
  );
}
