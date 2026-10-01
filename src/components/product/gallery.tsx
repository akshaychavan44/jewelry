"use client";

import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { LoupeImage } from "@/components/brand/loupe-image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type GalleryImage = { url: string; alt: string | null; angle: string | null };

export function ProductGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const current = images[index] ?? images[0];
  const step = (d: number) => setIndex((i) => (i + d + images.length) % images.length);

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row md:gap-4">
      {images.length > 1 && (
        <div className="scrollbar-none flex gap-2.5 overflow-x-auto md:w-20 md:flex-col md:overflow-visible" role="tablist" aria-label="Views">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={img.angle ?? `View ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn("relative aspect-square w-16 shrink-0 overflow-hidden bg-sand transition md:w-full", i === index ? "ring-1 ring-ink ring-offset-2 ring-offset-ivory" : "opacity-70 hover:opacity-100")}
            >
              <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="relative flex-1">
        <LoupeImage
          key={current.url}
          src={current.url}
          alt={current.alt ?? title}
          priority
          showLens="hover"
          zoom={2.3}
          lensSize={230}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="aspect-square bg-sand md:aspect-[4/5]"
        />
        {current.angle && <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-ivory/85 px-3 py-1 text-[11px] tracking-[0.12em] text-ink-soft uppercase backdrop-blur-sm">{current.angle}</span>}
        <button type="button" onClick={() => setOpen(true)} className="absolute right-3 bottom-3 grid size-10 place-items-center rounded-full bg-ivory/85 text-ink backdrop-blur-sm transition hover:bg-ivory" aria-label="Open full-screen viewer">
          <Expand className="size-4" strokeWidth={1.6} />
        </button>
        {images.length > 1 && (
          <div className="absolute inset-y-0 right-0 left-0 flex items-center justify-between px-2 md:hidden">
            <button type="button" onClick={() => step(-1)} className="grid size-9 place-items-center rounded-full bg-ivory/80" aria-label="Previous view">
              <ChevronLeft className="size-4" />
            </button>
            <button type="button" onClick={() => step(1)} className="grid size-9 place-items-center rounded-full bg-ivory/80" aria-label="Next view">
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
        <p className="mt-3 hidden text-center text-[12px] text-muted md:block">Hover to examine under the loupe · click the corner icon to go full screen</p>
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          setZoomed(false);
        }}
      >
        <DialogContent size="xl" className="h-[calc(100dvh-2rem)] max-w-[min(1200px,calc(100vw-2rem))] bg-porcelain">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <div
            className={cn("relative flex-1 overflow-hidden", zoomed ? "cursor-zoom-out" : "cursor-zoom-in")}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
              setZoomed((z) => !z);
            }}
            onMouseMove={(e) => {
              if (!zoomed) return;
              const r = e.currentTarget.getBoundingClientRect();
              setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
            }}
          >
            <Image
              src={current.url}
              alt={current.alt ?? title}
              fill
              sizes="100vw"
              quality={90}
              className="object-contain transition-transform duration-300"
              style={{ transform: zoomed ? "scale(2.5)" : "scale(1)", transformOrigin: origin }}
            />
          </div>
          {images.length > 1 && (
            <div className="flex items-center justify-center gap-4 border-t border-line py-3">
              <button type="button" onClick={() => step(-1)} className="grid size-9 place-items-center rounded-full hover:bg-parchment" aria-label="Previous view">
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-[13px] text-muted">
                {index + 1} / {images.length}
              </span>
              <button type="button" onClick={() => step(1)} className="grid size-9 place-items-center rounded-full hover:bg-parchment" aria-label="Next view">
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
