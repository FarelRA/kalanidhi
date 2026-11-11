import type { Metadata } from "next"

import { OverviewBoardGate } from "@/components/workspace/overview/overview-board-gate"

export const metadata: Metadata = {
  title: "Ringkasan",
}

export default function Page() {
  return <OverviewBoardGate />
}
