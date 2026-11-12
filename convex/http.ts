import { httpRouter } from "convex/server"

import { constantTimeEqual } from "../lib/security/constant-time"
import { internal } from "./_generated/api"
import { httpAction } from "./_generated/server"
import { authComponent, createAuth } from "./auth"

const http = httpRouter()

authComponent.registerRoutes(http, createAuth)

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  })
}

function authorized(request: Request): boolean {
  return constantTimeEqual(
    request.headers.get("x-internal-key"),
    process.env.PAYMENTS_INTERNAL_KEY,
  )
}

function stringField(body: unknown, key: string): string {
  if (!body || typeof body !== "object") return ""
  const value = (body as Record<string, unknown>)[key]
  return typeof value === "string" ? value : ""
}

http.route({
  path: "/internal/login-email",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) {
      return json({ ok: false, error: "unauthorized" }, 401)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return json({ ok: false, error: "malformed" }, 400)
    }

    const phone = stringField(body, "phone")
    if (!phone) {
      return json({ ok: false, error: "malformed" }, 400)
    }

    const email = await ctx.runQuery(internal.users.emailForPhone, { phone })
    return json({ ok: true, email })
  }),
})

http.route({
  path: "/internal/whatsapp-verify",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) {
      return json({ ok: false, error: "unauthorized" }, 401)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return json({ ok: false, error: "malformed" }, 400)
    }

    const token = stringField(body, "token")
    const phone = stringField(body, "phone")
    const messageId = stringField(body, "messageId") || undefined
    if (!token || !phone) {
      return json({ ok: false, error: "malformed" }, 400)
    }

    const result = await ctx.runMutation(internal.users.verifyWhatsappToken, {
      token,
      phone,
      messageId,
    })
    return json({ ok: true, ...result })
  }),
})

export default http
