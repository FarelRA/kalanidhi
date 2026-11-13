import type { MetadataRoute } from "next"

import { getSiteData } from "@/lib/convex/server"

/**
 * Home-screen and install metadata. The icons are the same mark used in the
 * header and the browser tab, so the brand never falls back to a placeholder.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { metadata } = await getSiteData()

  return {
    name: metadata.siteName,
    short_name: "KalaNidhi",
    description: metadata.description,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    lang: "id",
    background_color: "#f4ead8",
    theme_color: "#f4ead8",
    icons: [
      {
        src: "/brand/kalanidhi-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/kalanidhi-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/kalanidhi-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
