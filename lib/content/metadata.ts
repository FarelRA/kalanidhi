import type { Metadata } from "next"
import { cacheLife } from "next/cache"
import { fetchQuery } from "convex/nextjs"

import { api } from "@/convex/_generated/api"
import type { SeoOverride } from "@/lib/content/types"

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

/**
 * Applies an override on top of the page defaults. Missing override fields
 * keep the default value, so a partial override never blanks the metadata.
 */
export function applySeoOverride(
  defaults: Metadata,
  override: SeoOverride | null,
): Metadata {
  if (!override) return defaults

  const title = override.title || defaults.title
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

/** Builds page metadata with the route override taking precedence. */
export async function buildPageMetadata(
  route: string,
  defaults: Metadata,
): Promise<Metadata> {
  const override = await getSeoOverride(route)
  return applySeoOverride(defaults, override)
}

export function pathRoute(slug: string): string {
  return `/jalur/${slug}`
}

export function teacherRoute(slug: string): string {
  return `/pengajar/${slug}`
}

export function workRoute(slug: string): string {
  return `/karya/${slug}`
}
