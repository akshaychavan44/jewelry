"use client";

import { Check } from "lucide-react";
import { Checkbox as CheckboxPrimitive, RadioGroup as RadioPrimitive, Slider as SliderPrimitive, Switch as SwitchPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer grid size-[18px] shrink-0 place-items-center rounded-[2px] border border-line-strong bg-porcelain transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sage/30 data-[state=checked]:border-sage data-[state=checked]:bg-sage data-[state=checked]:text-white disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-3.5" strokeWidth={2.5} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioPrimitive.Root>) {
  return <RadioPrimitive.Root className={cn("grid gap-2", className)} {...props} />;
}

export function RadioItem({ className, ...props }: React.ComponentProps<typeof RadioPrimitive.Item>) {
  return (
    <RadioPrimitive.Item
      className={cn(
        "grid size-[18px] shrink-0 place-items-center rounded-full border border-line-strong bg-porcelain outline-none focus-visible:ring-2 focus-visible:ring-sage/30 data-[state=checked]:border-sage disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="size-2.5 rounded-full bg-sage" />
    </RadioPrimitive.Item>
  );
}

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent bg-line-strong transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sage/30 data-[state=checked]:bg-sage disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[21px]" />
    </SwitchPrimitive.Root>
  );
}

export function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const thumbs = (props.value ?? props.defaultValue ?? [0]).length;
  return (
    <SliderPrimitive.Root className={cn("relative flex h-5 w-full touch-none items-center select-none", className)} {...props}>
      <SliderPrimitive.Track className="relative h-[3px] grow overflow-hidden rounded-full bg-line">
        <SliderPrimitive.Range className="absolute h-full bg-sage" />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbs }, (_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className="block size-4 rounded-full border border-sage bg-white shadow-sm outline-none focus-visible:ring-4 focus-visible:ring-sage/20"
          aria-label={thumbs > 1 ? (i === 0 ? "Minimum" : "Maximum") : undefined}
        />
      ))}
    </SliderPrimitive.Root>
  );
}
