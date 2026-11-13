import type { MetadataRoute } from "next"
import { connection } from "next/server"

import { getPublicWorks } from "@/lib/commerce/server"
import { getSiteBaseUrl } from "@/lib/content/metadata"
import {
  pathHref,
  PUBLIC_ROUTES,
  teacherHref,
  workHref,
} from "@/lib/content/routes"
import {
  getPublicPaths,
  getPublicTeachers,
  isConvexConfigured,
} from "@/lib/convex/server"

const staticRoutes = [
  PUBLIC_ROUTES.home,
  PUBLIC_ROUTES.fields,
  PUBLIC_ROUTES.paths,
  PUBLIC_ROUTES.teachers,
  PUBLIC_ROUTES.works,
  PUBLIC_ROUTES.interest,
  PUBLIC_ROUTES.consult,
  PUBLIC_ROUTES.verify,
  PUBLIC_ROUTES.about,
  PUBLIC_ROUTES.ethics,
  PUBLIC_ROUTES.privacy,
  PUBLIC_ROUTES.terms,
  PUBLIC_ROUTES.faq,
  PUBLIC_ROUTES.institution,
  PUBLIC_ROUTES.mangsa,
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The sitemap reflects published Convex entities, so it has to run at
  // request time. Without this, Next starts a prerender and the cached Convex
  // queries finish after it ends, which logs a spurious build warning.
  await connection()

  const baseUrl = await getSiteBaseUrl()
  if (!baseUrl) return []

  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${baseUrl}${route === "/" ? "" : route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.7,
  }))

  if (!isConvexConfigured()) return entries

  try {
    const [paths, teachers, works] = await Promise.all([
      getPublicPaths(),
      getPublicTeachers(),
      getPublicWorks(),
    ])
    for (const path of paths) {
      entries.push({
        url: `${baseUrl}${pathHref(path.slug)}`,
        lastModified: path.updatedAt ? new Date(path.updatedAt) : new Date(),
        changeFrequency: "monthly",
        priority: 0.8,
      })
    }
    for (const teacher of teachers) {
      entries.push({
        url: `${baseUrl}${teacherHref(teacher.slug)}`,
        lastModified: teacher.updatedAt
          ? new Date(teacher.updatedAt)
          : new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      })
    }
    for (const work of works) {
      entries.push({
        url: `${baseUrl}${workHref(work.slug)}`,
        lastModified: work.updatedAt ? new Date(work.updatedAt) : new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      })
    }
  } catch (error) {
    console.error("[sitemap] Could not load Convex entities.", error)
  }

  return entries
}
