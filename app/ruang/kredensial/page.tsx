import type { Metadata } from "next"

import { LiveCredentialBoard } from "@/components/workspace/credentials/live-credential-board"

export const metadata: Metadata = {
  title: "Kredensial",
}

export default function Page() {
  return <LiveCredentialBoard />
}
