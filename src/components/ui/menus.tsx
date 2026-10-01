"use client";

import { ChevronDown } from "lucide-react";
import {
  Accordion as AccordionPrimitive,
  DropdownMenu as MenuPrimitive,
  Popover as PopoverPrimitive,
  Tabs as TabsPrimitive,
  Tooltip as TooltipPrimitive,
} from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

// ── Dropdown menu ─────────────────────────────────────────────────────────────

export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;
export const DropdownMenuGroup = MenuPrimitive.Group;

export function DropdownMenuContent({ className, sideOffset = 8, ...props }: React.ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn("z-50 min-w-52 rounded-[3px] border border-line bg-ivory p-1.5 shadow-lift data-[state=open]:animate-fade-in", className)}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Item>) {
  return (
    <MenuPrimitive.Item
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-[2px] px-2.5 py-2 text-[14px] text-ink outline-none select-none data-[highlighted]:bg-parchment data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-ink-soft",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Label>) {
  return <MenuPrimitive.Label className={cn("px-2.5 pt-2 pb-1.5", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Separator>) {
  return <MenuPrimitive.Separator className={cn("my-1.5 h-px bg-line", className)} {...props} />;
}

// ── Popover ───────────────────────────────────────────────────────────────────

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

export function PopoverContent({ className, sideOffset = 8, align = "start", ...props }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn("z-50 w-72 rounded-[3px] border border-line bg-ivory p-4 shadow-lift outline-none data-[state=open]:animate-fade-in", className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

export function Tooltip({ content, children, side = "top" }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className="z-50 max-w-64 rounded-[2px] bg-ink px-2.5 py-1.5 text-[12.5px] leading-snug text-ivory shadow-soft data-[state=delayed-open]:animate-fade-in"
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-ink" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("scrollbar-none flex gap-7 overflow-x-auto border-b border-line", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "caps -mb-px shrink-0 border-b border-transparent pb-3 text-muted transition-colors hover:text-ink data-[state=active]:border-ink data-[state=active]:text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("pt-6 outline-none", className)} {...props} />;
}

// ── Accordion ─────────────────────────────────────────────────────────────────

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn("border-b border-line", className)} {...props} />;
}

export function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "group flex flex-1 items-center justify-between gap-4 py-4 text-left caps text-ink outline-none focus-visible:underline",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown className="size-4 shrink-0 text-muted transition-transform duration-300 group-data-[state=open]:rotate-180" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content className="overflow-hidden" {...props}>
      <div className={cn("pb-5", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
