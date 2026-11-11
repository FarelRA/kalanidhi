import { afterEach, describe, expect, it, vi } from "vitest"

import { fallbackSiteData } from "@/lib/content/fallback"

describe("landing without CONVEX_URL", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("returns complete seed content from the fallback", () => {
    expect(fallbackSiteData.metadata.title).toBeTruthy()
    expect(fallbackSiteData.paths.length).toBeGreaterThan(0)
    expect(fallbackSiteData.teachers.length).toBeGreaterThan(0)
    expect(fallbackSiteData.works.length).toBeGreaterThan(0)
  })

  it("reports Convex as unconfigured and serves the fallback", async () => {
    vi.stubEnv("CONVEX_URL", "")
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "")
    vi.doMock("next/cache", () => ({
      cacheLife: () => undefined,
    }))

    const server = await import("@/lib/convex/server")
    expect(server.isConvexConfigured()).toBe(false)

    const data = await server.getSiteData()
    expect(data.metadata.title).toBe(fallbackSiteData.metadata.title)
    expect(data.paths).toHaveLength(fallbackSiteData.paths.length)
  })
})
