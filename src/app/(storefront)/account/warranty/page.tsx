import { ShieldCheck, Wrench } from "lucide-react";
import Image from "next/image";
import { PageHeader } from "@/components/account/page-header";
import { ServiceDialog } from "@/components/orders/order-actions";
import { EmptyState, StatusBadge } from "@/components/ui/display";
import { formatDate } from "@/lib/format";
import { SERVICE_STATUS } from "@/lib/status";
import { humanize } from "@/lib/utils";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";

export default async function WarrantyPage() {
  const user = await requireUser("/account/warranty");
  const [warranties, tickets] = await Promise.all([
    db.warranty.findMany({
      where: { buyerId: user.id },
      orderBy: { startsAt: "desc" },
      include: { orderItem: { select: { id: true, title: true, imageUrl: true, variantTitle: true } }, seller: { select: { storeName: true } } },
    }),
    db.serviceRequest.findMany({
      where: { buyerId: user.id },
      orderBy: { createdAt: "desc" },
      include: { events: { orderBy: { createdAt: "asc" } }, seller: { select: { storeName: true } }, orderItem: { select: { title: true, imageUrl: true } } },
    }),
  ]);
  const now = new Date();

  return (
    <>
      <PageHeader title="Warranty & repairs" description="Every piece comes with a maker's warranty. Resizing, repairs and cleaning go back to the jeweler who made it." />

      <section className="mb-12">
        <h2 className="caps mb-4 text-ink">Service log</h2>
        {tickets.length === 0 ? (
          <EmptyState icon={<Wrench />} title="No repairs or resizing yet" />
        ) : (
          <ul className="space-y-4">
            {tickets.map((t) => (
              <li key={t.id} className="rounded-[3px] border border-line bg-porcelain">
                <div className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4">
                  <div className="relative size-14 shrink-0 overflow-hidden bg-sand">{t.orderItem?.imageUrl && <Image src={t.orderItem.imageUrl} alt="" fill sizes="56px" className="object-cover" />}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] text-ink">
                      {humanize(t.type)} · {t.orderItem?.title}
                    </p>
                    <p className="text-[12.5px] text-muted">
                      <span className="font-mono">{t.ticketNumber}</span> · {t.seller.storeName}
                      {t.coveredByWarranty && " · covered by warranty"}
                    </p>
                  </div>
                  <StatusBadge status={t.status} map={SERVICE_STATUS} />
                </div>
                <ol className="px-5 py-4">
                  {t.events.map((e, i) => (
                    <li key={e.id} className="relative flex gap-4 pb-4 last:pb-0">
                      {i < t.events.length - 1 && <span aria-hidden className="absolute top-3 left-[5px] h-full w-px bg-line" />}
                      <span className={i === t.events.length - 1 ? "relative mt-1.5 size-[11px] shrink-0 rounded-full bg-sage" : "relative mt-1.5 size-[11px] shrink-0 rounded-full border border-line-strong bg-ivory"} />
                      <div>
                        <p className="text-[13.5px] text-ink">{SERVICE_STATUS[e.status].label}</p>
                        {e.note && <p className="text-[13px] text-ink-soft">{e.note}</p>}
                        <p className="text-[12px] text-muted">{formatDate(e.createdAt, "dateTime")}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="caps mb-4 text-ink">Warranties</h2>
        {warranties.length === 0 ? (
          <EmptyState icon={<ShieldCheck />} title="Warranties appear once your pieces are delivered" />
        ) : (
          <ul className="divide-y divide-line rounded-[3px] border border-line bg-porcelain">
            {warranties.map((w) => {
              const active = w.endsAt > now;
              return (
                <li key={w.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="relative size-14 shrink-0 overflow-hidden bg-sand">{w.orderItem.imageUrl && <Image src={w.orderItem.imageUrl} alt="" fill sizes="56px" className="object-cover" />}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] text-ink">{w.orderItem.title}</p>
                    <p className="text-[12.5px] text-muted">
                      <span className="font-mono">{w.warrantyNumber}</span> · {w.seller.storeName} · {active ? `valid until ${formatDate(w.endsAt)}` : `expired ${formatDate(w.endsAt)}`}
                      {w.isTransferable && " · transferable"}
                    </p>
                    <p className="mt-1 text-[12.5px] text-ink-soft">{w.coverage}</p>
                  </div>
                  <ServiceDialog orderItemId={w.orderItem.id} title={w.orderItem.title} trigger="Request service" />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
