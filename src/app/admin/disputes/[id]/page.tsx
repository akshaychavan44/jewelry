import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseControls, ResolvePanel } from "@/components/admin/dispute-panel";
import { MessageThread } from "@/components/messages/thread";
import { Card, CardHeader, Monogram, Stars, StatusBadge } from "@/components/ui/display";
import { formatDate, timeAgo } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { CARRIERS, trackingUrl } from "@/lib/shipping";
import { DISPUTE_PRIORITY, DISPUTE_REASONS, DISPUTE_RESOLUTIONS, DISPUTE_STATUS, FULFILLMENT_STATUS, PAYOUT_STATUS, RETURN_STATUS } from "@/lib/status";
import { humanize, num } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/session";
import { getDisputeCase } from "@/server/services/admin";

export const metadata: Metadata = { title: "Dispute" };

export default async function DisputeCasePage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const d = await getDisputeCase(id);
  if (!d) notFound();

  const so = d.sellerOrder;
  const closed = d.status === "RESOLVED" || d.status === "CLOSED";
  // Refundable balance counts every refund on this part of the order, not just this case's.
  const refunded = so.refunds.filter((r) => r.status !== "FAILED").reduce((n, r) => n + num(r.amountMinor), 0);
  const refundable = Math.max(0, num(so.totalMinor) - refunded);
  const money = (m: bigint | number) => formatMoney(m, d.currency, { exact: true });
  const shipment = so.shipments.find((s) => s.direction === "OUTBOUND");
  const due = d.sellerResponseDueAt && d.status.startsWith("AWAITING") ? d.sellerResponseDueAt : null;

  return (
    <>
      <nav className="mb-4 text-[13px] text-muted">
        <Link href="/admin/disputes" className="hover:text-ink">
          Disputes
        </Link>{" "}
        / {d.caseNumber}
      </nav>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="eyebrow mb-2">{DISPUTE_REASONS[d.reason]}</p>
          <h1 className="display-md font-mono text-ink">{d.caseNumber}</h1>
          <p className="mt-1.5 text-[14px] text-ink-soft">
            Opened {formatDate(d.createdAt, "long")} by {d.openedBy.name ?? d.openedBy.email} · claim {money(d.claimAmountMinor)}
            {due && ` · reply due ${timeAgo(due)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={d.priority} map={DISPUTE_PRIORITY} />
          <StatusBadge status={d.status} map={DISPUTE_STATUS} />
        </div>
      </div>

      {closed && d.resolution && (
        <div className="mb-6 rounded-[3px] border border-moss/30 bg-sage-mist/40 px-5 py-4 text-[14px]">
          <p className="text-ink">
            <strong className="font-medium">{DISPUTE_RESOLUTIONS[d.resolution].label}</strong> · closed {formatDate(d.resolvedAt, "long")}
            {d.refundAmountMinor ? ` · ${money(d.refundAmountMinor)} refunded` : ""}
          </p>
          {d.resolutionNotes && <p className="mt-1 text-ink-soft">{d.resolutionNotes}</p>}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="The buyer's claim" />
            <p className="px-5 py-4 text-[14.5px] leading-relaxed whitespace-pre-wrap text-ink">{d.description}</p>
            {d.evidenceUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 px-5 pb-5">
                {d.evidenceUrls.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer" className="relative size-20 overflow-hidden rounded-[2px] border border-line bg-sand">
                    <Image src={u} alt="Evidence photo" fill sizes="80px" className="object-cover" />
                  </a>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Mediation thread"
              description="Buyer, jeweler and Loupe. Your messages are marked as Loupe mediation."
            />
            <div className="p-4">
              {d.conversation ? (
                <MessageThread
                  conversationId={d.conversation.id}
                  meId={admin.id}
                  readOnly={closed}
                  messages={d.conversation.messages.map((m) => ({ id: m.id, body: m.body, isSystem: m.isSystem, createdAt: m.createdAt.toISOString(), sender: m.sender }))}
                />
              ) : (
                <p className="text-[13.5px] text-muted">No thread was opened for this case.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Order"
              description={
                <>
                  <Link href={`/admin/orders/${d.order.orderNumber}`} className="font-mono underline underline-offset-2">
                    {d.order.orderNumber}
                  </Link>{" "}
                  · part <span className="font-mono">{so.reference}</span> · placed {formatDate(d.order.placedAt)}
                </>
              }
              action={<StatusBadge status={so.status} map={FULFILLMENT_STATUS} />}
            />
            <ul className="divide-y divide-line">
              {so.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="relative size-14 shrink-0 overflow-hidden bg-sand">{i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="56px" className="object-cover" />}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] text-ink">{i.title}</p>
                    <p className="text-[12.5px] text-muted">
                      {i.variantTitle ?? i.sku} · qty {i.quantity}
                      {i.engravingText && ` · engraved "${i.engravingText}"`}
                    </p>
                  </div>
                  <p className="text-[14px] tabular text-ink">{money(i.totalMinor)}</p>
                </li>
              ))}
            </ul>
            <dl className="grid gap-x-6 gap-y-3 border-t border-line px-5 py-4 text-[13.5px] sm:grid-cols-2">
              <div>
                <dt className="text-[12px] text-muted">Paid for this part</dt>
                <dd className="text-ink">
                  {money(so.totalMinor)} <span className="text-muted">incl. shipping, tax & duties</span>
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-muted">Refunded so far</dt>
                <dd className="text-ink">{refunded ? money(refunded) : "Nothing"}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-muted">Shipment</dt>
                <dd className="text-ink">
                  {shipment ? (
                    <>
                      {CARRIERS[shipment.carrier].label} ·{" "}
                      {shipment.trackingNumber ? (
                        <a href={shipment.trackingUrl ?? trackingUrl(shipment.carrier, shipment.trackingNumber) ?? "#"} target="_blank" rel="noreferrer" className="font-mono underline underline-offset-2">
                          {shipment.trackingNumber}
                        </a>
                      ) : (
                        "no tracking"
                      )}{" "}
                      · {humanize(shipment.status)}
                      {shipment.deliveredAt && ` ${formatDate(shipment.deliveredAt)}`}
                      {shipment.events[0] && <span className="block text-[12px] text-muted">Last scan: {shipment.events[0].description}</span>}
                    </>
                  ) : (
                    "Not shipped"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-muted">Jeweler payout</dt>
                <dd className="text-ink">
                  {so.payout ? (
                    <>
                      {money(so.payout.amountMinor)} · <StatusBadge status={so.payout.status} map={PAYOUT_STATUS} />
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              {so.returnRequests[0] && (
                <div>
                  <dt className="text-[12px] text-muted">Return</dt>
                  <dd className="text-ink">
                    <span className="font-mono">{so.returnRequests[0].rmaNumber}</span> · <StatusBadge status={so.returnRequests[0].status} map={RETURN_STATUS} />
                    {so.returnRequests[0].sellerResponse && <span className="mt-1 block text-[12.5px] text-muted">Jeweler: &ldquo;{so.returnRequests[0].sellerResponse}&rdquo;</span>}
                  </dd>
                </div>
              )}
            </dl>
            <ol className="border-t border-line px-5 py-4 text-[12.5px] text-ink-soft">
              {so.statusEvents.map((e) => (
                <li key={e.id} className="flex gap-3 py-0.5">
                  <span className="w-28 shrink-0 text-muted">{formatDate(e.createdAt, "dayMonth")}</span>
                  <span>
                    {FULFILLMENT_STATUS[e.status].label}
                    {e.note && ` — ${e.note}`}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          {!closed && (
            <>
              <Card>
                <CardHeader title="Case controls" description={d.assignedAdmin ? `Assigned to ${d.assignedAdmin.id === admin.id ? "you" : d.assignedAdmin.name}` : "Unassigned"} />
                <div className="p-5">
                  <CaseControls
                    disputeId={d.id}
                    status={d.status as "OPEN" | "AWAITING_SELLER" | "AWAITING_BUYER" | "UNDER_REVIEW"}
                    priority={d.priority}
                    internalNotes={d.internalNotes ?? ""}
                    assignedToMe={d.assignedAdmin?.id === admin.id}
                  />
                </div>
              </Card>
              <Card className="border-gold/40">
                <CardHeader title="Resolve the case" description="Refund outcomes are enforced through the payment provider, even if the jeweler doesn't respond." />
                <div className="p-5">
                  <ResolvePanel disputeId={d.id} currency={d.currency} refundableMinor={refundable} claimMinor={num(d.claimAmountMinor)} />
                </div>
              </Card>
            </>
          )}

          <Card>
            <CardHeader title="Parties" />
            <div className="space-y-4 px-5 py-4 text-[13.5px]">
              <div>
                <p className="text-[12px] text-muted">Buyer</p>
                <p className="text-ink">{d.openedBy.name ?? "—"}</p>
                <p className="text-ink-soft">{d.openedBy.email}</p>
                <p className="text-[12.5px] text-muted">Customer since {formatDate(d.openedBy.createdAt, "monthYear")}</p>
              </div>
              <div className="flex items-start gap-3 border-t border-line pt-4">
                <Monogram name={d.seller.storeName} src={d.seller.logoUrl} size={36} />
                <div className="min-w-0">
                  <p className="text-[12px] text-muted">Jeweler</p>
                  <Link href={`/admin/kyc/${d.seller.id}`} className="text-ink hover:underline">
                    {d.seller.storeName}
                  </Link>
                  <p className="text-ink-soft">{d.seller.user.email}</p>
                  {d.seller.ratingCount > 0 && <Stars rating={d.seller.ratingAverage} size={11} className="mt-1" />}
                </div>
              </div>
            </div>
          </Card>

          {d.refunds.length > 0 && (
            <Card>
              <CardHeader title="Refunds on this case" />
              <ul className="divide-y divide-line">
                {d.refunds.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[13.5px]">
                    <span>
                      {money(r.amountMinor)}
                      <span className="block text-[12px] text-muted">
                        {r.isForced ? "Forced by Loupe" : humanize(r.initiatedBy)} · {formatDate(r.createdAt)}
                      </span>
                    </span>
                    <span className="text-[12.5px] text-ink-soft">{humanize(r.status)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
