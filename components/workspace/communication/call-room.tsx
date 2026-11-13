"use client"

import dynamic from "next/dynamic"

const CallRoomLive = dynamic(
  () => import("./call-room-live").then((module) => module.CallRoomLive),
  {
    ssr: false,
    loading: () => (
      <div className="border border-ink/20 bg-paper-2 p-6 text-[12px] text-ink-muted">
        Menyiapkan ruang panggilan…
      </div>
    ),
  },
)

/** One route, one shell. Every session renders the Convex-backed LiveKit room. */
export function CallRoom({
  initialCallId,
  initialConversationId,
}: {
  initialCallId?: string
  initialConversationId?: string
}) {
  return (
    <CallRoomLive
      initialCallId={initialCallId}
      initialConversationId={initialConversationId}
    />
  )
}
