// Deterministic helpers so every `db:seed` produces the same marketplace.

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const random = mulberry32(20260930);

export const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
export const between = (min: number, max: number) => min + random() * (max - min);
export const int = (min: number, max: number) => Math.floor(between(min, max + 1));
export const chance = (p: number) => random() < p;

export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const NOW = Date.now();
export const now = () => new Date(NOW);
export const daysAgo = (days: number, hours = 0) => new Date(NOW - days * 86_400_000 - hours * 3_600_000);
export const daysFromNow = (days: number) => new Date(NOW + days * 86_400_000);
export const addHours = (d: Date, hours: number) => new Date(d.getTime() + hours * 3_600_000);

export const img = (id: string) => `https://images.unsplash.com/${id}`;

export function code(length: number, alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789") {
  return Array.from({ length }, () => alphabet[Math.floor(random() * alphabet.length)]).join("");
}
