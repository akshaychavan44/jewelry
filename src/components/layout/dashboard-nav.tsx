"use client";

import {
  BadgeCheck,
  Bell,
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
  notifications: Bell,
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
export function DashboardNav({
  items,
  className,
  variant = "default",
}: {
  items: NavItem[];
  className?: string;
  variant?: "default" | "underlined";
}) {
  const pathname = usePathname();
  const isUnderlined = variant === "underlined";

  return (
    <nav
      className={cn(
        "scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0",
        isUnderlined && "divide-y divide-[#e5d8c3]/80 border-y border-[#e5d8c3]/80 bg-white/70 rounded-[4px] overflow-hidden shadow-xs",
        className,
      )}
    >
      {items.map(({ href, label, icon, badge, exact }) => {
        const Icon = ICONS[icon];
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3.5 transition-all duration-200",
              isUnderlined
                ? cn(
                    "px-4 py-3.5 text-[15px] font-medium",
                    active
                      ? "bg-white text-ink font-semibold border-l-[3px] border-[#b8883b] shadow-xs"
                      : "text-ink/75 hover:bg-white/90 hover:text-ink hover:translate-x-0.5",
                  )
                : cn(
                    "rounded-[2px] px-3 py-2.5 text-[14px]",
                    active ? "bg-parchment text-ink" : "text-ink-soft hover:bg-parchment/60 hover:text-ink",
                  ),
            )}
          >
            <Icon
              className={cn(
                "size-[18px] shrink-0 transition-colors",
                isUnderlined && active ? "text-[#b8883b]" : "text-ink/65",
              )}
              strokeWidth={isUnderlined && active ? 2 : 1.6}
            />
            <span className="flex-1 whitespace-nowrap">{label}</span>
            {!!badge && (
              <span className="grid min-w-5 place-items-center rounded-full bg-sage px-1.5 text-[11px] leading-5 text-white">
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
