"use client"

import { useViewer } from "@/components/workspace/shell/viewer-provider"

import { LeadsBoard as PreviewLeadsBoard } from "./leads-board"
import { LeadsLive } from "./leads-live"

export function LeadsBoardGate() {
  const { isPreview } = useViewer()
  return isPreview ? <PreviewLeadsBoard /> : <LeadsLive />
}
