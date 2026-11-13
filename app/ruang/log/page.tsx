import type { Metadata } from "next"

import { LogLive } from "@/components/workspace/governance/log-live"

export const metadata: Metadata = {
  title: "Log",
}

export default function Page() {
  return <LogLive />
}
