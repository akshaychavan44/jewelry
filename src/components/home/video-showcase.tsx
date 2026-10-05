"use client";

import { useEffect, useRef } from "react";

export function VideoShowcase() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Automatically plays smoothly when in viewport, pauses when scrolled away
  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;

    // Ensure audio is strictly muted
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="shell py-10 md:py-16"
      aria-label="Loupe Fine Jewelry Video Showcase"
    >
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[24px] border border-line-strong/60 bg-[#FAF7F2] p-[2px] shadow-[0_20px_60px_-15px_rgba(47,44,40,0.15)] md:rounded-[34px]">
        {/* Clean HD Video Frame */}
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[22px] bg-black md:rounded-[32px]">
          <video
            ref={videoRef}
            src="/media/landing-video.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}

