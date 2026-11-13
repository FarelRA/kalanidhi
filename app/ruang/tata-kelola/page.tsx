import type { Metadata } from "next"

import { GovernanceBoardLive } from "@/components/workspace/governance/governance-board-live"

export const metadata: Metadata = {
  title: "Tata kelola",
}

export default function Page() {
  return <GovernanceBoardLive />
}
