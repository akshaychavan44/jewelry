import { z } from "zod";
import { db } from "@/server/db";
import { applyBulkStock, authenticateApiKey, SyncError } from "@/server/services/inventory-sync";

// Custom POS inventory API.
//   GET  /api/v1/inventory            → every SKU with its current stock
//   PUT  /api/v1/inventory            → { items: [{ sku, quantity }] } absolute levels
// Auth: Authorization: Bearer lp_live_…  ·  Idempotency: Idempotency-Key header.

const bodySchema = z.object({
  items: z.array(z.object({ sku: z.string().min(1).max(40), quantity: z.number().int().min(0).max(100_000) })).min(1).max(500),
});

function error(e: unknown) {
  if (e instanceof SyncError) return Response.json({ error: e.message }, { status: e.status });
  throw e;
}

export async function GET(req: Request) {
  try {
    const integration = await authenticateApiKey(req.headers.get("authorization"));
    const variants = await db.productVariant.findMany({
      where: { sellerId: integration.sellerId, isActive: true },
      orderBy: { sku: "asc" },
      select: { sku: true, title: true, stockQuantity: true, allowBackorder: true, product: { select: { title: true, status: true } } },
    });
    return Response.json({
      items: variants.map((v) => ({ sku: v.sku, product: v.product.title, variant: v.title, quantity: v.stockQuantity, backorder: v.allowBackorder, status: v.product.status })),
    });
  } catch (e) {
    return error(e);
  }
}

export async function PUT(req: Request) {
  try {
    const integration = await authenticateApiKey(req.headers.get("authorization"));
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Body must be { items: [{ sku, quantity }] } with 1–500 items" }, { status: 422 });
    const result = await applyBulkStock(integration.id, integration.sellerId, parsed.data.items, req.headers.get("idempotency-key"));
    return Response.json(result, { status: result.duplicate ? 200 : 202 });
  } catch (e) {
    return error(e);
  }
}
