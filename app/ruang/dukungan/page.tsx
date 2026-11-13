import type { Metadata } from "next"

import { SupportInboxLive } from "@/components/workspace/governance/support-inbox-live"

export const metadata: Metadata = {
  title: "Dukungan",
}

export default function Page() {
  return <SupportInboxLive />
}
