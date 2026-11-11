import type { Metadata } from "next"

import { SupportInbox } from "@/components/workspace/governance/support-inbox"

export const metadata: Metadata = {
  title: "Dukungan",
}

export default function Page() {
  return <SupportInbox />
}
