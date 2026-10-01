"use client";

import { SendHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { sendMessageAction } from "@/server/actions/account";

export type ThreadMessage = {
  id: string;
  body: string;
  isSystem: boolean;
  createdAt: string;
  sender: { id: string; name: string | null; role: string } | null;
};

/** Conversation view with composer. Polls for new messages every few seconds. */
export function MessageThread({ conversationId, messages, meId, readOnly }: { conversationId: string; messages: ThreadMessage[]; meId: string; readOnly?: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 8000);
    return () => clearInterval(id);
  }, [router]);

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    start(async () => {
      const res = await sendMessageAction(conversationId, body);
      if (res.ok) {
        setDraft("");
        router.refresh();
      } else toast.error(res.message);
    });
  };

  let lastDay = "";
  return (
    <div className="flex h-[min(70vh,720px)] flex-col rounded-[3px] border border-line bg-porcelain">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 md:px-6">
        {messages.map((m) => {
          const day = formatDate(m.createdAt, "long");
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = m.sender?.id === meId;
          return (
            <div key={m.id}>
              {showDay && <p className="my-4 text-center text-[11px] tracking-[0.12em] text-muted uppercase">{day}</p>}
              {m.isSystem ? (
                <p className="mx-auto w-fit max-w-[90%] rounded-full bg-parchment px-4 py-1.5 text-center text-[12.5px] text-ink-soft">{m.body}</p>
              ) : (
                <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                  <div className={cn("max-w-[85%] rounded-[10px] px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap", mine ? "rounded-br-[2px] bg-sage-mist text-ink" : "rounded-bl-[2px] border border-line bg-ivory text-ink", m.sender?.role === "ADMIN" && !mine && "border-gold/40 bg-gold-mist/50")}>
                    {m.body}
                  </div>
                  <p className="mt-1 px-1 text-[11.5px] text-muted">
                    {mine ? "You" : m.sender?.role === "ADMIN" ? `${m.sender?.name ?? "Loupe"} · Loupe mediation` : (m.sender?.name ?? "")} · {formatDate(m.createdAt, "time")}
                  </p>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      {!readOnly && (
        <form
          className="flex items-end gap-2 border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label htmlFor="composer" className="sr-only">
            Message
          </label>
          <textarea
            id="composer"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
            className="max-h-40 min-h-11 flex-1 resize-y rounded-[2px] border border-line bg-ivory px-3.5 py-2.5 text-[14px] outline-none focus:border-sage"
          />
          <Button type="submit" size="icon" pending={pending} aria-label="Send message">
            {!pending && <SendHorizontal />}
          </Button>
        </form>
      )}
    </div>
  );
}
