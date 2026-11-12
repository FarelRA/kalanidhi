import { fetchMutation, fetchQuery } from "convex/nextjs"
import { cacheLife } from "next/cache"

import { api } from "@/convex/_generated/api"
import type { LeadArgs } from "@/lib/convex/types"
import type { SiteData } from "@/lib/content/types"

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

export async function persistLead(args: LeadArgs): Promise<boolean> {
  await fetchMutation(api.leads.create, args, {
    url: requireConvexUrl(),
    skipConvexDeploymentUrlCheck: true,
  })
  return true
}
