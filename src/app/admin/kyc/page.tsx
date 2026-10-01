import type { Metadata } from "next";
import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import { PageHeader } from "@/components/account/page-header";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { Card, EmptyState, Monogram, Stars, StatusBadge, Table, Td, Th } from "@/components/ui/display";
import type { VerificationStatus } from "@/generated/prisma/enums";
import { formatDate, timeAgo } from "@/lib/format";
import { bpsToPercent } from "@/lib/money";
import { countryName } from "@/lib/regions";
import { VERIFICATION_STATUS } from "@/lib/status";
import { cn, firstParam, humanize, type SearchParams } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/session";
import { getKycCounts, listKycApplications } from "@/server/services/admin";

export const metadata: Metadata = { title: "Jeweler verification" };

const TABS: { value: VerificationStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Awaiting review" },
  { value: "APPROVED", label: "Live stores" },
  { value: "REJECTED", label: "Returned" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "ALL", label: "All" },
];

export default async function KycQueue({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const param = firstParam((await searchParams).status)?.toUpperCase();
  const status = (TABS.find((t) => t.value === param)?.value ?? "PENDING") as VerificationStatus | "ALL";
  const [rows, counts] = await Promise.all([listKycApplications(status), getKycCounts()]);
  const total = Object.entries(counts).reduce((n, [k, v]) => (k === "NOT_SUBMITTED" ? n : n + (v ?? 0)), 0);
  const pendingView = status === "PENDING";

  return (
    <>
      <PageHeader eyebrow="Trust & safety" title="Jeweler verification" description="Every store is reviewed by a person before it can sell. Oldest applications first." />
      <FilterTabs
        label="Application status"
        active={status}
        tabs={TABS.map((t) => ({ value: t.value, label: t.label, href: `/admin/kyc?status=${t.value.toLowerCase()}`, count: t.value === "ALL" ? total : (counts[t.value] ?? 0) }))}
      />

      {rows.length === 0 ? (
        <EmptyState icon={<FileCheck2 />} title={pendingView ? "The queue is clear" : "Nothing here"}>
          {pendingView ? "New applications appear here the moment a jeweler submits." : "No stores have this status."}
        </EmptyState>
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Store</Th>
                <Th>Business</Th>
                <Th>{pendingView ? "Waiting" : "Updated"}</Th>
                <Th>Status</Th>
                <Th>{pendingView ? "Documents" : "Performance"}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const sub = s.kycSubmissions[0];
                const waitingHours = s.submittedAt ? (Date.now() - s.submittedAt.getTime()) / 3_600_000 : 0;
                return (
                  <tr key={s.id} className="hover:bg-parchment/40">
                    <Td>
                      <Link href={`/admin/kyc/${s.id}`} className="flex items-center gap-3">
                        <Monogram name={s.storeName} src={s.logoUrl} size={36} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium hover:underline">{s.storeName}</span>
                          <span className="block truncate text-[12.5px] text-muted">
                            {s.city ? `${s.city}, ` : ""}
                            {countryName(s.country)} · {s.user.email}
                          </span>
                        </span>
                      </Link>
                    </Td>
                    <Td className="text-[13.5px]">
                      <span className="block text-ink">{s.legalBusinessName ?? "—"}</span>
                      <span className="text-[12.5px] text-muted">{s.businessType ? humanize(s.businessType) : "—"}</span>
                    </Td>
                    <Td className="text-[13.5px] whitespace-nowrap">
                      {pendingView ? (
                        <>
                          <span className={cn("block", waitingHours > 48 ? "font-medium text-rosewood" : "text-ink")}>{timeAgo(s.submittedAt)}</span>
                          <span className="text-[12.5px] text-muted">{waitingHours > 48 ? "Past 2-day target" : `Submitted ${formatDate(s.submittedAt)}`}</span>
                        </>
                      ) : (
                        <span className="text-ink-soft">{formatDate(s.approvedAt ?? s.updatedAt)}</span>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={s.verificationStatus} map={VERIFICATION_STATUS} />
                      {sub?.reviewer?.name && !pendingView && <span className="mt-1 block text-[12px] text-muted">by {sub.reviewer.name}</span>}
                    </Td>
                    <Td className="text-[13px] whitespace-nowrap text-ink-soft">
                      {pendingView ? (
                        `${sub?._count.documents ?? 0} files`
                      ) : s.verificationStatus === "APPROVED" ? (
                        <span className="flex flex-col gap-0.5">
                          <Stars rating={s.ratingAverage} size={11} label={false} />
                          <span>
                            {s.activeListingCount} listings · {s.salesCount} sales{s.commissionRateBps !== null ? ` · ${bpsToPercent(s.commissionRateBps, 1)} rate` : ""}
                          </span>
                        </span>
                      ) : (
                        (s.suspensionReason ?? sub?.reviewerNotes ?? "—").slice(0, 60)
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
