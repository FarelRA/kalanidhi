import { describe, expect, it } from "vitest"

import { buildRootMetadata } from "../lib/content/metadata"

type RouteGuard = {
  EXTRA_ROUTES: string[]
  REQUIRED_200: string[]
  RETIRED_ROUTES: string[]
  routePaths: (sitemapXml: string, extra?: string[]) => string[]
}

const guard = (await import("../scripts/check-routes.mjs")) as RouteGuard

const seededSite = {
  metadata: {
    siteName: "KalaNidhi Digital",
    siteUrl: "https://kalanidhi.site",
    areaServed: "Daerah Istimewa Yogyakarta",
    title: "KalaNidhi Digital | Buka layarmu, Kenali Budayamu",
    description: "Platform belajar praktik budaya Nusantara di Yogyakarta.",
    keywords: ["batik"],
    ogTitle: "KalaNidhi Digital",
    ogDescription: "Belajar praktik budaya.",
    twitterTitle: "KalaNidhi Digital",
    twitterDescription: "Belajar praktik budaya.",
    category: "education",
    image: {
      url: "https://convex.example/api/storage/hero.webp",
      width: 1600,
      height: 900,
      alt: "Canting di atas anyaman bambu",
    },
  },
}

describe("root metadata during a clear window", () => {
  it("returns safe metadata when Convex has no site content", () => {
    const metadata = buildRootMetadata(null)

    expect(metadata.metadataBase?.toString()).toBe("https://kalanidhi.site/")
    expect(metadata.title).toEqual({
      default: "KalaNidhi Digital",
      template: "%s | KalaNidhi Digital",
    })
    expect(metadata.description).toContain("budaya Nusantara")
    expect(metadata.openGraph).toBeUndefined()
  })

  it("keeps the seeded title and share image when content exists", () => {
    const metadata = buildRootMetadata(seededSite)

    expect(metadata.title).toEqual({
      default: "KalaNidhi Digital | Buka layarmu, Kenali Budayamu",
      template: "%s | KalaNidhi Digital",
    })
    expect(metadata.openGraph).toMatchObject({
      title: "KalaNidhi Digital",
      images: [seededSite.metadata.image],
    })
  })
})

describe("direct-load route smoke list", () => {
  it("merges sitemap paths with auth and legacy routes", () => {
    const sitemap = `<?xml version="1.0"?><urlset>
      <url><loc>https://kalanidhi.site/</loc></url>
      <url><loc>https://kalanidhi.site/kelas</loc></url>
      <url><loc>https://kalanidhi.site/karya/nampan-batik-bambu</loc></url>
    </urlset>`

    expect(guard.routePaths(sitemap, ["/masuk"])).toEqual([
      "/",
      "/karya/nampan-batik-bambu",
      "/kelas",
      "/masuk",
    ])
  })

  it("requires the auth and listing pages to answer 200", () => {
    expect(guard.REQUIRED_200).toEqual(
      expect.arrayContaining(["/", "/masuk", "/daftar", "/kelas", "/ruang"]),
    )
  })

  it("keeps every retired work URL in the 404 list", () => {
    expect(guard.RETIRED_ROUTES).toEqual(
      expect.arrayContaining([
        "/karya/box-tisu-batik-bambu",
        "/karya/selendang-canting-nitik",
        "/pesan/box-tisu-batik-bambu",
        "/pesan/selendang-canting-nitik",
      ]),
    )
  })
})
