"use client"

import * as React from "react"

import { profileForViewer, type WorkspaceProfile } from "@/lib/workspace/access"
import type { Viewer } from "@/lib/access/viewer"
import type { Capability } from "@/lib/workspace/types"

type ViewerContextValue = {
  profile: WorkspaceProfile
  capabilities: Capability[]
  can: (capability: Capability) => boolean
  viewer: Viewer
}

const ViewerContext = React.createContext<ViewerContextValue | null>(null)

export function ViewerProvider({
  children,
  viewer,
}: {
  children: React.ReactNode
  viewer: Viewer
}) {
  const profile = React.useMemo<WorkspaceProfile>(
    () => profileForViewer(viewer),
    [viewer],
  )

  const capabilities = viewer.capabilities

  const can = React.useCallback(
    (capability: Capability) => capabilities.includes(capability),
    [capabilities],
  )

  const value = React.useMemo<ViewerContextValue>(
    () => ({
      profile,
      capabilities,
      can,
      viewer,
    }),
    [profile, capabilities, can, viewer],
  )

  return (
    <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>
  )
}

export function useViewer() {
  const context = React.useContext(ViewerContext)
  if (!context) {
    throw new Error("useViewer harus dipakai di dalam ViewerProvider.")
  }
  return context
}
