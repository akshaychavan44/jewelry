"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setUserStatusAction } from "@/server/actions/admin";

export function UserStatusButton({ userId, name, status }: { userId: string; name: string; status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const suspend = status === "ACTIVE";
  return (
    <Button
      size="sm"
      variant={suspend ? "ghost" : "outline"}
      pending={pending}
      onClick={() => {
        if (suspend && !window.confirm(`Suspend ${name}? They'll be signed out and can't buy, sell or message until reactivated.`)) return;
        start(async () => {
          const res = await setUserStatusAction(userId, suspend ? "SUSPENDED" : "ACTIVE");
          if (res.ok) toast.success(res.message);
          else toast.error(res.message);
          router.refresh();
        });
      }}
    >
      {suspend ? "Suspend" : "Reactivate"}
    </Button>
  );
}
