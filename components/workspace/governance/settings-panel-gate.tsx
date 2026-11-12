"use client"

import { useViewer } from "@/components/workspace/shell/viewer-provider"

import { SettingsPanel as PreviewSettingsPanel } from "./settings-panel"
import { SettingsPanelLive } from "./settings-panel-live"

export function SettingsPanelGate() {
  const { isPreview } = useViewer()
  return isPreview ? <PreviewSettingsPanel /> : <SettingsPanelLive />
}
