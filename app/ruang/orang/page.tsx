import type { Metadata } from "next"

import { PeopleDirectoryGate } from "@/components/workspace/governance/people-directory-gate"

export const metadata: Metadata = {
  title: "Orang",
}

export default function Page() {
  return <PeopleDirectoryGate />
}
