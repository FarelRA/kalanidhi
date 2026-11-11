"use client"

import { useViewer } from "@/components/workspace/shell/viewer-provider"

import { OverviewBoard as PreviewOverview } from "./overview-board"
import { OverviewLive } from "./overview-live"

export function OverviewBoardGate() {
  const { isPreview } = useViewer()
  return isPreview ? <PreviewOverview /> : <OverviewLive />
}
