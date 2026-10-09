// Brand, navigation and editorial content. Rename the marketplace here.

const u = (id: string, params = "fit=crop") => `https://images.unsplash.com/${id}?${params}`;

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:3000";

export const siteConfig = {
  name: "Loupe",
  descriptor: "Independent Jeweler Directory & Showcase",
  description:
    "Discover exceptional fine, high and vintage jewelry from verified independent jewelers — connect directly with master ateliers and artisans.",
  url: appUrl,
  supportEmail: "concierge@loupe.example",
  announcement: "Discover exceptional independent jewelers · Connect directly with master artisans",
  social: {
    instagram: "https://www.instagram.com/",
    pinterest: "https://www.pinterest.com/",
    tiktok: "https://www.tiktok.com/",
  },
  instagramHandle: "@wornwithloupe",
} as const;

export const mainCategories = [
  { slug: "rings", name: "Rings" },
  { slug: "necklaces", name: "Necklaces" },
  { slug: "earrings", name: "Earrings" },
  { slug: "bracelets", name: "Bracelets" },
  { slug: "high-jewelry", name: "High Jewelry" },
  { slug: "vintage", name: "Vintage & Pre-owned" },
] as const;

export const footerNav = [
  {
    title: "Discover",
    links: [
      { label: "All jewelry", href: "/shop" },
      { label: "Our jewelers", href: "/jewelers" },
      { label: "Engagement rings", href: "/shop/engagement-rings" },
      { label: "High jewelry", href: "/shop/high-jewelry" },
      { label: "Custom commissions", href: "/custom-orders" },
    ],
  },
  {
    title: "Guides",
    links: [
      { label: "Gold purity", href: "/guides/gold-purity" },
      { label: "Diamond clarity", href: "/guides/diamond-clarity" },
      { label: "Ring size guide", href: "/guides/ring-size" },
      { label: "Certificates explained", href: "/guides/certificates" },
    ],
  },
  {
    title: "For Jewelers",
    links: [
      { label: "List your business", href: "/sell" },
      { label: "Jeweler login", href: "/login" },
      { label: "Direct policies", href: "/help/shipping-returns" },
      { label: "Terms of service", href: "/help/terms" },
    ],
  },
] as const;

/** Editorial photography (Unsplash licence). */
export const imagery = {
  // Cropped (rect, in source pixels) and mirrored so the ring sits right of the headline.
  hero: u("photo-1707379059964-7f93f37ba418", "rect=1680,973,5040,2400&flip=h"),
  loupeStory: u("photo-1516652695352-6118f7cc1a07"),
  inspection: u("photo-1624588057318-5f1b2eb81012"),
  customOrder: [
    u("photo-1777126413571-8ec9bf884245"),
    u("photo-1705326452395-1d35e6add570"),
    u("photo-1628926379972-9843ad139a8c"),
  ],
  styled: [
    u("photo-1611652032931-10fc009c980a"),
    u("photo-1481980235850-66e47651e431"),
    u("photo-1740567177735-b3a751eb3891"),
    u("photo-1633934542430-0905ccb5f050"),
    u("photo-1643387774154-4ec59518f9a5"),
  ],
  sellCta: u("photo-1628058494685-6c2f796ac24a"),
  authBackdrop: u("photo-1682823544433-aae34df4e3da"),
} as const;

export const testimonials = [
  {
    quote:
      "I discovered an independent jeweler in Florence through Loupe and contacted them directly. We arranged a video consultation and designed a custom sapphire ring together.",
    name: "Elena M.",
    detail: "Bespoke sapphire solitaire · Florence",
  },
  {
    quote:
      "I reached out to the atelier directly through their Loupe showcase. They provided detailed provenance and resized the Art Deco ring perfectly for me.",
    name: "Hannah W.",
    detail: "1920s Art Deco cluster · London",
  },
  {
    quote:
      "Finding verified independent jewelers in one directory made finding an engagement ring effortless. Dealing directly with the master goldsmith was an unmatched experience.",
    name: "David K.",
    detail: "Handcrafted diamond band · New York",
  },
] as const;
