import type { MetadataRoute } from "next"

import { getSiteBaseUrl } from "@/lib/content/metadata"

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = await getSiteBaseUrl()

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    ...(baseUrl
      ? {
          sitemap: `${baseUrl}/sitemap.xml`,
          host: baseUrl,
        }
      : {}),
  }
}
