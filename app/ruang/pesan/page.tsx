import type { Metadata } from "next"

import { MessageCenter } from "@/components/workspace/communication/message-center"

export const metadata: Metadata = {
  title: "Pesan",
}

export default function Page() {
  return <MessageCenter />
}
