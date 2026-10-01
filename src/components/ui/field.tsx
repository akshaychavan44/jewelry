import type * as React from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-[12px] font-medium tracking-[0.06em] text-ink-soft uppercase", className)} {...props} />;
}

/** Label + control + hint/error, wired for screen readers. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: string | string[] | null;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("min-w-0", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="ml-1.5 normal-case tracking-normal text-muted">(optional)</span>}
      </Label>
      {children}
      {message ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-[13px] text-rosewood">
          {message}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-[2px] border border-rosewood/30 bg-rosewood-mist px-4 py-3 text-[14px] text-rosewood">
      {message}
    </div>
  );
}
