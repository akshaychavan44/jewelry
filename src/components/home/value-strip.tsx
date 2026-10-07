"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Gem, Ruler, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const VALUES = [
  {
    icon: Store,
    title: "INDEPENDENT ATELIERS",
    body: "Small houses and family workshops — never a factory floor.",
    image: "https://images.unsplash.com/photo-1531995811006-35cb42e1a022?auto=format&fit=crop&w=600&q=85",
    alt: "Jeweler working at an independent atelier bench with loupe",
  },
  {
    icon: Gem,
    title: "OFTEN ONE OF A KIND",
    body: "Antique, bespoke and single-stone pieces you won't see twice.",
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=85",
    alt: "Unique blue sapphire and diamond halo ring on travertine stone",
  },
  {
    icon: Ruler,
    title: "MADE TO YOUR MEASURE",
    body: "Sized, engraved and adjusted by the jeweler who made it.",
    image: "https://images.unsplash.com/photo-1628926379972-9843ad139a8c?auto=format&fit=crop&w=600&q=85",
    alt: "Craftsman hand holding caliper measuring engraved gold ring band",
  },
];

export function ValueStrip() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const updateMotion = () => setReducedMotion(query.matches);
    query.addEventListener("change", updateMotion);
    return () => query.removeEventListener("change", updateMotion);
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden border-y border-[#e6dcce] bg-[#FAF7F2] py-8 md:py-10"
      aria-label="Our Values"
    >
      <div className="mx-auto w-full max-w-[1720px] px-4 sm:px-6 md:px-10 lg:px-14">
        {/* Single continuous horizontal straight-line strip */}
        <div className="relative grid grid-cols-1 md:grid-cols-3">
          {VALUES.map(({ icon: Icon, title, body, image, alt }, index) => {
            // 0: Left, 1: Center, 2: Right
            const isCenter = index === 1;
            const isLeft = index === 0;
            const isRight = index === 2;

            let transformStyle: React.CSSProperties = {};

            if (reducedMotion) {
              transformStyle = { opacity: 1, transform: "none", zIndex: 1 };
            } else if (!isRevealed) {
              if (isCenter) {
                transformStyle = {
                  opacity: 0,
                  transform: "scale(0.96) translateY(12px)",
                  zIndex: 20,
                  transition: "none",
                };
              } else if (isLeft) {
                transformStyle = {
                  opacity: 0,
                  transform: "translateX(100%) scale(0.96)",
                  zIndex: 10,
                  transition: "none",
                };
              } else if (isRight) {
                transformStyle = {
                  opacity: 0,
                  transform: "translateX(-100%) scale(0.96)",
                  zIndex: 10,
                  transition: "none",
                };
              }
            } else {
              // Revealed state with slow, clean, luxury deceleration easing
              if (isCenter) {
                transformStyle = {
                  opacity: 1,
                  transform: "translateX(0) translateY(0) scale(1)",
                  zIndex: 20,
                  transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.9s ease",
                };
              } else if (isLeft) {
                transformStyle = {
                  opacity: 1,
                  transform: "translateX(0) scale(1)",
                  zIndex: 10,
                  transition: "transform 1.45s cubic-bezier(0.16, 1, 0.3, 1) 0.32s, opacity 1.1s ease 0.32s",
                };
              } else if (isRight) {
                transformStyle = {
                  opacity: 1,
                  transform: "translateX(0) scale(1)",
                  zIndex: 10,
                  transition: "transform 1.45s cubic-bezier(0.16, 1, 0.3, 1) 0.32s, opacity 1.1s ease 0.32s",
                };
              }
            }

            return (
              <div
                key={title}
                style={transformStyle}
                className={cn(
                  "group relative flex items-center gap-4.5 bg-[#FAF7F2] py-5 px-3 sm:gap-5 sm:px-5 md:py-3 lg:gap-6 lg:px-8",
                  // Subtle vertical dividers between columns that fade in cleanly
                  index > 0 && "border-t border-[#e6dcce] md:border-t-0 md:border-l md:border-[#e6dcce]"
                )}
              >
                <div className="relative size-[78px] shrink-0 overflow-hidden rounded-[14px] bg-sand sm:size-[88px] md:size-[96px] lg:size-[104px]">
                  <Image
                    src={image}
                    alt={alt}
                    fill
                    sizes="(min-width: 1280px) 104px, (min-width: 768px) 96px, 78px"
                    className="object-cover transition-transform duration-700 ease-silk group-hover:scale-105"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center pr-1">
                  <Icon className="size-5 stroke-[1.4] text-[#b58f55] sm:size-5.5 lg:size-6" aria-hidden />
                  <p className="caps mt-2 text-[12px] font-semibold tracking-wider text-ink sm:text-[12.5px] lg:text-[13px]">
                    {title}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink/80 sm:text-[13.5px] lg:text-[14px]">
                    {body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
