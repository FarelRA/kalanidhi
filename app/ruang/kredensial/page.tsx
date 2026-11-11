import type { Metadata } from "next"

import { CredentialBoard } from "@/components/workspace/credentials/credential-board"

export const metadata: Metadata = {
  title: "Kredensial",
}

export default function Page() {
  return <CredentialBoard />
}
