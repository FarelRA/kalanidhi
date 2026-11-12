import { afterEach, describe, expect, it, vi } from "vitest"

describe("landing requires Convex", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("fails loudly when Convex is not configured", async () => {
    vi.stubEnv("CONVEX_URL", "")
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "")
    vi.doMock("next/cache", () => ({
      cacheLife: () => undefined,
    }))

    const server = await import("@/lib/convex/server")
    expect(server.isConvexConfigured()).toBe(false)
    await expect(server.getSiteData()).rejects.toThrow(/CONVEX_URL/)
  })
})
