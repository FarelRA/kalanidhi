import type { Metadata } from "next"

import { StatsLive } from "@/components/workspace/governance/stats-live"

export const metadata: Metadata = {
  title: "Statistik",
}

export default function Page() {
  return <StatsLive />
}
