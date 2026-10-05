"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./story.module.css";

export function AtelierVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const manuallyPaused = useRef(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const syncPlayback = () => {
      if (visible && !manuallyPaused.current && !motion.matches && !document.hidden) {
        video.play().catch(() => setPlaying(false));
      } else { video.pause(); }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncPlayback();
    }, { threshold: 0.25 });
    observer.observe(video);
    video.addEventListener("loadeddata", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    motion.addEventListener("change", syncPlayback);
    return () => {
      observer.disconnect();
      video.removeEventListener("loadeddata", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
      motion.removeEventListener("change", syncPlayback);
      video.pause();
    };
  }, []);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      manuallyPaused.current = false;
      video.play().catch(() => setPlaying(false));
    } else {
      manuallyPaused.current = true;
      video.pause();
    }
  }

  return (
    <div className={styles.media}>
      <video ref={videoRef} autoPlay muted loop playsInline preload="metadata" poster="/media/atelier-story-poster.jpg" aria-label="A jeweler opens an ivory presentation box to reveal a diamond ring" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}>
        <source src="/media/atelier-story.mp4" type="video/mp4" />
      </video>
      <button type="button" className={styles.playback} aria-label={playing ? "Pause atelier video" : "Play atelier video"} onClick={togglePlayback}>
        {playing ? <Pause size={17} strokeWidth={1.5} aria-hidden /> : <Play size={17} strokeWidth={1.5} aria-hidden />}
      </button>
    </div>
  );
}
