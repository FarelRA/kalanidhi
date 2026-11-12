import { NextResponse } from "next/server"
import { z } from "zod"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { CallDetail } from "@/lib/calls/types"
import { getAuthServer, isAuthConfigured } from "@/lib/auth-server"
import { readLiveKitConfig } from "@/lib/livekit/config"
import { createRoomToken } from "@/lib/livekit/token"

const bodySchema = z.object({
  callId: z.string().trim().min(1).max(120),
})

const ERROR_STATUS: Record<string, number> = {
  UNAUTHENTICATED: 401,
  NOT_FOUND: 404,
  SUSPENDED: 403,
  FORBIDDEN: 403,
  BLOCKED: 403,
  MESSAGING_SUSPENDED: 403,
  MONITOR_ONLY: 403,
  CALL_NOT_STARTED: 409,
  WAITING_FOR_HOST: 409,
  CALL_ENDED: 409,
  CALL_NOT_JOINABLE: 409,
  INVALID_TRANSITION: 409,
  CALL_CAPACITY: 409,
  INVALID_INPUT: 400,
  INVALID_CALL: 400,
}

const ERROR_MESSAGE: Record<string, string> = {
  UNAUTHENTICATED: "Masuk diperlukan.",
  NOT_FOUND: "Panggilan tidak ditemukan.",
  SUSPENDED: "Akun ini sedang ditangguhkan.",
  FORBIDDEN: "Akun ini tidak dapat memakai panggilan.",
  BLOCKED: "Panggilan ini diblokir.",
  MESSAGING_SUSPENDED: "Panggilan dibatasi oleh pengelola.",
  MONITOR_ONLY: "Pengelola hanya dapat memantau metadata, bukan media.",
  CALL_NOT_STARTED: "Panggilan terjadwal belum dimulai.",
  WAITING_FOR_HOST: "Menunggu tuan rumah masuk ke ruang panggilan.",
  CALL_ENDED: "Panggilan ini sudah berakhir.",
  CALL_NOT_JOINABLE: "Panggilan ini belum dapat dimasuki.",
  CALL_CAPACITY: "Ruang panggilan sudah penuh.",
  INVALID_INPUT: "Permintaan panggilan tidak sah.",
  INVALID_CALL: "Panggilan tidak sah.",
}

function errorCode(error: unknown): string {
  if (typeof error === "object" && error && "data" in error) {
    const data = (error as { data?: { code?: string } }).data
    if (data?.code) return data.code
  }
  if (error instanceof z.ZodError) return "INVALID_INPUT"
  return "INVALID_CALL"
}

function errorResponse(error: unknown) {
  const code = errorCode(error)
  return NextResponse.json(
    {
      ok: false,
      code,
      message: ERROR_MESSAGE[code] ?? "Panggilan belum dapat diproses.",
    },
    { status: ERROR_STATUS[code] ?? 500 },
  )
}

/**
 * Issues a short-lived LiveKit room token after the viewer, call capability,
 * conversation membership, block, restriction, and call status checks.
 *
 * LIVEKIT_API_SECRET is read by readLiveKitConfig inside the server process.
 * It is used only as the token signing key and is never returned to the client.
 */
export async function POST(request: Request) {
  const configResult = readLiveKitConfig()
  if (!configResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: "LIVEKIT_NOT_CONFIGURED",
        message: "Panggilan belum tersambung ke server LiveKit.",
      },
      { status: 503 },
    )
  }

  if (!isAuthConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        code: "AUTH_NOT_CONFIGURED",
        message: "Sesi ruang kerja belum tersambung.",
      },
      { status: 503 },
    )
  }

  const auth = getAuthServer()
  if (!(await auth.isAuthenticated())) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHENTICATED", message: ERROR_MESSAGE.UNAUTHENTICATED },
      { status: 401 },
    )
  }

  const viewer = await auth.fetchAuthQuery(api.access.getViewer)
  if (!viewer) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHENTICATED", message: ERROR_MESSAGE.UNAUTHENTICATED },
      { status: 401 },
    )
  }

  const canStart = viewer.capabilities.includes("calls.start")
  const canMonitor = viewer.capabilities.includes("calls.monitor")
  if (!canStart && !canMonitor) {
    return NextResponse.json(
      { ok: false, code: "FORBIDDEN", message: ERROR_MESSAGE.FORBIDDEN },
      { status: 403 },
    )
  }
  if (!canStart) {
    return NextResponse.json(
      { ok: false, code: "MONITOR_ONLY", message: ERROR_MESSAGE.MONITOR_ONLY },
      { status: 403 },
    )
  }

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return errorResponse(parsed.error)

  let call: CallDetail
  try {
    call = await auth.fetchAuthQuery(api.calls.getCall, {
      callId: parsed.data.callId as Id<"callSessions">,
    })
  } catch (error) {
    return errorResponse(error)
  }

  if (!call) return errorResponse({ data: { code: "NOT_FOUND" } })
  if (call.monitorOnly) {
    return errorResponse({ data: { code: "MONITOR_ONLY" } })
  }
  if (
    call.joinBlockedReason === "BLOCKED" ||
    call.joinBlockedReason === "MESSAGING_SUSPENDED"
  ) {
    return errorResponse({ data: { code: call.joinBlockedReason } })
  }
  if (call.status === "scheduled") {
    return errorResponse({ data: { code: "CALL_NOT_STARTED" } })
  }
  if (call.status === "ringing" && !call.isHost) {
    return errorResponse({ data: { code: "WAITING_FOR_HOST" } })
  }
  if (call.status !== "active" && call.status !== "ringing") {
    return errorResponse({ data: { code: "CALL_ENDED" } })
  }
  if (!call.canJoin) {
    return errorResponse({
      data: { code: call.joinBlockedReason ?? "CALL_NOT_JOINABLE" },
    })
  }

  const { apiKey, apiSecret, clientUrl } = configResult.config
  const token = await createRoomToken({
    apiKey,
    apiSecret,
    roomName: call.roomName,
    identity: viewer.userId,
    name: viewer.name,
    metadata: {
      callId: call.id,
      role: call.viewerRole,
      scope: call.scope,
      status: call.status,
    },
  })

  // Only the token and the public client URL leave the server.
  return NextResponse.json({ token, url: clientUrl })
}
