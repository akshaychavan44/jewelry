import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-ivory">
      <header className="border-b border-line">
        <div className="shell grid h-20 grid-cols-[1fr_auto_1fr] items-center">
          <Link href="/" className="text-[13px] text-ink-soft hover:text-ink">
            ← Back to Loupe
          </Link>
          <Logo />
          <p className="text-right text-[12px] tracking-[0.12em] text-muted uppercase">Jeweler application</p>
        </div>
      </header>
      <main className="shell-narrow py-12">{children}</main>
    </div>
  );
}
