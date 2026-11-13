import type { Metadata } from "next"

import { LiveScheduleBoard } from "@/components/workspace/learning/live-schedule-board"

export const metadata: Metadata = {
  title: "Jadwal",
}

export default function Page() {
  return <LiveScheduleBoard />
}
