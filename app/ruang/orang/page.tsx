import type { Metadata } from "next"

import { PeopleDirectory } from "@/components/workspace/governance/people-directory"

export const metadata: Metadata = {
  title: "Orang",
}

export default function Page() {
  return <PeopleDirectory />
}
