import "server-only";

import { cache } from "react";
import { db } from "@/server/db";

/** Badge counts for the buyer's account navigation. */
export const getAccountBadges = cache(async (userId: string) => {
  const [offers, participations, openOrders] = await Promise.all([
    db.offer.count({ where: { buyerId: userId, OR: [{ status: "COUNTERED", lastActor: "SELLER" }, { status: "ACCEPTED" }] } }),
    db.conversationParticipant.findMany({ where: { userId }, select: { conversationId: true, lastReadAt: true } }),
    db.sellerOrder.count({ where: { order: { buyerId: userId, paymentStatus: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED"] } }, status: { in: ["PENDING", "PROCESSING", "IN_PRODUCTION", "SHIPPED"] } } }),
  ]);
  const unread = participations.length
    ? await db.message.count({
        where: {
          senderId: { not: userId },
          OR: participations.map((p) => ({ conversationId: p.conversationId, createdAt: { gt: p.lastReadAt ?? new Date(0) } })),
        },
      })
    : 0;
  return { offers, unread, openOrders };
});

export async function getBuyerOrders(userId: string, filter: "all" | "open" | "delivered" | "cancelled" = "all") {
  const statusFilter =
    filter === "open"
      ? { some: { status: { in: ["PENDING", "PROCESSING", "IN_PRODUCTION", "SHIPPED"] as ("PENDING" | "PROCESSING" | "IN_PRODUCTION" | "SHIPPED")[] } } }
      : filter === "delivered"
        ? { some: { status: "DELIVERED" as const } }
        : filter === "cancelled"
          ? { some: { status: { in: ["CANCELLED", "REFUNDED"] as ("CANCELLED" | "REFUNDED")[] } } }
          : undefined;
  return db.order.findMany({
    where: { buyerId: userId, status: { not: "PENDING_PAYMENT" }, ...(statusFilter ? { sellerOrders: statusFilter } : {}) },
    orderBy: { createdAt: "desc" },
    include: {
      sellerOrders: {
        include: {
          seller: { select: { storeName: true, slug: true } },
          items: { select: { id: true, title: true, imageUrl: true, variantTitle: true } },
          shipments: { where: { direction: "OUTBOUND" }, select: { carrier: true, trackingNumber: true } },
        },
      },
    },
  });
}

export async function getBuyerOrderDetail(userId: string, orderNumber: string) {
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: {
      payments: true,
      refunds: true,
      sellerOrders: {
        orderBy: { reference: "asc" },
        include: {
          seller: { select: { id: true, storeName: true, slug: true, city: true, country: true, returnWindowDays: true, userId: true } },
          statusEvents: { orderBy: { createdAt: "asc" } },
          shipments: { include: { events: { orderBy: { occurredAt: "desc" } } }, orderBy: { createdAt: "asc" } },
          items: { include: { review: { select: { id: true, rating: true } }, warranty: { select: { warrantyNumber: true, endsAt: true } }, product: { select: { slug: true } } } },
          returnRequests: { include: { shipment: true }, orderBy: { createdAt: "desc" } },
          disputes: { select: { id: true, caseNumber: true, status: true } },
          payout: { select: { status: true, releaseAfter: true } },
        },
      },
    },
  });
  if (!order || order.buyerId !== userId) return null;
  return order;
}
