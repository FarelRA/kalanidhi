"use client"

import { useViewer } from "@/components/workspace/shell/viewer-provider"

import { GovernanceBoardPreview } from "./governance-board-preview"
import { GovernanceBoardLive } from "./governance-board-live"

export function GovernanceBoardGate() {
  const { isPreview } = useViewer()
  return isPreview ? <GovernanceBoardPreview /> : <GovernanceBoardLive />
}
