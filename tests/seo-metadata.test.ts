import type { Metadata } from "next"
import { describe, expect, it } from "vitest"

import { applySeoOverride } from "@/lib/content/metadata"
import type { SeoOverride } from "@/lib/content/types"

const defaults: Metadata = {
  title: "Judul bawaan",
  description: "Deskripsi bawaan.",
  alternates: { canonical: "/bawaan" },
  keywords: ["bawaan"],
  openGraph: {
    title: "OG bawaan",
    description: "OG deskripsi bawaan.",
  },
}

function override(patch: Partial<SeoOverride> = {}): SeoOverride {
  return {
    route: "/karya/batik",
    title: "Judul khusus",
    description: "Deskripsi khusus.",
    ogTitle: null,
    ogDescription: null,
    canonical: null,
    keywords: null,
    robots: null,
    updatedAt: 1,
    ...patch,
  }
}

describe("SEO metadata overrides", () => {
  it("returns the defaults unchanged when there is no override", () => {
    expect(applySeoOverride(defaults, null)).toBe(defaults)
  })

  it("lets the override win for title, description, OG, canonical, and keywords", () => {
    const result = applySeoOverride(
      defaults,
      override({
        ogTitle: "OG khusus",
        ogDescription: "OG deskripsi khusus.",
        canonical: "https://kalanidhi.site/karya/batik",
        keywords: ["batik", "soga"],
      }),
    )

    expect(result.title).toBe("Judul khusus")
    expect(result.description).toBe("Deskripsi khusus.")
    expect(result.alternates?.canonical).toBe(
      "https://kalanidhi.site/karya/batik",
    )
    expect(result.keywords).toEqual(["batik", "soga"])
    expect(result.openGraph?.title).toBe("OG khusus")
    expect(result.openGraph?.description).toBe("OG deskripsi khusus.")
  })

  it("falls back per field when the override is partial", () => {
    const result = applySeoOverride(
      defaults,
      override({ description: "", ogTitle: null, ogDescription: null }),
    )

    expect(result.title).toBe("Judul khusus")
    expect(result.description).toBe("Deskripsi bawaan.")
    expect(result.alternates?.canonical).toBe("/bawaan")
    expect(result.keywords).toEqual(["bawaan"])
    expect(result.openGraph?.title).toBe("Judul khusus")
    expect(result.openGraph?.description).toBe("OG deskripsi bawaan.")
  })

  it("parses a robots string into index/follow flags", () => {
    const result = applySeoOverride(
      defaults,
      override({ robots: "noindex, nofollow" }),
    )

    expect(result.robots).toEqual({ index: false, follow: false })
  })
})
