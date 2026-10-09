"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import imageLoader from "@/lib/image-loader";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };

/**
 * The Loupe signature: a jeweler's lens that magnifies the photograph beneath
 * it. It follows a mouse, rests on a focal point for touch and reduced-motion
 * users, and maps correctly onto `object-cover` crops.
 */
export function LoupeImage({
  src,
  alt,
  focus = { x: 0.5, y: 0.5 },
  zoom = 2.4,
  lensSize = 200,
  priority,
  sizes = "100vw",
  className,
  imageClassName,
  fit = "cover",
  showLens = "always",
  caption,
  children,
}: {
  src: string;
  alt: string;
  focus?: Point;
  zoom?: number;
  lensSize?: number;
  priority?: boolean;
  sizes?: string;
  className?: string;
  imageClassName?: string;
  fit?: "cover" | "contain";
  /** "always" rests the lens on `focus`; "hover" only shows it under a mouse. */
  showLens?: "always" | "hover";
  caption?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [pos, setPos] = useState<Point>(focus);
  const [tracking, setTracking] = useState(false);
  const [finePointer, setFinePointer] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setBox({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    const mq = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    setFinePointer(mq.matches);
    const onChange = () => setFinePointer(mq.matches);
    mq.addEventListener("change", onChange);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", onChange);
    };
  }, []);

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!finePointer || e.pointerType !== "mouse") return;
      const r = e.currentTarget.getBoundingClientRect();
      setTracking(true);
      setPos({ x: Math.min(0.97, Math.max(0.03, (e.clientX - r.left) / r.width)), y: Math.min(0.97, Math.max(0.03, (e.clientY - r.top) / r.height)) });
    },
    [finePointer],
  );

  const onLeave = useCallback(() => {
    setTracking(false);
    setPos(focus);
  }, [focus]);

  // Geometry of the object-cover rendered image inside the box.
  const ready = box.w > 0 && natural.w > 0;
  const scale = ready ? (fit === "contain" ? Math.min : Math.max)(box.w / natural.w, box.h / natural.h) : 1;
  const rw = natural.w * scale;
  const rh = natural.h * scale;
  const ox = (box.w - rw) / 2;
  const oy = (box.h - rh) / 2;
  const size = box.w < 640 ? Math.round(lensSize * 0.7) : lensSize;
  const cx = pos.x * box.w;
  const cy = pos.y * box.h;
  // Resting lens only where there is room for it beside the content (desktop).
  const visible = ready && ((showLens === "always" && box.w >= 1024) || tracking);
  const hiRes = imageLoader({ src, width: 2400, quality: 80 });

  return (
    <div ref={ref} className={cn("relative overflow-hidden", finePointer && tracking && "cursor-none", className)} onPointerMove={onMove} onPointerLeave={onLeave}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={cn(fit === "contain" ? "object-contain" : "object-cover", imageClassName)}
        onLoad={(e) => {
          const img = e.currentTarget;
          setNatural({ w: img.naturalWidth, h: img.naturalHeight });
        }}
      />
      {children}
      <div
        aria-hidden
        className={cn("pointer-events-none absolute rounded-full transition-opacity duration-300", visible ? "opacity-100" : "opacity-0")}
        style={{
          width: size,
          height: size,
          left: cx - size / 2,
          top: cy - size / 2,
          backgroundImage: ready ? `url("${hiRes}")` : undefined,
          backgroundRepeat: "no-repeat",
          backgroundSize: `${rw * zoom}px ${rh * zoom}px`,
          backgroundPosition: `${-((cx - ox) * zoom - size / 2)}px ${-((cy - oy) * zoom - size / 2)}px`,
          boxShadow: "0 0 0 1px rgba(168,134,79,.9), 0 0 0 6px rgba(250,247,242,.72), 0 0 0 7px rgba(168,134,79,.35), 0 18px 40px -12px rgba(47,44,40,.45)",
          transition: tracking ? "opacity .3s" : "left .7s cubic-bezier(.22,1,.36,1), top .7s cubic-bezier(.22,1,.36,1), background-position .7s cubic-bezier(.22,1,.36,1), opacity .3s",
        }}
      >
        {caption && (
          <span className="absolute top-full left-1/2 mt-4 -translate-x-1/2 rounded-full bg-ivory/90 px-3 py-1 font-mono text-[10px] tracking-[0.14em] whitespace-nowrap text-ink-soft uppercase backdrop-blur-sm">
            {caption}
          </span>
        )}
      </div>
    </div>
  );
}
