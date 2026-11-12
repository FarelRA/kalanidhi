import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TokenVerifier } from "livekit-server-sdk"

import type { Viewer } from "@/lib/access/viewer"
import type { CallDetail } from "@/lib/calls/types"

const state = vi.hoisted(() => ({
  authenticated: true,
  configured: true,
  viewer: null as Viewer | null,
  call: null as unknown,
  error: null as unknown,
}))

vi.mock("@/lib/auth-server", () => ({
  isAuthConfigured: () => state.configured,
  getAuthServer: () => ({
    isAuthenticated: async () => state.authenticated,
    fetchAuthQuery: async (_reference: unknown, args?: unknown) => {
      const hasCallId =
        typeof args === "object" &&
        args !== null &&
        "callId" in (args as Record<string, unknown>)
      if (!hasCallId) return state.viewer
      if (state.error) throw state.error
      return state.call
    },
  }),
}))

import { POST } from "@/app/api/livekit/token/route"

const API_KEY = "test-livekit-key"
const API_SECRET = "test-livekit-secret-that-must-not-leak"
const SERVER_URL = "wss://livekit.internal.test"
const CLIENT_URL = "wss://livekit.test"

const originalEnv = {
  LIVEKIT_URL: process.env.LIVEKIT_URL,
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
  NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
}

function viewer(overrides: Partial<Viewer> = {}): Viewer {
  const capabilities = overrides.capabilities ?? ["calls.start"]
  return {
    userId: "user-student",
    authUserId: "auth-student",
    name: "Anisa Rahmawati",
    email: "anisa@example.test",
    initials: "AR",
    region: "Yogyakarta",
    roles: ["student"],
    status: "active",
    capabilities,
    entitlements: {
      learn: true,
      teach: false,
      assess: false,
      sell: false,
      sellActive: false,
      buy: true,
      operate: false,
    },
    roleLabel: "Peserta",
    teacherProfile: null,
    sellerProfile: null,
    certificates: [],
    enrollments: [],
    teachScopes: [],
    assessScopes: [],
    sellScopes: [],
    ...overrides,
  }
}

function call(overrides: Partial<CallDetail> = {}): CallDetail {
  return {
    id: "call-one",
    roomName: "kn-call-call-one",
    kind: "video",
    scope: "direct",
    title: "Panggilan dengan Bambang",
    status: "active",
    initiatorId: "user-student",
    hostId: "user-student",
    conversationId: "conversation-one",
    cohortId: null,
    cohortSessionId: null,
    scheduledAt: null,
    scheduledEndsAt: null,
    startedAt: Date.now() - 5_000,
    endedAt: null,
    durationMs: null,
    recordingConsent: "pending",
    recordingEnabled: false,
    recordingConsentUserIds: [],
    recordingConsentRequired: 2,
    qualitySummary: null,
    participants: [],
    viewerRole: "host",
    isHost: true,
    canJoin: true,
    canEnd: true,
    monitorOnly: false,
    joinBlockedReason: null,
    createdAt: Date.now() - 20_000,
    ...overrides,
  }
}

function request(body: unknown = { callId: "call-one" }) {
  return new Request("http://localhost/api/livekit/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  state.authenticated = true
  state.configured = true
  state.viewer = viewer()
  state.call = call()
  state.error = null
  process.env.LIVEKIT_URL = SERVER_URL
  process.env.LIVEKIT_API_KEY = API_KEY
  process.env.LIVEKIT_API_SECRET = API_SECRET
  process.env.NEXT_PUBLIC_LIVEKIT_URL = CLIENT_URL
})

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe("calls / token route", () => {
  it("[P5-CALL-01] requires an authenticated session and a calls capability", async () => {
    state.authenticated = false
    const unauthenticated = await POST(request())
    expect(unauthenticated.status).toBe(401)
    expect((await unauthenticated.json()).code).toBe("UNAUTHENTICATED")

    state.authenticated = true
    state.viewer = viewer({ capabilities: ["messages.read.own"] })
    const forbidden = await POST(request())
    expect(forbidden.status).toBe(403)
    expect((await forbidden.json()).code).toBe("FORBIDDEN")
  })

  it("[P5-CALL-04] monitor-only admins never receive a media token", async () => {
    state.viewer = viewer({
      roles: ["admin"],
      roleLabel: "Pengelola",
      capabilities: ["calls.monitor", "messages.read.own"],
      entitlements: {
        learn: false,
        teach: false,
        assess: false,
        sell: false,
        sellActive: false,
        buy: true,
        operate: true,
      },
    })
    state.call = call({ monitorOnly: true, canJoin: false, viewerRole: null })

    const response = await POST(request())
    expect(response.status).toBe(403)
    expect((await response.json()).code).toBe("MONITOR_ONLY")
  })

  it("[P5-CALL-06] returns only a short-lived room token and the public URL", async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    const payload = (await response.json()) as Record<string, unknown>
    expect(Object.keys(payload).sort()).toEqual(["token", "url"])
    expect(payload.url).toBe(CLIENT_URL)
    expect(typeof payload.token).toBe("string")

    const verifier = new TokenVerifier(API_KEY, API_SECRET)
    const claims = await verifier.verify(payload.token as string)
    expect(claims.sub).toBe("user-student")
    expect(claims.name).toBe("Anisa Rahmawati")
    expect(claims.video?.room).toBe("kn-call-call-one")
    expect(claims.video?.roomJoin).toBe(true)
    expect(claims.video?.canPublish).toBe(true)
    expect(claims.video?.canSubscribe).toBe(true)
    expect(claims.video?.canPublishData).toBe(true)
    expect(claims.exp).toBeTypeOf("number")
    expect(claims.nbf).toBeTypeOf("number")
    expect((claims.exp ?? 0) - (claims.nbf ?? 0)).toBeLessThanOrEqual(900)
    expect(JSON.parse(claims.metadata ?? "{}")).toMatchObject({
      callId: "call-one",
    })

    const serialised = JSON.stringify(payload)
    expect(serialised).not.toContain(API_SECRET)
    expect(serialised).not.toContain(SERVER_URL)
  })

  it("[P5-CALL-06b] missing LiveKit configuration returns a stable code without values", async () => {
    delete process.env.LIVEKIT_API_SECRET
    const response = await POST(request())
    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body.code).toBe("LIVEKIT_NOT_CONFIGURED")
    expect(JSON.stringify(body)).not.toContain(API_KEY)
    expect(JSON.stringify(body)).not.toContain(SERVER_URL)
  })

  it("[P5-CALL-08] a scheduled call must ring before a token is issued", async () => {
    state.call = call({
      status: "scheduled",
      viewerRole: "host",
      canJoin: false,
      startedAt: null,
    })
    const response = await POST(request())
    expect(response.status).toBe(409)
    expect((await response.json()).code).toBe("CALL_NOT_STARTED")
  })

  it("[P5-CALL-11] a guest waits for the host before entering the room", async () => {
    state.call = call({
      status: "ringing",
      viewerRole: "guest",
      isHost: false,
      canJoin: false,
      startedAt: null,
    })
    const response = await POST(request())
    expect(response.status).toBe(409)
    expect((await response.json()).code).toBe("WAITING_FOR_HOST")
  })

  it("[P5-CALL-08c] terminal calls never issue a token", async () => {
    state.call = call({
      status: "ended",
      canJoin: false,
      endedAt: Date.now(),
      durationMs: 5_000,
    })
    const response = await POST(request())
    expect(response.status).toBe(409)
    expect((await response.json()).code).toBe("CALL_ENDED")
  })

  it("[P5-CALL-05f] a blocked or restricted participant is denied a token", async () => {
    for (const code of ["BLOCKED", "MESSAGING_SUSPENDED"]) {
      state.error = null
      state.call = call({ canJoin: false, joinBlockedReason: code })
      const response = await POST(request())
      expect(response.status).toBe(403)
      expect((await response.json()).code).toBe(code)
    }
  })

  it("[P5-CALL-05g] membership, block, and restriction codes are passed through without detail", async () => {
    for (const code of [
      "NOT_FOUND",
      "BLOCKED",
      "MESSAGING_SUSPENDED",
      "SUSPENDED",
    ]) {
      state.error = { data: { code } }
      const response = await POST(request())
      const expected = code === "NOT_FOUND" ? 404 : 403
      expect(response.status).toBe(expected)
      const body = await response.json()
      expect(body.code).toBe(code)
      expect(JSON.stringify(body)).not.toContain(API_SECRET)
    }
  })
})
