"use client"

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { ConvexProvider, ConvexReactClient } from "convex/react"
import { useState, type ReactNode } from "react"

import { authClient } from "@/lib/auth-client"

/**
 * One client per URL per process. The client must also exist during server
 * rendering: workspace components call `useQuery` while the shell is rendered
 * on the server, and a missing provider throws before hydration.
 */
let sharedClient: { url: string; client: ConvexReactClient } | null = null

function clientFor(url: string): ConvexReactClient {
  if (!sharedClient || sharedClient.url !== url) {
    sharedClient = { url, client: new ConvexReactClient(url) }
  }
  return sharedClient.client
}

export function ConvexClientProvider({
  children,
  url,
  authEnabled = false,
}: {
  children: ReactNode
  url?: string
  authEnabled?: boolean
}) {
  const [client] = useState<ConvexReactClient | null>(() =>
    url ? clientFor(url) : null,
  )

  if (!client) return <>{children}</>

  if (authEnabled) {
    return (
      <ConvexBetterAuthProvider client={client} authClient={authClient}>
        {children}
      </ConvexBetterAuthProvider>
    )
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>
}
