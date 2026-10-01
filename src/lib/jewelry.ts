// Domain knowledge shared by the storefront, seller tools and pricing engine.
import type {
  CertificateLab,
  ClarityGrade,
  CutGrade,
  Gemstone,
  MetalColor,
  MetalType,
  SpotMetal,
  StoneShape,
} from "@/generated/prisma/enums";

// ── Metals ────────────────────────────────────────────────────────────────────

type MetalInfo = {
  label: string;
  /** Millesimal fineness as struck in a hallmark (e.g. 750 = 18k). */
  fineness: string | null;
  /** Fraction of pure metal, used by live spot pricing. */
  purity: number | null;
  spot: SpotMetal | null;
  family: "gold" | "platinum" | "silver" | "other";
};

export const METALS: Record<MetalType, MetalInfo> = {
  GOLD_9K: { label: "9k Gold", fineness: "375", purity: 0.375, spot: "GOLD", family: "gold" },
  GOLD_14K: { label: "14k Gold", fineness: "585", purity: 0.585, spot: "GOLD", family: "gold" },
  GOLD_18K: { label: "18k Gold", fineness: "750", purity: 0.75, spot: "GOLD", family: "gold" },
  GOLD_22K: { label: "22k Gold", fineness: "916", purity: 0.916, spot: "GOLD", family: "gold" },
  GOLD_24K: { label: "24k Gold", fineness: "999", purity: 0.999, spot: "GOLD", family: "gold" },
  PLATINUM: { label: "Platinum", fineness: "PT950", purity: 0.95, spot: "PLATINUM", family: "platinum" },
  PALLADIUM: { label: "Palladium", fineness: "PD950", purity: 0.95, spot: "PALLADIUM", family: "platinum" },
  STERLING_SILVER: { label: "Sterling Silver", fineness: "925", purity: 0.925, spot: "SILVER", family: "silver" },
  FINE_SILVER: { label: "Fine Silver", fineness: "999", purity: 0.999, spot: "SILVER", family: "silver" },
  TITANIUM: { label: "Titanium", fineness: null, purity: null, spot: null, family: "other" },
  MIXED_METALS: { label: "Mixed Metals", fineness: null, purity: null, spot: null, family: "other" },
  OTHER: { label: "Other Metal", fineness: null, purity: null, spot: null, family: "other" },
};

/** Order used by filters and the variant builder. */
export const METAL_OPTIONS: MetalType[] = [
  "GOLD_24K",
  "GOLD_22K",
  "GOLD_18K",
  "GOLD_14K",
  "GOLD_9K",
  "PLATINUM",
  "PALLADIUM",
  "STERLING_SILVER",
  "FINE_SILVER",
  "TITANIUM",
  "MIXED_METALS",
];

export const METAL_COLORS: Record<MetalColor, string> = {
  YELLOW: "Yellow",
  WHITE: "White",
  ROSE: "Rose",
  TWO_TONE: "Two-tone",
  NATURAL: "Natural",
};

/** Swatch colours for metal toggles. */
export const METAL_SWATCH: Record<MetalColor | "PLATINUM" | "SILVER", string> = {
  YELLOW: "#d6b26b",
  WHITE: "#dcdcd8",
  ROSE: "#d9a38c",
  TWO_TONE: "linear-gradient(135deg,#d6b26b 50%,#dcdcd8 50%)",
  NATURAL: "#c9c6bf",
  PLATINUM: "#cfd0cc",
  SILVER: "#d8d8d6",
};

export function metalLabel(metal: MetalType, color?: MetalColor | null) {
  const info = METALS[metal];
  if (info.family === "gold" && color && color !== "NATURAL") {
    const shade = color === "TWO_TONE" ? "Two-tone" : METAL_COLORS[color];
    return `${info.label.replace(" Gold", "")} ${shade} Gold`;
  }
  return info.label;
}

export const SPOT_METALS: Record<SpotMetal, { label: string; symbol: string }> = {
  GOLD: { label: "Gold", symbol: "XAU" },
  SILVER: { label: "Silver", symbol: "XAG" },
  PLATINUM: { label: "Platinum", symbol: "XPT" },
  PALLADIUM: { label: "Palladium", symbol: "XPD" },
};

// ── Gemstones & grading ───────────────────────────────────────────────────────

export const GEMSTONES: Record<Gemstone, string> = {
  NONE: "No gemstone",
  DIAMOND: "Diamond",
  LAB_GROWN_DIAMOND: "Lab-grown diamond",
  SAPPHIRE: "Sapphire",
  RUBY: "Ruby",
  EMERALD: "Emerald",
  PEARL: "Pearl",
  MOISSANITE: "Moissanite",
  TANZANITE: "Tanzanite",
  AQUAMARINE: "Aquamarine",
  MORGANITE: "Morganite",
  OPAL: "Opal",
  AMETHYST: "Amethyst",
  TOPAZ: "Topaz",
  TOURMALINE: "Tourmaline",
  SPINEL: "Spinel",
  GARNET: "Garnet",
  CITRINE: "Citrine",
  PERIDOT: "Peridot",
  ONYX: "Onyx",
  TURQUOISE: "Turquoise",
  JADE: "Jade",
  OTHER: "Other gemstone",
};

export const STONE_SHAPES: Record<StoneShape, string> = {
  ROUND: "Round brilliant",
  OVAL: "Oval",
  CUSHION: "Cushion",
  PRINCESS: "Princess",
  EMERALD: "Emerald cut",
  PEAR: "Pear",
  MARQUISE: "Marquise",
  RADIANT: "Radiant",
  ASSCHER: "Asscher",
  HEART: "Heart",
  BAGUETTE: "Baguette",
  CABOCHON: "Cabochon",
  ROSE_CUT: "Rose cut",
  OLD_EUROPEAN: "Old European cut",
  OTHER: "Other",
};

export const CLARITY_SCALE: { grade: ClarityGrade; name: string; group: string; detail: string }[] = [
  { grade: "FL", name: "Flawless", group: "Flawless", detail: "No inclusions or blemishes visible under 10× magnification." },
  { grade: "IF", name: "Internally flawless", group: "Flawless", detail: "No inclusions under 10× — only faint surface blemishes." },
  { grade: "VVS1", name: "Very, very slightly included 1", group: "VVS", detail: "Minute inclusions, extremely difficult for a skilled grader to find at 10×." },
  { grade: "VVS2", name: "Very, very slightly included 2", group: "VVS", detail: "Minute inclusions, very difficult to see at 10×." },
  { grade: "VS1", name: "Very slightly included 1", group: "VS", detail: "Minor inclusions, difficult to see at 10×. Invisible to the eye." },
  { grade: "VS2", name: "Very slightly included 2", group: "VS", detail: "Minor inclusions, somewhat easy to see at 10×. Eye-clean." },
  { grade: "SI1", name: "Slightly included 1", group: "SI", detail: "Noticeable at 10×; usually eye-clean face up — the value sweet spot." },
  { grade: "SI2", name: "Slightly included 2", group: "SI", detail: "Easily noticeable at 10×; may be visible to a trained eye." },
  { grade: "I1", name: "Included 1", group: "Included", detail: "Obvious inclusions that may be visible to the naked eye." },
  { grade: "I2", name: "Included 2", group: "Included", detail: "Inclusions visible to the eye that can affect brilliance." },
  { grade: "I3", name: "Included 3", group: "Included", detail: "Prominent inclusions that may affect durability." },
];

export const CUT_GRADES: Record<CutGrade, string> = {
  EXCELLENT: "Excellent",
  VERY_GOOD: "Very good",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
};

/** Gold purity chart used on the homepage and in guides. */
export const GOLD_PURITY = [
  { karat: "24k", fineness: "999", percent: 99.9, note: "Pure gold. Rich colour, too soft for most settings.", use: "Coins, bullion, ceremonial pieces" },
  { karat: "22k", fineness: "916", percent: 91.6, note: "Deep yellow and malleable — the standard for Indian bridal gold.", use: "Bangles, temple & bridal jewelry" },
  { karat: "18k", fineness: "750", percent: 75, note: "The fine-jewelry benchmark: warm colour, secure for stone settings.", use: "Engagement rings, high jewelry" },
  { karat: "14k", fineness: "585", percent: 58.5, note: "Harder-wearing and more affordable, with a paler tone.", use: "Everyday rings, chains, studs" },
  { karat: "9k", fineness: "375", percent: 37.5, note: "The minimum legal gold standard in the UK. Durable and accessible.", use: "Stacking rings, charms" },
] as const;

// ── Certification labs ────────────────────────────────────────────────────────

type LabInfo = { name: string; full: string; verify?: (report: string) => string };

export const LABS: Record<CertificateLab, LabInfo> = {
  GIA: {
    name: "GIA",
    full: "Gemological Institute of America",
    verify: (n) => `https://www.gia.edu/report-check?reportno=${encodeURIComponent(n)}`,
  },
  IGI: {
    name: "IGI",
    full: "International Gemological Institute",
    verify: (n) => `https://www.igi.org/verify-your-report/?r=${encodeURIComponent(n)}`,
  },
  HRD: { name: "HRD", full: "HRD Antwerp" },
  AGS: { name: "AGS", full: "American Gem Society Laboratories" },
  GCAL: { name: "GCAL", full: "Gem Certification & Assurance Lab" },
  SSEF: { name: "SSEF", full: "Swiss Gemmological Institute" },
  GUBELIN: { name: "Gübelin", full: "Gübelin Gem Lab" },
  AGL: { name: "AGL", full: "American Gemological Laboratories" },
  BIS_HALLMARK: { name: "BIS Hallmark", full: "Bureau of Indian Standards hallmark (HUID)" },
  ASSAY_OFFICE: { name: "UK Hallmark", full: "UK Assay Office hallmark" },
  OTHER: { name: "Other", full: "Independent laboratory" },
};

/** Labs offered as PLP certification facets. */
export const CERTIFICATION_FILTERS: CertificateLab[] = ["GIA", "IGI", "BIS_HALLMARK", "HRD", "AGS", "SSEF", "GUBELIN", "ASSAY_OFFICE"];

// ── Ring sizes (US scale is canonical) ────────────────────────────────────────

const UK_LETTERS: Record<string, string> = {
  "3": "F", "3.5": "G", "4": "H", "4.5": "I", "5": "J½", "5.5": "K½", "6": "L½", "6.5": "M½",
  "7": "N½", "7.5": "O½", "8": "Q", "8.5": "Q½", "9": "R½", "9.5": "S½", "10": "T½",
  "10.5": "U½", "11": "V½", "11.5": "W½", "12": "Y", "12.5": "Z", "13": "Z+1",
};

export type RingSize = {
  us: number;
  uk: string;
  eu: number;
  india: number;
  diameterMm: number;
  circumferenceMm: number;
};

export const RING_SIZES: RingSize[] = Array.from({ length: 21 }, (_, i) => {
  const us = 3 + i * 0.5;
  const diameter = 11.63 + 0.8128 * us;
  const circumference = Math.PI * diameter;
  return {
    us,
    uk: UK_LETTERS[String(us)] ?? "—",
    eu: Math.round(circumference),
    india: Math.max(1, Math.round(circumference - 40)),
    diameterMm: Math.round(diameter * 10) / 10,
    circumferenceMm: Math.round(circumference * 10) / 10,
  };
});

export function ringSizeLabel(us: number | null | undefined) {
  if (us === null || us === undefined) return "";
  const row = RING_SIZES.find((r) => r.us === us);
  return row ? `US ${us} · UK ${row.uk} · EU ${row.eu}` : `US ${us}`;
}

export function ringSizesBetween(min?: number | null, max?: number | null) {
  return RING_SIZES.filter((r) => r.us >= (min ?? 3) && r.us <= (max ?? 13));
}

// ── Chains ────────────────────────────────────────────────────────────────────

export const CHAIN_LENGTHS = [
  { mm: 356, inches: 14, name: "Collar" },
  { mm: 406, inches: 16, name: "Choker" },
  { mm: 457, inches: 18, name: "Princess" },
  { mm: 508, inches: 20, name: "Matinee" },
  { mm: 610, inches: 24, name: "Long matinee" },
  { mm: 762, inches: 30, name: "Opera" },
];

export function chainLengthLabel(mm: number) {
  const preset = CHAIN_LENGTHS.find((c) => c.mm === mm);
  const inches = Math.round((mm / 25.4) * 2) / 2;
  return preset ? `${preset.inches}″ · ${preset.name}` : `${inches}″ (${Math.round(mm / 10)} cm)`;
}

// ── Scale visualiser references ───────────────────────────────────────────────

export type ScaleReference = {
  id: string;
  label: string;
  shape: "circle" | "rect" | "dodecagon";
  widthMm: number;
  heightMm: number;
};

export const SCALE_REFERENCES: ScaleReference[] = [
  { id: "us-quarter", label: "US quarter", shape: "circle", widthMm: 24.26, heightMm: 24.26 },
  { id: "euro", label: "€1 coin", shape: "circle", widthMm: 23.25, heightMm: 23.25 },
  { id: "pound", label: "£1 coin", shape: "dodecagon", widthMm: 23.43, heightMm: 23.43 },
  { id: "rupee", label: "₹10 coin", shape: "circle", widthMm: 27, heightMm: 27 },
  { id: "card", label: "Bank card", shape: "rect", widthMm: 85.6, heightMm: 53.98 },
];

// ── Engraving ─────────────────────────────────────────────────────────────────

export const ENGRAVING_STYLES = {
  SCRIPT: { label: "Script", className: "font-script text-[1.35em]" },
  SERIF: { label: "Serif", className: "font-display" },
  BLOCK: { label: "Block", className: "font-sans uppercase tracking-[0.18em] text-[0.8em]" },
} as const;

export function formatCarat(ct: number | null | undefined) {
  if (!ct) return "";
  return `${ct.toFixed(2)} ct`;
}
