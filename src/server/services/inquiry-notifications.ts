import "server-only";
import { db, type Tx } from "@/server/db";

export function inquiryEmailAvailable() {
  return !!(process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM && process.env.NEXT_PUBLIC_APP_URL);
}

/** Delivery is separate from the committed inquiry so a mail outage cannot lose it. */
export async function sendInquiryEmail(input: { to: string; subject: string; text: string; href: string; key: string }, send: typeof fetch = fetch) {
  if (!inquiryEmailAvailable()) return "unconfigured" as const;
  try {
    const link = new URL(input.href, process.env.NEXT_PUBLIC_APP_URL).href;
    const response = await send("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": input.key },
      body: JSON.stringify({ from: process.env.AUTH_EMAIL_FROM, to: [input.to], subject: input.subject, text: `${input.text}\n\nView on Loupe: ${link}` }), signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) { console.error("Inquiry email delivery failed", response.status); return "failed" as const; }
    return "sent" as const;
  } catch { console.error("Inquiry email delivery unavailable"); return "failed" as const; }
}

export async function markInquiryNotificationsRead(userId: string, through: Date, executor: Pick<Tx, "notification"> = db) {
  return executor.notification.updateMany({ where: { userId, type: "CUSTOM_REQUEST", readAt: null, createdAt: { lte: through } }, data: { readAt: new Date() } });
}
