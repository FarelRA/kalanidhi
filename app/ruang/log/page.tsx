import type { Metadata } from "next"

import { LogExplorerGate } from "@/components/workspace/governance/log-explorer-gate"

export const metadata: Metadata = {
  title: "Log",
}

export default function Page() {
  return <LogExplorerGate />
}
