import type { Metadata } from "next"

import { SettingsPanelGate } from "@/components/workspace/governance/settings-panel-gate"

export const metadata: Metadata = {
  title: "Pengaturan",
}

export default function Page() {
  return <SettingsPanelGate />
}
