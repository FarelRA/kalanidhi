import type { Metadata } from "next"

import { LearningBoard } from "@/components/workspace/learning/learning-board"

export const metadata: Metadata = {
  title: "Belajar & mengajar",
}

export default function Page() {
  return <LearningBoard />
}
