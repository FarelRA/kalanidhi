import { readFile } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

async function source(relativePath: string): Promise<string> {
  return await readFile(path.join(process.cwd(), relativePath), "utf8")
}

describe("calls / live mode and mock isolation", () => {
  it("[P5-CALL-30] the live call room uses Convex and LiveKit, never mock records", async () => {
    const live = await source("components/workspace/communication/call-room-live.tsx")
    expect(live).toContain("@/convex/_generated/api")
    expect(live).toContain('from "convex/react"')
    expect(live).toContain("useQuery")
    expect(live).toContain("LiveKitRoom")
    expect(live).toContain("RoomAudioRenderer")
    expect(live).toContain("VideoTrack")
    expect(live).toContain("useTracks")
    expect(live).toContain("useParticipants")
    expect(live).toContain("useLocalParticipant")
    expect(live).toContain("useRoomContext")
    expect(live).not.toContain("mock-data")
    expect(live).not.toContain("lib/workspace/mock")
    expect(live).not.toContain("@livekit/components-styles")
  })

  it("[P5-CALL-31] the call route renders the live LiveKit room with no preview branch", async () => {
    const wrapper = await source("components/workspace/communication/call-room.tsx")
    expect(wrapper).toContain("call-room-live")
    expect(wrapper).toContain("CallRoomLive")
    expect(wrapper).not.toContain("isPreview")
    expect(wrapper).not.toContain("Preview")
    expect(wrapper).not.toContain("mock-data")
  })

  it("[P5-CALL-32] the route renders the shared call room and stays noindex by layout", async () => {
    const page = await source("app/ruang/panggilan/page.tsx")
    expect(page).toContain("CallRoom")
    expect(page).not.toContain("mock-data")

    const layout = await source("app/ruang/layout.tsx")
    expect(layout).toContain("index: false")
  })

  it("[P5-CALL-33] the live message centre starts a call from an allowed conversation", async () => {
    const live = await source(
      "components/workspace/communication/message-center-live.tsx",
    )
    expect(live).toContain("api.calls.startCall")
    expect(live).toContain("router.push")
    expect(live).toContain("/ruang/panggilan?call=")
    expect(live).toContain('can("calls.start")')
    expect(live).not.toContain("mock-data")
  })

  it("[P5-CALL-34] the token route is server-only and returns no secret", async () => {
    const route = await source("app/api/livekit/token/route.ts")
    expect(route).toContain("createRoomToken")
    expect(route).toContain("readLiveKitConfig")
    expect(route).toContain("LIVEKIT_API_SECRET")
    expect(route).not.toContain("apiSecret:")
    expect(route).not.toContain("secret:")
    expect(route).not.toContain("console.log")

    const token = await source("lib/livekit/token.ts")
    expect(token).toContain("AccessToken")
    expect(token).toContain("roomJoin: true")
    expect(token).toContain("canPublishData: true")
    expect(token).not.toContain("console.log")

    const config = await source("lib/livekit/config.ts")
    expect(config).toContain("LIVEKIT_API_KEY")
    expect(config).toContain("LIVEKIT_API_SECRET")
    expect(config).toContain("NEXT_PUBLIC_LIVEKIT_URL")
  })
})
