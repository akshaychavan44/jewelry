import type { MetalPricingData, PreciousMetalRateItem } from "@/server/services/metal-rates";
import { cn } from "@/lib/utils";

const METAL_STYLES: Record<PreciousMetalRateItem["accent"], { card: string; badge: string; dot: string; position: string; description: string }> = {
  gold: {
    card: "border-[#e9d8b8] bg-[linear-gradient(115deg,#f3dfbb_0%,#fbf5e9_55%,#faf8f3_100%)]",
    badge: "border-[#dfcda9] bg-[#f5e6cb] text-[#916724]",
    dot: "bg-[#aa7b2f]", position: "0% 50%", description: "24 Karat · 999 Fineness",
  },
  silver: {
    card: "border-[#e2e1dd] bg-[linear-gradient(115deg,#e7e6e1_0%,#f5f5f1_55%,#fafaf7_100%)]",
    badge: "border-[#d8d8d4] bg-[#e8e8e4] text-[#666963]",
    dot: "bg-[#93968f]", position: "50% 50%", description: "999 Fine Silver",
  },
  platinum: {
    card: "border-[#dbe3e7] bg-[linear-gradient(115deg,#dfe8ee_0%,#f1f5f7_55%,#f8fafb_100%)]",
    badge: "border-[#cbd6dd] bg-[#e0e8ed] text-[#526473]",
    dot: "bg-[#788b98]", position: "100% 50%", description: "999 Pure Platinum",
  },
};

export function MetalPricingStrip({ data }: { data: MetalPricingData }) {
  return (
    <section className="bg-[#faf8f3] pt-6 pb-3" aria-labelledby="metal-pricing-heading">
      <div className="w-full px-6">
        <div className="mb-6 text-center">
          <div aria-hidden className="mb-3 flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-[#cdbd9f]" />
            <span className="size-2 rotate-45 bg-[#cdbd9f]" />
            <span className="h-px w-10 bg-[#cdbd9f]" />
          </div>
          <h2 id="metal-pricing-heading" className="font-display text-[30px] leading-tight text-ink">Precious Metal Pricing</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {data.items.map(item => {
            const styles = METAL_STYLES[item.accent];
            return (
              <article key={item.metal} className={cn("relative flex h-[200px] min-w-0 flex-col overflow-hidden rounded-md border px-5 py-4", styles.card)} aria-label={`${item.name} spot price`}>
                <div aria-hidden className="pointer-events-none absolute right-[-12px] top-8 h-[112px] w-[155px] opacity-80 [mask-image:linear-gradient(to_bottom,black_65%,transparent)]" style={{ backgroundImage: "url('/media/metal-nuggets.png')", backgroundSize: "300% auto", backgroundPosition: styles.position, backgroundRepeat: "no-repeat" }} />
                <div className="relative flex items-center justify-between gap-2">
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide", styles.badge)}>
                    <span className={cn("size-1.5 rounded-full", styles.dot)} />
                    {item.symbol} · {item.purity}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-ink-soft">Spot rate</span>
                </div>
                <div className="relative mt-4">
                  <h3 className="font-display text-[27px] leading-none text-ink">{item.name}</h3>
                  <p className="mt-2 text-[12px] text-ink-soft">{styles.description}</p>
                </div>
                <div className="relative mt-auto flex items-baseline justify-between gap-2 border-t border-ink/10 pt-3">
                  <span className="font-display text-[29px] font-semibold leading-none tabular-nums tracking-tight text-ink">{item.formattedPrice}</span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wider text-ink-soft">{item.unitLabel}</span>
                </div>
              </article>
            );
          })}
        </div>
        <div className="mt-3 flex items-start justify-between gap-6 text-[10px] leading-relaxed text-muted">
          <p>Reference benchmark. Artisan finishing and settings are priced separately.</p>
          <p className="text-right">Live market reference in INR · Last updated: {data.lastUpdatedFormatted}</p>
        </div>
      </div>
    </section>
  );
}
