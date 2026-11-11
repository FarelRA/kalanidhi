import type { Metadata } from "next"

import { SettingsPanel } from "@/components/workspace/governance/settings-panel"

export const metadata: Metadata = {
  title: "Pengaturan",
}

export default function Page() {
  return <SettingsPanel />
}
