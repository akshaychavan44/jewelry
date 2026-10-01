import type { Metadata, Viewport } from "next";
import { DM_Mono, Gilda_Display, Jost, Pinyon_Script } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { siteConfig } from "@/config/site";
import "./globals.css";

const gilda = Gilda_Display({ subsets: ["latin"], weight: "400", variable: "--font-gilda", display: "swap" });
const jost = Jost({ subsets: ["latin"], variable: "--font-jost", display: "swap" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono", display: "swap" });
const pinyon = Pinyon_Script({ subsets: ["latin"], weight: "400", variable: "--font-pinyon", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} — ${siteConfig.descriptor}`, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  openGraph: { siteName: siteConfig.name, type: "website" },
};

export const viewport: Viewport = { themeColor: "#faf7f2" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${gilda.variable} ${jost.variable} ${dmMono.variable} ${pinyon.variable}`}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
