import { NextResponse } from "next/server"
import { z } from "zod"

import { settlePayment } from "@/lib/commerce/server"
import {
  verifyWebhookSignature,
  WebhookError,
} from "@/lib/commerce/webhook"

const payloadSchema = z.object({
  event: z.literal("payment.settled"),
  eventId: z.string().min(1).max(200),
  chargeId: z.string().min(1).max(200),
  orderId: z.string().min(4).max(60),
  providerTransactionId: z.string().min(1).max(200),
  amount: z.number().int().positive(),
  paidAt: z.iso.datetime(),
  gatewayFee: z.number().int().nonnegative().optional(),
})

function failure(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, code, message }, { status })
}

export async function POST(request: Request) {
  const internalKey = process.env.PAYMENTS_INTERNAL_KEY ?? ""
  const secret = process.env.PAYMENTS_WEBHOOK_SECRET ?? ""
  if (!internalKey || !secret) {
    return failure(
      500,
      "NOT_CONFIGURED",
      "Webhook pembayaran belum dikonfigurasi.",
    )
  }

  const rawBody = await request.text()
  try {
    verifyWebhookSignature({
      secret,
      rawBody,
      headers: {
        signature: request.headers.get("x-kalanidhi-signature"),
        timestamp: request.headers.get("x-kalanidhi-timestamp"),
        eventId: request.headers.get("x-kalanidhi-event-id"),
      },
    })
  } catch (error) {
    if (error instanceof WebhookError) {
      return failure(401, error.code, "Tanda tangan webhook tidak sah.")
    }
    return failure(401, "INVALID_SIGNATURE", "Tanda tangan webhook tidak sah.")
  }

  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(rawBody || "{}")
  } catch {
    return failure(400, "INVALID_EVENT", "Payload webhook bukan JSON yang sah.")
  }

  const parsed = payloadSchema.safeParse(parsedBody)
  if (!parsed.success) {
    return failure(400, "INVALID_EVENT", "Payload webhook tidak sah.")
  }

  const headerEventId = request.headers.get("x-kalanidhi-event-id")
  if (headerEventId && headerEventId !== parsed.data.eventId) {
    return failure(400, "EVENT_MISMATCH", "EventId header dan payload berbeda.")
  }

  try {
    const result = await settlePayment({
      internalKey,
      eventId: parsed.data.eventId,
      chargeId: parsed.data.chargeId,
      orderCode: parsed.data.orderId,
      providerTransactionId: parsed.data.providerTransactionId,
      amount: parsed.data.amount,
      paidAt: new Date(parsed.data.paidAt).getTime(),
      gatewayFee: parsed.data.gatewayFee,
    })

    if (result.status === "late") {
      // Accepted into the reconciliation queue, never auto-settled.
      return NextResponse.json({ ok: true, status: result.status }, { status: 202 })
    }
    if (result.status === "rejected") {
      return failure(409, "EVENT_CONFLICT", result.reason ?? "Event ditolak.")
    }
    return NextResponse.json({
      ok: true,
      status: result.status,
      orderId: result.orderId,
    })
  } catch (error) {
    const data =
      typeof error === "object" && error && "data" in error
        ? (error as { data?: { code?: string } }).data
        : undefined
    const code = data?.code ?? "SETTLEMENT_FAILED"
    const status =
      code === "AMOUNT_MISMATCH" ||
      code === "OUTSIDE_WINDOW" ||
      code === "DUPLICATE_TRANSACTION" ||
      code === "INVALID_STATE"
        ? 409
        : code === "UNKNOWN_CHARGE" || code === "INVALID_EVENT"
          ? 400
          : 500
    return failure(status, code, "Pembayaran belum dapat diselesaikan.")
  }
}
