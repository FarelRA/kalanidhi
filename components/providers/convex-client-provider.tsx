"use client"

import { ConvexProvider, ConvexReactClient } from "convex/react"
import { useState, type ReactNode } from "react"

export function ConvexClientProvider({
  children,
  url,
}: {
  children: ReactNode
  url?: string
}) {
  const [client] = useState<ConvexReactClient | null>(() =>
    typeof window !== "undefined" && url ? new ConvexReactClient(url) : null,
  )

  if (!client) return <>{children}</>

  return <ConvexProvider client={client}>{children}</ConvexProvider>
}
