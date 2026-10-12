"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NativeSelect } from "@/components/ui/input";
import { INQUIRY_LABELS, type InquiryStatus } from "@/lib/jeweler-profile";
import { updateInquiryStatusAction } from "@/server/actions/jeweler-profile";

export function InquiryStatusSelect({ id, status }: { id: string; status: InquiryStatus }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return <div className="w-40"><label htmlFor={`status-${id}`} className="mb-1 block text-xs text-muted">Request status</label><NativeSelect id={`status-${id}`} value={status} disabled={pending} aria-busy={pending} onChange={(e) => {
    const value = e.target.value;
    start(async () => {
      try {
        const res = await updateInquiryStatusAction(id, value);
        if (res.ok) { toast.success(res.message); router.refresh(); }
        else toast.error(res.message);
      } catch { toast.error("Could not save the status. Please try again."); }
    });
  }}>{Object.entries(INQUIRY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>;
}
