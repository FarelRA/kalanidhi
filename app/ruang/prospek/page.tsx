import type { Metadata } from "next"

import { LeadsLive } from "@/components/workspace/governance/leads-live"

export const metadata: Metadata = {
  title: "Prospek",
}

export default function Page() {
  return <LeadsLive />
}
