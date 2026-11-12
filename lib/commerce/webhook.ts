import { createHmac, timingSafeEqual } from "node:crypto"

export const WEBHOOK_TOLERANCE_MS = 5 * 60 * 1000
export const WEBHOOK_SIGNATURE_PREFIX = "sha256="

export type WebhookHeaders = {
  signature: string | null
  timestamp: string | null
  eventId: string | null
}

export type VerifyWebhookInput = {
  secret: string
  rawBody: string
  headers: WebhookHeaders
  now?: number
}

export type VerifiedWebhook = {
  timestamp: number
  eventId: string | null
}

export class WebhookError extends Error {
  readonly code:
    | "MISSING_SECRET"
    | "MISSING_SIGNATURE"
    | "INVALID_SIGNATURE"
    | "STALE_TIMESTAMP"
    | "INVALID_TIMESTAMP"

  constructor(code: WebhookError["code"], message: string) {
    super(message)
    this.name = "WebhookError"
    this.code = code
  }
}

export function signWebhookPayload(
  secret: string,
  timestamp: string,
  rawBody: string,
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")
}

/**
 * Verifies the gateway signature: HMAC-SHA256 over `timestamp + "." + rawBody`,
 * sent as `sha256=<hex>`. Timestamps older than five minutes are rejected and
 * comparison is timing-safe. A missing secret fails closed.
 */
export function verifyWebhookSignature(input: VerifyWebhookInput): VerifiedWebhook {
  const { secret, rawBody, headers } = input
  if (!secret) {
    throw new WebhookError("MISSING_SECRET", "Webhook secret is not configured.")
  }
  if (!headers.signature) {
    throw new WebhookError("MISSING_SIGNATURE", "Signature header is missing.")
  }
  if (!headers.timestamp) {
    throw new WebhookError("INVALID_TIMESTAMP", "Timestamp header is missing.")
  }

  const timestampSeconds = Number(headers.timestamp)
  if (!Number.isFinite(timestampSeconds) || timestampSeconds <= 0) {
    throw new WebhookError("INVALID_TIMESTAMP", "Timestamp header is invalid.")
  }
  const now = input.now ?? Date.now()
  if (Math.abs(now - timestampSeconds * 1000) > WEBHOOK_TOLERANCE_MS) {
    throw new WebhookError(
      "STALE_TIMESTAMP",
      "Webhook timestamp is outside the allowed window.",
    )
  }

  const expected = signWebhookPayload(secret, headers.timestamp, rawBody)
  const supplied = headers.signature.startsWith(WEBHOOK_SIGNATURE_PREFIX)
    ? headers.signature.slice(WEBHOOK_SIGNATURE_PREFIX.length)
    : headers.signature

  const expectedBytes = Buffer.from(expected, "utf8")
  const suppliedBytes = Buffer.from(supplied, "utf8")
  if (
    expectedBytes.length !== suppliedBytes.length ||
    !timingSafeEqual(expectedBytes, suppliedBytes)
  ) {
    throw new WebhookError("INVALID_SIGNATURE", "Webhook signature is invalid.")
  }

  return { timestamp: timestampSeconds, eventId: headers.eventId }
}
