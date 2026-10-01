import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

const cartouche = "[clip-path:polygon(10px_0,calc(100%-10px)_0,100%_10px,100%_calc(100%-10px),calc(100%-10px)_100%,10px_100%,0_calc(100%-10px),0_10px)]";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="shell flex min-h-[62vh] flex-col items-center justify-center py-20 text-center">
        {/* Struck like a fineness mark — the site's hallmark device. */}
        <span aria-hidden className={`inline-flex bg-gold/55 p-[2px] ${cartouche}`}>
          <span className={`bg-gold-mist px-6 py-2 font-mono text-[34px] leading-none font-medium tracking-[0.12em] text-gold-deep ${cartouche}`}>404</span>
        </span>
        <h1 className="display-lg mt-8 text-ink">This piece isn&rsquo;t in the case.</h1>
        <p className="mt-4 max-w-md text-[16px] leading-relaxed text-ink-soft">
          The page may have moved — or the piece found its owner. One-of-a-kind jewelry sells, and when it does, its page goes with it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className={buttonVariants()}>
            Browse the collection
          </Link>
          <Link href="/jewelers" className={buttonVariants({ variant: "outline" })}>
            Meet the jewelers
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
