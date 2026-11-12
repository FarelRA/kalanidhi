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
    remotePatterns: [
      {
        protocol: "https",
        hostname: convexHost,
        pathname: "/api/storage/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/api/storage/**",
      },
    ],
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
