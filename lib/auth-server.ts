import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs"

const convexUrl =
  process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL ?? ""
const convexSiteUrl =
  process.env.CONVEX_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? ""

export function isAuthConfigured(): boolean {
  return Boolean(convexUrl && convexSiteUrl)
}

type AuthServer = ReturnType<typeof convexBetterAuthNextJs>

let helpers: AuthServer | null = null

/**
 * The upstream helper validates URLs at construction time, so it is created
 * lazily. A build without Convex credentials must still render the public site.
 */
export function getAuthServer(): AuthServer {
  if (!isAuthConfigured()) {
    throw new Error(
      "Better Auth is not configured: set CONVEX_URL and CONVEX_SITE_URL.",
    )
  }
  helpers ??= convexBetterAuthNextJs({
    convexUrl,
    convexSiteUrl,
  })
  return helpers
}

export const handler = {
  GET: (request: Request) => getAuthServer().handler.GET(request),
  POST: (request: Request) => getAuthServer().handler.POST(request),
}
