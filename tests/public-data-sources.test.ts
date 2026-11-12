import { readFileSync } from "node:fs"
import path from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/convex/server", () => ({
  getSiteData: vi.fn(),
}))

import { getSiteBaseUrl } from "@/lib/content/metadata"
import { getSiteData } from "@/lib/convex/server"

const root = path.resolve(__dirname, "..")

function read(relative: string): string {
  return readFileSync(path.join(root, relative), "utf8")
}

describe("public data sources", () => {
  it("reads the revenue split from the shared money constant", () => {
    const files = [
      "app/(site)/karya/[slug]/page.tsx",
      "app/(site)/pesan/[slug]/page.tsx",
      "app/(site)/pesan/jalur/[slug]/page.tsx",
    ]

    for (const file of files) {
      const source = read(file)
      expect(source, `${file} must import SPLIT_PERCENTAGES`).toContain(
        "SPLIT_PERCENTAGES",
      )
      expect(source, `${file} must not hardcode 70%`).not.toMatch(/\b70%/)
      expect(source, `${file} must not hardcode 15%`).not.toMatch(/\b15%/)
    }
  })

  it("builds absolute URLs from Convex site metadata", () => {
    for (const file of ["app/sitemap.ts", "app/robots.ts"]) {
      const source = read(file)
      expect(source, `${file} must use getSiteBaseUrl`).toContain(
        "getSiteBaseUrl",
      )
      expect(source, `${file} must not hardcode the domain`).not.toContain(
        "kalanidhi.site",
      )
    }
  })

  it("keeps entity route builders in the route registry", () => {
    const source = read("lib/content/metadata.ts")
    expect(source).not.toMatch(
      /export function (pathRoute|teacherRoute|workRoute)/,
    )
  })
})

describe("getSiteBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it("uses the Convex site URL and trims trailing slashes", async () => {
    vi.mocked(getSiteData).mockResolvedValue({
      metadata: { siteUrl: "https://kalanidhi.example/" },
    } as never)

    await expect(getSiteBaseUrl()).resolves.toBe("https://kalanidhi.example")
  })

  it("falls back to the deployment origin when Convex is unreachable", async () => {
    vi.mocked(getSiteData).mockRejectedValue(new Error("offline"))
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://deploy.example/")

    await expect(getSiteBaseUrl()).resolves.toBe("https://deploy.example")
  })

  it("returns null when neither source is available", async () => {
    vi.mocked(getSiteData).mockRejectedValue(new Error("offline"))
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "")

    await expect(getSiteBaseUrl()).resolves.toBeNull()
  })
})
