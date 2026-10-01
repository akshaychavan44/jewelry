import Image from "next/image";
import Link from "next/link";
import { ENGRAVING_STYLES, chainLengthLabel, ringSizeLabel } from "@/lib/jewelry";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CartLine } from "@/server/services/cart";

/** A cart / checkout line: image, title, options, price. */
export function LineSummary({ line, compact, children }: { line: CartLine; compact?: boolean; children?: React.ReactNode }) {
  return (
    <div className={cn("flex gap-4", !line.available && "opacity-60")}>
      <Link href={`/product/${line.slug}`} className={cn("relative shrink-0 overflow-hidden bg-sand", compact ? "size-16" : "size-24 md:size-28")}>
        {line.image.url && <Image src={line.image.url} alt={line.image.alt} fill sizes="112px" className="object-cover" />}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link href={`/product/${line.slug}`} className={cn("text-ink hover:underline", compact ? "text-[14px]" : "text-[15px]")}>
              {line.title}
            </Link>
            <p className="mt-0.5 text-[13px] text-muted">{line.variantTitle}</p>
          </div>
          <p className="tabular shrink-0 text-[14.5px] text-ink">{formatMoney(line.lineTotal.amountMinor, line.lineTotal.currency)}</p>
        </div>
        <ul className="mt-2 space-y-0.5 text-[12.5px] text-ink-soft">
          {line.ringSize && <li>Ring size: {ringSizeLabel(line.ringSize)}</li>}
          {line.chainLengthMm && !line.variantTitle.includes("″") && <li>Chain: {chainLengthLabel(line.chainLengthMm)}</li>}
          {line.engravingText && (
            <li>
              Engraving: <span className={cn("text-ink", line.engravingStyle && ENGRAVING_STYLES[line.engravingStyle].className)}>{line.engravingText}</span>
            </li>
          )}
          {line.fees.amountMinor > 0 && <li>Includes {formatMoney(line.fees.amountMinor, line.fees.currency)} for engraving / sizing</li>}
          {line.quantity > 1 && <li>{line.quantity} × {formatMoney(line.unit.amountMinor, line.unit.currency)}</li>}
          {line.offer && !line.issue && <li className="text-sage-deep">✓ Agreed offer price</li>}
          {line.livePrice && <li className="text-gold-deep">Live gold price · locked when you pay</li>}
          {line.issue && <li className="text-rosewood">{line.issue}</li>}
        </ul>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}
