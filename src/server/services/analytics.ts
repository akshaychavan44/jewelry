import "server-only";

import { after } from "next/server";
import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import type { AnalyticsEventType } from "@/generated/prisma/enums";
import { sha256 } from "@/server/crypto";
import { db } from "@/server/db";

/**
 * Records a first-party analytics event after the response is sent. Sessions
 * are a daily-rotating hash of IP + user agent — no tracking cookie needed.
 */
export async function track(type: AnalyticsEventType, data: { userId?: string | null; sellerId?: string; productId?: string; path?: string; metadata?: Prisma.InputJsonValue } = {}) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const ua = h.get("user-agent") ?? "";
  if (/bot|crawler|spider|preview/i.test(ua)) return;
  const sessionId = `h_${sha256(`${ip}|${ua}|${new Date().toISOString().slice(0, 10)}`).slice(0, 20)}`;
  const country = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? null;
  const referrer = h.get("referer");

  after(async () => {
    await db.analyticsEvent.create({
      data: { type, sessionId, userId: data.userId ?? null, sellerId: data.sellerId, productId: data.productId, path: data.path, referrer, country: country?.slice(0, 2) ?? null, metadata: data.metadata },
    });
    if (type === "PRODUCT_VIEW" && data.productId) {
      await db.product.update({ where: { id: data.productId }, data: { viewCount: { increment: 1 } } });
    }
  });
}
