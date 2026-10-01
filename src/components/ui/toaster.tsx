"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "!rounded-[3px] !border !border-line !bg-ivory !text-ink !shadow-lift !font-sans",
          description: "!text-ink-soft",
          actionButton: "!bg-sage !text-white !rounded-[2px]",
          success: "[&_[data-icon]]:!text-moss",
          error: "[&_[data-icon]]:!text-rosewood",
        },
      }}
    />
  );
}
