import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  // A stray lockfile in a parent directory would otherwise confuse root detection.
  turbopack: { root: import.meta.dirname },
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
  experimental: {
    serverActions: {
      // Local-development uploads use server actions; UploadThing uploads go directly from the browser.
      bodySizeLimit: "26mb",
    },
  },
};

export default nextConfig;
