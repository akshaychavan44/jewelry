// Brand, navigation and editorial content. Rename the marketplace here.

const u = (id: string, params = "fit=crop") => `https://images.unsplash.com/${id}?${params}`;

export const siteConfig = {
  name: "Loupe",
  descriptor: "Fine Jewelry Marketplace",
  description:
    "Fine, high and vintage jewelry from independent jewelers — every seller verified, every stone certified, every delivery insured.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supportEmail: "concierge@loupe.example",
  announcement: "Every certificate checked · Insured, signature-on-delivery shipping",
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
    title: "Shop",
    links: [
      { label: "All jewelry", href: "/shop" },
      { label: "Engagement rings", href: "/shop/engagement-rings" },
      { label: "High jewelry", href: "/shop/high-jewelry" },
      { label: "Vintage & pre-owned", href: "/shop/vintage" },
      { label: "Custom orders", href: "/custom-orders" },
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
    title: "Marketplace",
    links: [
      { label: "Our jewelers", href: "/jewelers" },
      { label: "Sell on Loupe", href: "/sell" },
      { label: "Track an order", href: "/account/orders" },
      { label: "Shipping & returns", href: "/help/shipping-returns" },
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
      "The GIA report was attached to the listing and matched the laser inscription exactly. It arrived insured, signed for, and even more beautiful than the photos.",
    name: "Priya R.",
    detail: "Emerald-cut solitaire · Mumbai",
  },
  {
    quote:
      "I negotiated on a 1920s ring through Make an Offer, and the jeweler resized it before shipping. It felt like buying from a boutique, not a website.",
    name: "Hannah W.",
    detail: "Art Deco cluster ring · London",
  },
  {
    quote:
      "Payment was held until I'd inspected the bracelet. That's what finally made me comfortable buying fine jewelry online.",
    name: "Marcus L.",
    detail: "Diamond line bracelet · New York",
  },
] as const;
