import type { Metadata } from "next"

import { StatsBoardGate } from "@/components/workspace/governance/stats-board-gate"

export const metadata: Metadata = {
  title: "Statistik",
}

export default function Page() {
  return <StatsBoardGate />
}
