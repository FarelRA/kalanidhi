import type { Metadata } from "next"

import { StatsBoard } from "@/components/workspace/governance/stats-board"

export const metadata: Metadata = {
  title: "Statistik",
}

export default function Page() {
  return <StatsBoard />
}
