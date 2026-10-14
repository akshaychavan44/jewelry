"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./sell-hero.module.css";

export function JewelerHeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const manuallyPaused = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => {
      if (visible && !motion.matches && !document.hidden && !manuallyPaused.current) {
        void video.play().catch(() => setPlaying(false));
      } else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(video);
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      video.pause();
    };
  }, []);

  function togglePlayback() {
    const video = ref.current;
    if (!video) return;
    manuallyPaused.current = !video.paused;
    if (video.paused) void video.play().catch(() => setPlaying(false));
    else video.pause();
  }

  return (
    <>
      <svg className="sr-only" aria-hidden="true" focusable="false" style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <filter id="cleanBlackRing" colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncR type="linear" slope="1.5" intercept="-0.32" />
              <feFuncG type="linear" slope="1.5" intercept="-0.32" />
              <feFuncB type="linear" slope="1.5" intercept="-0.32" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>
      <div className={styles.media} aria-hidden="true">
        <video ref={ref} loop muted playsInline preload="auto" poster="/media/for-jewelers-hero.jpg" className={styles.video} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setFailed(true)}>
          <source src="/media/gemini_generated_video_932f8c86.mp4" type="video/mp4" />
          <source src="/media/for-jewelers-hero.mp4" type="video/mp4" />
        </video>
      </div>
      {!failed && <button type="button" className={styles.playback} onClick={togglePlayback} aria-label={playing ? "Pause ring video" : "Play ring video"}>
        {playing ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
      </button>}
    </>
  );
}
