import type { Metadata } from "next"

import { ScheduleBoard } from "@/components/workspace/learning/schedule-board"

export const metadata: Metadata = {
  title: "Jadwal",
}

export default function Page() {
  return <ScheduleBoard />
}
