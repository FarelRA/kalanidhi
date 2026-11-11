import type { Metadata } from "next"

import { FlowBoard } from "@/components/workspace/governance/flow-board"

export const metadata: Metadata = {
  title: "Alur",
}

export default function Page() {
  return <FlowBoard />
}
