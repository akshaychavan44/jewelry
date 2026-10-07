"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./cinematic-hero.module.css";

export function CinematicHero({ jewelers }: { jewelers: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const manualRef = useRef(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const scene = sceneRef.current;
    const video = videoRef.current;
    if (!section || !scene || !video) return;

    if (typeof window !== "undefined" && "scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let visible = true;
    let current = 0;
    let target = 0;
    let lastTime = 0;
    let desiredTime = 0;
    let horizontalCrop = 0;
    let opening = !motion.matches;
    let ready = video.readyState >= 2;
    const clamp = (n: number) => Math.min(1, Math.max(0, n));
    const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
    const seek = () => {
      if (ready && !opening && !manualRef.current && !video.seeking && Math.abs(video.currentTime - desiredTime) > 0.025) video.currentTime = desiredTime;
    };
    const paint = () => {
      const skipOpacity = motion.matches ? 0 : 1 - ease((current - 0.85) / 0.1);
      scene.style.setProperty("--skip-opacity", String(skipOpacity));
      scene.style.setProperty("--progress", String(current));
      scene.style.setProperty("--prompt-opacity", String(1 - ease(current / 0.08)));
      const focus = 0.5 - 0.34 * ease((current - 0.17) / 0.15) + 0.56 * ease((current - 0.62) / 0.14);
      const xOffset = Math.round(-horizontalCrop * focus);
      video.style.transform = `translate3d(${xOffset}px, 0, 0)`;
      if (introRef.current) introRef.current.inert = current > 0.08;
      desiredTime = motion.matches ? 0 : 0.65 + current * Math.max(0, (Number.isFinite(video.duration) ? video.duration : 10) - 0.7);
      seek();
    };
    const animate = (time: number) => {
      frame = 0;
      const delta = lastTime ? Math.min(time - lastTime, 64) : 16;
      lastTime = time;
      current += (target - current) * (1 - Math.exp(-delta / 90));
      if (Math.abs(target - current) < 0.0002) current = target;
      paint();
      if (visible && current !== target) frame = requestAnimationFrame(animate);
    };
    const measure = () => {
      const top = Number.parseFloat(getComputedStyle(scene).top) || 0;
      const travel = section.offsetHeight - scene.offsetHeight;
      target = motion.matches || travel <= 0 ? 0 : clamp((top - section.getBoundingClientRect().top) / travel);
      const media = video.parentElement;
      const mediaHeight = media?.clientHeight ?? scene.clientHeight;
      const sceneWidth = scene.clientWidth;
      scene.style.setProperty("--media-height", `${mediaHeight}px`);
      // Cover the jewelry scene, excluding the header and footer recorded
      // inside the source clip (148px above and 84px below at 1080p).
      const sourceWidth = video.videoWidth || 1920;
      const sourceHeight = video.videoHeight || 1080;
      const cropTop = sourceHeight * (148 / 1080);
      const contentHeight = sourceHeight * (848 / 1080);
      // Exclude the rightmost 12% containing the embedded Gemini mark.
      const contentWidth = sourceWidth * 0.88;
      const scale = Math.max(sceneWidth / contentWidth, mediaHeight / contentHeight);
      const videoWidth = Math.ceil(sourceWidth * scale);
      const videoHeight = Math.ceil(sourceHeight * scale);
      horizontalCrop = Math.max(0, contentWidth * scale - sceneWidth);
      video.style.width = `${videoWidth}px`;
      video.style.height = `${videoHeight}px`;
      video.style.top = `${Math.floor((mediaHeight - contentHeight * scale) / 2 - cropTop * scale)}px`;
      if (motion.matches) {
        opening = false;
        manualRef.current = false;
        setPlaying(false);
        video.pause();
        current = 0;
        paint();
      } else if (visible && !frame) { lastTime = 0; frame = requestAnimationFrame(animate); }
    };
    const scroll = () => {
      opening = false;
      if (manualRef.current) { manualRef.current = false; setPlaying(false); }
      video.pause();
      measure();
    };
    const loaded = () => {
      ready = true;
      delete section.dataset.failed;
      section.dataset.mediaReady = "true";
      section.dataset.scrollReady = "true";
      measure();
      if (opening && target === 0) video.play().catch(() => { opening = false; paint(); });
      else { opening = false; paint(); }
    };
    const timeUpdate = () => {
      if (opening && video.currentTime >= 0.65) { opening = false; video.pause(); paint(); }
    };
    const failed = () => {
      if (!video.dataset.fallbackUsed) {
        video.dataset.fallbackUsed = "true";
        video.src = "/media/loupe-entrance.mp4";
        video.load();
        return;
      }
      section.dataset.scrollReady = "false";
      section.dataset.failed = "true";
      opening = false;
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) measure();
      else { video.pause(); manualRef.current = false; setPlaying(false); }
    });
    observer.observe(section);
    video.addEventListener("loadeddata", loaded);
    video.addEventListener("seeked", seek);
    video.addEventListener("timeupdate", timeUpdate);
    video.addEventListener("error", failed);
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", measure);
    motion.addEventListener("change", measure);
    measure();
    if (video.error) failed();
    else if (ready) loaded();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      video.pause();
      video.removeEventListener("loadeddata", loaded);
      video.removeEventListener("seeked", seek);
      video.removeEventListener("timeupdate", timeUpdate);
      video.removeEventListener("error", failed);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", measure);
      motion.removeEventListener("change", measure);
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.hero} aria-labelledby="hero-heading">
      <div ref={sceneRef} className={styles.scene}>
        <h1 id="hero-heading" className="sr-only">Loupe — fine jewelry, extraordinary stories</h1>
        <div className={styles.media} aria-hidden="true">
          <video ref={videoRef} src="/media/loupe-entrance-1080p.mp4" muted playsInline preload="auto" poster="/media/loupe-entrance-poster-1080p.jpg" tabIndex={-1} className={styles.video} onEnded={() => { manualRef.current = false; setPlaying(false); }} />
        </div>
        <div className={styles.shade} aria-hidden="true" />
        <div className={styles.promptMask} aria-hidden="true" />
        <div ref={introRef} className={styles.intro}>
          <p className={styles.eyebrow}>Fine jewelry. A world of discovery.</p>
          <p className={styles.tagline}>Step inside something extraordinary.</p>
          <Link href="/shop" className={styles.shop}>Explore the collection <ArrowUpRight size={15} aria-hidden /></Link>
        </div>
        <a
          href="#our-story"
          className={styles.skipButton}
          onClick={(event) => {
            const section = sectionRef.current;
            if (!section) return;
            event.preventDefault();
            const nextSectionTop = window.scrollY + section.getBoundingClientRect().bottom;
            window.scrollTo({ top: nextSectionTop, behavior: "smooth" });
          }}
        >
          Skip intro <ArrowUpRight size={14} aria-hidden />
        </a>
        <div className={styles.progress} aria-hidden="true"><span /></div>
      </div>
    </section>
  );
}
