"use client";

import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Shield,
  Sparkles,
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
import type { Role } from "@/generated/prisma/enums";
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
};

const navLink = "caps text-[12px] md:text-[12.5px] font-semibold tracking-[0.14em] text-ink transition-colors hover:text-[#86683a] " + styles.navItem;

export function HeaderClient({ categories, currency, user }: Props) {
  const pathname = usePathname();
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
  const isCustomOrdersActive = pathname.startsWith("/custom-orders");
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
            <Link href="/jewelers" className={cn(navLink, isJewelersActive && styles.activeNavItem)} data-active={isJewelersActive ? "true" : undefined}>
              Jewelers
            </Link>
            <Link href="/custom-orders" className={cn(navLink, isCustomOrdersActive && styles.activeNavItem)} data-active={isCustomOrdersActive ? "true" : undefined}>
              Custom orders
            </Link>
            <Link href="/guides" className={cn(navLink, "hidden xl:inline", isGuidesActive && styles.activeNavItem)} data-active={isGuidesActive ? "true" : undefined}>
              Guides
            </Link>
            <Link href="/sell" className={cn(navLink, "hidden xl:inline", isSellActive && styles.activeNavItem)} data-active={isSellActive ? "true" : undefined}>
              For jewelers
            </Link>
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
          <AccountMenu user={user} />
          <Link
            href={user ? "/seller/onboarding" : "/register?intent=seller"}
            className={cn(styles.listBusinessButton, "caps hidden md:inline-flex")}
          >
            List Your Business
          </Link>
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
                ["/jewelers", "Our jewelers"],
                ["/custom-orders", "Custom orders"],
                ["/guides", "Guides"],
                ["/styling", "Styling inspiration"],
                ["/sell", "List your business"],
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

function AccountMenu({ user }: { user: Props["user"] }) {
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(navLink, "inline-flex h-11 items-center gap-2 outline-none")} aria-label="Account menu">
        <span className="hidden lg:inline">Account</span>
        <User className="size-[18px] md:size-4" strokeWidth={1.6} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-60">
        <DropdownMenuLabel>
          <p className="text-[14px] font-medium text-ink">{user.name ?? "Your account"}</p>
          <p className="truncate text-[12.5px] text-muted">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.role === "ADMIN" && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield /> Admin console
            </Link>
          </DropdownMenuItem>
        )}
        {user.role === "SELLER" && (
          <DropdownMenuItem asChild>
            <Link href="/seller">
              <Store /> Jeweler dashboard
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/account">
            <LayoutDashboard /> My account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/messages">
            <MessageSquare /> Messages & Inquiries
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/custom-requests">
            <Sparkles /> Custom commissions
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/wishlist">
            <Heart /> Saved pieces
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/favorite-stores">
            <Store /> Saved jewelers
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOutAction()}>
          <LogOut /> Sign out
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
