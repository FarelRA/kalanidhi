import type { Metadata } from "next"

import { SupportInboxGate } from "@/components/workspace/governance/support-inbox-gate"

export const metadata: Metadata = {
  title: "Dukungan",
}

export default function Page() {
  return <SupportInboxGate />
}
