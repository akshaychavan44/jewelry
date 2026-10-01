"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/menus";
import { publishListingAction, setListingStatusAction } from "@/server/actions/seller";

export function ListingRowActions({ productId, status, slug }: { productId: string; status: string; slug: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => ReturnType<typeof publishListingAction>) =>
    start(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      router.refresh();
    });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-parchment disabled:opacity-40" disabled={pending} aria-label="Listing actions">
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/seller/products/${productId}`}>Edit</Link>
        </DropdownMenuItem>
        {status === "ACTIVE" && (
          <DropdownMenuItem asChild>
            <a href={`/product/${slug}`} target="_blank" rel="noreferrer">View live</a>
          </DropdownMenuItem>
        )}
        {(status === "DRAFT" || status === "ARCHIVED") && <DropdownMenuItem onSelect={() => run(() => publishListingAction(productId))}>Publish</DropdownMenuItem>}
        {status === "ACTIVE" && <DropdownMenuItem onSelect={() => run(() => setListingStatusAction(productId, "ARCHIVED"))}>Archive</DropdownMenuItem>}
        {status === "ARCHIVED" && <DropdownMenuItem onSelect={() => run(() => setListingStatusAction(productId, "DRAFT"))}>Move to drafts</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
