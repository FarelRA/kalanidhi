/**
 * Private payments gateway client.
 *
 * The gateway lives in `FarelRA/kalanidhi-payments`; this module is the only
 * app-side boundary. It never imports the gateway repo, never contains provider
 * protocol code, and accepts an injected `fetch` so tests never call GoPay.
 */

export type GatewayChargeStatus =
  | "pending"
  | "paid"
  | "expired"
  | "failed"
  | "cancelled"
  | "refunded"

export type GatewayCharge = {
  chargeId: string
  orderId: string
  baseAmount: number
  uniqueAmount: number
  qrString?: string
  qrImageUrl?: string
  expiresAt: string
  status: GatewayChargeStatus
}

export type GatewayChargeDetail = {
  chargeId: string
  status: GatewayChargeStatus
  providerReference?: string | null
  paidAt?: string | null
  providerTransactionId?: string | null
}

export type GatewayHealth = {
  status: "ok" | "degraded" | "down"
  session?: "valid" | "expired" | "missing"
  pendingCount?: number
  lastReconcileAt?: string | null
  uptimeSeconds?: number
}

export type CreateChargeInput = {
  orderId: string
  baseAmount: number
  expiresInSeconds: number
  description: string
}

export type GatewayConfig = {
  baseUrl: string
  internalKey: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

export class GatewayError extends Error {
  readonly code:
    | "NOT_CONFIGURED"
    | "AMOUNT_CONFLICT"
    | "POOL_EXHAUSTED"
    | "REQUEST_FAILED"
    | "INVALID_RESPONSE"

  readonly status?: number

  constructor(
    code: GatewayError["code"],
    message: string,
    status?: number,
  ) {
    super(message)
    this.name = "GatewayError"
    this.code = code
    this.status = status
  }
}

const DEFAULT_TIMEOUT_MS = 8_000

function configFromEnv(): Required<Pick<GatewayConfig, "baseUrl" | "internalKey">> & {
  timeoutMs: number
} {
  const baseUrl = process.env.PAYMENTS_GATEWAY_URL ?? ""
  const internalKey = process.env.PAYMENTS_INTERNAL_KEY ?? ""
  const timeoutMs = Number(process.env.PAYMENTS_GATEWAY_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS)
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    internalKey,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS,
  }
}

export function isGatewayConfigured(): boolean {
  const config = configFromEnv()
  return Boolean(config.baseUrl && config.internalKey)
}

async function request<T>(
  config: GatewayConfig,
  path: string,
  init: RequestInit,
): Promise<{ status: number; body: T }> {
  if (!config.baseUrl || !config.internalKey) {
    throw new GatewayError(
      "NOT_CONFIGURED",
      "Payment gateway URL or internal key is not configured.",
    )
  }

  const fetchImpl = config.fetchImpl ?? fetch
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(`${config.baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-internal-key": config.internalKey,
        ...(init.headers ?? {}),
      },
      cache: "no-store",
      redirect: "error",
    })

    const text = await response.text()
    const body = text ? (JSON.parse(text) as T) : ({} as T)
    return { status: response.status, body }
  } catch (error) {
    if (error instanceof GatewayError) throw error
    throw new GatewayError(
      "REQUEST_FAILED",
      error instanceof Error ? error.message : "Gateway request failed.",
    )
  } finally {
    clearTimeout(timer)
  }
}

function validCharge(value: GatewayCharge): GatewayCharge {
  if (
    !value ||
    typeof value.chargeId !== "string" ||
    !Number.isInteger(value.baseAmount) ||
    !Number.isInteger(value.uniqueAmount) ||
    typeof value.expiresAt !== "string"
  ) {
    throw new GatewayError("INVALID_RESPONSE", "Gateway returned a malformed charge.")
  }
  return value
}

/**
 * Creates a charge. The gateway is idempotent by `orderId`: 201 creates,
 * 200 returns the existing charge, 409 means the order already has a charge
 * with a different amount, and 409 can also mean the unique-amount pool is
 * exhausted (retryable).
 */
export async function createCharge(
  input: CreateChargeInput,
  config: GatewayConfig = configFromEnv(),
): Promise<{ charge: GatewayCharge; created: boolean }> {
  const { status, body } = await request<GatewayCharge & { code?: string }>(
    config,
    "/v1/charges",
    { method: "POST", body: JSON.stringify(input) },
  )

  if (status === 409) {
    const code = body?.code
    if (code === "pool_exhausted" || code === "POOL_EXHAUSTED") {
      throw new GatewayError(
        "POOL_EXHAUSTED",
        "Nominal unik habis. Coba lagi sebentar.",
        status,
      )
    }
    throw new GatewayError(
      "AMOUNT_CONFLICT",
      "Pesanan ini sudah memiliki tagihan dengan nominal berbeda.",
      status,
    )
  }

  if (status !== 200 && status !== 201) {
    throw new GatewayError(
      "REQUEST_FAILED",
      `Gateway charge failed with status ${status}.`,
      status,
    )
  }

  return { charge: validCharge(body), created: status === 201 }
}

export async function getCharge(
  chargeId: string,
  config: GatewayConfig = configFromEnv(),
): Promise<GatewayChargeDetail> {
  const { status, body } = await request<GatewayChargeDetail>(
    config,
    `/v1/charges/${encodeURIComponent(chargeId)}`,
    { method: "GET" },
  )
  if (status !== 200 || !body?.chargeId) {
    throw new GatewayError(
      "REQUEST_FAILED",
      `Gateway status failed with status ${status}.`,
      status,
    )
  }
  return body
}

export async function cancelCharge(
  chargeId: string,
  config: GatewayConfig = configFromEnv(),
): Promise<void> {
  const { status } = await request<Record<string, never>>(
    config,
    `/v1/charges/${encodeURIComponent(chargeId)}/cancel`,
    { method: "POST", body: JSON.stringify({}) },
  )
  if (status !== 200 && status !== 204) {
    throw new GatewayError(
      "REQUEST_FAILED",
      `Gateway cancel failed with status ${status}.`,
      status,
    )
  }
}

export async function reconcileOnce(
  config: GatewayConfig = configFromEnv(),
): Promise<{ settled?: number; pending?: number }> {
  const { status, body } = await request<{ settled?: number; pending?: number }>(
    config,
    "/v1/reconcile",
    { method: "POST", body: JSON.stringify({}) },
  )
  if (status !== 200) {
    throw new GatewayError(
      "REQUEST_FAILED",
      `Gateway reconcile failed with status ${status}.`,
      status,
    )
  }
  return body ?? {}
}

export async function getHealth(
  config: GatewayConfig = configFromEnv(),
): Promise<GatewayHealth> {
  const { status, body } = await request<GatewayHealth>(config, "/v1/health", {
    method: "GET",
  })
  if (status !== 200) {
    throw new GatewayError(
      "REQUEST_FAILED",
      `Gateway health failed with status ${status}.`,
      status,
    )
  }
  return body
}
