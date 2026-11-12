import { fetchMutation, fetchQuery } from "convex/nextjs"
import { cacheLife } from "next/cache"

import { api } from "@/convex/_generated/api"
import type { LeadArgs } from "@/lib/convex/types"
import type {
  Faq,
  LearningPath,
  PublicPathDetail,
  PublicTeacherDetail,
  SiteData,
  Teacher,
} from "@/lib/content/types"

const convexUrl =
  process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL

export function isConvexConfigured() {
  return Boolean(convexUrl)
}

function requireConvexUrl(): string {
  if (!convexUrl) {
    throw new Error(
      "CONVEX_URL atau NEXT_PUBLIC_CONVEX_URL wajib diisi. Konten landing hanya berasal dari Convex.",
    )
  }
  return convexUrl
}

export async function getSiteData(): Promise<SiteData> {
  "use cache"
  cacheLife("minutes")

  const data = await fetchQuery(api.content.getSite, {}, {
    url: requireConvexUrl(),
    skipConvexDeploymentUrlCheck: true,
  })
  if (!data) {
    throw new Error(
      "Konten landing belum tersedia di Convex. Jalankan seedRunner:run.",
    )
  }
  return data
}

export async function getPublicPaths(): Promise<LearningPath[]> {
  "use cache"
  cacheLife("minutes")

  return await fetchQuery(api.content.listPublicPaths, {}, {
    url: requireConvexUrl(),
    skipConvexDeploymentUrlCheck: true,
  })
}

export async function getPublicPath(
  slug: string,
): Promise<PublicPathDetail | null> {
  "use cache"
  cacheLife("minutes")

  return await fetchQuery(
    api.content.getPublicPath,
    { slug },
    { url: requireConvexUrl(), skipConvexDeploymentUrlCheck: true },
  )
}

export async function getPublicTeachers(): Promise<Teacher[]> {
  "use cache"
  cacheLife("minutes")

  return await fetchQuery(api.content.listPublicTeachers, {}, {
    url: requireConvexUrl(),
    skipConvexDeploymentUrlCheck: true,
  })
}

export async function getPublicTeacher(
  slug: string,
): Promise<PublicTeacherDetail | null> {
  "use cache"
  cacheLife("minutes")

  return await fetchQuery(
    api.content.getPublicTeacher,
    { slug },
    { url: requireConvexUrl(), skipConvexDeploymentUrlCheck: true },
  )
}

export async function getPublicFaqs(): Promise<Faq[]> {
  "use cache"
  cacheLife("minutes")

  return await fetchQuery(api.content.listPublicFaqs, {}, {
    url: requireConvexUrl(),
    skipConvexDeploymentUrlCheck: true,
  })
}

export async function persistLead(args: LeadArgs): Promise<boolean> {
  await fetchMutation(api.leads.create, args, {
    url: requireConvexUrl(),
    skipConvexDeploymentUrlCheck: true,
  })
  return true
}
