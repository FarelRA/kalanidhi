import type { Metadata } from "next"

import { WorkspaceShell } from "@/components/workspace/shell/workspace-shell"

export const metadata: Metadata = {
  title: {
    default: "Ruang kerja",
    template: "%s · Ruang kerja KalaNidhi",
  },
  description:
    "Satu ruang kerja KalaNidhi Digital untuk belajar, mengajar, berkarya, menjual, dan mengelola.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <WorkspaceShell>{children}</WorkspaceShell>
}
