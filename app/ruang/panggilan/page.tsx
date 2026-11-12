import type { Metadata } from "next"

import { CallRoom } from "@/components/workspace/communication/call-room"

export const metadata: Metadata = {
  title: "Panggilan",
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ call?: string; percakapan?: string }>
}) {
  const params = await searchParams
  return (
    <CallRoom
      initialCallId={params.call}
      initialConversationId={params.percakapan}
    />
  )
}
