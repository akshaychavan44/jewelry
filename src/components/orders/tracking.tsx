import { Check, ExternalLink } from "lucide-react";
import type { FulfillmentStatus, ShipmentStatus } from "@/generated/prisma/enums";
import { formatDate, formatDateRange } from "@/lib/format";
import { CARRIERS, trackingUrl } from "@/lib/shipping";
import { FULFILLMENT_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { Carrier } from "@/generated/prisma/enums";

type Event = { status: FulfillmentStatus; createdAt: Date; note: string | null };
type Shipment = {
  carrier: Carrier;
  trackingNumber: string | null;
  service: string | null;
  status: ShipmentStatus;
  estimatedDeliveryAt: Date | null;
  events: { status: ShipmentStatus; description: string; location: string | null; occurredAt: Date }[];
};

/** Order-tracking portal: stepper, carrier details and scan history. */
export function TrackingTimeline({
  status,
  events,
  shipment,
  needsProduction,
  estimate,
}: {
  status: FulfillmentStatus;
  events: Event[];
  shipment?: Shipment | null;
  needsProduction: boolean;
  estimate: { from: Date | null; to: Date | null };
}) {
  const steps: FulfillmentStatus[] = ["PENDING", "PROCESSING", ...(needsProduction ? (["IN_PRODUCTION"] as const) : []), "SHIPPED", "DELIVERED"];
  const labels: Record<string, string> = { PENDING: "Order placed", PROCESSING: "Processing", IN_PRODUCTION: "In production", SHIPPED: "Shipped", DELIVERED: "Delivered" };
  const reachedAt = (s: FulfillmentStatus) => [...events].reverse().find((e) => e.status === s)?.createdAt;
  const currentIndex = steps.indexOf(status);
  const cancelled = status === "CANCELLED" || status === "REFUNDED";

  return (
    <div>
      {cancelled ? (
        <p className="rounded-[2px] border border-rosewood/25 bg-rosewood-mist px-4 py-3 text-[14px] text-rosewood">{FULFILLMENT_STATUS[status].label} · {formatDate(reachedAt(status))}</p>
      ) : (
        <ol className="grid gap-4 sm:grid-flow-col sm:auto-cols-fr sm:gap-0" aria-label="Order progress">
          {steps.map((s, i) => {
            const done = i <= currentIndex;
            const at = reachedAt(s);
            return (
              <li key={s} className="relative flex items-start gap-3 sm:flex-col sm:items-center sm:gap-2 sm:text-center">
                {i > 0 && <span aria-hidden className={cn("absolute top-3 hidden h-px sm:block", done ? "bg-sage" : "bg-line")} style={{ left: "calc(-50% + 14px)", right: "calc(50% + 14px)" }} />}
                <span className={cn("relative z-10 grid size-6 shrink-0 place-items-center rounded-full border", done ? "border-sage bg-sage text-white" : "border-line-strong bg-ivory text-muted", i === currentIndex && "ring-4 ring-sage/15")}>
                  {done ? <Check className="size-3.5" /> : <span className="size-1.5 rounded-full bg-current" />}
                </span>
                <span>
                  <span className={cn("block text-[13px]", done ? "text-ink" : "text-muted")}>{labels[s]}</span>
                  <span className="block text-[12px] text-muted">{at ? formatDate(at, "dayMonth") : s === "DELIVERED" && estimate.from ? `Est. ${formatDateRange(estimate.from, estimate.to)}` : ""}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {shipment && (
        <div className="mt-6 rounded-[3px] border border-line bg-ivory">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <p className="text-[13.5px] text-ink">
                {CARRIERS[shipment.carrier].label}
                {shipment.service && <span className="text-muted"> · {shipment.service}</span>}
              </p>
              {shipment.trackingNumber && <p className="data text-ink-soft">{shipment.trackingNumber}</p>}
            </div>
            {trackingUrl(shipment.carrier, shipment.trackingNumber) && (
              <a href={trackingUrl(shipment.carrier, shipment.trackingNumber)!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[13px] text-ink underline underline-offset-4">
                Track with {CARRIERS[shipment.carrier].label.split(" ")[0]} <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
          <ol className="px-4 py-3">
            {shipment.events.map((e, i) => (
              <li key={`${e.occurredAt.toISOString()}-${i}`} className="grid grid-cols-[7.5rem_1fr] gap-3 py-1.5 text-[13px]">
                <span className="text-muted">{formatDate(e.occurredAt, "dateTime")}</span>
                <span className={i === 0 ? "text-ink" : "text-ink-soft"}>
                  {e.description}
                  {e.location && <span className="text-muted"> · {e.location}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
