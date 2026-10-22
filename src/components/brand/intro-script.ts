export const BRAND_INTRO_DURATION = 4000;
export const BRAND_INTRO_SESSION_KEY = "jewelrex-wordmark-intro-v1";

// Runs before the first paint. The independent deadline also releases the page
// if hydration or the image fails, so the intro cannot leave a blocking screen.
export const brandIntroScript = `(() => {
  const desktop = matchMedia('(min-width: 1024px)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const storefront = /^(\\/$|\\/(shop|jewelers|guides|styling|custom-orders|help|sell)(\\/|$))/.test(location.pathname);
  if (!desktop || reduced || !storefront) return;
  try {
    if (sessionStorage.getItem('${BRAND_INTRO_SESSION_KEY}')) return;
    sessionStorage.setItem('${BRAND_INTRO_SESSION_KEY}', 'seen');
  } catch { /* Storage may be unavailable; the deadline still applies. */ }
  const root = document.documentElement;
  const startedAt = performance.now();
  root.dataset.brandIntro = 'running';
  root.dataset.brandIntroStart = String(startedAt);
  let animation;
  let finished = false;
  let attached = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    animation?.cancel();
    observer.disconnect();
    delete root.dataset.brandIntro;
    delete root.dataset.brandIntroStart;
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', finish);
    motion.removeEventListener('change', finish);
    window.dispatchEvent(new Event('jewelrex:intro-end'));
  };
  const onKey = (event) => {
    if (event.key === 'Escape') finish();
    else if (['Tab', 'Enter', ' '].includes(event.key)) event.preventDefault();
  };
  const attach = () => {
    if (finished || attached) return;
    const image = document.querySelector('[data-brand-header] [data-brand-wordmark]');
    if (!image) return;
    attached = true;
    image.decode().then(() => {
      requestAnimationFrame(() => {
        if (finished) return;
        const elapsed = performance.now() - startedAt;
        const box = image.getBoundingClientRect();
        if (elapsed >= ${BRAND_INTRO_DURATION} || !box.width || !box.height) { finish(); return; }
        const scale = Math.min(innerWidth * 0.56, 760) / box.width;
        const x = innerWidth / 2 - box.left - box.width / 2;
        const y = innerHeight / 2 - box.top - box.height / 2;
        const centered = 'translate(' + x + 'px, ' + y + 'px) scale(' + scale + ')';
        animation = image.animate([
          { offset: 0, transform: centered, opacity: 0, easing: 'ease-out' },
          { offset: 0.2, transform: centered, opacity: 1 },
          { offset: 0.7, transform: centered, opacity: 1, easing: 'cubic-bezier(0.65, 0, 0.2, 1)' },
          { offset: 1, transform: 'translate(0px, 0px) scale(1)', opacity: 1 }
        ], { duration: ${BRAND_INTRO_DURATION}, fill: 'both' });
        animation.currentTime = elapsed;
      });
    }).catch(finish);
  };
  const observer = new MutationObserver(attach);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  observer.observe(document, { childList: true, subtree: true });
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', finish, { once: true });
  motion.addEventListener('change', finish, { once: true });
  window.setTimeout(finish, ${BRAND_INTRO_DURATION});
  attach();
})();`;
