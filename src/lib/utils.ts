import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      font: ["display", "script"],
      shadow: ["soft", "lift"],
      tracking: ["caps", "wordmark"],
      ease: ["silk"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function initials(name?: string | null) {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count.toLocaleString("en-US")} ${count === 1 ? singular : plural}`;
}

/** "IN_PRODUCTION" → "In production" */
export function humanize(value: string) {
  const text = value.toLowerCase().replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Converts Prisma BigInt / Decimal / number values into a plain JS number. */
export function num(value: bigint | number | string | { toString(): string } | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  return Number(value.toString());
}

export function absoluteUrl(path = "/") {
  return new URL(path, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").toString();
}

export function randomCode(length = 6, alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789") {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function truncate(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export type SearchParams = Record<string, string | string[] | undefined>;

export function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function listParam(value: string | string[] | undefined) {
  if (!value) return [];
  return (Array.isArray(value) ? value : value.split(",")).map((v) => v.trim()).filter(Boolean);
}
