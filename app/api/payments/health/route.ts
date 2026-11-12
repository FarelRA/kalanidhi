import { NextResponse } from "next/server"

import { api } from "@/convex/_generated/api"
import { getAuthServer, isAuthConfigured } from "@/lib/auth-server"
import { getHealth, isGatewayConfigured } from "@/lib/commerce/gateway"
import { recordGatewayHealth } from "@/lib/commerce/server"

/**
 * Admin-only gateway probe. The gateway is never reachable from the browser;
 * the signed-in operator triggers one health read and the result is recorded
 * in Convex integration health.
 */
export async function POST() {
  if (!isAuthConfigured() || !isGatewayConfigured()) {
    return NextResponse.json(
      { ok: false, code: "NOT_CONFIGURED" },
      { status: 503 },
    )
  }

  const auth = getAuthServer()
  if (!(await auth.isAuthenticated())) {
    return NextResponse.json({ ok: false, code: "UNAUTHENTICATED" }, { status: 401 })
  }
  const viewer = await auth.fetchAuthQuery(api.access.getViewer)
  if (!viewer?.capabilities.includes("payments.manage")) {
    return NextResponse.json({ ok: false, code: "FORBIDDEN" }, { status: 403 })
  }

  const startedAt = Date.now()
  try {
    const health = await getHealth()
    const latencyMs = Date.now() - startedAt
    const status =
      health.status === "ok" ? "healthy" : health.status === "degraded" ? "degraded" : "down"

    await recordGatewayHealth({
      internalKey: process.env.PAYMENTS_INTERNAL_KEY ?? "",
      status,
      message: health.session ? `session:${health.session}` : undefined,
      latencyMs,
    })

    return NextResponse.json({
      ok: true,
      health: {
        ...health,
        latencyMs,
      },
    })
  } catch {
    await recordGatewayHealth({
      internalKey: process.env.PAYMENTS_INTERNAL_KEY ?? "",
      status: "down",
      message: "Gateway health probe failed.",
      latencyMs: Date.now() - startedAt,
    }).catch(() => undefined)
    return NextResponse.json(
      { ok: false, code: "GATEWAY_DOWN" },
      { status: 503 },
    )
  }
}
