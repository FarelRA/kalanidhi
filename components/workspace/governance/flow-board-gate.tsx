"use client"

import { useViewer } from "@/components/workspace/shell/viewer-provider"

import { FlowBoard as PreviewFlowBoard } from "./flow-board"
import { FlowBoardLive } from "./flow-board-live"

export function FlowBoardGate() {
  const { isPreview } = useViewer()
  return isPreview ? <PreviewFlowBoard /> : <FlowBoardLive />
}
