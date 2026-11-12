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
  createOrder,
  createPaymentIntent,
  isCommerceConfigured,
  markManualFallback,
  recordGatewayHealth,
} from "@/lib/commerce/server"
import { getAuthServer, isAuthConfigured } from "@/lib/auth-server"

const bodySchema = z
  .object({
    kind: z.enum(["work", "path"]),
    slug: z.string().min(1).max(120),
    note: z.string().trim().max(600).optional(),
    idempotencyKey: z.string().trim().min(8).max(120),
    consentTransactional: z.literal(true),
  })
  .strict()

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

  if (!isAuthConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        code: "AUTH_UNAVAILABLE",
        message: "Masuk belum tersambung pada lingkungan ini.",
      },
      { status: 503 },
    )
  }

  const auth = getAuthServer()
  if (!(await auth.isAuthenticated())) {
    return NextResponse.json(
      {
        ok: false,
        code: "UNAUTHENTICATED",
        message: "Masuk ke akunmu sebelum membuat pesanan.",
      },
      { status: 401 },
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
    const order = await createOrder(parsed.data)
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
      code === "UNAUTHENTICATED"
        ? 401
        : code === "SELF_DEALING" ||
            code === "WORK_UNAVAILABLE" ||
            code === "PATH_UNAVAILABLE"
          ? 409
          : code === "INVALID_AMOUNT" ||
              code === "RATE_LIMITED" ||
              code === "CONSENT_REQUIRED" ||
              code === "INVALID_BUYER" ||
              code === "INVALID_IDEMPOTENCY"
            ? 400
            : 500
    return NextResponse.json(
      {
        ok: false,
        code,
        message:
          code === "UNAUTHENTICATED"
            ? "Masuk ke akunmu sebelum membuat pesanan."
            : code === "SELF_DEALING"
              ? "Karya atau jalur ini milik akun yang sama."
              : code === "WORK_UNAVAILABLE"
                ? "Karya ini tidak sedang dijual."
                : code === "PATH_UNAVAILABLE"
                  ? "Jalur ini belum dapat dibeli."
                  : code === "CONSENT_REQUIRED"
                    ? "Persetujuan kontak transaksional diperlukan."
                    : "Checkout belum dapat diproses. Coba lagi.",
      },
      { status },
    )
  }
}
