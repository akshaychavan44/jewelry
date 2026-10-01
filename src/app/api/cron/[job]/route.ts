import { safeEqual } from "@/server/crypto";
import { db } from "@/server/db";
import { releaseExpiredReservations } from "@/server/services/checkout";
import { releaseDuePayouts } from "@/server/services/fulfillment";
import { repriceSpotListings } from "@/server/services/listings";

// Scheduled jobs (Vercel Cron / any scheduler). Authorise with
// `Authorization: Bearer $CRON_SECRET`.
//   release-payouts      every hour     escrow → vendor transfers
//   expire-reservations  every 10 min   unpaid checkouts return stock
//   expire-offers        every hour     lapsed negotiations close
//   reprice-metals       every 15 min   METAL_SPOT listings follow the spot rate
const JOBS: Record<string, () => Promise<unknown>> = {
  "release-payouts": () => releaseDuePayouts(),
  "expire-reservations": () => releaseExpiredReservations(),
  "expire-offers": async () => {
    const res = await db.offer.updateMany({ where: { status: { in: ["PENDING", "COUNTERED"] }, expiresAt: { lt: new Date() } }, data: { status: "EXPIRED" } });
    return res.count;
  },
  "reprice-metals": () => repriceSpotListings(),
};

export async function GET(req: Request, { params }: { params: Promise<{ job: string }> }) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return new Response("Unauthorized", { status: 401 });
  const { job } = await params;
  const run = JOBS[job];
  if (!run) return new Response("Unknown job", { status: 404 });
  const started = Date.now();
  const result = await run();
  return Response.json({ job, result, ms: Date.now() - started });
}
