"use client";

import {
  BadgeCheck,
  BarChart3,
  FileCheck2,
  Gem,
  HandCoins,
  Heart,
  Landmark,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Package,
  Percent,
  Plug,
  RotateCcw,
  Scale,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Icons are referenced by key so server layouts can pass nav items across the
// server → client boundary (component functions aren't serialisable).
const ICONS = {
  overview: LayoutDashboard,
  orders: Package,
  offers: HandCoins,
  messages: MessageSquare,
  wishlist: Heart,
  stores: Store,
  custom: Sparkles,
  warranty: ShieldCheck,
  addresses: MapPin,
  payments: Wallet,
  settings: Settings,
  products: Gem,
  returns: RotateCcw,
  reviews: Star,
  integrations: Plug,
  payouts: Landmark,
  analytics: BarChart3,
  kyc: FileCheck2,
  verified: BadgeCheck,
  disputes: Scale,
  monetization: Percent,
  users: Users,
  audit: ScrollText,
  pricing: TrendingUp,
  shipping: Truck,
} as const;

export type NavIcon = keyof typeof ICONS;
export type NavItem = { href: string; label: string; icon: NavIcon; badge?: number; exact?: boolean };

/** Sidebar navigation for account, seller and admin areas. */
export function DashboardNav({ items, className }: { items: NavItem[]; className?: string }) {
  const pathname = usePathname();
  return (
    <nav className={cn("scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0", className)}>
      {items.map(({ href, label, icon, badge, exact }) => {
        const Icon = ICONS[icon];
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-[2px] px-3 py-2.5 text-[14px] transition-colors",
              active ? "bg-parchment text-ink" : "text-ink-soft hover:bg-parchment/60 hover:text-ink",
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.5} />
            <span className="flex-1 whitespace-nowrap">{label}</span>
            {!!badge && <span className="grid min-w-5 place-items-center rounded-full bg-sage px-1.5 text-[11px] leading-5 text-white">{badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
