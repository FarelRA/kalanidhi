import type { Metadata } from "next"

import { FlowBoardGate } from "@/components/workspace/governance/flow-board-gate"

export const metadata: Metadata = {
  title: "Alur",
}

export default function Page() {
  return <FlowBoardGate />
}
