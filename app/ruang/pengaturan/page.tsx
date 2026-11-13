import type { Metadata } from "next"

import { SettingsPanelLive } from "@/components/workspace/governance/settings-panel-live"

export const metadata: Metadata = {
  title: "Pengaturan",
}

export default function Page() {
  return <SettingsPanelLive />
}
