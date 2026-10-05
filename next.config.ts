import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // A stray lockfile in a parent directory would otherwise confuse root detection.
  turbopack: { root: import.meta.dirname },
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
  experimental: {
    serverActions: {
      // Certificate PDFs and KYC documents are uploaded through server actions.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
