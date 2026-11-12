"use client"

import { useViewer } from "@/components/workspace/shell/viewer-provider"

import { SupportInbox as PreviewSupportInbox } from "./support-inbox"
import { SupportInboxLive } from "./support-inbox-live"

export function SupportInboxGate() {
  const { isPreview } = useViewer()
  return isPreview ? <PreviewSupportInbox /> : <SupportInboxLive />
}
