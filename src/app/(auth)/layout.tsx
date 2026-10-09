import Image from "next/image";
import { AuthScrollReset } from "@/components/auth/scroll-reset";
import { Logo } from "@/components/brand/logo";
import { imagery } from "@/config/site";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:h-dvh lg:overflow-hidden lg:grid-cols-[1fr_1.05fr]">
      <AuthScrollReset />
      <div className="relative hidden h-full bg-sand lg:block">
        <Image src={imagery.authBackdrop} alt="" fill priority sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
        <p className="absolute bottom-10 left-10 max-w-sm font-display text-[28px] leading-snug text-ivory">
          &ldquo;Every piece passes under a loupe before it reaches you.&rdquo;
        </p>
      </div>
      <div className="flex h-full flex-col overflow-y-auto px-5 py-6 md:px-12">
        <div className="flex shrink-0 justify-center">
          <Logo />
        </div>
        <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
