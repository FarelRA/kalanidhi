import type { NextConfig } from "next";

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
  // The Docker image sets SKIP_TYPECHECK=1 because the release workflow runs
  // `npm run typecheck` as a required step before the image build. Checking the
  // whole project twice is the single largest cost in a deploy, and the second
  // pass runs inside the arm64 build. Local builds keep the check.
  typescript: {
    ignoreBuildErrors: process.env.SKIP_TYPECHECK === "1",
  },
};

export default nextConfig;
