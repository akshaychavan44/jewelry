"use client";

import { Ruler } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, Td, Th } from "@/components/ui/display";
import { RING_SIZES, type RingSize } from "@/lib/jewelry";
import { cn } from "@/lib/utils";

type Scale = "us" | "uk" | "eu" | "india";
const SCALES: { id: Scale; label: string }[] = [
  { id: "us", label: "US" },
  { id: "uk", label: "UK" },
  { id: "eu", label: "EU" },
  { id: "india", label: "IN" },
];

export function RingSizePicker({
  sizes,
  value,
  onChange,
  unavailable = new Set<number>(),
}: {
  sizes: RingSize[];
  value: number | null;
  onChange: (size: number) => void;
  unavailable?: Set<number>;
}) {
  const [scale, setScale] = useState<Scale>("us");
  const selected = sizes.find((s) => s.us === value);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[13px] text-ink">
          Ring size{" "}
          {selected && (
            <span className="text-muted">
              · US {selected.us} · {selected.diameterMm} mm inside
            </span>
          )}
        </p>
        <div className="flex items-center gap-3">
          <div className="flex overflow-hidden rounded-full border border-line text-[11px]" role="radiogroup" aria-label="Size system">
            {SCALES.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={scale === s.id} onClick={() => setScale(s.id)} className={cn("px-2.5 py-1 transition-colors", scale === s.id ? "bg-ink text-ivory" : "text-ink-soft hover:bg-parchment")}>
                {s.label}
              </button>
            ))}
          </div>
          <SizeGuide />
        </div>
      </div>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8" role="radiogroup" aria-label="Ring size">
        {sizes.map((s) => {
          const off = unavailable.has(s.us);
          return (
            <button
              key={s.us}
              type="button"
              role="radio"
              aria-checked={value === s.us}
              aria-label={`US ${s.us}, UK ${s.uk}, EU ${s.eu}${off ? " (sold out)" : ""}`}
              disabled={off}
              onClick={() => onChange(s.us)}
              className={cn(
                "h-10 rounded-[2px] border text-[13px] tabular transition-colors",
                value === s.us ? "border-ink bg-ink text-ivory" : "border-line bg-porcelain text-ink hover:border-ink/50",
                off && "cursor-not-allowed text-line-strong line-through hover:border-line",
              )}
            >
              {scale === "us" ? s.us : scale === "uk" ? s.uk : scale === "eu" ? s.eu : s.india}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SizeGuide() {
  return (
    <Dialog>
      <DialogTrigger className="inline-flex items-center gap-1 text-[12.5px] text-ink underline underline-offset-4">
        <Ruler className="size-3.5" /> Size guide
      </DialogTrigger>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Ring size guide</DialogTitle>
          <DialogDescription>Sizes vary between countries. Match your inside diameter or circumference to the chart.</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-8 md:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4 text-[14px] text-ink-soft">
            <div>
              <p className="caps mb-1.5 text-ink">From a ring you own</p>
              <p>Measure the inside diameter of a ring that fits the right finger, edge to edge, in millimetres. Find the closest diameter in the chart.</p>
            </div>
            <div>
              <p className="caps mb-1.5 text-ink">With a strip of paper</p>
              <p>Wrap a strip snugly around the base of your finger, mark where it overlaps and measure the length — that is your circumference.</p>
            </div>
            <div>
              <p className="caps mb-1.5 text-ink">Tips from our jewelers</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Measure at the end of the day, when fingers are largest.</li>
                <li>For bands wider than 5 mm, go up a quarter to half size.</li>
                <li>Between sizes? Choose the larger — most rings can be sized down.</li>
              </ul>
            </div>
          </div>
          <div className="max-h-[55vh] overflow-y-auto">
            <Table>
              <thead className="sticky top-0 bg-ivory">
                <tr>
                  <Th>US</Th>
                  <Th>UK</Th>
                  <Th>EU</Th>
                  <Th>India</Th>
                  <Th>Diameter</Th>
                  <Th>Circ.</Th>
                </tr>
              </thead>
              <tbody>
                {RING_SIZES.map((s) => (
                  <tr key={s.us}>
                    <Td className="py-2">{s.us}</Td>
                    <Td className="py-2">{s.uk}</Td>
                    <Td className="py-2">{s.eu}</Td>
                    <Td className="py-2">{s.india}</Td>
                    <Td className="py-2 font-mono text-[12px]">{s.diameterMm} mm</Td>
                    <Td className="py-2 font-mono text-[12px]">{s.circumferenceMm} mm</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
