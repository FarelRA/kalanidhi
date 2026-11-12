import { NextResponse } from "next/server"

import { getAuthServer, isAuthConfigured } from "@/lib/auth-server"

const WINDOW_MS = 10 * 60_000
const MAX_ATTEMPTS = 5

type Bucket = { count: number; resetAt: number }

const attempts = new Map<string, Bucket>()

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

function rateLimited(key: string): boolean {
  const timestamp = Date.now()
  const bucket = attempts.get(key)
  if (!bucket || bucket.resetAt <= timestamp) {
    attempts.set(key, { count: 1, resetAt: timestamp + WINDOW_MS })
    return false
  }
  bucket.count += 1
  if (attempts.size > 5_000) {
    for (const [entryKey, entry] of attempts) {
      if (entry.resetAt <= timestamp) attempts.delete(entryKey)
    }
  }
  return bucket.count > MAX_ATTEMPTS
}

function genericFailure() {
  return NextResponse.json(
    { ok: false, message: "Nomor WhatsApp atau kata sandi tidak cocok." },
    { status: 401 },
  )
}

export async function POST(request: Request) {
  const internalKey = process.env.PAYMENTS_INTERNAL_KEY ?? ""
  const siteUrl = (
    process.env.CONVEX_SITE_URL ??
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
    ""
  ).replace(/\/$/, "")

  if (!internalKey || !siteUrl || !isAuthConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Login WhatsApp belum dikonfigurasi." },
      { status: 500 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, message: "Permintaan tidak sah." },
      { status: 400 },
    )
  }

  const phone =
    body && typeof body === "object"
      ? (body as { phone?: unknown }).phone
      : undefined
  const password =
    body && typeof body === "object"
      ? (body as { password?: unknown }).password
      : undefined

  if (typeof phone !== "string" || typeof password !== "string" || !phone) {
    return NextResponse.json(
      { ok: false, message: "Nomor WhatsApp dan kata sandi wajib diisi." },
      { status: 400 },
    )
  }

  if (rateLimited(`${clientIp(request)}:${phone}`)) {
    return NextResponse.json(
      { ok: false, message: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429 },
    )
  }

  let email: string | null = null
  try {
    const lookup = await fetch(`${siteUrl}/internal/login-email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-key": internalKey,
      },
      body: JSON.stringify({ phone }),
      cache: "no-store",
    })

    if (lookup.ok) {
      const payload = (await lookup.json()) as { email?: unknown }
      email = typeof payload.email === "string" ? payload.email : null
    }
  } catch {
    return NextResponse.json(
      { ok: false, message: "Layanan masuk belum tersedia." },
      { status: 502 },
    )
  }

  if (!email) return genericFailure()

  const headers = new Headers(request.headers)
  headers.set("content-type", "application/json")
  headers.delete("content-length")
  headers.delete("host")

  const signInRequest = new Request(
    new URL("/api/auth/sign-in/email", request.url),
    {
      method: "POST",
      headers,
      body: JSON.stringify({ email, password }),
    },
  )

  try {
    return await getAuthServer().handler.POST(signInRequest)
  } catch {
    return genericFailure()
  }
}
