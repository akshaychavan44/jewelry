import { z } from "zod";
import { CONTACT_CHANNELS } from "@/lib/contact-analytics";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { getDirectorySettings } from "@/server/services/jeweler-directory";
import { publicProductWhere } from "@/server/services/catalog";
import { track } from "@/server/services/analytics";

const schema = z.object({ sellerId: z.string().min(1).max(100), channel: z.enum(CONTACT_CHANNELS), productId: z.string().min(1).max(100).optional() });
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 });
  const body = await request.text();
  if (body.length > 1024) return new Response(null, { status: 413 });
  let value: unknown;
  try { value = JSON.parse(body); } catch { return new Response(null, { status: 400 }); }
  const parsed = schema.safeParse(value);
  if (!parsed.success) return new Response(null, { status: 400 });
  const { sellerId, channel, productId } = parsed.data;
  const [seller, user] = await Promise.all([db.sellerProfile.findFirst({ where: { id: sellerId, verificationStatus: "APPROVED" }, select: { userId: true } }), getCurrentUser()]);
  if (!seller || (await getDirectorySettings(sellerId)).isPaused) return new Response(null, { status: 404 });
  if (user?.id === seller.userId) return new Response(null, { status: 204 });
  if (productId && !await db.product.findFirst({ where: { ...(await publicProductWhere("either")), id: productId, sellerId }, select: { id: true } })) return new Response(null, { status: 404 });
  await track("PAGE_VIEW", { sellerId, productId, userId: user?.id, metadata: { event: "contact_click", channel }, path: "/api/analytics/contact" });
  return new Response(null, { status: 204 });
}
