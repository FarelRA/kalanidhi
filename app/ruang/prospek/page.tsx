import type { Metadata } from "next"

import { LeadsBoard } from "@/components/workspace/governance/leads-board"

export const metadata: Metadata = {
  title: "Prospek",
}

export default function Page() {
  return <LeadsBoard />
}
