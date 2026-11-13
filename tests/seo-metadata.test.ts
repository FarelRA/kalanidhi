import type { Metadata } from "next"
import { describe, expect, it } from "vitest"

import { applySeoOverride, applyShareImage } from "@/lib/content/metadata"
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

describe("share image inheritance", () => {
  const shareImage = {
    url: "https://convex.example/api/storage/share",
    width: 1408,
    height: 768,
    alt: "Proses membatik dengan canting",
  }

  it("carries the site image into a page-level Open Graph object", () => {
    const result = applyShareImage(defaults, shareImage)

    expect(result.openGraph?.images).toEqual([shareImage])
    expect(result.openGraph?.title).toBe("OG bawaan")
  })

  it("keeps an image chosen by the page", () => {
    const own = { url: "https://convex.example/api/storage/work" }
    const result = applyShareImage(
      { ...defaults, openGraph: { ...defaults.openGraph, images: [own] } },
      shareImage,
    )

    expect(result.openGraph?.images).toEqual([own])
  })

  it("leaves metadata without Open Graph untouched so the layout is inherited", () => {
    const pageMetadata: Metadata = { title: "Tanpa OG" }

    expect(applyShareImage(pageMetadata, shareImage)).toBe(pageMetadata)
  })

  it("ignores an image without a URL", () => {
    expect(
      applyShareImage(defaults, { url: "", width: 0, height: 0, alt: "" }),
    ).toBe(defaults)
  })
})
