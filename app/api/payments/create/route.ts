import { NextResponse } from "next/server"
import { z } from "zod"

import type { PaymentIntentView } from "@/lib/commerce/types"
import {
  createCharge,
  GatewayError,
  getHealth,
  isGatewayConfigured,
} from "@/lib/commerce/gateway"
import {
  clientKeyFromHeaders,
  checkoutRateLimiter,
} from "@/lib/commerce/rate-limit"
import {
  attachGatewayCharge,
  createGuestOrder,
  createPaymentIntent,
  isCommerceConfigured,
  markManualFallback,
  recordGatewayHealth,
} from "@/lib/commerce/server"

const bodySchema = z.object({
  workSlug: z.string().min(1).max(120),
  buyerName: z.string().trim().min(2).max(120),
  buyerEmail: z.email().max(200),
  buyerWhatsapp: z.string().trim().max(40).optional(),
  note: z.string().trim().max(600).optional(),
  idempotencyKey: z.string().trim().min(8).max(120),
  consentTransactional: z.literal(true),
})

function intentPayload(payment: PaymentIntentView) {
  return {
    orderCode: payment.orderCode,
    provider: payment.provider,
    status: payment.status,
    baseAmount: payment.baseAmount,
    uniqueAmount: payment.uniqueAmount,
    offset: payment.uniqueAmount - payment.baseAmount,
    qrString: payment.qrString ?? null,
    qrImageUrl: payment.qrImageUrl ?? null,
    expiresAt: payment.expiresAt,
  }
}

export async function POST(request: Request) {
  if (!isCommerceConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        code: "COMMERCE_UNAVAILABLE",
        message: "Checkout belum tersambung ke sistem pesanan.",
      },
      { status: 503 },
    )
  }

  const limit = checkoutRateLimiter.consume(clientKeyFromHeaders(request.headers))
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        message: "Terlalu banyak percobaan. Coba lagi sebentar.",
      },
      {
        status: 429,
        headers: { "retry-after": String(Math.ceil(limit.retryAfterMs / 1000)) },
      },
    )
  }

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_INPUT",
        message: "Data checkout belum lengkap atau tidak sah.",
      },
      { status: 400 },
    )
  }

  try {
    const order = await createGuestOrder(parsed.data)
    let payment = await createPaymentIntent({
      orderId: order.orderId as never,
      token: order.token,
    })

    // A provider charge already attached: idempotent repeat.
    const alreadyCharged = !payment.providerChargeId.startsWith("pending:")
    if (!alreadyCharged && isGatewayConfigured()) {
      try {
        const { charge } = await createCharge({
          orderId: order.code,
          baseAmount: order.baseAmount,
          expiresInSeconds: 900,
          description: `KalaNidhi ${order.code}`,
        })
        payment = await attachGatewayCharge({
          orderId: order.orderId as never,
          token: order.token,
          chargeId: charge.chargeId,
          baseAmount: charge.baseAmount,
          uniqueAmount: charge.uniqueAmount,
          qrString: charge.qrString,
          qrImageUrl: charge.qrImageUrl,
          expiresAt: new Date(charge.expiresAt).getTime(),
        })
        void getHealth()
          .then((health) =>
            recordGatewayHealth({
              internalKey: process.env.PAYMENTS_INTERNAL_KEY ?? "",
              status: health.status === "ok" ? "healthy" : "degraded",
              message: health.session ? `session:${health.session}` : undefined,
            }),
          )
          .catch(() => undefined)
      } catch (error) {
        if (error instanceof GatewayError) {
          payment = await markManualFallback({
            orderId: order.orderId as never,
            token: order.token,
            reason: `Gerbang pembayaran tidak tersedia (${error.code}).`,
          })
          return NextResponse.json({
            ok: true,
            manual: true,
            order: { code: order.code, token: order.token },
            payment: intentPayload(payment),
            message:
              "Gerbang QRIS tidak tersedia. Transfer manual dengan nominal tepat akan direkonsiliasi pengelola.",
          })
        }
        throw error
      }
    } else if (!alreadyCharged) {
      payment = await markManualFallback({
        orderId: order.orderId as never,
        token: order.token,
        reason: "Gerbang pembayaran belum dikonfigurasi.",
      })
      return NextResponse.json({
        ok: true,
        manual: true,
        order: { code: order.code, token: order.token },
        payment: intentPayload(payment),
        message:
          "Transfer manual dengan nominal tepat. Pengelola mencocokkan mutasi secara manual.",
      })
    }

    return NextResponse.json({
      ok: true,
      manual: payment.provider === "manual_transfer",
      order: { code: order.code, token: order.token },
      payment: intentPayload(payment),
    })
  } catch (error) {
    const code =
      typeof error === "object" && error && "data" in error
        ? ((error as { data?: { code?: string } }).data?.code ?? "CREATE_FAILED")
        : "CREATE_FAILED"
    const status =
      code === "SELF_DEALING" || code === "WORK_UNAVAILABLE"
        ? 409
        : code === "INVALID_AMOUNT" || code === "RATE_LIMITED"
          ? 400
          : 500
    return NextResponse.json(
      {
        ok: false,
        code,
        message:
          code === "SELF_DEALING"
            ? "Karya ini milik akun yang sama."
            : code === "WORK_UNAVAILABLE"
              ? "Karya ini tidak sedang dijual."
              : "Checkout belum dapat diproses. Coba lagi.",
      },
      { status },
    )
  }
}
