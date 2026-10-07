"use client";

import Link from "next/link";
import { ArrowRight, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./video-showcase.module.css";

export function VideoShowcase() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const manuallyPaused = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const stage = stageRef.current;
    if (!video || !stage) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let disposed = false;
    const syncPlayback = () => {
      setReducedMotion(preference.matches);
      if (preference.matches) setRevealed(true);
      if (visible && !preference.matches && !manuallyPaused.current && !video.ended) {
        void video.play().catch(() => { if (!disposed) setRevealed(true); });
      } else video.pause();
    };
    video.muted = true;
    video.defaultMuted = true;
    video.pause();
    syncPlayback();
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
      syncPlayback();
    }, { threshold: [0, 0.35] });
    observer.observe(stage);
    preference.addEventListener("change", syncPlayback);
    video.addEventListener("loadeddata", syncPlayback);
    return () => {
      disposed = true;
      observer.disconnect();
      preference.removeEventListener("change", syncPlayback);
      video.removeEventListener("loadeddata", syncPlayback);
      video.pause();
    };
  }, []);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      manuallyPaused.current = false;
      void video.play().catch(() => setRevealed(true));
    } else {
      manuallyPaused.current = true;
      video.pause();
      setRevealed(true);
    }
  }

  return (
    <section id="fine-jewelry-film" className={styles.section} data-message={revealed ? "visible" : "pending"} aria-labelledby="film-heading">
      <div ref={stageRef} className={styles.stage}>
        <video ref={videoRef} className={styles.video} src="/media/fine-jewelry-campaign-edited.mp4"
          width={1280} height={720} autoPlay muted playsInline preload="auto"
          aria-label="Loupe jewelry campaign featuring a diamond necklace, earrings and ring"
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            // The 5.83s edit skips the source dissolve. Reveal in its closing 2.2s.
            if (Number.isFinite(video.duration) && video.currentTime >= Math.max(0, video.duration - 2.2)) setRevealed(true);
          }}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setRevealed(true); }}
          onError={() => { setFailed(true); setRevealed(true); }}
        />
        <div className={styles.wash} aria-hidden="true" />
        {!reducedMotion && !failed && <button type="button" className={styles.playback} onClick={togglePlayback} aria-label={playing ? "Pause jewelry film" : "Play jewelry film"}>
          {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
        </button>}
      </div>
      <div className={styles.copy} inert={!revealed}>
        <p className={`caps ${styles.eyebrow}`}>Discover fine jewelry</p>
        <h2 id="film-heading" className={styles.heading}>
          <span className={styles.firstLine}>Made to be found.</span>
          <span className={styles.secondLine}>Made to be yours.</span>
        </h2>
        <p className={styles.description}>
          <span className={styles.desktop}>Discover remarkable pieces from independent jewelers, trusted ateliers, and designers from around the world.</span>
          <span className={styles.mobile}>Discover remarkable pieces from independent jewelers around the world.</span>
        </p>
        <Link href="/shop" className={`link-quiet ${styles.cta}`}>
          <span className={styles.desktop}>Explore the marketplace</span>
          <span className={styles.mobile}>Explore</span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
