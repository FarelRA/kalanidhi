import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://kalanidhi.site",
      lastModified: new Date("2026-11-11"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ]
}
