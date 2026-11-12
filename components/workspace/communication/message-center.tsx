"use client"

import { useViewer } from "@/components/workspace/shell/viewer-provider"

import { MessageCenterLive } from "./message-center-live"
import { MessageCenterPreview } from "./message-center-preview"

/**
 * One route, one shell. Preview mode renders the development prototype;
 * every real session renders Convex data and never imports mock records.
 */
export function MessageCenter() {
  const { isPreview } = useViewer()
  return isPreview ? <MessageCenterPreview /> : <MessageCenterLive />
}
