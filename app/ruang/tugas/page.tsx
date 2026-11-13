import type { Metadata } from "next"

import { LiveTaskBoard } from "@/components/workspace/learning/live-task-board"

export const metadata: Metadata = {
  title: "Tugas & penilaian",
}

export default function Page() {
  return <LiveTaskBoard />
}
