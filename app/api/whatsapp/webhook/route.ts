import { NextResponse } from "next/server"

import { constantTimeEqual } from "@/lib/security/constant-time"

const TOKEN_MARKER = "Verifikasi KalaNidhi:"

function tokenFromBody(body: string): string | null {
  const markerIndex = body.indexOf(TOKEN_MARKER)
  if (markerIndex >= 0) {
    const candidate = body
      .slice(markerIndex + TOKEN_MARKER.length)
      .trim()
      .match(/^[A-Za-z0-9-]+/)?.[0]
    if (candidate) return candidate
  }

  return body.match(/\bKN-[A-Za-z0-9-]+\b/)?.[0] ?? null
}

function failure(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status })
}

export async function POST(request: Request) {
  const secret = process.env.WAHA_WEBHOOK_SECRET ?? ""
  const internalKey = process.env.PAYMENTS_INTERNAL_KEY ?? ""
  const siteUrl = (
    process.env.CONVEX_SITE_URL ??
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
    ""
  ).replace(/\/$/, "")

  if (!secret || !internalKey || !siteUrl) {
    return failure(500, "Webhook WhatsApp belum dikonfigurasi.")
  }

  if (
    !constantTimeEqual(request.headers.get("x-kalanidhi-webhook"), secret)
  ) {
    return failure(401, "Rahasia webhook tidak sah.")
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return failure(400, "Payload webhook bukan JSON yang sah.")
  }

  if (!payload || typeof payload !== "object") {
    return failure(400, "Payload webhook tidak sah.")
  }

  const envelope = payload as {
    event?: unknown
    payload?: {
      from?: unknown
      body?: unknown
      id?: unknown
      _data?: {
        key?: {
          remoteJidAlt?: unknown
          participantAlt?: unknown
          addressingMode?: unknown
        }
      }
    }
  }

  if (envelope.event !== "message") {
    return NextResponse.json({ ok: true, ignored: true, reason: "event" })
  }

  const message = envelope.payload
  if (!message || typeof message !== "object") {
    return failure(400, "Payload pesan tidak sah.")
  }

  const key = message._data?.key
  const alt =
    typeof key?.remoteJidAlt === "string"
      ? key.remoteJidAlt
      : typeof key?.participantAlt === "string"
        ? key.participantAlt
        : ""
  const from =
    alt || (typeof message.from === "string" ? message.from : "")
  const text = typeof message.body === "string" ? message.body : ""
  if (!from || !text) {
    return failure(400, "Payload pesan tidak lengkap.")
  }

  const phone = from.split("@")[0]?.replace(/\D/g, "") ?? ""
  if (!phone) {
    return failure(400, "Nomor pengirim tidak sah.")
  }

  const token = tokenFromBody(text)
  if (!token) {
    return NextResponse.json({ ok: true, ignored: true, reason: "token" })
  }

  try {
    const verify = await fetch(`${siteUrl}/internal/whatsapp-verify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-key": internalKey,
      },
      body: JSON.stringify({
        token,
        phone,
        messageId: typeof message.id === "string" ? message.id : undefined,
      }),
      cache: "no-store",
    })

    if (!verify.ok) {
      return failure(502, "Verifikasi WhatsApp belum dapat diproses.")
    }

    const result = (await verify.json()) as Record<string, unknown>
    return NextResponse.json({ ok: true, ...result })
  } catch {
    return failure(502, "Verifikasi WhatsApp belum dapat diproses.")
  }
}
