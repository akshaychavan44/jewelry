"use client";

import {
  ChevronDown,
  ChevronRight,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Shield,
  Sparkles,
  Star,
  Store,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useEffect, useRef, useState, useTransition } from "react";
import { Logo } from "@/components/brand/logo";
import { Dialog, DialogContent, DialogTitle, SheetContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menus";
import type { Role } from "@/lib/domain-enums";
import type { AccountView } from "@/lib/account-view";
import { AccountViewSwitch } from "./account-view-switch";
import { CURRENCIES, type CurrencyCode, SUPPORTED_CURRENCIES } from "@/lib/money";
import { cn } from "@/lib/utils";
import { setCurrency } from "@/server/actions/preferences";
import { signOutAction } from "@/server/actions/auth";
import styles from "./site-header.module.css";

type Category = { slug: string; name: string; imageUrl: string | null; children: { slug: string; name: string }[] };

type Props = {
  categories: Category[];
  currency: CurrencyCode;
  user: { name: string | null; email: string; role: Role } | null;
  isApprovedJeweler?: boolean;
  sellerSlug?: string;
  accountView?: AccountView;
};

const navLink = "caps text-[12px] md:text-[12.5px] font-semibold tracking-[0.14em] text-ink transition-colors hover:text-[#86683a] " + styles.navItem;

export function HeaderClient({ categories, currency, user, isApprovedJeweler, sellerSlug, accountView = "seller" }: Props) {
  const pathname = usePathname();
  const sellerView = user?.role === "SELLER" && accountView === "seller";
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const onScroll = () => { setScrolled(window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  useEffect(() => {
    setMegaOpen(false);
    setMobileOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  const openMega = () => {
    clearTimeout(closeTimer.current);
    setMegaOpen(true);
  };
  const closeMegaSoon = () => {
    closeTimer.current = setTimeout(() => setMegaOpen(false), 140);
  };

  const isShopActive = pathname.startsWith("/shop") || pathname.startsWith("/categories");
  const isJewelersActive = pathname.startsWith("/jewelers");
  const requestsHref = sellerView ? "/seller/custom-requests" : "/custom-orders";
  const isCustomOrdersActive = pathname === requestsHref || pathname.startsWith(`${requestsHref}/`);
  const isGuidesActive = pathname.startsWith("/guides") || pathname.startsWith("/styling");
  const isSellActive = pathname.startsWith("/sell");

  return (
    <header
      className={cn(
        "sticky top-0 z-40",
        styles.header,
        "transition-all duration-500 ease-silk",
        (scrolled || megaOpen) && styles.elevated,
        "translate-y-0 opacity-100 visible pointer-events-auto"
      )}
    >
      <div className={cn(styles.bar, "h-[72px] md:h-[84px]")}>
        {/* Left: navigation */}
        <div className="flex items-center gap-7">
          <button type="button" className="-ml-2 grid size-10 place-items-center lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="size-5" strokeWidth={1.5} />
          </button>
          <nav className={cn(styles.navigation, "hidden items-center lg:flex")} aria-label="Main">
            <div onMouseEnter={openMega} onMouseLeave={closeMegaSoon}>
              <button
                type="button"
                className={cn(navLink, "inline-flex items-center gap-1.5", (isShopActive || megaOpen) && styles.activeNavItem)}
                data-active={isShopActive || megaOpen ? "true" : undefined}
                aria-expanded={megaOpen}
                aria-controls="mega-menu"
                onClick={() => setMegaOpen((v) => !v)}
                onKeyDown={(e) => e.key === "Escape" && setMegaOpen(false)}
              >
                Jewelry <ChevronDown className={cn("size-3.5 transition-transform", megaOpen && "rotate-180")} />
              </button>
            </div>
            <Link
              href={sellerView && sellerSlug ? `/jewelers/${sellerSlug}` : "/jewelers"}
              className={cn(navLink, isJewelersActive && styles.activeNavItem)}
              data-active={isJewelersActive ? "true" : undefined}
            >
              {sellerView ? "My Shop" : "Jewelers"}
            </Link>
            <Link href={requestsHref} className={cn(navLink, isCustomOrdersActive && styles.activeNavItem)} data-active={isCustomOrdersActive ? "true" : undefined}>
              {sellerView ? "Customer Requests" : "Custom Orders"}
            </Link>
            <Link href="/guides" className={cn(navLink, isGuidesActive && styles.activeNavItem)} data-active={isGuidesActive ? "true" : undefined}>
              Guides
            </Link>
            {(!isApprovedJeweler || !sellerView) && (
              <Link href="/sell" className={cn(navLink, isSellActive && styles.activeNavItem)} data-active={isSellActive ? "true" : undefined}>
                For jewelers
              </Link>
            )}
          </nav>
        </div>

        {/* Centre: wordmark */}
        <div className={styles.centerBrand}>
          <Logo className={styles.wordmark} />
        </div>

        {/* Right: utilities */}
        <div className={styles.utilities}>
          <CurrencyMenu currency={currency} className={styles.currencyControl} />
          <button type="button" onClick={() => setSearchOpen(true)} className={cn(navLink, styles.searchButton, "inline-flex items-center gap-2 p-2")} aria-label="Search">
            <span className="hidden xl:inline">Search jewelry</span>
            <Search className="size-[18px] md:size-4" strokeWidth={1.6} />
          </button>
          {user?.role !== "BUYER" && !(user?.role === "SELLER" && !sellerView) && <Link
            href={user?.role === "SELLER" ? "/seller" : user ? "/seller/onboarding" : "/register?intent=seller"}
            className={cn(styles.listBusinessButton, "caps hidden md:inline-flex")}
          >
            {user?.role === "SELLER" ? "My Dashboard" : "List Your Business"}
          </Link>}
          <AccountMenu user={user} accountView={accountView} />
        </div>
      </div>

      {/* Mega menu */}
      <div
        id="mega-menu"
        onMouseEnter={openMega}
        onMouseLeave={closeMegaSoon}
        className={cn(
          "absolute inset-x-0 top-full hidden border-b border-line/60 bg-white/95 backdrop-blur-2xl shadow-soft transition-[opacity,transform] duration-200 lg:block",
          megaOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
        )}
      >
        <div className="shell flex gap-12 py-10">
          {categories.slice(0, 4).map((c) => (
            <div key={c.slug} className="w-48 shrink-0">
              <Link href={`/shop/${c.slug}`} className="font-display text-[22px] text-ink hover:text-sage-deep">
                {c.name}
              </Link>
              <ul className="mt-4 space-y-2.5">
                {c.children.map((ch) => (
                  <li key={ch.slug}>
                    <Link href={`/shop/${ch.slug}`} className="text-[14px] text-ink-soft hover:text-ink">
                      {ch.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href={`/shop/${c.slug}`} className="text-[14px] text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
                    All {c.name.toLowerCase()}
                  </Link>
                </li>
              </ul>
            </div>
          ))}
        </div>
      </div>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Mobile navigation */}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" title="Menu">
          <nav className="flex-1 overflow-y-auto px-5 py-4" aria-label="Mobile">
            <ul className="divide-y divide-line">
              {categories.map((c) => (
                <li key={c.slug}>
                  <details className="group py-1">
                    <summary className="flex cursor-pointer list-none items-center justify-between py-3 font-display text-[21px] text-ink">
                      {c.name}
                      {c.children.length > 0 && <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" />}
                    </summary>
                    <ul className="space-y-2.5 pb-4 pl-1">
                      <li>
                        <Link href={`/shop/${c.slug}`} className="text-[15px] text-ink underline underline-offset-4">
                          Browse all {c.name.toLowerCase()}
                        </Link>
                      </li>
                      {c.children.map((ch) => (
                        <li key={ch.slug}>
                          <Link href={`/shop/${ch.slug}`} className="text-[15px] text-ink-soft">
                            {ch.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
            <ul className="mt-6 space-y-4">
              {[
                ["/shop", "All jewelry"],
                [sellerView && sellerSlug ? `/jewelers/${sellerSlug}` : "/jewelers", sellerView ? "My Shop" : "Our jewelers"],
                ["/custom-orders", "Custom orders"],
                ["/guides", "Guides"],
                ["/styling", "Styling inspiration"],
                [sellerView ? "/seller" : "/sell", sellerView ? "My Dashboard" : "List your business"],
                [user ? "/account" : "/login", user ? "My account" : "Customer login"],
                ...(!user ? [["/jeweler/login", "Jeweler login"]] : []),
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="caps text-ink">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            {user?.role === "SELLER" && <AccountViewSwitch view={sellerView ? "customer" : "seller"} className="mt-5 w-full" />}
          </nav>
          <div className="border-t border-line px-5 py-4">
            <CurrencyMenu currency={currency} />
          </div>
        </SheetContent>
      </Dialog>
    </header>
  );
}

function CurrencyMenu({ currency, className }: { currency: CurrencyCode; className?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn("caps inline-flex items-center gap-1 text-ink/85 outline-none transition-colors hover:text-[#86683a]", styles.navItem, pending && "opacity-50", className)} aria-label={`Currency: ${currency}`}>
        {currency} <ChevronDown className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="eyebrow">Currency</DropdownMenuLabel>
        {SUPPORTED_CURRENCIES.map((code) => (
          <DropdownMenuItem
            key={code}
            onSelect={() =>
              start(async () => {
                await setCurrency(code);
                router.refresh();
              })
            }
            className={cn(code === currency && "bg-parchment")}
          >
            <span className="w-10 font-mono text-[12px] text-ink-soft">{code}</span>
            {CURRENCIES[code].name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountMenu({ user, accountView }: { user: Props["user"]; accountView: AccountView }) {
  const pathname = usePathname();
  if (!user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className={cn(navLink, "inline-flex h-11 items-center gap-2 outline-none")} aria-label="Sign in options">
          <span className="hidden lg:inline">Sign in</span>
          <User className="size-[18px] md:size-4" strokeWidth={1.6} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-60">
          <DropdownMenuItem asChild><Link href="/login"><User /> Customer login</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/jeweler/login"><Store /> Jeweler login</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  const displayName = user.name?.trim() || user.email.split("@")[0];
  const firstName = displayName.split(" ")[0];
  const initial = (firstName.charAt(0) || "U").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="group inline-flex items-center gap-2 rounded-full outline-none transition-all focus-visible:ring-2 focus-visible:ring-gold/60"
        aria-label={`Account menu for ${displayName}`}
      >
        <span
          className="grid size-9 place-items-center rounded-full bg-[#faf6ee] font-display text-[15px] font-semibold text-[#865d1b] shadow-2xs transition-all duration-200 group-hover:bg-white group-hover:shadow-xs group-hover:scale-105"
          title={displayName}
        >
          {initial}
        </span>
        <span className="hidden text-[12.5px] font-medium tracking-[0.02em] text-ink group-hover:text-[#865d1b] xl:inline">
          {firstName}
        </span>
        <ChevronDown aria-hidden className="size-3.5 text-ink-soft" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={16}
        className="relative w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border-[#e5d8c3] bg-ivory p-4 shadow-[0_16px_40px_rgba(50,37,20,0.14)] before:absolute before:-top-[9px] before:right-7 before:size-4 before:rotate-45 before:border-l before:border-t before:border-[#e5d8c3] before:bg-ivory"
      >
        <DropdownMenuLabel className="border-0 bg-transparent px-2 py-1">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-[#faf6ee] font-display text-[15px] font-semibold text-[#865d1b] shadow-2xs"
            >
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-display text-[22px] font-normal text-ink">{displayName}</p>
                {user.role !== "BUYER" && (
                  <span className="shrink-0 text-[10px] font-semibold tracking-wider uppercase text-[#9e743e] px-1.5 py-0.5 rounded-full bg-white border border-[#e2d5c2]">
                    {user.role === "ADMIN" ? "Admin" : accountView === "customer" ? "Customer view" : "Jeweler"}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[12px] font-normal text-muted" title={user.email}>
                {user.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="space-y-0.5 py-1">
          {(user.role === "BUYER" || (user.role === "SELLER" && accountView === "customer")
            ? [
                { href: "/account/settings", label: "My Profile", icon: User },
                { href: "/account/custom-requests", label: "Custom Requests", icon: Sparkles },
                { href: "/account/wishlist", label: "Saved Jewellery", icon: Heart },
                { href: "/account/favorite-stores", label: "Saved Jewellers", icon: Store },
                { href: "/account/reviews", label: "My Reviews", icon: Star },
              ]
            : user.role === "ADMIN"
            ? [
                { href: "/admin", label: "Admin console", icon: Shield },
                { href: "/account", label: "My account", icon: LayoutDashboard },
              ]
            : [
                { href: "/seller", label: "My account", icon: LayoutDashboard },
              ]
          ).map(({ href, label, icon: Icon }) => (
            <DropdownMenuItem
              key={href}
              asChild
              className={cn(
                "min-h-10 gap-3 rounded-lg px-2 py-1 font-display text-[18px] font-normal data-[highlighted]:bg-parchment/70",
                pathname === href && "bg-parchment/50"
              )}
            >
              <Link href={href} aria-current={pathname === href ? "page" : undefined}>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-parchment/80">
                  <Icon aria-hidden className="!size-[18px]" strokeWidth={1.5} />
                </span>
                <span className="flex-1">{label}</span>
                <ChevronRight aria-hidden className="!size-[18px]" strokeWidth={1.5} />
              </Link>
            </DropdownMenuItem>
          ))}
        </div>
        {user.role === "SELLER" && <>
          <DropdownMenuSeparator />
          <AccountViewSwitch view={accountView === "customer" ? "seller" : "customer"} className="w-full px-2 py-2" />
        </>}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => signOutAction()}
          className="cursor-pointer gap-3 rounded-lg px-2 py-2 font-display text-[18px] text-rosewood focus:bg-rosewood-mist focus:text-rosewood [&_svg]:!size-5 [&_svg]:!text-rosewood"
        >
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const POPULAR = ["Emerald cut", "GIA certified", "22k gold", "Tennis bracelet", "Art Deco", "Pearl strand", "Lab-grown"];

function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const go = (query: string) => {
    onOpenChange(false);
    router.push(`/shop?q=${encodeURIComponent(query)}`);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="top-[18%] translate-y-0">
        <div className="px-6 pt-6 pb-7 md:px-8">
          <DialogTitle className="eyebrow mb-4">Search jewelry & jewelers</DialogTitle>
          <DialogPrimitive.Description className="sr-only">Search jewelry, jewelers and materials</DialogPrimitive.Description>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) go(q.trim());
            }}
            className="flex items-center gap-3 border-b border-ink/60 pb-3"
          >
            <Search className="size-5 text-ink-soft" strokeWidth={1.5} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Emerald rings, Kundan, GIA 1.5 ct…"
              className="w-full bg-transparent font-display text-[26px] text-ink outline-none placeholder:text-muted/60"
              aria-label="Search"
            />
          </form>
          <p className="eyebrow mt-6 mb-3">Popular searches</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR.map((term) => (
              <button key={term} type="button" onClick={() => go(term)} className="rounded-full border border-line bg-porcelain px-3.5 py-1.5 text-[13.5px] text-ink-soft hover:border-ink/40 hover:text-ink">
                {term}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
