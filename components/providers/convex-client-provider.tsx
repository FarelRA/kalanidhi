"use client"

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { ConvexProvider, ConvexReactClient } from "convex/react"
import { useState, type ReactNode } from "react"

import { authClient } from "@/lib/auth-client"

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
    typeof window !== "undefined" && url ? new ConvexReactClient(url) : null,
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
