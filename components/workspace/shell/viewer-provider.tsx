"use client"

import * as React from "react"

import {
  capabilitiesFor,
  previewProfiles,
  profileForViewer,
  type PreviewProfile,
} from "@/lib/workspace/access"
import type { Viewer } from "@/lib/access/viewer"
import type { Capability, PreviewKey } from "@/lib/workspace/types"

type ViewerContextValue = {
  preview: PreviewKey | null
  profile: PreviewProfile
  capabilities: Capability[]
  can: (capability: Capability) => boolean
  setPreview: (preview: PreviewKey) => void
  profiles: PreviewProfile[]
  viewer: Viewer | null
  isPreview: boolean
}

const ViewerContext = React.createContext<ViewerContextValue | null>(null)

const previewFallback = previewProfiles[previewProfiles.length - 1]

export function ViewerProvider({
  children,
  viewer = null,
  preview = false,
}: {
  children: React.ReactNode
  viewer?: Viewer | null
  preview?: boolean
}) {
  const [previewKey, setPreviewKey] = React.useState<PreviewKey>("pengelola")

  const previewProfile =
    previewProfiles.find((item) => item.key === previewKey) ?? previewFallback

  const profile = React.useMemo<PreviewProfile>(() => {
    if (!preview && viewer) return profileForViewer(viewer)
    return previewProfile
  }, [preview, viewer, previewProfile])

  const capabilities = React.useMemo(() => {
    if (!preview && viewer) return viewer.capabilities
    return capabilitiesFor(previewProfile)
  }, [preview, viewer, previewProfile])

  const can = React.useCallback(
    (capability: Capability) => capabilities.includes(capability),
    [capabilities],
  )

  const setPreview = React.useCallback((next: PreviewKey) => {
    setPreviewKey(next)
  }, [])

  const value = React.useMemo<ViewerContextValue>(
    () => ({
      preview: preview ? previewKey : null,
      profile,
      capabilities,
      can,
      setPreview,
      profiles: preview ? previewProfiles : [],
      viewer: preview ? null : viewer,
      isPreview: preview,
    }),
    [preview, previewKey, profile, capabilities, can, setPreview, viewer],
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
