import type { EngravingStyle } from "@/generated/prisma/enums";
import { chainLengthLabel, ENGRAVING_STYLES, ringSizeLabel } from "@/lib/jewelry";
import { cn } from "@/lib/utils";

type Item = {
  variantTitle: string | null;
  sku: string;
  quantity: number;
  ringSize: number | null;
  chainLengthMm: number | null;
  engravingText: string | null;
  engravingStyle: EngravingStyle | null;
};

export function LineItemOptions({ item, showSku }: { item: Item; showSku?: boolean }) {
  return (
    <ul className="mt-0.5 space-y-0.5 text-[12.5px] text-muted">
      {item.variantTitle && <li>{item.variantTitle}</li>}
      {item.ringSize && <li>Ring size {ringSizeLabel(item.ringSize)}</li>}
      {item.chainLengthMm && !item.variantTitle?.includes("″") && <li>Chain {chainLengthLabel(item.chainLengthMm)}</li>}
      {item.engravingText && (
        <li>
          Engraving: <span className={cn("text-ink", item.engravingStyle && ENGRAVING_STYLES[item.engravingStyle].className)}>{item.engravingText}</span>
        </li>
      )}
      {item.quantity > 1 && <li>Quantity {item.quantity}</li>}
      {showSku && <li className="font-mono text-[11.5px]">SKU {item.sku}</li>}
    </ul>
  );
}
