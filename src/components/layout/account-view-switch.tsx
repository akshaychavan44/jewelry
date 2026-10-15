"use client";

import { useTransition } from "react";
import { Store, User } from "lucide-react";
import type { AccountView } from "@/lib/account-view";
import { switchAccountView } from "@/server/actions/account-view";
import { cn } from "@/lib/utils";

export function AccountViewSwitch({ view, className }: { view: AccountView; className?: string }) {
  const [pending, start] = useTransition();
  const Icon = view === "customer" ? User : Store;
  return <button type="button" disabled={pending} onClick={() => start(async () => { await switchAccountView(view); })}
    className={cn("inline-flex min-h-10 items-center gap-2 rounded-lg text-left text-sm text-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50", className)}>
    <Icon size={16} aria-hidden />
    {pending ? "Switching…" : view === "customer" ? "Switch to customer view" : "Switch to jeweler dashboard"}
  </button>;
}
