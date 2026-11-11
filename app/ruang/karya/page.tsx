import type { Metadata } from "next"

import { WorksBoard } from "@/components/workspace/commerce/works-board"

export const metadata: Metadata = {
  title: "Karya & Kartu Karya",
}

export default function Page() {
  return <WorksBoard />
}
