"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

function Overlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn("fixed inset-0 z-50 bg-ink/35 backdrop-blur-[2px] data-[state=open]:animate-fade-in", className)}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  children,
  size = "md",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[3px] border border-line bg-ivory shadow-lift outline-none data-[state=open]:animate-fade-up",
          size === "sm" && "max-w-md",
          size === "md" && "max-w-lg",
          size === "lg" && "max-w-3xl",
          size === "xl" && "max-w-5xl",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 grid size-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-parchment hover:text-ink">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("border-b border-line px-6 pt-6 pb-4 pr-14", className)} {...props} />;
}

export function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("overflow-y-auto px-6 py-5", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col-reverse gap-2 border-t border-line bg-parchment/50 px-6 py-4 sm:flex-row sm:justify-end", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("display-sm text-ink", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("mt-1 text-[14px] text-ink-soft", className)} {...props} />;
}

/** Side panel (mobile navigation, filters, cart drawer). */
export function SheetContent({
  className,
  children,
  side = "right",
  title,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: "left" | "right"; title: string }) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 z-50 flex w-[min(420px,calc(100vw-3rem))] flex-col bg-ivory shadow-lift outline-none transition-transform duration-300 ease-silk",
          side === "right" ? "right-0 border-l border-line" : "left-0 border-r border-line",
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <DialogPrimitive.Title className="caps text-ink">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-parchment hover:text-ink">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </div>
        <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
