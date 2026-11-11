import type { Metadata } from "next"

import { OverviewBoard } from "@/components/workspace/overview/overview-board"

export const metadata: Metadata = {
  title: "Ringkasan",
}

export default function Page() {
  return <OverviewBoard />
}
