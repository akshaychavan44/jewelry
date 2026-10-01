const u = (id: string) => `https://images.unsplash.com/${id}?fit=crop`;

/** Buying guides — linked from the header, footer, homepage education and PDPs. */
export const guides = [
  {
    slug: "gold-purity",
    title: "Gold purity, explained",
    short: "Gold purity",
    description: "What 9k, 14k, 18k and 22k really mean, how hallmarks prove it, and how live gold pricing works on Loupe.",
    image: u("photo-1777126413571-8ec9bf884245"),
    minutes: 6,
  },
  {
    slug: "diamond-clarity",
    title: "Diamond clarity, under the loupe",
    short: "Diamond clarity",
    description: "The eleven clarity grades, where eye-clean begins, and how clarity trades off against cut, colour and carat.",
    image: u("photo-1516652695352-6118f7cc1a07"),
    minutes: 7,
  },
  {
    slug: "ring-size",
    title: "Find your ring size",
    short: "Ring sizing",
    description: "Three reliable ways to measure at home, a size chart across the US, UK, EU and India, and what to do between sizes.",
    image: u("photo-1481980235850-66e47651e431"),
    minutes: 4,
  },
  {
    slug: "certificates",
    title: "Certificates & hallmarks",
    short: "Certificates explained",
    description: "Which laboratories to trust, how to read a grading report, and how Loupe checks every report number before it counts.",
    image: u("photo-1624588057318-5f1b2eb81012"),
    minutes: 6,
  },
] as const;

export type GuideSlug = (typeof guides)[number]["slug"];
export const guideBySlug = (slug: GuideSlug) => guides.find((g) => g.slug === slug)!;
