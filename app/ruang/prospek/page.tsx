import type { Metadata } from "next"

import { LeadsBoardGate } from "@/components/workspace/governance/leads-board-gate"

export const metadata: Metadata = {
  title: "Prospek",
}

export default function Page() {
  return <LeadsBoardGate />
}
