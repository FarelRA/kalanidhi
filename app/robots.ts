import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://kalanidhi.digital/sitemap.xml",
    host: "https://kalanidhi.digital",
  }
}
