import type { Metadata } from "next"

import { FlowBoardLive } from "@/components/workspace/governance/flow-board-live"

export const metadata: Metadata = {
  title: "Proses",
}

export default function Page() {
  return <FlowBoardLive />
}
