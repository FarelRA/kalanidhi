import path from "node:path"

import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The full seed runs dozens of batched mutations inside one test; five
    // seconds is tight when the machine is busy, so allow a wider budget.
    testTimeout: 30_000,
    server: {
      deps: {
        inline: ["convex-test"],
      },
    },
  },
})
