"use client";

import Link from "next/link";
import { useTransition } from "react";
import { LogOut, Settings } from "lucide-react";
import { Monogram } from "@/components/ui/display";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menus";
import { signOutAction } from "@/server/actions/auth";

type Props = {
  name: string | null;
  email: string;
  image?: string | null;
  label: string;
  settingsHref: string;
};

export function DashboardAccountMenu({ name, email, image, label, settingsHref }: Props) {
  const [pending, start] = useTransition();
  const displayName = name || email;

  return (
    <div className="shrink-0 border-t border-line bg-parchment px-3 py-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account settings and sign out"
          className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left outline-none transition-colors hover:bg-white/80 focus-visible:ring-2 focus-visible:ring-gold/60 data-[state=open]:bg-white"
        >
          <Monogram name={displayName} src={image} size={36} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">{displayName}</span>
            <span className="mt-0.5 block truncate text-[11px] text-muted" title={email}>{email}</span>
          </span>
          <Settings size={18} strokeWidth={1.6} className="shrink-0 text-ink-soft" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" sideOffset={12} className="w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl bg-ivory p-3 shadow-lift">
          <DropdownMenuLabel className="px-3 pt-3 pb-4">
            <div className="flex items-center gap-3">
              <Monogram name={displayName} src={image} size={44} />
              <div className="min-w-0 flex-1">
                <p className="break-words text-[15px] font-medium text-ink">{displayName}</p>
                <p className="mt-1 break-all text-[12px] font-normal text-ink-soft">{email}</p>
                <p className="mt-2 text-[10px] font-normal uppercase tracking-wider text-gold-deep">{label}</p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="rounded-lg py-3">
            <Link href={settingsHref}><Settings aria-hidden /> Account settings</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending}
            className="rounded-lg py-3"
            onSelect={event => {
              event.preventDefault();
              start(async () => { await signOutAction(); });
            }}
          >
            <LogOut aria-hidden /> {pending ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
