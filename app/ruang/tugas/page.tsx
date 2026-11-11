import type { Metadata } from "next"

import { TaskBoard } from "@/components/workspace/learning/task-board"

export const metadata: Metadata = {
  title: "Tugas & penilaian",
}

export default function Page() {
  return <TaskBoard />
}
