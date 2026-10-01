import Image from "next/image";
import { Logo } from "@/components/brand/logo";
import { imagery } from "@/config/site";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="relative hidden bg-sand lg:block">
        <Image src={imagery.authBackdrop} alt="" fill priority sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
        <p className="absolute bottom-10 left-10 max-w-sm font-display text-[28px] leading-snug text-ivory">
          &ldquo;Every piece passes under a loupe before it reaches you.&rdquo;
        </p>
      </div>
      <div className="flex flex-col px-5 py-8 md:px-12">
        <div className="flex justify-center lg:justify-start">
          <Logo />
        </div>
        <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">{children}</main>
      </div>
    </div>
  );
}
