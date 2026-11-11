"use client"

import dynamic from "next/dynamic"
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import type {
  InfoKey,
  LeadDialogCopy,
  LeadRequest,
  Overlays,
} from "@/lib/content/types"

const LeadDialog = dynamic(
  () =>
    import("@/components/overlays/lead-dialog").then(
      (module) => module.LeadDialog,
    ),
  { ssr: false },
)

const InfoDialog = dynamic(
  () =>
    import("@/components/overlays/info-dialog").then(
      (module) => module.InfoDialog,
    ),
  { ssr: false },
)

type OverlayContextValue = {
  openLead: (request: LeadRequest) => void
  openInfo: (key: InfoKey) => void
  closeAll: () => void
}

const OverlayContext = createContext<OverlayContextValue | null>(null)

export function OverlayProvider({
  children,
  overlays,
  leadDialogs,
}: {
  children: ReactNode
  overlays: Overlays
  leadDialogs: LeadDialogCopy
}) {
  const [lead, setLead] = useState<LeadRequest | null>(null)
  const [info, setInfo] = useState<InfoKey | null>(null)

  const openLead = useCallback((request: LeadRequest) => {
    setInfo(null)
    setLead(request)
  }, [])

  const openInfo = useCallback((key: InfoKey) => {
    setLead(null)
    setInfo(key)
  }, [])

  const closeAll = useCallback(() => {
    setLead(null)
    setInfo(null)
  }, [])

  const value = useMemo(
    () => ({ openLead, openInfo, closeAll }),
    [openLead, openInfo, closeAll],
  )

  const runInfoAction = useCallback((request: LeadRequest) => {
    setInfo(null)
    window.setTimeout(() => setLead(request), 220)
  }, [])

  return (
    <OverlayContext.Provider value={value}>
      {children}
      {lead ? (
        <LeadDialog
          request={lead}
          copy={leadDialogs}
          onClose={() => setLead(null)}
        />
      ) : null}
      {info ? (
        <InfoDialog
          content={overlays[info]}
          onClose={() => setInfo(null)}
          onLeadAction={runInfoAction}
        />
      ) : null}
    </OverlayContext.Provider>
  )
}

export function useOverlay() {
  const context = useContext(OverlayContext)

  if (!context) {
    throw new Error("useOverlay must be used inside <OverlayProvider>.")
  }

  return context
}
