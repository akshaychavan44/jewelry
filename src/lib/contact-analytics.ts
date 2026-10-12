export const CONTACT_CHANNELS = ["phone", "whatsapp", "email", "website", "directions", "instagram", "facebook", "youtube"] as const;
export type ContactChannel = typeof CONTACT_CHANNELS[number];

export function recordContactClick(sellerId: string, channel: ContactChannel, productId?: string) {
  const body = JSON.stringify({ sellerId, channel, productId });
  try {
    if (navigator.sendBeacon?.("/api/analytics/contact", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/analytics/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch { /* Analytics must never interrupt a customer's contact link. */ }
}
