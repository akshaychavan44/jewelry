"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleFavoriteStore, toggleWishlist } from "@/server/actions/wishlist";

function useToggle(
  initial: boolean,
  action: () => Promise<Awaited<ReturnType<typeof toggleWishlist>>>,
  messages: { on: string; off: string; signIn: string }
) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [active, setActive] = useState(initial);

  useEffect(() => {
    setActive(initial);
  }, [initial]);

  const toggle = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (pending) return;
    const returnPath = pathname + window.location.search;

    const next = !active;
    setActive(next);

    start(async () => {
      try {
        const res = await action();
        if (!res.ok) {
          setActive(initial);
          if (res.requiresAuth) {
            toast.info(messages.signIn, {
              id: "favorites-sign-in-required",
              duration: 6000,
              action: {
                label: "Sign in",
                onClick: () => router.push(`/login?callbackUrl=${encodeURIComponent(returnPath)}`),
              },
            });
          } else {
            toast.error(res.message);
          }
          return;
        }
        setActive(res.saved);
        toast.success(res.saved ? messages.on : messages.off, { duration: 2500 });
        router.refresh();
      } catch {
        setActive(initial);
        toast.error("Something went wrong. Please try again.");
      }
    });
  };

  return { active, pending, toggle };
}

export function WishlistButton({
  productId,
  saved,
  className,
  variant = "icon",
}: {
  productId: string;
  saved: boolean;
  className?: string;
  variant?: "icon" | "full";
}) {
  const { active, pending, toggle } = useToggle(
    saved,
    () => toggleWishlist(productId),
    { on: "Added to favorites", off: "Removed from favorites", signIn: "Sign in to add to favorites" }
  );

  if (variant === "full") {
    return (
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={toggle}
        disabled={pending}
        className={cn("group/heart", className)}
        aria-pressed={active}
      >
        <Heart
          className={cn(
            "transition-colors duration-150",
            active
              ? "fill-red-500 text-red-500 group-hover/heart:fill-red-600 group-hover/heart:text-red-600"
              : "group-hover/heart:text-red-500"
          )}
          strokeWidth={1.8}
        />
        {active ? "Saved to favorites" : "Add to favorites"}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={active}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "group/heart grid size-9 place-items-center rounded-full bg-ivory/80 text-ink backdrop-blur-sm transition-all duration-150 hover:bg-ivory active:scale-95",
        className
      )}
    >
      <Heart
        className={cn(
          "size-4 transition-all duration-150 group-hover/heart:scale-110",
          active
            ? "fill-red-500 text-red-500 group-hover/heart:fill-red-600 group-hover/heart:text-red-600"
            : "text-current group-hover/heart:fill-red-500/25 group-hover/heart:text-red-500"
        )}
        strokeWidth={1.8}
      />
    </button>
  );
}

export function FollowStoreButton({
  sellerId,
  following,
  className,
  variant = "full",
  storeName,
}: {
  sellerId: string;
  following: boolean;
  className?: string;
  variant?: "full" | "icon";
  storeName?: string;
}) {
  const { active, pending, toggle } = useToggle(
    following,
    () => toggleFavoriteStore(sellerId),
    { on: "Added to your favourite jewelers", off: "Removed from your favourite jewelers", signIn: "Sign in to follow jewelers" }
  );

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={active}
        aria-label={(active ? "Unfollow " : "Follow ") + (storeName ?? "jeweler")}
        className={cn(
          "grid size-9 place-items-center rounded-lg bg-ink/40 text-white backdrop-blur-sm transition hover:bg-ink/60 disabled:opacity-60",
          className
        )}
      >
        <Heart size={19} className={cn(active && "fill-white")} strokeWidth={1.6} aria-hidden />
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={active ? "subtle" : "outline"}
      size="sm"
      onClick={toggle}
      disabled={pending}
      className={className}
      aria-pressed={active}
    >
      <Heart className={cn(active && "fill-rosewood text-rosewood")} strokeWidth={1.6} />
      {active ? "Following" : "Follow"}
    </Button>
  );
}
