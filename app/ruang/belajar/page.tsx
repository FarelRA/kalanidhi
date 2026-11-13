import type { Metadata } from "next"

import { LiveLearningBoard } from "@/components/workspace/learning/live-learning-board"

export const metadata: Metadata = {
  title: "Belajar & mengajar",
}

export default function Page() {
  return <LiveLearningBoard />
}
