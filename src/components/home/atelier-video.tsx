"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./story.module.css";

export function AtelierVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const manuallyPaused = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let readyToPlay = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const syncPlayback = () => {
      if (visible && readyToPlay && !manuallyPaused.current && !motion.matches && !document.hidden && !video.ended) {
        void video.play().catch(() => setPlaying(false));
      } else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
      if (visible && !readyToPlay && !timer) {
        timer = setTimeout(() => { readyToPlay = true; timer = undefined; syncPlayback(); }, 750);
      }
      syncPlayback();
    }, { threshold: [0, 0.25] });
    observer.observe(video);
    video.addEventListener("loadeddata", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    motion.addEventListener("change", syncPlayback);
    return () => {
      if (timer) clearTimeout(timer);
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
      if (video.ended) video.currentTime = 0;
      void video.play().catch(() => setPlaying(false));
    } else {
      manuallyPaused.current = true;
      video.pause();
    }
  }

  return (
    <div className={styles.media}>
      <video ref={videoRef} muted playsInline preload="metadata" poster="/media/bracelet-unboxing-poster.png" aria-label="A presentation box opens to reveal a floating diamond bracelet" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setFailed(true)}>
        <source src="/media/bracelet-unboxing.mp4" type="video/mp4" />
      </video>
      {failed ? <p className={styles.videoError} role="status">The bracelet video could not load. Please refresh to try again.</p> : <button type="button" className={styles.playback} aria-label={playing ? "Pause bracelet video" : "Play bracelet video"} onClick={togglePlayback}>
        {playing ? <Pause size={17} strokeWidth={1.5} aria-hidden /> : <Play size={17} strokeWidth={1.5} aria-hidden />}
      </button>}
    </div>
  );
}