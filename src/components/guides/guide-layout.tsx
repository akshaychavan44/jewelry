import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { guideBySlug, guides, type GuideSlug } from "@/config/guides";
import { cn } from "@/lib/utils";

/** Editorial shell shared by every buying guide: header, sticky contents, related reading. */
export function GuideLayout({ slug, sections, children, cta }: { slug: GuideSlug; sections: { id: string; label: string }[]; children: React.ReactNode; cta?: { label: string; href: string } }) {
  const guide = guideBySlug(slug);
  return (
    <article>
      <header className="border-b border-line bg-parchment/40">
        <div className="shell grid items-center gap-10 py-12 md:grid-cols-[1.1fr_1fr] md:py-16">
          <div>
            <nav aria-label="Breadcrumb" className="mb-6 text-[13px] text-muted">
              <Link href="/guides" className="hover:text-ink">
                Guides
              </Link>{" "}
              / {guide.short}
            </nav>
            <p className="eyebrow">Buying guide · {guide.minutes} min read</p>
            <h1 className="display-lg mt-3 text-ink">{guide.title}</h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-soft">{guide.description}</p>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2px] bg-sand">
            <Image src={guide.image} alt="" fill priority sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" />
          </div>
        </div>
      </header>

      <div className="shell grid gap-12 py-12 md:py-16 lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav aria-label="In this guide" className="sticky top-28">
            <p className="caps mb-3 text-muted">In this guide</p>
            <ol className="space-y-2 border-l border-line text-[13.5px]">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="-ml-px block border-l border-transparent pl-4 text-ink-soft hover:border-ink hover:text-ink">
                    {s.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
        <div className="max-w-[760px] min-w-0 space-y-14">
          {children}
          {cta && (
            <Link href={cta.href} className="group flex items-center justify-between gap-4 rounded-[3px] border border-line bg-porcelain px-6 py-5 transition-colors hover:border-line-strong">
              <span className="font-display text-[21px] text-ink">{cta.label}</span>
              <ArrowRight className="size-5 text-ink transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </div>

      <RelatedGuides current={slug} />
    </article>
  );
}

export function GuideSection({ id, title, children, className }: { id: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-28", className)}>
      <h2 id={`${id}-title`} className="display-md text-ink">
        {title}
      </h2>
      <div className="prose-loupe mt-4">{children}</div>
    </section>
  );
}

export function GuideCard({ slug, className }: { slug: GuideSlug; className?: string }) {
  const g = guideBySlug(slug);
  return (
    <Link href={`/guides/${g.slug}`} className={cn("group block", className)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[2px] bg-sand">
        <Image src={g.image} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
      </div>
      <p className="caps mt-4 text-muted">{g.minutes} min read</p>
      <h3 className="display-sm mt-1.5 text-ink group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">{g.title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{g.description}</p>
    </Link>
  );
}

/** Compact horizontal card for secondary guides beside a lead story. */
export function GuideRow({ slug }: { slug: GuideSlug }) {
  const g = guideBySlug(slug);
  return (
    <Link href={`/guides/${g.slug}`} className="group grid grid-cols-[112px_1fr] items-start gap-5 sm:grid-cols-[160px_1fr]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[2px] bg-sand">
        <Image src={g.image} alt="" fill sizes="160px" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
      </div>
      <div>
        <p className="caps text-muted">{g.minutes} min read</p>
        <h3 className="display-sm mt-1 text-ink group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">{g.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-ink-soft">{g.description}</p>
      </div>
    </Link>
  );
}

function RelatedGuides({ current }: { current: GuideSlug }) {
  const others = guides.filter((g) => g.slug !== current);
  return (
    <section aria-labelledby="related-guides" className="border-t border-line bg-parchment/30">
      <div className="shell py-14">
        <h2 id="related-guides" className="display-md text-ink">
          Keep reading
        </h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((g) => (
            <GuideCard key={g.slug} slug={g.slug} />
          ))}
        </div>
      </div>
    </section>
  );
}
