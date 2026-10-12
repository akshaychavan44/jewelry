import { z } from "zod";

const webLink = (hosts?: string[]) => z.string().trim().max(500).refine((value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && (!hosts || hosts.some((h) => host === h || host.endsWith(`.${h}`)));
  } catch { return false; }
}, "Enter a valid full website or profile URL (including https://).");

export const directoryProfileSchema = z.object({
  storeName: z.string().trim().min(2, "Enter your business name.").max(60),
  tagline: z.string().trim().max(120),
  bio: z.string().trim().max(1500),
  city: z.string().trim().min(2, "Enter your city.").max(100),
  specialties: z.string().trim().max(300),
  address: z.string().trim().min(3, "Enter your business address.").max(200),
  hours: z.string().trim().max(200),
  latitude: z.string().trim().refine(v => !v || (Number.isFinite(Number(v)) && Math.abs(Number(v)) <= 90), "Enter a latitude between -90 and 90.").optional(),
  longitude: z.string().trim().refine(v => !v || (Number.isFinite(Number(v)) && Math.abs(Number(v)) <= 180), "Enter a longitude between -180 and 180.").optional(),
  phone: z.string().trim().max(30).refine((v) => !v || /^\+?[\d\s()-]{7,30}$/.test(v), "Enter a valid phone number."),
  whatsapp: z.string().trim().max(30).refine((v) => !v || /^\+?\d{8,15}$/.test(v.replace(/[\s()-]/g, "")), "Include the country code, e.g. +91 9876543210."),
  publicEmail: z.union([z.email(), z.literal("")]),
  instagram: webLink(["instagram.com"]),
  facebook: webLink(["facebook.com", "fb.com"]),
  youtube: webLink(["youtube.com", "youtu.be"]),
  website: webLink(),
  maps: webLink(["google.com", "maps.app.goo.gl", "goo.gl"]),
  acceptsCustomOrders: z.boolean(),
});

export type DirectoryProfileInput = z.infer<typeof directoryProfileSchema>;
export const socialEnrollmentSchema = directoryProfileSchema.pick({ instagram: true, facebook: true, youtube: true, whatsapp: true, publicEmail: true, maps: true });
export const INQUIRY_LABELS = { NEW: "New", CONTACTED: "Contacted", CLOSED: "Closed" } as const;
export type InquiryStatus = keyof typeof INQUIRY_LABELS;
