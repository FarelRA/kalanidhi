import type { Metadata } from "next"

import { PeopleLive } from "@/components/workspace/governance/people-live"

export const metadata: Metadata = {
  title: "Orang",
}

export default function Page() {
  return <PeopleLive />
}
