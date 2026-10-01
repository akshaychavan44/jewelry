import { ExternalLink, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/account/page-header";
import { CertificateDecision } from "@/components/admin/certificate-review";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { LabMark } from "@/components/brand/hallmark";
import { Card, EmptyState, StatusBadge } from "@/components/ui/display";
import { formatDate, timeAgo } from "@/lib/format";
import { formatCarat, LABS } from "@/lib/jewelry";
import { CERTIFICATE_STATUS, PRODUCT_STATUS } from "@/lib/status";
import { firstParam, humanize, type SearchParams } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";
import { listCertificates } from "@/server/services/admin";

export const metadata: Metadata = { title: "Certificates" };

const TABS = [
  { value: "PENDING_REVIEW", label: "To verify" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
] as const;

export default async function CertificatesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const param = firstParam((await searchParams).status)?.toUpperCase();
  const status = TABS.find((t) => t.value === param)?.value ?? "PENDING_REVIEW";
  const [rows, counts] = await Promise.all([
    listCertificates(status),
    db.certificate.groupBy({ by: ["status"], where: { product: { deletedAt: null } }, _count: { _all: true } }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Trust & safety"
        title="Certificates"
        description="Grading reports and hallmarks power the “certified” filters. Check each report number against the issuing lab before it counts."
      />
      <FilterTabs label="Certificate status" active={status} tabs={TABS.map((t) => ({ value: t.value, label: t.label, href: `/admin/certificates?status=${t.value.toLowerCase()}`, count: count(t.value) }))} />

      {rows.length === 0 ? (
        <EmptyState icon={<ShieldCheck />} title={status === "PENDING_REVIEW" ? "Every certificate is checked" : "Nothing here"}>
          {status === "PENDING_REVIEW" ? "New uploads from jewelers land here for verification." : "No certificates have this status."}
        </EmptyState>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {rows.map((c) => {
              const verify = c.verifyUrl ?? LABS[c.lab].verify?.(c.reportNumber);
              const grading = [
                formatCarat(c.caratWeight),
                c.colorGrade && `${c.colorGrade} colour`,
                c.clarityGrade && c.clarityGrade.replace(/_/g, " "),
                c.cutGrade && `${humanize(c.cutGrade)} cut`,
                c.hallmarkPurity,
                c.origin,
              ].filter(Boolean);
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="relative size-16 shrink-0 overflow-hidden bg-sand">{c.product.images[0] && <Image src={c.product.images[0].url} alt="" fill sizes="64px" className="object-cover" />}</div>
                  <div className="min-w-0 flex-1 basis-64">
                    <div className="flex flex-wrap items-center gap-2">
                      <LabMark lab={c.lab} />
                      <span className="font-mono text-[13px] text-ink">{c.reportNumber}</span>
                      {c.variant && <span className="text-[12px] text-muted">SKU {c.variant.sku}</span>}
                    </div>
                    <p className="mt-1 truncate text-[14px] text-ink">
                      {c.product.status === "ACTIVE" ? (
                        <Link href={`/product/${c.product.slug}`} target="_blank" className="hover:underline">
                          {c.product.title}
                        </Link>
                      ) : (
                        c.product.title
                      )}{" "}
                      <span className="text-muted">·</span>{" "}
                      <Link href={`/admin/kyc/${c.product.seller.id}`} className="text-ink-soft hover:underline">
                        {c.product.seller.storeName}
                      </Link>
                    </p>
                    <p className="text-[12.5px] text-muted">
                      {grading.join(" · ") || "No grading details"} · uploaded {timeAgo(c.createdAt)}
                      {c.issuedAt && ` · issued ${formatDate(c.issuedAt)}`}
                    </p>
                    {c.notes && <p className="mt-1 text-[12.5px] text-ink-soft">Note: {c.notes}</p>}
                  </div>
                  <div className="flex flex-col items-start gap-2 text-[12.5px] sm:items-end">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={c.status} map={CERTIFICATE_STATUS} />
                      <StatusBadge status={c.product.status} map={PRODUCT_STATUS} />
                    </div>
                    <div className="flex gap-3">
                      {c.file && (
                        <a href={`/api/files/${c.file.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ink underline underline-offset-2">
                          Uploaded report <ExternalLink className="size-3" />
                        </a>
                      )}
                      {verify && (
                        <a href={verify} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ink underline underline-offset-2">
                          Check with {LABS[c.lab].name} <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="w-full sm:w-auto">
                    <CertificateDecision certificateId={c.id} status={c.status} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
