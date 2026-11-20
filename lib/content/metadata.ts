import type { Metadata } from "next"
import { cacheLife } from "next/cache"
import { fetchQuery } from "convex/nextjs"

import { api } from "@/convex/_generated/api"
import type { SeoOverride, SiteData } from "@/lib/content/types"
import { getSiteData } from "@/lib/convex/server"

const convexUrl =
  process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL

/** Reads the per-route SEO override, or null when Convex is unavailable. */
export async function getSeoOverride(
  route: string,
): Promise<SeoOverride | null> {
  "use cache"
  cacheLife("minutes")

  if (!convexUrl) return null

  try {
    return await fetchQuery(
      api.content.getSeoOverride,
      { route },
      { url: convexUrl, skipConvexDeploymentUrlCheck: true },
    )
  } catch (error) {
    console.error("[convex] Could not load SEO override.", error)
    return null
  }
}

function parseRobots(value: string): Metadata["robots"] {
  const tokens = value
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean)
  if (tokens.length === 0) return undefined
  return {
    index: !tokens.includes("noindex"),
    follow: !tokens.includes("nofollow"),
  }
}

function normaliseLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("id-ID")
}

/**
 * True when a page title already names the site. The root layout appends
 * `| siteName` through `title.template`, so such a title must be marked
 * absolute or the site name would render twice.
 */
export function titleIncludesSiteName(
  title: string,
  siteName: string | null | undefined,
): boolean {
  if (!siteName) return false
  const needle = normaliseLabel(siteName)
  return needle.length > 0 && normaliseLabel(title).includes(needle)
}

/**
 * Applies an override on top of the page defaults. Missing override fields
 * keep the default value, so a partial override never blanks the metadata.
 *
 * `siteName` is the name the root layout appends to child titles. When an
 * admin-edited title already contains it, the title is returned as
 * `{ absolute }` so the template is skipped; a short title stays a plain
 * string and receives the site name exactly once. Open Graph titles are not
 * templated and are kept complete as written.
 */
export function applySeoOverride(
  defaults: Metadata,
  override: SeoOverride | null,
  siteName?: string | null,
): Metadata {
  if (!override) {
    if (
      typeof defaults.title === "string" &&
      titleIncludesSiteName(defaults.title, siteName)
    ) {
      return { ...defaults, title: { absolute: defaults.title } }
    }
    return defaults
  }

  const overrideTitle = override.title || defaults.title
  const title =
    typeof overrideTitle === "string" &&
    titleIncludesSiteName(overrideTitle, siteName)
      ? { absolute: overrideTitle }
      : overrideTitle
  const description = override.description || defaults.description
  const ogTitle =
    override.ogTitle || override.title || defaults.openGraph?.title
  const ogDescription =
    override.ogDescription ||
    override.description ||
    defaults.openGraph?.description

  return {
    ...defaults,
    title,
    description,
    alternates: override.canonical
      ? { ...defaults.alternates, canonical: override.canonical }
      : defaults.alternates,
    keywords: override.keywords ?? defaults.keywords,
    robots: override.robots ? parseRobots(override.robots) : defaults.robots,
    openGraph: {
      ...defaults.openGraph,
      title: ogTitle,
      description: ogDescription,
    },
  }
}

/**
 * A page-level `openGraph` object replaces the root layout's object during
 * Next's metadata merge, which would drop the site share image. Carry it
 * forward unless the page supplied its own image or has no Open Graph object
 * (in which case the layout value is inherited untouched).
 */
export function applyShareImage(
  metadata: Metadata,
  image: SiteData["metadata"]["image"] | null | undefined,
): Metadata {
  if (!metadata.openGraph || metadata.openGraph.images || !image?.url) {
    return metadata
  }
  return {
    ...metadata,
    openGraph: { ...metadata.openGraph, images: [image] },
  }
}

/** Builds page metadata with the route override taking precedence. */
export async function buildPageMetadata(
  route: string,
  defaults: Metadata,
): Promise<Metadata> {
  const [override, data] = await Promise.all([
    getSeoOverride(route),
    getSiteData().catch(() => null),
  ])
  const merged = applySeoOverride(
    defaults,
    override,
    data?.metadata.siteName,
  )
  if (!merged.openGraph || merged.openGraph.images) return merged

  return applyShareImage(merged, data?.metadata.image)
}

/**
 * The public origin for absolute URLs such as the sitemap and robots file.
 * Convex site metadata is the source of truth; NEXT_PUBLIC_SITE_URL is only a
 * deployment fallback when Convex cannot be reached.
 */
export async function getSiteBaseUrl(): Promise<string | null> {
  try {
    const data = await getSiteData()
    return data.metadata.siteUrl.replace(/\/+$/, "")
  } catch (error) {
    console.error("[convex] Could not load site metadata for base URL.", error)
    const fallback = process.env.NEXT_PUBLIC_SITE_URL?.trim()
    return fallback ? fallback.replace(/\/+$/, "") : null
  }
}
