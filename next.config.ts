import type { NextConfig } from "next";

const convexUrl =
  process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
const convexHost = convexUrl
  ? new URL(convexUrl).hostname
  : "convex.kalanidhi.site";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Convex storage already serves optimized, cacheable image responses.
    // Bypass the Next.js optimizer so the browser fetches the storage URL
    // directly and no remote-pattern allowlist can block it.
    unoptimized: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
