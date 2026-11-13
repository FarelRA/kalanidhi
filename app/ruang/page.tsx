import type { Metadata } from "next"

import { OverviewLive } from "@/components/workspace/overview/overview-live"

export const metadata: Metadata = {
  title: "Ringkasan",
}

export default function Page() {
  return <OverviewLive />
}
