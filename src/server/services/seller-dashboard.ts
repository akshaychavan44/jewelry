import "server-only";

import { convertMinor } from "@/lib/money";
import { num } from "@/lib/utils";
import { db } from "@/server/db";

const DAY = 86_400_000;

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Seller analytics in the seller's own currency, converted at each order's FX snapshot. */
export async function getSellerDashboard(sellerId: string, currency: string, rangeDays: number) {
  const now = Date.now();
  const since = new Date(now - rangeDays * DAY);
  const prevSince = new Date(now - 2 * rangeDays * DAY);

  const [orders, queue, lowStock, payouts, views, prevViews, sessions, recentOrders, seller] = await Promise.all([
    db.sellerOrder.findMany({
      where: { sellerId, createdAt: { gte: prevSince }, order: { paymentStatus: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"] } } },
      select: { createdAt: true, status: true, subtotalMinor: true, currency: true, order: { select: { fxSnapshot: true } }, items: { select: { quantity: true } } },
    }),
    db.sellerOrder.groupBy({ by: ["status"], where: { sellerId, order: { paymentStatus: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED"] } } }, _count: { _all: true } }),
    db.productVariant.findMany({
      where: { sellerId, isActive: true, trackInventory: true, allowBackorder: false, product: { status: { in: ["ACTIVE", "SOLD"] }, deletedAt: null, isOneOfAKind: false } },
      select: { id: true, sku: true, title: true, stockQuantity: true, lowStockThreshold: true, product: { select: { id: true, title: true } } },
    }),
    db.payout.groupBy({ by: ["status"], where: { sellerId }, _sum: { amountMinor: true } }),
    db.analyticsEvent.groupBy({ by: ["type"], where: { sellerId, createdAt: { gte: since }, type: { in: ["PRODUCT_VIEW", "STORE_VIEW", "ADD_TO_CART"] } }, _count: { _all: true } }),
    db.analyticsEvent.count({ where: { sellerId, createdAt: { gte: prevSince, lt: since }, type: { in: ["PRODUCT_VIEW", "STORE_VIEW"] } } }),
    db.analyticsEvent.findMany({ where: { sellerId, createdAt: { gte: since }, type: { in: ["PRODUCT_VIEW", "STORE_VIEW"] } }, select: { sessionId: true, createdAt: true } }),
    db.sellerOrder.findMany({
      where: { sellerId, status: { in: ["PENDING", "PROCESSING", "IN_PRODUCTION"] }, order: { paymentStatus: "SUCCEEDED" } },
      orderBy: { createdAt: "asc" },
      take: 6,
      include: { order: { select: { orderNumber: true, shippingAddress: true } }, items: { select: { title: true, imageUrl: true, engravingText: true, ringSize: true } } },
    }),
    db.sellerProfile.findUniqueOrThrow({ where: { id: sellerId }, select: { ratingAverage: true, ratingCount: true, responseTimeMinutes: true } }),
  ]);

  const toSeller = (minor: bigint | number, from: string, snapshot: unknown) => {
    const rates = ((snapshot as { rates?: Record<string, number> } | null)?.rates ?? {}) as Record<string, number>;
    if (from === currency) return num(minor);
    if (!rates[from] || !rates[currency]) return 0;
    return convertMinor(num(minor), from, currency, rates, "exact");
  };

  const live = (s: string) => s !== "CANCELLED" && s !== "REFUNDED";
  const current = orders.filter((o) => o.createdAt >= since && live(o.status));
  const previous = orders.filter((o) => o.createdAt < since && live(o.status));
  const revenue = current.reduce((n, o) => n + toSeller(o.subtotalMinor, o.currency, o.order.fxSnapshot), 0);
  const prevRevenue = previous.reduce((n, o) => n + toSeller(o.subtotalMinor, o.currency, o.order.fxSnapshot), 0);
  const units = current.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0);
  const prevUnits = previous.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0);

  // Daily revenue series (zero-filled).
  const byDay = new Map<string, number>();
  for (let i = rangeDays - 1; i >= 0; i--) byDay.set(dayKey(new Date(now - i * DAY)), 0);
  for (const o of current) {
    const k = dayKey(o.createdAt);
    if (byDay.has(k)) byDay.set(k, byDay.get(k)! + toSeller(o.subtotalMinor, o.currency, o.order.fxSnapshot));
  }
  const trafficByDay = new Map<string, number>([...byDay.keys()].map((k) => [k, 0]));
  for (const s of sessions) {
    const k = dayKey(s.createdAt);
    if (trafficByDay.has(k)) trafficByDay.set(k, trafficByDay.get(k)! + 1);
  }

  const viewsTotal = views.filter((v) => v.type !== "ADD_TO_CART").reduce((n, v) => n + v._count._all, 0);
  const uniqueSessions = new Set(sessions.map((s) => s.sessionId)).size;
  const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : null);

  return {
    revenue,
    revenueDelta: pct(revenue, prevRevenue),
    units,
    unitsDelta: pct(units, prevUnits),
    orders: current.length,
    aov: current.length ? Math.round(revenue / current.length) : 0,
    views: viewsTotal,
    viewsDelta: pct(viewsTotal, prevViews),
    conversion: uniqueSessions ? (current.length / uniqueSessions) * 100 : 0,
    addToCart: views.find((v) => v.type === "ADD_TO_CART")?._count._all ?? 0,
    rating: seller,
    revenueSeries: [...byDay.entries()].map(([date, value]) => ({ date, value })),
    trafficSeries: [...trafficByDay.values()],
    queue: Object.fromEntries(queue.map((q) => [q.status, q._count._all])) as Record<string, number>,
    lowStock: lowStock.filter((v) => v.stockQuantity <= v.lowStockThreshold).sort((a, b) => a.stockQuantity - b.stockQuantity).slice(0, 8),
    payouts: Object.fromEntries(payouts.map((p) => [p.status, num(p._sum.amountMinor)])) as Record<string, number>,
    recentOrders,
  };
}
