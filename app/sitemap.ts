import type { MetadataRoute } from "next"

import { getPublicWorks } from "@/lib/commerce/server"
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

const baseUrl = "https://kalanidhi.site"

const staticRoutes = [
  PUBLIC_ROUTES.home,
  PUBLIC_ROUTES.paths,
  PUBLIC_ROUTES.teachers,
  PUBLIC_ROUTES.works,
  PUBLIC_ROUTES.interest,
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
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.8,
      })
    }
    for (const teacher of teachers) {
      entries.push({
        url: `${baseUrl}${teacherHref(teacher.slug)}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      })
    }
    for (const work of works) {
      entries.push({
        url: `${baseUrl}${workHref(work.slug)}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      })
    }
  } catch (error) {
    console.error("[sitemap] Could not load Convex entities.", error)
  }

  return entries
}
