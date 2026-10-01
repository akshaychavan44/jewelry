import { Scale } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/account/page-header";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { Card, EmptyState, StatusBadge, Table, Td, Th } from "@/components/ui/display";
import { formatDate, timeAgo } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { DISPUTE_PRIORITY, DISPUTE_REASONS, DISPUTE_RESOLUTIONS, DISPUTE_STATUS } from "@/lib/status";
import { cn, firstParam, type SearchParams } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/session";
import { DISPUTE_VIEWS, type DisputeView, listDisputes } from "@/server/services/admin";

export const metadata: Metadata = { title: "Disputes" };

export default async function DisputesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const param = firstParam((await searchParams).view);
  const view: DisputeView = param && param in DISPUTE_VIEWS ? (param as DisputeView) : "open";
  const { rows, counts } = await listDisputes(view);

  return (
    <>
      <PageHeader eyebrow="Resolution centre" title="Disputes" description="Mediate between buyers and jewelers. Funds for a disputed order stay on hold until you close the case." />
      <FilterTabs label="Case filter" active={view} tabs={(Object.keys(DISPUTE_VIEWS) as DisputeView[]).map((v) => ({ value: v, label: DISPUTE_VIEWS[v].label, href: `/admin/disputes?view=${v}`, count: counts[v] }))} />

      {rows.length === 0 ? (
        <EmptyState icon={<Scale />} title={view === "resolved" ? "No resolved cases yet" : "No cases here"}>
          {view === "open" ? "Nothing needs your attention right now." : "Cases appear here as they move through mediation."}
        </EmptyState>
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Case</Th>
                <Th>Parties</Th>
                <Th className="text-right">Claim</Th>
                <Th>Priority</Th>
                <Th>Stage</Th>
                <Th>{view === "resolved" ? "Outcome" : "Timing"}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const overdue = d.sellerResponseDueAt && d.status === "AWAITING_SELLER" && d.sellerResponseDueAt.getTime() < Date.now();
                return (
                  <tr key={d.id} className="hover:bg-parchment/40">
                    <Td>
                      <Link href={`/admin/disputes/${d.id}`} className="block hover:underline">
                        <span className="font-mono text-[13px] text-ink">{d.caseNumber}</span>
                        <span className="block text-[12.5px] text-muted">{DISPUTE_REASONS[d.reason]}</span>
                      </Link>
                    </Td>
                    <Td className="text-[13.5px]">
                      <span className="block text-ink">{d.openedBy.name ?? d.openedBy.email}</span>
                      <span className="text-[12.5px] text-muted">
                        vs {d.seller.storeName} · <span className="font-mono">{d.sellerOrder.reference}</span>
                      </span>
                    </Td>
                    <Td className="text-right tabular">{formatMoney(d.claimAmountMinor, d.currency)}</Td>
                    <Td>
                      <StatusBadge status={d.priority} map={DISPUTE_PRIORITY} />
                    </Td>
                    <Td>
                      <StatusBadge status={d.status} map={DISPUTE_STATUS} />
                      {d.assignedAdmin?.name && <span className="mt-1 block text-[12px] text-muted">{d.assignedAdmin.name}</span>}
                    </Td>
                    <Td className="text-[13px] whitespace-nowrap">
                      {view === "resolved" || d.resolution ? (
                        <span className="text-ink-soft">
                          {d.resolution ? DISPUTE_RESOLUTIONS[d.resolution].label : "—"}
                          <span className="block text-[12px] text-muted">{formatDate(d.resolvedAt)}</span>
                        </span>
                      ) : (
                        <span className={cn(overdue ? "font-medium text-rosewood" : "text-ink-soft")}>
                          Opened {timeAgo(d.createdAt)}
                          {d.sellerResponseDueAt && d.status.startsWith("AWAITING") && (
                            <span className="block text-[12px]">{overdue ? "Response overdue" : `Reply due ${timeAgo(d.sellerResponseDueAt)}`}</span>
                          )}
                        </span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
