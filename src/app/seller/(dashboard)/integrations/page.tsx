import { PageHeader } from "@/components/account/page-header";
import { ConnectIntegration, CopyField, DisconnectButton, SkuMapper } from "@/components/seller/integration-forms";
import { Card, CardHeader, Badge, Table, Td, Th } from "@/components/ui/display";
import { formatDate, timeAgo } from "@/lib/format";
import { absoluteUrl, humanize } from "@/lib/utils";
import { requireSeller } from "@/server/auth/session";
import { db } from "@/server/db";

export default async function SellerIntegrations() {
  const { seller } = await requireSeller();
  const [integrations, variants] = await Promise.all([
    db.inventoryIntegration.findMany({
      where: { sellerId: seller.id, status: { not: "DISCONNECTED" } },
      orderBy: { createdAt: "asc" },
      include: { mappings: { include: { variant: { select: { sku: true } } } }, events: { orderBy: { createdAt: "desc" }, take: 8 } },
    }),
    db.productVariant.findMany({ where: { sellerId: seller.id, isActive: true }, orderBy: { sku: "asc" }, select: { id: true, sku: true, title: true } }),
  ]);
  const apiBase = absoluteUrl("/api/v1/inventory");

  return (
    <>
      <PageHeader title="POS & inventory sync" description="Keep stock identical between your boutique and Loupe, so a one-of-a-kind piece can never sell twice." />

      <Card>
        <CardHeader title="Connect a system" />
        <div className="p-5">
          <ConnectIntegration />
        </div>
      </Card>

      {integrations.map((i) => {
        const webhook = i.provider === "CUSTOM_API" ? null : absoluteUrl(`/api/integrations/${i.provider.toLowerCase()}/${i.id}`);
        return (
          <Card key={i.id} className="mt-6">
            <CardHeader
              title={i.name}
              description={`${humanize(i.provider)} · connected ${formatDate(i.createdAt)} · last sync ${i.lastSyncedAt ? timeAgo(i.lastSyncedAt) : "never"}`}
              action={
                <div className="flex items-center gap-2">
                  <Badge tone={i.status === "ACTIVE" ? "success" : i.status === "ERROR" ? "danger" : "neutral"} dot>
                    {humanize(i.status)}
                  </Badge>
                  <DisconnectButton integrationId={i.id} />
                </div>
              }
            />
            <div className="space-y-5 p-5">
              {i.lastError && <p className="rounded-[2px] bg-rosewood-mist px-3 py-2 text-[13px] text-rosewood">Last error: {i.lastError}</p>}
              {webhook ? (
                <div>
                  <p className="mb-1.5 text-[12px] tracking-[0.06em] text-ink-soft uppercase">Webhook URL</p>
                  <CopyField value={webhook} label="webhook URL" />
                  <p className="mt-1.5 text-[12.5px] text-muted">
                    {i.provider === "SHOPIFY" ? "Subscribe to inventory_levels/update. Requests are verified with X-Shopify-Hmac-Sha256." : "Subscribe to inventory.count.updated. Requests are verified with x-square-hmacsha256-signature."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[12px] tracking-[0.06em] text-ink-soft uppercase">API · key {i.apiKeyPrefix}…</p>
                  <pre className="overflow-x-auto rounded-[3px] bg-ink px-4 py-3 font-mono text-[12px] leading-relaxed text-ivory">
{`curl -X PUT ${apiBase} \\
  -H "Authorization: Bearer lp_live_…" \\
  -H "Idempotency-Key: pos-2026-09-30-001" \\
  -H "Content-Type: application/json" \\
  -d '{"items":[{"sku":"${variants[0]?.sku ?? "SKU-001-A"}","quantity":2}]}'`}
                  </pre>
                  <p className="text-[12.5px] text-muted">Send absolute stock levels by SKU. GET the same URL to read current levels.</p>
                </div>
              )}

              {i.provider !== "CUSTOM_API" && (
                <div>
                  <p className="mb-2 text-[12px] tracking-[0.06em] text-ink-soft uppercase">SKU mapping · {i.mappings.length} mapped</p>
                  <SkuMapper integrationId={i.id} variants={variants.map((v) => ({ ...v, mapped: i.mappings.find((m) => m.variantId === v.id)?.externalId ?? null }))} />
                </div>
              )}

              {i.events.length > 0 && (
                <div>
                  <p className="mb-2 text-[12px] tracking-[0.06em] text-ink-soft uppercase">Recent events</p>
                  <div className="rounded-[3px] border border-line">
                    <Table>
                      <thead>
                        <tr>
                          <Th>When</Th>
                          <Th>Direction</Th>
                          <Th>Topic</Th>
                          <Th>Result</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {i.events.map((e) => (
                          <tr key={e.id}>
                            <Td className="text-muted">{timeAgo(e.createdAt)}</Td>
                            <Td>{humanize(e.direction)}</Td>
                            <Td className="font-mono text-[12px]">{e.topic}</Td>
                            <Td>
                              <Badge tone={e.status === "PROCESSED" ? "success" : e.status === "FAILED" ? "danger" : "neutral"}>{humanize(e.status)}</Badge>
                              {e.error && <span className="ml-2 text-[12px] text-rosewood">{e.error}</span>}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </>
  );
}
