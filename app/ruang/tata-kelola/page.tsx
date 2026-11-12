import type { Metadata } from "next"

import { GovernanceBoardGate } from "@/components/workspace/governance/governance-board-gate"

export const metadata: Metadata = {
  title: "Tata kelola",
}

export default function Page() {
  return <GovernanceBoardGate />
}
