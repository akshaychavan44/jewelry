"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleFavoriteStore, toggleWishlist } from "@/server/actions/wishlist";

function useToggle(initial: boolean, action: () => Promise<Awaited<ReturnType<typeof toggleWishlist>>>, messages: { on: string; off: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [active, setActive] = useOptimistic(initial);
  const toggle = () =>
    start(async () => {
      setActive(!active);
      const res = await action();
      if (!res.ok) {
        if (res.requiresAuth) router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
        else toast.error(res.message);
        return;
      }
      toast.success(res.saved ? messages.on : messages.off);
      router.refresh();
    });
  return { active, pending, toggle };
}

export function WishlistButton({ productId, saved, className, variant = "icon" }: { productId: string; saved: boolean; className?: string; variant?: "icon" | "full" }) {
  const { active, pending, toggle } = useToggle(saved, () => toggleWishlist(productId), { on: "Saved to your wishlist", off: "Removed from your wishlist" });
  if (variant === "full") {
    return (
      <Button type="button" variant="outline" size="lg" onClick={toggle} disabled={pending} className={className} aria-pressed={active}>
        <Heart className={cn(active && "fill-rosewood text-rosewood")} strokeWidth={1.6} />
        {active ? "Saved" : "Save"}
      </Button>
    );
  }
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={active}
      aria-label={active ? "Remove from wishlist" : "Save to wishlist"}
      className={cn("grid size-9 place-items-center rounded-full bg-ivory/80 text-ink backdrop-blur-sm transition hover:bg-ivory", className)}
    >
      <Heart className={cn("size-4 transition-colors", active ? "fill-rosewood text-rosewood" : "text-ink")} strokeWidth={1.6} />
    </button>
  );
}

export function FollowStoreButton({ sellerId, following, className, variant = "full", storeName }: { sellerId: string; following: boolean; className?: string; variant?: "full" | "icon"; storeName?: string }) {
  const { active, pending, toggle } = useToggle(following, () => toggleFavoriteStore(sellerId), { on: "Added to your favourite jewelers", off: "Removed from your favourite jewelers" });
  if (variant === "icon") return (
    <button type="button" onClick={toggle} disabled={pending} aria-pressed={active} aria-label={(active ? "Unfollow " : "Follow ") + (storeName ?? "jeweler")} className={cn("grid size-9 place-items-center rounded-lg bg-ink/40 text-white backdrop-blur-sm transition hover:bg-ink/60 disabled:opacity-60", className)}>
      <Heart size={19} className={cn(active && "fill-white")} strokeWidth={1.6} aria-hidden />
    </button>
  );
  return (
    <Button type="button" variant={active ? "subtle" : "outline"} size="sm" onClick={toggle} disabled={pending} className={className} aria-pressed={active}>
      <Heart className={cn(active && "fill-rosewood text-rosewood")} strokeWidth={1.6} />
      {active ? "Following" : "Follow"}
    </Button>
  );
}
