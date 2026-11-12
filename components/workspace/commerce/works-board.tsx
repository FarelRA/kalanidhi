"use client"

import { useViewer } from "@/components/workspace/shell/viewer-provider"

import { WorksLive } from "./works-live"
import { WorksPreview } from "./works-board-preview"

/** Preview mode keeps local records; live sessions use Convex only. */
export function WorksBoard() {
  const { isPreview } = useViewer()
  return isPreview ? <WorksPreview /> : <WorksLive />
}
