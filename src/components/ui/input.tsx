"use client";

import { ChevronDown, Eye, EyeOff } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-[2px] border border-line bg-porcelain px-3.5 text-[15px] text-ink placeholder:text-muted/80 transition-[border-color,box-shadow] duration-150 outline-none hover:border-line-strong focus-visible:border-sage focus-visible:ring-2 focus-visible:ring-sage/20 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-rosewood aria-invalid:ring-rosewood/15";

export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  const [showPassword, setShowPassword] = useState(false);

  if (type === "password") {
    return (
      <div className="relative w-full">
        <input
          type={showPassword ? "text" : "password"}
          className={cn(fieldBase, "h-11 pr-11", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded text-muted/80 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/40"
          aria-label={showPassword ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff size={20} strokeWidth={1.5} className="size-5 shrink-0" aria-hidden />
          ) : (
            <Eye size={20} strokeWidth={1.5} className="size-5 shrink-0" aria-hidden />
          )}
        </button>
      </div>
    );
  }

  return <input type={type} className={cn(fieldBase, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "min-h-28 py-3 leading-relaxed resize-none", className)} {...props} />;
}

export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(fieldBase, "h-11 cursor-pointer appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
}
