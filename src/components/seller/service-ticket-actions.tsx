"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { NativeSelect } from "@/components/ui/input";
import type { ServiceStatus } from "@/generated/prisma/enums";
import { SERVICE_STATUS } from "@/lib/status";
import { updateServiceAction } from "@/server/actions/seller";

const NEXT: Partial<Record<ServiceStatus, ServiceStatus[]>> = {
  REQUESTED: ["APPROVED", "DECLINED"],
  APPROVED: ["AWAITING_ITEM"],
  AWAITING_ITEM: ["RECEIVED"],
  RECEIVED: ["IN_PROGRESS"],
  IN_PROGRESS: ["SHIPPED_BACK"],
  SHIPPED_BACK: ["COMPLETED"],
};

export function ServiceTicketActions({ ticketId, status }: { ticketId: string; status: ServiceStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const options = NEXT[status] ?? [];
  if (!options.length) return null;
  return (
    <NativeSelect
      aria-label="Update service request"
      disabled={pending}
      defaultValue=""
      className="h-8 w-48 text-[12.5px]"
      onChange={(e) => {
        const next = e.target.value as ServiceStatus;
        if (!next) return;
        start(async () => {
          const res = await updateServiceAction(ticketId, next);
          if (res.ok) toast.success(res.message);
          else toast.error(res.message);
          router.refresh();
        });
      }}
    >
      <option value="">Update status…</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {SERVICE_STATUS[o].label}
        </option>
      ))}
    </NativeSelect>
  );
}
