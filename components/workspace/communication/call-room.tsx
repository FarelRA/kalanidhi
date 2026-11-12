"use client"

import dynamic from "next/dynamic"

import { useViewer } from "@/components/workspace/shell/viewer-provider"

const CallRoomPreview = dynamic(
  () =>
    import("./call-room-preview").then((module) => module.CallRoomPreview),
  {
    ssr: false,
    loading: () => (
      <div className="border border-ink/20 bg-paper-2 p-6 text-[12px] text-ink-muted">
        Menyiapkan pratinjau panggilan…
      </div>
    ),
  },
)

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

/**
 * One route, one shell. The approved prototype stays behind explicit preview
 * mode; every real session renders the Convex-backed LiveKit room.
 */
export function CallRoom({
  initialCallId,
  initialConversationId,
}: {
  initialCallId?: string
  initialConversationId?: string
}) {
  const { isPreview } = useViewer()
  return isPreview ? (
    <CallRoomPreview />
  ) : (
    <CallRoomLive
      initialCallId={initialCallId}
      initialConversationId={initialConversationId}
    />
  )
}
