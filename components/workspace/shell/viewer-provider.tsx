"use client"

import * as React from "react"

import {
  capabilitiesFor,
  previewProfiles,
  type PreviewProfile,
} from "@/lib/workspace/access"
import type { Capability, PreviewKey } from "@/lib/workspace/types"

type ViewerContextValue = {
  preview: PreviewKey
  profile: PreviewProfile
  capabilities: Capability[]
  can: (capability: Capability) => boolean
  setPreview: (preview: PreviewKey) => void
  profiles: PreviewProfile[]
}

const ViewerContext = React.createContext<ViewerContextValue | null>(null)

export function ViewerProvider({ children }: { children: React.ReactNode }) {
  const [preview, setPreview] = React.useState<PreviewKey>("pengelola")
  const profile =
    previewProfiles.find((item) => item.key === preview) ?? previewProfiles[0]
  const capabilities = React.useMemo(() => capabilitiesFor(profile), [profile])

  const can = React.useCallback(
    (capability: Capability) => capabilities.includes(capability),
    [capabilities],
  )

  const value = React.useMemo<ViewerContextValue>(
    () => ({
      preview,
      profile,
      capabilities,
      can,
      setPreview,
      profiles: previewProfiles,
    }),
    [preview, profile, capabilities, can],
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
