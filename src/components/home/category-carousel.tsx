"use client";

import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import styles from "./category-carousel.module.css";

interface CategoryItem {
  slug: string;
  name: string;
  imageUrl: string | null;
  count?: number;
}

interface CategoryCarouselProps {
  categories: CategoryItem[];
}

// Curated 4K / HD editorial jewelry photography on luxury studio backdrops
const CATEGORY_HD_IMAGES: Record<string, string> = {
  rings: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1200&q=85",
  necklaces: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&q=85",
  earrings: "https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=1200&q=85",
  bracelets: "https://images.unsplash.com/photo-1611652032931-10fc009c980a?auto=format&fit=crop&w=1200&q=85",
  "high-jewelry": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&q=85",
  vintage: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=1200&q=85",
};

// Repeat the array 5 times to enable seamless infinite circular wrapping
const REPEATS = 5;

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  rings: "A promise, a milestone, a little everyday brilliance. Find the ring that tells your story.",
  necklaces: "Delicate chains and extraordinary pendants. Discover a piece to keep close.",
  earrings: "From quiet sparkle to a statement silhouette. The finishing touch, beautifully considered.",
  bracelets: "Precious details for every gesture. Explore fine chains, sculptural cuffs and timeless bracelets.",
  "high-jewelry": "Exceptional stones. Remarkable craftsmanship. Discover jewelry with an extraordinary presence.",
  vintage: "Treasures with a past and a future. Discover distinctive pieces ready for their next chapter.",
};

export function CategoryCarousel({ categories }: CategoryCarouselProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const expandedHeadingId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const originRef = useRef<DOMRect | null>(null);
  const originFocusRef = useRef<HTMLAnchorElement | null>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const n = categories.length;
  const middleSetOffset = Math.floor(REPEATS / 2) * n;

  const [isInView, setIsInView] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<CategoryItem | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [activeNormalizedIndex, setActiveNormalizedIndex] = useState(0);
  const [currentVirtualIndex, setCurrentVirtualIndex] = useState(middleSetOffset);
  const isScrollingProgrammatically = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // Trigger one-by-one entrance animation when section enters viewport
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!expandedCategory) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const origin = originRef.current;
    if (origin) {
      dialog.style.setProperty("--expand-x", `${origin.x + origin.width / 2 - window.innerWidth / 2}px`);
      dialog.style.setProperty("--expand-y", `${origin.y + origin.height / 2 - window.innerHeight / 2}px`);
      dialog.style.setProperty("--expand-scale-x", String(origin.width / dialog.offsetWidth));
      dialog.style.setProperty("--expand-scale-y", String(origin.height / dialog.offsetHeight));
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = originalOverflow;
    };
  }, [expandedCategory]);

  const closeExpanded = useCallback(() => {
    if (closeTimeout.current) return;
    setIsClosing(true);
    closeTimeout.current = setTimeout(() => {
      dialogRef.current?.close();
      originFocusRef.current?.focus({ preventScroll: true });
      setExpandedCategory(null);
      setIsClosing(false);
      setIsInteracting(false);
      closeTimeout.current = null;
    }, reducedMotion ? 0 : 220);
  }, [reducedMotion]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Flatten repeated items with unique keys and HD imagery
  const repeatedItems = Array.from({ length: REPEATS }).flatMap((_, setIdx) =>
    categories.map((c, itemIdx) => ({
      ...c,
      virtualIndex: setIdx * n + itemIdx,
      originalIndex: itemIdx,
      isInitialSet: setIdx === Math.floor(REPEATS / 2),
      uniqueKey: `${c.slug}-set${setIdx}-${itemIdx}`,
      displayImage: CATEGORY_HD_IMAGES[c.slug] || c.imageUrl || CATEGORY_HD_IMAGES.rings,
    }))
  );

  // Center a specific virtual card into viewport and stop cleanly
  const scrollToVirtualIndex = useCallback(
    (virtualIdx: number, behavior: ScrollBehavior = "smooth") => {
      const container = containerRef.current;
      if (!container) return;

      const card = container.querySelector<HTMLElement>(`[data-virtual-index="${virtualIdx}"]`);
      if (!card) return;

      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const containerCenter = container.clientWidth / 2;
      const targetScrollLeft = cardCenter - containerCenter;

      // Immediately set the active index so zoom & upright posture trigger instantly with zero lag
      isScrollingProgrammatically.current = true;
      setCurrentVirtualIndex(virtualIdx);
      setActiveNormalizedIndex(((virtualIdx % n) + n) % n);

      container.scrollTo({
        left: targetScrollLeft,
        behavior: reducedMotion ? "instant" : behavior,
      });

      // Release lock after smooth scroll animation settles
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        isScrollingProgrammatically.current = false;
        if (virtualIdx < n || virtualIdx >= (REPEATS - 1) * n) {
          const centered = middleSetOffset + ((virtualIdx % n) + n) % n;
          const middleCard = container.querySelector<HTMLElement>(`[data-virtual-index="${centered}"]`);
          if (middleCard) {
            container.scrollTo({ left: middleCard.offsetLeft + middleCard.offsetWidth / 2 - container.clientWidth / 2, behavior: "instant" });
            setCurrentVirtualIndex(centered);
          }
        }
      }, 380);
    },
    [n, middleSetOffset, reducedMotion]
  );

  // Initialize scroll position to the center set once on mount
  useEffect(() => {
    if (n === 0) return;
    const initialIndex = middleSetOffset;
    scrollToVirtualIndex(initialIndex, "instant" as ScrollBehavior);
  }, [middleSetOffset, n, scrollToVirtualIndex]);

  useEffect(() => {
    const recenter = () => scrollToVirtualIndex(currentVirtualIndex, "instant");
    window.addEventListener("resize", recenter);
    return () => window.removeEventListener("resize", recenter);
  }, [currentVirtualIndex, scrollToVirtualIndex]);

  // Handle auto infinite wrap repositioning and real-time active center tracking
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || n === 0) return;

    // Suppress intermediate calculation while programmatic smooth scroll is active
    if (isScrollingProgrammatically.current) return;

    const containerCenter = container.scrollLeft + container.clientWidth / 2;
    const cards = container.querySelectorAll<HTMLElement>("[data-virtual-index]");
    let closestCard: HTMLElement | null = null;
    let minDistance = Infinity;

    cards.forEach((card) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(containerCenter - cardCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestCard = card;
      }
    });

    if (closestCard) {
      const vIdx = parseInt((closestCard as HTMLElement).dataset.virtualIndex || "0", 10);
      const normIdx = ((vIdx % n) + n) % n;
      if (vIdx !== currentVirtualIndex) {
        setCurrentVirtualIndex(vIdx);
        setActiveNormalizedIndex(normIdx);
      }
    }

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      if (closestCard) {
        const vIdx = parseInt((closestCard as HTMLElement).dataset.virtualIndex || "0", 10);
        const normIdx = ((vIdx % n) + n) % n;

        // If user scrolled near the edge repeat boundaries, silently reset to middle set
        if (vIdx < n || vIdx >= (REPEATS - 1) * n) {
          const recenteredVirtualIdx = middleSetOffset + normIdx;
          scrollToVirtualIndex(recenteredVirtualIdx, "instant" as ScrollBehavior);
        }
      }
    }, 120);
  }, [currentVirtualIndex, middleSetOffset, n, scrollToVirtualIndex]);

  const interactionTimer = useRef<NodeJS.Timeout | null>(null);

  const pauseTemporarily = useCallback((durationMs = 7000) => {
    setIsInteracting(true);
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
    interactionTimer.current = setTimeout(() => {
      setIsInteracting(false);
    }, durationMs);
  }, []);

  // Continuous auto circular loop rotation at 1s
  useEffect(() => {
    if (n < 2 || !isVisible || isPaused || isInteracting || reducedMotion || expandedCategory) return;
    const timer = setInterval(() => {
      if (!document.hidden) {
        scrollToVirtualIndex(currentVirtualIndex + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [n, isVisible, isPaused, isInteracting, reducedMotion, expandedCategory, currentVirtualIndex, scrollToVirtualIndex]);

  useEffect(() => () => {
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
  }, []);

  const handleNext = () => {
    pauseTemporarily(7000);
    const nextIdx = currentVirtualIndex >= REPEATS * n - 1 ? middleSetOffset : currentVirtualIndex + 1;
    scrollToVirtualIndex(nextIdx, "smooth");
  };

  const handlePrev = () => {
    pauseTemporarily(7000);
    const prevIdx = currentVirtualIndex <= 0 ? middleSetOffset + n - 1 : currentVirtualIndex - 1;
    scrollToVirtualIndex(prevIdx, "smooth");
  };

  // Center a side card first; expand the centered card before exploring its collection.
  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>, virtualIdx: number, isActive: boolean, category: CategoryItem) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    pauseTemporarily(7000);
    if (!isActive) {
      scrollToVirtualIndex(virtualIdx, "smooth");
    } else {
      originFocusRef.current = e.currentTarget;
      originRef.current = e.currentTarget.querySelector(`.${styles.frame}`)?.getBoundingClientRect() ?? null;
      setExpandedCategory(category);
    }
  };

  if (categories.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      aria-labelledby={headingId}
      aria-roledescription="carousel"
      data-expanded={expandedCategory ? "true" : undefined}
    >
      <div className={styles.studio} aria-hidden="true"><span /><span /><span /></div>
      {/* Scoped CSS for Entrance Staggered Bottom-to-Top Rise & Gold Shimmer */}
      <style>{`
        @keyframes loupeRiseBottom {
          0% {
            opacity: 0;
            transform: translateY(40px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes loupeGoldFlash {
          0% {
            opacity: 0;
            transform: translateY(140%) rotate(25deg);
          }
          30% {
            opacity: 0.95;
          }
          70% {
            opacity: 0.95;
          }
          100% {
            opacity: 0;
            transform: translateY(-140%) rotate(25deg);
          }
        }

        .loupe-stagger-card {
          opacity: 0;
          transform: translateY(40px);
        }

        .loupe-stagger-card.is-revealed {
          animation: loupeRiseBottom 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .loupe-gold-flash {
          animation: loupeGoldFlash 1.1s cubic-bezier(0.25, 1, 0.5, 1) both;
        }
      `}</style>

      {/* Header Container */}
      <div className={styles.heading}>
        <div className="flex flex-col items-center justify-center text-center">
          <p className="eyebrow mb-2.5 text-gold-deep">Discover your next heirloom</p>
          <h2 id={headingId} className="font-display text-[32px] leading-tight text-ink md:text-[46px]">
            Shop by Category
          </h2>
        </div>

        {/* Circular Left & Right Nav Buttons */}
        <div className="pointer-events-none absolute inset-x-4 top-1/2 flex -translate-y-1/2 items-center justify-between sm:inset-x-8 md:inset-x-12">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous category"
            className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-line-strong/60 bg-ivory/95 text-ink shadow-soft backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-gold hover:bg-ink hover:text-ivory active:scale-95"
          >
            <ChevronLeft className="size-5 stroke-[1.5]" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next category"
            className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-line-strong/60 bg-ivory/95 text-ink shadow-soft backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-gold hover:bg-ink hover:text-ivory active:scale-95"
          >
            <ChevronRight className="size-5 stroke-[1.5]" />
          </button>
        </div>
      </div>

      <div className={styles.stage}>
      <div className={styles.orbit} aria-hidden="true" />
      {/* Infinite Horizontal Scroll Track with Refined 3D Circular Arc */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={cn("scrollbar-none", styles.track)}
        style={{
          scrollPadding: "0 calc(50vw - 150px)",
          perspective: "1400px",
          perspectiveOrigin: "center center",
        }}
      >
        {repeatedItems.map((c) => {
          const offset = c.virtualIndex - currentVirtualIndex;
          const absOffset = Math.abs(offset);
          const isActive = absOffset === 0;

          // Gentle luxury circular curvature and elevation
          let scale = 0.74;
          let translateY = 36;
          let rotateY = offset < 0 ? 16 : -16;
          let opacity = 0.35;
          let zIndex = 5;

          if (absOffset === 0) {
            scale = 1.08;
            translateY = 0;
            rotateY = 0;
            opacity = 1;
            zIndex = 30;
          } else if (absOffset === 1) {
            scale = 0.94;
            translateY = 14;
            rotateY = offset < 0 ? 8 : -8;
            opacity = 0.85;
            zIndex = 20;
          } else if (absOffset === 2) {
            scale = 0.84;
            translateY = 26;
            rotateY = offset < 0 ? 14 : -14;
            opacity = 0.58;
            zIndex = 10;
          }

          const staggerDelay = `${c.originalIndex * 120}ms`;
          const flashDelay = `${c.originalIndex * 120 + 320}ms`;

          return (
            <div
              key={c.uniqueKey}
              data-virtual-index={c.virtualIndex}
              className={cn(
                styles.card,
                c.isInitialSet && "loupe-stagger-card",
                c.isInitialSet && isInView && "is-revealed"
              )}
              style={
                c.isInitialSet
                  ? {
                      animationDelay: staggerDelay,
                    }
                  : undefined
              }
            >
              {/* 3D Circular Arc Wrapper with Zoom & Curvature */}
              <div
                className={styles.arc}
                style={{
                  transform: `translateY(${translateY}px) scale(${scale}) rotateY(${rotateY}deg)`,
                  opacity,
                  zIndex,
                  transformStyle: "preserve-3d",
                }}
              >
                <Link
                  href={`/shop/${c.slug}`}
                  onClick={(e) => handleCardClick(e, c.virtualIndex, isActive, c)}
                  className={cn("group", styles.link)}
                  tabIndex={absOffset <= 2 ? 0 : -1}
                  aria-current={isActive ? "true" : undefined}
                  aria-haspopup="dialog"
                  aria-label={`Preview ${c.name}`}
                >
                  {/* Outer Frame with Arched Border */}
                  <div
                    className={cn(
                      styles.frame,
                      isActive
                        ? "bg-gradient-to-b from-[#f0d8a8] via-[#cda260] to-[#8a6835] shadow-[0_20px_50px_-10px_rgba(168,134,79,0.48)]"
                        : "bg-gradient-to-b from-[#d5c3ab]/60 via-[#c4b197]/40 to-[#baa58a]/30 shadow-soft hover:bg-gradient-to-b hover:from-[#e5ca93]/80 hover:via-[#b58f55]/60 hover:to-[#785b30]/50 hover:shadow-[0_12px_30px_-8px_rgba(168,134,79,0.3)]"
                    )}
                  >
                    {/* Gold Flash Light Beam Effect on Reveal */}
                    {c.isInitialSet && isInView && (
                      <div
                        className="pointer-events-none absolute inset-x-0 -inset-y-12 z-20 bg-gradient-to-b from-transparent via-white/90 via-45% to-transparent loupe-gold-flash"
                        style={{ animationDelay: flashDelay }}
                      />
                    )}

                    {/* Active Halo Shimmer */}
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-0 rounded-full transition-opacity duration-550 z-10",
                        isActive
                          ? "opacity-100 ring-1 ring-gold-mist/70"
                          : "opacity-0 group-hover:opacity-70 ring-1 ring-gold-mist/40"
                      )}
                    />

                    {/* Arched Image Container with HD Jewelry Imagery */}
                    <div className={styles.image}>
                      <Image
                        src={c.displayImage}
                        alt={c.name}
                        fill
                        sizes="(min-width: 1440px) 260px, (min-width: 768px) 20vw, 200px"
                        className={cn(
                          "object-cover transition-transform duration-700 ease-silk",
                          isActive ? "scale-104" : "group-hover:scale-108"
                        )}
                        priority={c.isInitialSet}
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/20 via-transparent to-transparent opacity-50 transition-opacity duration-500 group-hover:opacity-15" />
                    </div>
                  </div>

                  {/* Category Text & Action */}
                  <div className={styles.caption}>
                    <p
                      className={cn(
                        "font-display text-[22px] text-ink transition-colors duration-300 md:text-[26px]",
                        isActive ? "text-ink" : "text-ink-soft group-hover:text-ink"
                      )}
                    >
                      {c.name}
                    </p>

                    {/* Active Indicator Underline */}
                    <div
                      className={cn(
                        "mt-1 h-[1.5px] bg-gold-deep transition-all duration-500 ease-silk",
                        isActive ? "w-14 opacity-100" : "w-0 opacity-0 group-hover:w-10 group-hover:opacity-70"
                      )}
                    />

                    {/* Explore CTA */}
                    <span
                      className={cn(
                        "caps mt-2 inline-flex items-center gap-1 text-[11px] font-medium tracking-wider text-gold-deep transition-all duration-500 ease-silk",
                        isActive
                          ? "translate-y-0 opacity-100"
                          : "-translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
                      )}
                    >
                      Discover {c.name} →
                    </span>
                  </div>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      </div>

      {/* Luxury Progress Bar Track */}
      <div className={styles.footer}>
        <div className="relative h-[2px] w-48 overflow-hidden rounded-full bg-line-strong/40">
          <div
            className="h-full bg-gold-deep transition-transform duration-500 ease-silk"
            style={{
              width: `${100 / n}%`,
              transform: `translateX(${activeNormalizedIndex * 100}%)`,
            }}
          />
        </div>
        {!reducedMotion && <button type="button" className={styles.playback} onClick={() => setIsPaused((paused) => !paused)} aria-label={isPaused ? "Resume automatic rotation" : "Pause automatic rotation"}>
          {isPaused ? <Play size={13} /> : <Pause size={13} />}
        </button>}
      </div>
      {expandedCategory && <dialog
        ref={dialogRef}
        className={styles.expanded}
        data-closing={isClosing ? "true" : undefined}
        aria-labelledby={expandedHeadingId}
        onCancel={(event) => { event.preventDefault(); closeExpanded(); }}
      >
        <Image src={CATEGORY_HD_IMAGES[expandedCategory.slug] || expandedCategory.imageUrl || CATEGORY_HD_IMAGES.rings} alt={expandedCategory.name} fill sizes="(min-width: 768px) 820px, 95vw" className={styles.expandedImage} />
        <div className={styles.expandedShade} />
        <button type="button" className={styles.close} aria-label="Close category preview" onClick={closeExpanded} autoFocus><X size={18} /></button>
        <div className={styles.expandedCopy}>
          <p className={styles.expandedEyebrow}>The Loupe collection</p>
          <h3 id={expandedHeadingId}>{expandedCategory.name}</h3>
          <p>{CATEGORY_DESCRIPTIONS[expandedCategory.slug] ?? "Discover beautifully considered jewelry from independent jewelers."}</p>
          <Link href={`/shop/${expandedCategory.slug}`} className={styles.explore}>Explore {expandedCategory.name} <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
      </dialog>}
    </section>
  );
}
