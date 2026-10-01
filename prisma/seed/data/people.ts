// Demo accounts. Every seeded account shares DEMO_PASSWORD (development only).
//
//   admin@loupe.example    Super-admin
//   buyer@loupe.example    Buyer with orders, offers, wishlist, custom request
//   seller@loupe.example   Approved jeweler (Atelier Solène)
//   pending@loupe.example  Jeweler awaiting KYC approval (locked dashboard)

export const DEMO_PASSWORD = "LoupeDemo!2026";

export const ADMINS = [
  { name: "Nadia Brooks", email: "admin@loupe.example" },
  { name: "Tomás Rivera", email: "tomas.rivera@loupe.example" },
];

export type BuyerSpec = {
  key: string;
  name: string;
  email: string;
  country: string;
  currency: string;
  address: { line1: string; line2?: string; city: string; region?: string; postalCode: string; phone?: string };
  card: { brand: string; last4: string; exp: [number, number] };
};

export const BUYERS: BuyerSpec[] = [
  {
    key: "olivia",
    name: "Olivia Carter",
    email: "buyer@loupe.example",
    country: "US",
    currency: "USD",
    address: { line1: "245 West 11th Street", line2: "Apt 4B", city: "New York", region: "NY", postalCode: "10014", phone: "+1 646 555 0172" },
    card: { brand: "visa", last4: "4242", exp: [8, 2029] },
  },
  {
    key: "priya",
    name: "Priya Raman",
    email: "priya.raman@example.com",
    country: "IN",
    currency: "INR",
    address: { line1: "14 Carmichael Road", city: "Mumbai", region: "Maharashtra", postalCode: "400026", phone: "+91 98200 55012" },
    card: { brand: "mastercard", last4: "4444", exp: [3, 2028] },
  },
  {
    key: "hannah",
    name: "Hannah Whitfield",
    email: "hannah.whitfield@example.com",
    country: "GB",
    currency: "GBP",
    address: { line1: "12 Elgin Crescent", city: "London", postalCode: "W11 2HX", phone: "+44 7700 900418" },
    card: { brand: "amex", last4: "0005", exp: [11, 2027] },
  },
  {
    key: "marcus",
    name: "Marcus Lee",
    email: "marcus.lee@example.com",
    country: "US",
    currency: "USD",
    address: { line1: "2150 Pacific Avenue", city: "San Francisco", region: "CA", postalCode: "94115" },
    card: { brand: "visa", last4: "1881", exp: [5, 2030] },
  },
  {
    key: "sofia",
    name: "Sofia Marchetti",
    email: "sofia.marchetti@example.com",
    country: "IT",
    currency: "EUR",
    address: { line1: "Via della Spiga 22", city: "Milano", region: "MI", postalCode: "20121" },
    card: { brand: "mastercard", last4: "5100", exp: [9, 2028] },
  },
  {
    key: "aisha",
    name: "Aisha Rahman",
    email: "aisha.rahman@example.com",
    country: "AE",
    currency: "AED",
    address: { line1: "Villa 18, Jumeirah 2", city: "Dubai", postalCode: "00000" },
    card: { brand: "visa", last4: "0077", exp: [1, 2029] },
  },
  {
    key: "daniel",
    name: "Daniel Okafor",
    email: "daniel.okafor@example.com",
    country: "US",
    currency: "USD",
    address: { line1: "900 N Lake Shore Drive", line2: "Unit 1802", city: "Chicago", region: "IL", postalCode: "60611" },
    card: { brand: "amex", last4: "8431", exp: [6, 2027] },
  },
  {
    key: "emma",
    name: "Emma Laurent",
    email: "emma.laurent@example.com",
    country: "FR",
    currency: "EUR",
    address: { line1: "8 Quai Saint-Antoine", city: "Lyon", postalCode: "69002" },
    card: { brand: "visa", last4: "3220", exp: [12, 2028] },
  },
  {
    key: "kenji",
    name: "Kenji Watanabe",
    email: "kenji.watanabe@example.com",
    country: "JP",
    currency: "JPY",
    address: { line1: "3-6-1 Minami-Aoyama", city: "Minato-ku, Tokyo", postalCode: "107-0062" },
    card: { brand: "jcb", last4: "0505", exp: [4, 2029] },
  },
  {
    key: "chloe",
    name: "Chloe Martin",
    email: "chloe.martin@example.com",
    country: "AU",
    currency: "AUD",
    address: { line1: "41 Elizabeth Bay Road", city: "Sydney", region: "NSW", postalCode: "2011" },
    card: { brand: "visa", last4: "9995", exp: [7, 2028] },
  },
  {
    key: "ravi",
    name: "Ravi Menon",
    email: "ravi.menon@example.com",
    country: "SG",
    currency: "SGD",
    address: { line1: "12 Nassim Road", city: "Singapore", postalCode: "258372" },
    card: { brand: "mastercard", last4: "2718", exp: [10, 2029] },
  },
];

export const REVIEW_SNIPPETS: Record<3 | 4 | 5, { title: string; body: string }[]> = {
  5: [
    { title: "Even better in person", body: "The photos don't do it justice. The stone is lively in every light and the setting is beautifully finished underneath, where no one will ever look." },
    { title: "Exactly as described", body: "Certificate matched the stone, packaging was discreet and secure, and the jeweler sent a personal note. I felt looked after from start to finish." },
    { title: "An heirloom already", body: "I bought this to mark a milestone and it feels like something I'll hand down. Weighty, well made, and so comfortable to wear." },
    { title: "Superb craftsmanship", body: "You can see the handwork — every claw is even and the polish is flawless. Delivery was insured and needed a signature, which I appreciated." },
    { title: "Wear it every day", body: "Hasn't come off since it arrived. Sized perfectly and the jeweler answered all my questions within the hour." },
  ],
  4: [
    { title: "Beautiful, slightly smaller than expected", body: "Lovely quality and exactly as certified. It's a touch more delicate than I pictured — do check the scale view before ordering." },
    { title: "Lovely piece, slow-ish shipping", body: "The piece is gorgeous. Production took a few days longer than estimated, but the jeweler kept me updated throughout." },
  ],
  3: [{ title: "Good, but not quite for me", body: "Well made, but the colour is warmer than it looked on my screen. The return process to the jeweler was simple." }],
};
