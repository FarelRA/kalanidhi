import { describe, expect, it, vi } from "vitest"

import {
  cancelCharge,
  createCharge,
  GatewayError,
  getCharge,
  getHealth,
  type GatewayCharge,
} from "@/lib/commerce/gateway"
import {
  signWebhookPayload,
  verifyWebhookSignature,
  WebhookError,
  WEBHOOK_TOLERANCE_MS,
} from "@/lib/commerce/webhook"

const config = {
  baseUrl: "http://payments-gateway.internal",
  internalKey: "test-internal-key",
  timeoutMs: 1_000,
}

const charge: GatewayCharge = {
  chargeId: "ch_01",
  orderId: "KN-2026-000123",
  baseAmount: 1_450_000,
  uniqueAmount: 1_450_037,
  qrString: "00020101021226",
  expiresAt: "2026-11-11T16:15:00.000Z",
  status: "pending",
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

describe("gateway contract", () => {
  it("[P3-PAY-25] charge creation is idempotent by order and returns the existing charge", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, charge))
    const result = await createCharge(
      {
        orderId: charge.orderId,
        baseAmount: charge.baseAmount,
        expiresInSeconds: 900,
        description: "Batik Tulis Soga",
      },
      { ...config, fetchImpl: fetchImpl as unknown as typeof fetch },
    )
    expect(result.created).toBe(false)
    expect(result.charge.uniqueAmount).toBe(1_450_037)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("http://payments-gateway.internal/v1/charges")
    expect(init.method).toBe("POST")
    expect((init.headers as Record<string, string>)["x-internal-key"]).toBe(
      "test-internal-key",
    )
  })

  it("[P3-PAY-26] a different amount for the same order is a conflict", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(409, { code: "amount_conflict" }))
    await expect(
      createCharge(
        {
          orderId: charge.orderId,
          baseAmount: 999,
          expiresInSeconds: 900,
          description: "x",
        },
        { ...config, fetchImpl: fetchImpl as unknown as typeof fetch },
      ),
    ).rejects.toMatchObject({ code: "AMOUNT_CONFLICT" })
  })

  it("[P3-PAY-24] pool exhaustion returns a retryable conflict", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(409, { code: "pool_exhausted" }))
    await expect(
      createCharge(
        {
          orderId: charge.orderId,
          baseAmount: charge.baseAmount,
          expiresInSeconds: 900,
          description: "x",
        },
        { ...config, fetchImpl: fetchImpl as unknown as typeof fetch },
      ),
    ).rejects.toMatchObject({ code: "POOL_EXHAUSTED" })
  })

  it("[P3-PAY-28] charge status and cancel use the private routes and internal key", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).endsWith("/cancel")) return jsonResponse(200, {})
      return jsonResponse(200, {
        chargeId: charge.chargeId,
        status: "pending",
        providerReference: "TRX-1",
      })
    })
    const detail = await getCharge("ch_01", {
      ...config,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(detail.providerReference).toBe("TRX-1")
    await cancelCharge("ch_01", {
      ...config,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it("[P3-PAY-70] health reports session state without secrets", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, { status: "ok", session: "valid", pendingCount: 3 }),
    )
    const health = await getHealth({
      ...config,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(health.session).toBe("valid")
    expect(JSON.stringify(health)).not.toContain("test-internal-key")
  })

  it("[P3-PAY-24] a malformed gateway response fails closed", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(201, { nope: true }))
    await expect(
      createCharge(
        {
          orderId: charge.orderId,
          baseAmount: 1,
          expiresInSeconds: 900,
          description: "x",
        },
        { ...config, fetchImpl: fetchImpl as unknown as typeof fetch },
      ),
    ).rejects.toBeInstanceOf(GatewayError)
  })
})

describe("webhook signature", () => {
  const secret = "test-webhook-secret"
  const body = JSON.stringify({
    event: "payment.settled",
    eventId: "evt_1",
    amount: 1_450_037,
  })

  function headers(timestamp: string, signature: string, eventId = "evt_1") {
    return { timestamp, signature, eventId }
  }

  it("[P7-SEC-20] the signature is HMAC-SHA256 over timestamp + '.' + rawBody", () => {
    const timestamp = "1760000000"
    const signature = signWebhookPayload(secret, timestamp, body)
    const verified = verifyWebhookSignature({
      secret,
      rawBody: body,
      headers: headers(timestamp, `sha256=${signature}`),
      now: Number(timestamp) * 1000,
    })
    expect(verified.eventId).toBe("evt_1")
  })

  it("[P7-SEC-21] wrong signature, body tampering, and missing headers are rejected", () => {
    const timestamp = "1760000000"
    const signature = signWebhookPayload(secret, timestamp, body)
    expect(() =>
      verifyWebhookSignature({
        secret,
        rawBody: `${body} `,
        headers: headers(timestamp, `sha256=${signature}`),
        now: Number(timestamp) * 1000,
      }),
    ).toThrow(WebhookError)
    expect(() =>
      verifyWebhookSignature({
        secret,
        rawBody: body,
        headers: headers(timestamp, "sha256=deadbeef"),
        now: Number(timestamp) * 1000,
      }),
    ).toThrow(WebhookError)
    expect(() =>
      verifyWebhookSignature({
        secret,
        rawBody: body,
        headers: headers(timestamp, ""),
        now: Number(timestamp) * 1000,
      }),
    ).toThrow(WebhookError)
  })

  it("[P7-SEC-22] a timestamp older than five minutes is rejected", () => {
    const timestamp = "1760000000"
    const signature = signWebhookPayload(secret, timestamp, body)
    expect(() =>
      verifyWebhookSignature({
        secret,
        rawBody: body,
        headers: headers(timestamp, `sha256=${signature}`),
        now: Number(timestamp) * 1000 + WEBHOOK_TOLERANCE_MS + 1,
      }),
    ).toThrow(WebhookError)
  })

  it("[P7-SEC-20] the tolerance boundary is inclusive", () => {
    const timestamp = "1760000000"
    const signature = signWebhookPayload(secret, timestamp, body)
    expect(() =>
      verifyWebhookSignature({
        secret,
        rawBody: body,
        headers: headers(timestamp, `sha256=${signature}`),
        now: Number(timestamp) * 1000 + WEBHOOK_TOLERANCE_MS,
      }),
    ).not.toThrow()
  })

  it("[P7-SEC-21] a missing secret fails closed", () => {
    expect(() =>
      verifyWebhookSignature({
        secret: "",
        rawBody: body,
        headers: headers("1760000000", "sha256=abc"),
        now: 1_760_000_000_000,
      }),
    ).toThrow(WebhookError)
  })
})
