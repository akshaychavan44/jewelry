import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Mono, Manrope, Pinyon_Script } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { siteConfig } from "@/config/site";
import { brandIntroScript } from "@/components/brand/intro-script";
import "./globals.css";

const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-cormorant", display: "swap" });
const sans = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono", display: "swap" });
const pinyon = Pinyon_Script({ subsets: ["latin"], weight: "400", variable: "--font-pinyon", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} — ${siteConfig.descriptor}`, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  icons: { icon: [{ url: "/brand/jewelrex-icon.svg", type: "image/svg+xml" }] },
  openGraph: { siteName: siteConfig.name, type: "website" },
};

export const viewport: Viewport = { themeColor: "#FCF9F4" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${dmMono.variable} ${pinyon.variable}`}>
      <head>
        <link rel="preload" as="image" href="/brand/jewelrex-video-wordmark.png" media="(min-width: 1024px)" />
        <script dangerouslySetInnerHTML={{ __html: brandIntroScript }} />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
