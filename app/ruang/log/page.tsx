import type { Metadata } from "next"

import { LogExplorer } from "@/components/workspace/governance/log-explorer"

export const metadata: Metadata = {
  title: "Log",
}

export default function Page() {
  return <LogExplorer />
}
