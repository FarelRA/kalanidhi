"use client"

import { useViewer } from "@/components/workspace/shell/viewer-provider"

import { LogExplorer as PreviewLogExplorer } from "./log-explorer"
import { LogLive } from "./log-live"

export function LogExplorerGate() {
  const { isPreview } = useViewer()
  return isPreview ? <PreviewLogExplorer /> : <LogLive />
}
