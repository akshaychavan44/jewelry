"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { repriceNowAction } from "@/server/actions/seller";

export function RepriceButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="subtle"
      size="sm"
      pending={pending}
      onClick={() =>
        start(async () => {
          const res = await repriceNowAction();
          if (res.ok) toast.success(res.message);
          else toast.error(res.message);
          router.refresh();
        })
      }
    >
      {!pending && <RefreshCw />} Reprice now
    </Button>
  );
}
