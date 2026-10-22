# Jewelrex navbar entrance

The desktop storefront uses `public/brand/jewelrex-video-wordmark.png`, derived from a frame at 6.5 seconds in the supplied `gemini_generated_video_756cf5d1.mp4`. The original MP4 is not played: its background particles, reflection and watermark were removed to obtain the clean transparent wordmark. The existing mobile, dashboard and footer artwork is preserved.

The navbar image itself moves. There is no second logo or late artwork swap. The early head script starts before React hydration and watches for the navbar image. Its image preload and animation do not depend on database requests or video autoplay.

- 0–800 ms: fade the centered gold wordmark onto pure black.
- 800–2800 ms: hold the centered wordmark.
- 2800–4000 ms: move and scale it to its actual navbar bounds, fade the black background and reveal the header controls.
- 4000 ms: cancel the temporary transforms and restore normal navigation. This release also runs if the navbar never loads. An unavailable image, resize or Escape can end the intro earlier.

The session key is `jewelrex-wordmark-intro-v1`. Reloading and subsequent navigation within the same tab skip the animation. To see it again, open a fresh tab with independent session storage. Mobile and reduced-motion preferences skip it. Authentication and dashboard paths are excluded. Network or database delays can still affect the page content; the intro does not extend its deadline to wait for them.

## Asset preparation

The built-in image editing tool produced the transparent cutout from the video frame. No image-generation API credential or new project dependency is required. Final prompt:

> Edit target: the attached video frame. Make a precise transparent-background cutout of ONLY the large central gold wordmark reading exactly 'Jewelrex', including its four-point star above the J. Preserve the source wordmark's exact existing letterforms, spacing, shape, gold gradients, polished metallic shading and proportions. Do not redesign, retype, add, remove or change any lettering. Remove the ENTIRE brown/black background, all floating particles, sparkles outside the letterforms, haze, light streaks, floor reflection, and the small lower-right watermark. The gold wordmark and its star are the only remaining visible pixels on true alpha transparency. Tight composition with a modest transparent margin around the complete wordmark. This cutout will be used as the same logo in an intro animation and permanent navbar.

## Verification

`node --import tsx --test src/components/brand/intro-script.test.ts` covers the deadline, session replay, path selection, mobile/reduced-motion bypass, storage failure, movement to the navbar bounds, and image-load failure. The favorites and database delegate regressions were also rerun.

Browser captures verified a single wordmark moving from approximately 717 px wide in the viewport center to 170 px wide in the navbar by four seconds. Reload skipped the intro, and a 390 px viewport retained the original mobile logo with no intro. The database-independent fallback navbar was used for this motion check because live database connectivity was intermittent. Captures are stored in this chat's visualization folder.

The homepage certification statistics also required `isEmpty` array-filter support in the database query builder, exposed by the earlier filter validation guard. That repair has a regression test and does not modify database records.
