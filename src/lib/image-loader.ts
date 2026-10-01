"use client";

// Global next/image loader. Product photography is served by image CDNs that
// resize on the fly (imgix for Unsplash, Cloudinary transformations), so we
// delegate resizing to them instead of the Next.js optimiser.

type LoaderArgs = { src: string; width: number; quality?: number };

export default function imageLoader({ src, width, quality }: LoaderArgs) {
  if (src.startsWith("https://images.unsplash.com/")) {
    const url = new URL(src);
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality ?? 72));
    url.searchParams.set("auto", "format");
    if (!url.searchParams.has("fit")) url.searchParams.set("fit", "max");
    return url.toString();
  }

  if (src.includes("res.cloudinary.com") && src.includes("/upload/")) {
    return src.replace("/upload/", `/upload/f_auto,q_${quality ?? "auto"},w_${width}/`);
  }

  // Local uploads and S3 objects are served as-is; the width param keeps
  // responsive srcsets distinct.
  return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
}
