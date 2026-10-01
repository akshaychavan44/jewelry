import { AlertTriangle, CheckCircle2, ExternalLink, FileText } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KycDecisionPanel, StoreControls } from "@/components/admin/kyc-review";
import { Badge, Card, CardHeader, Monogram, StatusBadge } from "@/components/ui/display";
import { formatDate, timeAgo } from "@/lib/format";
import { bpsToPercent, formatMoney } from "@/lib/money";
import { countryName } from "@/lib/regions";
import { DOCUMENT_REVIEW_STATUS, KYC_DOCUMENT_LABELS, VERIFICATION_STATUS } from "@/lib/status";
import { humanize } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/session";
import { getKycReview } from "@/server/services/admin";

export const metadata: Metadata = { title: "Verification file" };

const bytes = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 px-5 py-4 text-[13.5px] sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[12px] text-muted">{k}</dt>
          <dd className="mt-0.5 break-words text-ink">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function KycReviewPage({ params }: { params: Promise<{ sellerId: string }> }) {
  await requireAdmin();
  const { sellerId } = await params;
  const data = await getKycReview(sellerId);
  if (!data) notFound();
  const { seller, latest, checks, audit, settings } = data;
  const pending = seller.verificationStatus === "PENDING";
  const live = seller.verificationStatus === "APPROVED" || seller.verificationStatus === "SUSPENDED";
  const addr = seller.returnAddress;

  return (
    <>
      <nav className="mb-4 text-[13px] text-muted">
        <Link href="/admin/kyc" className="hover:text-ink">
          Jeweler verification
        </Link>{" "}
        / {seller.storeName}
      </nav>

      <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-line pb-6">
        <Monogram name={seller.storeName} src={seller.logoUrl} size={56} />
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-1">Verification file</p>
          <h1 className="display-md text-ink">{seller.storeName}</h1>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            {seller.city ? `${seller.city}, ` : ""}
            {countryName(seller.country)} · sells in {seller.defaultCurrency}
            {seller.submittedAt && ` · submitted ${formatDate(seller.submittedAt, "long")} (${timeAgo(seller.submittedAt)})`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={seller.verificationStatus} map={VERIFICATION_STATUS} />
          {seller.verificationStatus === "APPROVED" && (
            <Link href={`/jewelers/${seller.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-[13px] text-ink underline underline-offset-4">
              Storefront <ExternalLink className="size-3.5" />
            </Link>
          )}
        </div>
      </div>

      {seller.verificationStatus === "SUSPENDED" && seller.suspensionReason && (
        <div className="mb-6 rounded-[3px] border border-rosewood/30 bg-rosewood/5 px-4 py-3 text-[13.5px] text-ink">
          <strong className="font-medium">Suspended {formatDate(seller.suspendedAt)}:</strong> {seller.suspensionReason}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Store profile" description="What buyers will see" />
            {seller.bannerUrl && (
              <div className="relative mx-5 mt-4 aspect-[5/1] overflow-hidden rounded-[2px] bg-sand">
                <Image src={seller.bannerUrl} alt="" fill sizes="720px" className="object-cover" />
              </div>
            )}
            <div className="px-5 pt-4">
              {seller.tagline && <p className="font-display text-[19px] text-ink">{seller.tagline}</p>}
              {seller.bio && <p className="mt-2 line-clamp-4 text-[14px] leading-relaxed text-ink-soft">{seller.bio}</p>}
            </div>
            <Facts
              rows={[
                ["Founded", seller.foundedYear],
                ["Specialties", seller.specialties.join(", ")],
                ["Website", seller.website && <a href={seller.website} target="_blank" rel="noreferrer" className="underline underline-offset-2">{seller.website.replace(/^https?:\/\//, "")}</a>],
                ["Return address", addr && `${addr.fullName}, ${addr.line1}${addr.line2 ? `, ${addr.line2}` : ""}, ${addr.city} ${addr.postalCode}, ${countryName(addr.country)}`],
                ["Showrooms", seller.locations.map((l) => `${l.name} (${l.city})`).join(" · ") || "Online only"],
                ["Policies", `${seller.returnWindowDays}-day returns · ships in ${seller.handlingDays} days`],
              ]}
            />
          </Card>

          <Card>
            <CardHeader title="Business verification" description="Secrets are stored encrypted; only the last digits are ever shown." />
            <Facts
              rows={[
                ["Legal name", seller.legalBusinessName],
                ["Entity type", seller.businessType && humanize(seller.businessType)],
                ["Registration number", seller.registrationNumber && <span className="font-mono text-[13px]">{seller.registrationNumber}</span>],
                ["Tax ID", seller.taxIdLast4 && <span className="font-mono text-[13px]">•••• {seller.taxIdLast4}</span>],
                [
                  "Payouts",
                  seller.payoutMethod === "STRIPE_CONNECT"
                    ? `Stripe Connect · ${seller.stripeAccountId ?? "not linked"}`
                    : seller.payoutMethod === "BANK_TRANSFER"
                      ? `${seller.bankName ?? "Bank"} · ${seller.bankAccountHolder ?? ""} ••••${seller.bankAccountLast4 ?? ""} · ${seller.payoutCurrency ?? seller.defaultCurrency}`
                      : null,
                ],
                [
                  "Stripe capabilities",
                  seller.payoutMethod === "STRIPE_CONNECT" ? `Charges ${seller.stripeChargesEnabled ? "on" : "off"} · payouts ${seller.stripePayoutsEnabled ? "on" : "off"}` : "Not applicable",
                ],
              ]}
            />
          </Card>

          {!pending && latest && (
            <Card>
              <CardHeader title="Documents" description={`Submission of ${formatDate(latest.submittedAt, "long")}`} />
              <ul className="divide-y divide-line">
                {latest.documents.length === 0 && <li className="px-5 py-4 text-[13.5px] text-muted">Accepted documents carried over to the jeweler&rsquo;s next submission.</li>}
                {latest.documents.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <FileText className="size-4 text-muted" strokeWidth={1.5} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] text-ink">{KYC_DOCUMENT_LABELS[d.type]}</p>
                      <a href={`/api/files/${d.file.id}`} target="_blank" rel="noreferrer" className="text-[12px] text-ink-soft hover:underline">
                        {d.file.fileName} · {bytes(d.file.sizeBytes)}
                      </a>
                      {d.rejectionReason && <p className="mt-0.5 text-[12.5px] text-rosewood">{d.rejectionReason}</p>}
                    </div>
                    <StatusBadge status={d.status} map={DOCUMENT_REVIEW_STATUS} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader title="Submission history" />
            {seller.kycSubmissions.length === 0 ? (
              <p className="px-5 py-4 text-[13.5px] text-muted">This store hasn&rsquo;t submitted an application yet.</p>
            ) : (
              <ol className="divide-y divide-line">
                {seller.kycSubmissions.map((s) => (
                  <li key={s.id} className="px-5 py-3.5 text-[13.5px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={s.status} map={VERIFICATION_STATUS} />
                      <span className="text-ink-soft">
                        Submitted {formatDate(s.submittedAt)}
                        {s.reviewedAt && ` · reviewed ${formatDate(s.reviewedAt)}${s.reviewer?.name ? ` by ${s.reviewer.name}` : ""}`}
                      </span>
                    </div>
                    {s.reviewerNotes && <p className="mt-2 text-ink">&ldquo;{s.reviewerNotes}&rdquo;</p>}
                    {s.internalNotes && (
                      <p className="mt-1.5 text-[12.5px] text-muted">
                        <Badge tone="neutral" className="mr-1.5">
                          Internal
                        </Badge>
                        {s.internalNotes}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card>
            <CardHeader title="Activity" description="Audit trail for this store" />
            {audit.length === 0 ? (
              <p className="px-5 py-4 text-[13.5px] text-muted">No admin activity yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {audit.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 px-5 py-2.5 text-[13px]">
                    <span className="font-mono text-[12px] text-ink">{a.action}</span>
                    <span className="text-ink-soft">{a.actor?.name ?? a.actor?.email ?? "System"}</span>
                    <span className="ml-auto text-[12px] text-muted">{formatDate(a.createdAt, "dateTime")}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Automated checks" description="Signals to guide your review — not a decision" />
            <ul className="divide-y divide-line">
              {checks.map((c) => (
                <li key={c.label} className="flex gap-3 px-5 py-3">
                  {c.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-moss" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber" />}
                  <div className="min-w-0">
                    <p className="text-[13.5px] text-ink">{c.label}</p>
                    <p className="text-[12.5px] break-words text-muted">{c.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {pending && latest && (
            <Card className="border-gold/40">
              <CardHeader title="Your decision" description="Approving unlocks the seller studio immediately." />
              <div className="p-5">
                <KycDecisionPanel
                  sellerId={seller.id}
                  storeName={seller.storeName}
                  documents={latest.documents.map((d) => ({ id: d.id, fileId: d.file.id, label: KYC_DOCUMENT_LABELS[d.type], fileName: d.file.fileName, size: bytes(d.file.sizeBytes) }))}
                />
              </div>
            </Card>
          )}

          {live && (
            <Card>
              <CardHeader title="Store controls" />
              <div className="p-5">
                <StoreControls
                  sellerId={seller.id}
                  status={seller.verificationStatus as "APPROVED" | "SUSPENDED"}
                  defaultCommission={bpsToPercent(settings.defaultCommissionBps)}
                  initial={{ commissionPercent: seller.commissionRateBps === null ? "" : String(seller.commissionRateBps / 100), isFeatured: seller.isFeatured, isTopRated: seller.isTopRated }}
                />
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Account" />
            <Facts
              rows={[
                ["Owner", seller.user.name],
                ["Email", seller.user.email],
                ["Joined", formatDate(seller.user.createdAt, "long")],
                ["Last sign-in", seller.user.lastLoginAt ? timeAgo(seller.user.lastLoginAt) : "—"],
                ["Plan", seller.subscription?.plan.name ?? "Atelier (free)"],
                ["Listings · orders", `${seller._count.products} · ${seller._count.sellerOrders}`],
                ["Rating", seller.ratingCount ? `${seller.ratingAverage.toFixed(1)} from ${seller.ratingCount} reviews` : "No reviews yet"],
                ["Commission earned", `${formatMoney(data.commissionUsd, "USD")} · ${data.openDisputes} open ${data.openDisputes === 1 ? "dispute" : "disputes"}`],
              ]}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
