import { TrustBar } from "@/components/layout/bars";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="storefront">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <TrustBar />
      <SiteFooter />
    </div>
  );
}
