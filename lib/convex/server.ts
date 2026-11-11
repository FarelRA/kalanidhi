import { fetchMutation, fetchQuery } from "convex/nextjs"
import { cacheLife } from "next/cache"

import { api } from "@/convex/_generated/api"
import type { LeadArgs } from "@/lib/convex/types"
import { fallbackSiteData } from "@/lib/content/fallback"
import type { SiteData } from "@/lib/content/types"

const convexUrl =
  process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL

export function isConvexConfigured() {
  return Boolean(convexUrl)
}

export async function getSiteData(): Promise<SiteData> {
  "use cache"
  cacheLife("minutes")

  if (!convexUrl) return fallbackSiteData

  try {
    const data = await fetchQuery(api.content.getSite, {}, {
      url: convexUrl,
      skipConvexDeploymentUrlCheck: true,
    })
    return data ?? fallbackSiteData
  } catch (error) {
    console.error("[convex] Could not load site content. Using seed fallback.", error)
    return fallbackSiteData
  }
}

export async function persistLead(args: LeadArgs): Promise<boolean> {
  if (!convexUrl) {
    console.info("[lead] Convex is not configured; submission accepted locally.", {
      intent: args.intent,
      hasInstitution: Boolean(args.institution),
      hasWhatsapp: Boolean(args.whatsapp),
    })
    return false
  }

  try {
    await fetchMutation(api.leads.create, args, {
      url: convexUrl,
      skipConvexDeploymentUrlCheck: true,
    })
    return true
  } catch (error) {
    console.error("[convex] Could not store lead.", error)
    return false
  }
}
