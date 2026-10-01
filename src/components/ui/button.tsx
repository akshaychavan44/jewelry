import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] caps transition-[background-color,color,border-color,box-shadow] duration-200 ease-silk disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-sage text-white hover:bg-sage-deep",
        dark: "bg-ink text-ivory hover:bg-ink/90",
        outline: "border border-ink/70 bg-transparent text-ink hover:bg-ink hover:text-ivory",
        subtle: "border border-line bg-porcelain text-ink hover:border-line-strong hover:bg-white",
        ghost: "text-ink hover:bg-parchment",
        danger: "bg-rosewood text-white hover:bg-rosewood/90",
        gold: "bg-gold text-white hover:bg-gold-deep",
        link: "h-auto px-0 normal-case tracking-normal text-[14px] font-normal text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink",
      },
      size: {
        sm: "h-9 px-4 text-[10.5px]",
        md: "h-11 px-6",
        lg: "h-12 px-8",
        icon: "size-10 p-0",
        "icon-sm": "size-8 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    pending?: boolean;
  };

export function Button({ className, variant, size, asChild, pending, children, disabled, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={asChild ? undefined : disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {pending && <Spinner className="size-3.5" />}
          {children}
        </>
      )}
    </Comp>
  );
}
