import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { randomToken, sha256, hmacSha256, safeEqual, decrypt, encrypt } from "@/server/crypto";
import { db } from "@/server/db";
import { refreshProductFacets } from "./listings";

// External POS inventory synchronisation.
//
//   Inbound  · Shopify  POST /api/integrations/shopify/:id   (X-Shopify-Hmac-Sha256)
//            · Square   POST /api/integrations/square/:id    (x-square-hmacsha256-signature)
//            · Custom   PUT  /api/v1/inventory               (Authorization: Bearer lp_live_…)
//   Outbound · stock changes on Loupe are recorded as OUTBOUND sync events and
//              pushed to the provider's inventory API (credentials permitting).
//
// Every inbound event is stored with its provider event id for idempotency, so
// retried webhooks are acknowledged without being applied twice.

export class SyncError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function createCustomApiIntegration(sellerId: string, name: string) {
  const key = `lp_live_${randomToken(24)}`;
  const integration = await db.inventoryIntegration.create({
    data: { sellerId, provider: "CUSTOM_API", name, apiKeyPrefix: key.slice(0, 12), apiKeyHash: sha256(key) },
  });
  return { integration, apiKey: key };
}

export async function createWebhookIntegration(sellerId: string, provider: "SHOPIFY" | "SQUARE", name: string, secret: string, shopDomain?: string) {
  return db.inventoryIntegration.create({
    data: { sellerId, provider, name, shopDomain: shopDomain || null, webhookSecretEncrypted: encrypt(secret) },
  });
}

async function setStock(integrationId: string, sellerId: string, updates: { variantId: string; quantity: number }[]) {
  const products = new Set<string>();
  for (const u of updates) {
    // Ownership is checked before any write: a mapping can only move its own store's stock.
    const owned = await db.productVariant.findFirst({ where: { id: u.variantId, sellerId }, select: { id: true } });
    if (!owned) throw new SyncError("SKU does not belong to this store", 403);
    const v = await db.productVariant.update({ where: { id: owned.id }, data: { stockQuantity: Math.max(0, Math.floor(u.quantity)) }, select: { productId: true } });
    products.add(v.productId);
    await db.externalSkuMapping.updateMany({ where: { integrationId, variantId: u.variantId }, data: { lastQuantity: u.quantity, lastSyncedAt: new Date() } });
  }
  for (const p of products) await refreshProductFacets(db, p);
  await db.inventoryIntegration.update({ where: { id: integrationId }, data: { lastSyncedAt: new Date(), lastError: null, status: "ACTIVE" } });
}

async function logEvent(data: Prisma.InventorySyncEventUncheckedCreateInput) {
  try {
    return await db.inventorySyncEvent.create({ data });
  } catch (error) {
    // Unique (integrationId, externalEventId) → already processed.
    if ((error as { code?: string }).code === "P2002") return null;
    throw error;
  }
}

export async function handleShopifyWebhook(integrationId: string, rawBody: string, headers: Headers) {
  const integration = await db.inventoryIntegration.findUnique({ where: { id: integrationId } });
  if (!integration || integration.provider !== "SHOPIFY" || !integration.webhookSecretEncrypted) throw new SyncError("Unknown integration", 404);
  const expected = hmacSha256(decrypt(integration.webhookSecretEncrypted), rawBody, "base64");
  if (!safeEqual(expected, headers.get("x-shopify-hmac-sha256") ?? "")) throw new SyncError("Invalid signature", 401);

  const eventId = headers.get("x-shopify-webhook-id") ?? headers.get("x-shopify-event-id");
  const topic = headers.get("x-shopify-topic") ?? "inventory_levels/update";
  const payload = JSON.parse(rawBody) as { inventory_item_id?: number | string; available?: number };
  const event = await logEvent({ integrationId, direction: "INBOUND", externalEventId: eventId, topic, status: "RECEIVED", payload });
  if (!event) return { duplicate: true };

  const mapping = await db.externalSkuMapping.findUnique({ where: { integrationId_externalId: { integrationId, externalId: String(payload.inventory_item_id) } } });
  if (!mapping || typeof payload.available !== "number") {
    const error = `No SKU mapping for inventory_item_id ${payload.inventory_item_id}`;
    await db.inventorySyncEvent.update({ where: { id: event.id }, data: { status: "FAILED", error } });
    await db.inventoryIntegration.update({ where: { id: integrationId }, data: { lastError: error } });
    return { applied: 0 };
  }
  await setStock(integrationId, integration.sellerId, [{ variantId: mapping.variantId, quantity: payload.available }]);
  await db.inventorySyncEvent.update({ where: { id: event.id }, data: { status: "PROCESSED", processedAt: new Date() } });
  return { applied: 1 };
}

export async function handleSquareWebhook(integrationId: string, rawBody: string, headers: Headers, notificationUrl: string) {
  const integration = await db.inventoryIntegration.findUnique({ where: { id: integrationId } });
  if (!integration || integration.provider !== "SQUARE" || !integration.webhookSecretEncrypted) throw new SyncError("Unknown integration", 404);
  // Square signs notification URL + raw body with the subscription's signature key.
  const expected = hmacSha256(decrypt(integration.webhookSecretEncrypted), notificationUrl + rawBody, "base64");
  if (!safeEqual(expected, headers.get("x-square-hmacsha256-signature") ?? "")) throw new SyncError("Invalid signature", 401);

  const body = JSON.parse(rawBody) as { event_id?: string; type?: string; data?: { object?: { inventory_counts?: { catalog_object_id: string; quantity: string; state: string }[] } } };
  const event = await logEvent({ integrationId, direction: "INBOUND", externalEventId: body.event_id, topic: body.type ?? "inventory.count.updated", status: "RECEIVED", payload: body as Prisma.InputJsonValue });
  if (!event) return { duplicate: true };

  const counts = (body.data?.object?.inventory_counts ?? []).filter((c) => c.state === "IN_STOCK");
  const mappings = await db.externalSkuMapping.findMany({ where: { integrationId, externalId: { in: counts.map((c) => c.catalog_object_id) } } });
  const updates = counts.flatMap((c) => {
    const m = mappings.find((x) => x.externalId === c.catalog_object_id);
    return m ? [{ variantId: m.variantId, quantity: Number(c.quantity) }] : [];
  });
  await setStock(integrationId, integration.sellerId, updates);
  await db.inventorySyncEvent.update({ where: { id: event.id }, data: { status: updates.length ? "PROCESSED" : "IGNORED", processedAt: new Date() } });
  return { applied: updates.length };
}

export async function authenticateApiKey(authorization: string | null) {
  const key = authorization?.match(/^Bearer\s+(lp_live_[\w-]+)$/)?.[1];
  if (!key) throw new SyncError("Missing API key", 401);
  const integration = await db.inventoryIntegration.findUnique({ where: { apiKeyHash: sha256(key) } });
  if (!integration || integration.status === "DISCONNECTED") throw new SyncError("Invalid API key", 401);
  return integration;
}

/** Custom POS: absolute stock levels by SKU. */
export async function applyBulkStock(integrationId: string, sellerId: string, items: { sku: string; quantity: number }[], requestId?: string | null) {
  const event = await logEvent({ integrationId, direction: "INBOUND", externalEventId: requestId ?? null, topic: "inventory.bulk_set", status: "RECEIVED", payload: { items } });
  if (!event && requestId) return { duplicate: true, results: [] };
  const variants = await db.productVariant.findMany({ where: { sellerId, sku: { in: items.map((i) => i.sku.toUpperCase()) } }, select: { id: true, sku: true } });
  const results = items.map((i) => {
    const v = variants.find((x) => x.sku === i.sku.toUpperCase());
    return v ? { sku: i.sku, status: "updated" as const, variantId: v.id, quantity: i.quantity } : { sku: i.sku, status: "unknown_sku" as const };
  });
  await setStock(
    integrationId,
    sellerId,
    results.flatMap((r) => (r.status === "updated" ? [{ variantId: r.variantId, quantity: r.quantity }] : [])),
  );
  if (event) await db.inventorySyncEvent.update({ where: { id: event.id }, data: { status: "PROCESSED", processedAt: new Date() } });
  return { duplicate: false, results: results.map(({ sku, status }) => ({ sku, status })) };
}
