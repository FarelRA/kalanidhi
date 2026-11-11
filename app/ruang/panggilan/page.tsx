import type { Metadata } from "next"

import { CallRoom } from "@/components/workspace/communication/call-room"

export const metadata: Metadata = {
  title: "Panggilan",
}

export default function Page() {
  return <CallRoom />
}
