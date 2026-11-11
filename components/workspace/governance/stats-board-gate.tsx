"use client"

import { useViewer } from "@/components/workspace/shell/viewer-provider"

import { StatsBoard as PreviewStatsBoard } from "./stats-board"
import { StatsLive } from "./stats-live"

export function StatsBoardGate() {
  const { isPreview } = useViewer()
  return isPreview ? <PreviewStatsBoard /> : <StatsLive />
}
