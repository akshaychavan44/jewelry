import { handleShopifyWebhook, handleSquareWebhook, SyncError } from "@/server/services/inventory-sync";

// Inbound POS webhooks. Always read the raw body — signatures are computed over
// the exact bytes the provider sent.
export async function POST(req: Request, { params }: { params: Promise<{ provider: string; integrationId: string }> }) {
  const { provider, integrationId } = await params;
  const raw = await req.text();
  try {
    if (provider === "shopify") return Response.json(await handleShopifyWebhook(integrationId, raw, req.headers));
    if (provider === "square") return Response.json(await handleSquareWebhook(integrationId, raw, req.headers, req.url));
    return new Response("Unknown provider", { status: 404 });
  } catch (error) {
    if (error instanceof SyncError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return Response.json({ error: "Invalid JSON" }, { status: 400 });
    throw error;
  }
}
