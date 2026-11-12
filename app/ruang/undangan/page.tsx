import type { Metadata } from "next"

import { InviteAccept } from "@/components/workspace/governance/invite-accept"

export const metadata: Metadata = {
  title: "Terima undangan",
}

export default function Page() {
  return <InviteAccept />
}
