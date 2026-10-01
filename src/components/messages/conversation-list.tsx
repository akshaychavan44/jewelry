import Image from "next/image";
import Link from "next/link";
import { Monogram } from "@/components/ui/display";
import { timeAgo } from "@/lib/format";
import { cn, humanize } from "@/lib/utils";

export type ConversationSummary = {
  id: string;
  type: string;
  subject: string | null;
  lastMessageAt: Date;
  unread: number;
  counterpart: string;
  preview: string;
  imageUrl?: string | null;
};

export function ConversationList({ items, basePath, activeId }: { items: ConversationSummary[]; basePath: string; activeId?: string }) {
  if (!items.length) return <p className="rounded-[3px] border border-dashed border-line-strong px-5 py-10 text-center text-[14px] text-muted">No conversations yet.</p>;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-[3px] border border-line bg-porcelain">
      {items.map((c) => (
        <li key={c.id}>
          <Link href={`${basePath}/${c.id}`} className={cn("flex gap-3 px-4 py-3.5 transition-colors hover:bg-parchment/50", activeId === c.id && "bg-parchment")}>
            {c.imageUrl ? (
              <span className="relative size-11 shrink-0 overflow-hidden rounded-full bg-sand">
                <Image src={c.imageUrl} alt="" fill sizes="44px" className="object-cover" />
              </span>
            ) : (
              <Monogram name={c.counterpart} size={44} />
            )}
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className={cn("truncate text-[14px]", c.unread ? "font-medium text-ink" : "text-ink")}>{c.counterpart}</span>
                <span className="shrink-0 text-[11.5px] text-muted">{timeAgo(c.lastMessageAt)}</span>
              </span>
              <span className="block truncate text-[12.5px] text-ink-soft">
                <span className="text-muted">{humanize(c.type)} · </span>
                {c.subject}
              </span>
              <span className="mt-0.5 flex items-center justify-between gap-2">
                <span className="truncate text-[12.5px] text-muted">{c.preview}</span>
                {c.unread > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-sage px-1.5 text-[11px] leading-5 text-white">{c.unread}</span>}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
