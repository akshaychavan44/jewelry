import { Lock } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-ivory">
      <header className="border-b border-line bg-ivory">
        <div className="shell grid h-20 grid-cols-[1fr_auto_1fr] items-center">
          <Link href="/shop" className="text-[13px] text-ink-soft hover:text-ink">
            ← Back to directory
          </Link>
          <Logo />
          <p className="flex items-center justify-end gap-1.5 text-[12px] tracking-[0.12em] text-muted uppercase">
            <Lock className="size-3.5" /> <span className="hidden sm:inline">Verified Directory</span>
          </p>
        </div>
      </header>
      <main className="shell py-10">{children}</main>
    </div>
  );
}
