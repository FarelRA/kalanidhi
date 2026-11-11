"use client"

import { useViewer } from "@/components/workspace/shell/viewer-provider"

import { ContentCms as PreviewContentCms } from "./content-cms"
import { ContentCmsLive } from "./content-cms-live"

export function ContentCmsGate() {
  const { isPreview } = useViewer()
  return isPreview ? <PreviewContentCms /> : <ContentCmsLive />
}
