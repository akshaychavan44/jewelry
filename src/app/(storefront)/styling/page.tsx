import type { Metadata } from "next";
import Link from "next/link";
import { StylingPreview } from "@/components/catalog/discovery";

export const metadata: Metadata = { title: "Jewelry styling inspiration", description: "Bridal, everyday and evening jewelry inspiration, with pieces from independent jewelers on Loupe." };

export default function StylingPage() {
  return <div className="shell py-10 sm:py-16"><nav aria-label="Breadcrumb" className="mb-6 text-[12px] text-muted"><Link href="/guides" className="underline underline-offset-4">Guides</Link><span aria-hidden> / </span>Styling inspiration</nav><header className="mb-12 max-w-2xl"><p className="eyebrow mb-4">Styling inspiration</p><h1 className="display-lg text-ink">Make it your own.</h1><p className="mt-4 text-[16px] leading-relaxed text-ink-soft">Thoughtful ways to wear fine jewelry, from everyday favourites to once-in-a-lifetime moments. Explore an edit, find a piece, and speak with the jeweler who brings it to life.</p></header><StylingPreview /></div>;
}
