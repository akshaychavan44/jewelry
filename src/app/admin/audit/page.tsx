import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/account/page-header";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { Card, Pagination, Table, Td, Th } from "@/components/ui/display";
import { formatDate } from "@/lib/format";
import { firstParam, humanize, type SearchParams } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/session";
import { listAudit } from "@/server/services/admin";

export const metadata: Metadata = { title: "Audit log" };

/** Where an audit entry's subject lives in the admin console, when it has a page. */
function entityHref(type: string, id: string | null) {
  if (!id) return null;
  if (type === "SellerProfile") return `/admin/kyc/${id}`;
  if (type === "Dispute") return `/admin/disputes/${id}`;
  if (type === "PlatformSettings" || type === "CommissionRule" || type === "SubscriptionPlan") return "/admin/monetization";
  if (type === "Certificate") return "/admin/certificates?status=verified";
  return null;
}

function summarize(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return "";
  return Object.entries(metadata as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
    .slice(0, 4)
    .map(([k, v]) => `${humanize(k).toLowerCase()}: ${String(v)}`)
    .join(" · ");
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const sp = await searchParams;
  const entity = firstParam(sp.entity) || undefined;
  const page = Math.max(1, Number(firstParam(sp.page)) || 1);
  const { rows, total, pageCount, entities } = await listAudit({ entity, page });
  const href = (e?: string, p?: number) => {
    const params = new URLSearchParams();
    if (e) params.set("entity", e);
    if (p && p > 1) params.set("page", String(p));
    return `/admin/audit${params.size ? `?${params}` : ""}`;
  };

  return (
    <>
      <PageHeader eyebrow="Compliance" title="Audit log" description="Every sensitive action — approvals, suspensions, forced refunds, fee changes, document views — with who did it and when. Entries can't be edited." />
      <FilterTabs
        label="Entity"
        active={entity ?? "ALL"}
        tabs={[{ value: "ALL", label: "Everything", href: href(), count: entities.reduce((n, e) => n + e.count, 0) }, ...entities.map((e) => ({ value: e.entity, label: humanize(e.entity.replace(/([a-z])([A-Z])/g, "$1 $2")), href: href(e.entity), count: e.count }))]}
      />
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Who</Th>
              <Th>Action</Th>
              <Th>Subject</Th>
              <Th>Details</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <Td colSpan={5} className="py-10 text-center text-muted">
                  No entries yet.
                </Td>
              </tr>
            )}
            {rows.map((a) => {
              const link = entityHref(a.entityType, a.entityId);
              return (
                <tr key={a.id}>
                  <Td className="text-[13px] whitespace-nowrap text-ink-soft">{formatDate(a.createdAt, "dateTime")}</Td>
                  <Td className="text-[13.5px]">
                    <span className="block text-ink">{a.actor?.name ?? "System"}</span>
                    {a.actor && <span className="text-[12px] text-muted">{a.actor.email}</span>}
                  </Td>
                  <Td>
                    <span className="font-mono text-[12.5px] text-ink">{a.action}</span>
                  </Td>
                  <Td className="text-[13px] text-ink-soft">
                    {link ? (
                      <Link href={link} className="hover:underline">
                        {humanize(a.entityType.replace(/([a-z])([A-Z])/g, "$1 $2"))}
                      </Link>
                    ) : (
                      humanize(a.entityType.replace(/([a-z])([A-Z])/g, "$1 $2"))
                    )}
                    {a.entityId && <span className="block font-mono text-[11px] text-muted">{a.entityId.slice(-10)}</span>}
                  </Td>
                  <Td className="max-w-md text-[12.5px] break-words text-muted">{summarize(a.metadata) || "—"}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
      <div className="mt-6 flex items-center justify-between gap-4 text-[12.5px] text-muted">
        <span>{total.toLocaleString("en-US")} entries</span>
        <Pagination page={page} pageCount={pageCount} hrefFor={(p) => href(entity, p)} />
      </div>
    </>
  );
}
