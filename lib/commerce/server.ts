import { fetchMutation, fetchQuery } from "convex/nextjs"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type {
  CreateGuestOrderResult,
  GuestOrderView,
  PaymentIntentView,
  PublicWorkView,
  SettlementResult,
} from "./types"

const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL

const options = convexUrl
  ? { url: convexUrl, skipConvexDeploymentUrlCheck: true as const }
  : null

export function isCommerceConfigured(): boolean {
  return Boolean(convexUrl)
}

function requireConfigured() {
  if (!options) {
    throw new Error(
      "Convex belum dikonfigurasi. Checkout memerlukan CONVEX_URL.",
    )
  }
  return options
}

export async function getPublicWork(
  slug: string,
): Promise<PublicWorkView | null> {
  if (!options) return null
  return await fetchQuery(api.commerce.getPublicWork, { slug }, options)
}

export async function getOrderStatus(
  token: string,
): Promise<GuestOrderView | null> {
  if (!options) return null
  return await fetchQuery(api.commerce.getOrderByToken, { token }, options)
}

export async function getPaymentStatus(
  token: string,
): Promise<PaymentIntentView | null> {
  if (!options) return null
  return await fetchQuery(api.payments.getIntentByToken, { token }, options)
}

export async function createGuestOrder(input: {
  workSlug: string
  buyerName: string
  buyerEmail: string
  buyerWhatsapp?: string
  note?: string
  idempotencyKey: string
  consentTransactional: boolean
}): Promise<CreateGuestOrderResult> {
  return await fetchMutation(api.commerce.createGuestOrder, input, requireConfigured())
}

export async function createPaymentIntent(input: {
  orderId: Id<"orders">
  token: string
}): Promise<PaymentIntentView> {
  return await fetchMutation(api.payments.createIntent, input, requireConfigured())
}

export async function attachGatewayCharge(input: {
  orderId: Id<"orders">
  token: string
  chargeId: string
  baseAmount: number
  uniqueAmount: number
  qrString?: string
  qrImageUrl?: string
  expiresAt: number
  providerReference?: string
}): Promise<PaymentIntentView> {
  return await fetchMutation(api.payments.attachCharge, input, requireConfigured())
}

export async function markManualFallback(input: {
  orderId: Id<"orders">
  token: string
  reason: string
}): Promise<PaymentIntentView> {
  return await fetchMutation(api.payments.markManualFallback, input, requireConfigured())
}

export async function settlePayment(input: {
  internalKey: string
  eventId: string
  chargeId: string
  orderCode: string
  providerTransactionId: string
  amount: number
  paidAt: number
  gatewayFee?: number
}): Promise<SettlementResult> {
  return await fetchMutation(api.payments.settleFromWebhook, input, requireConfigured())
}

export async function recordGatewayHealth(input: {
  internalKey: string
  status: "healthy" | "degraded" | "down" | "unknown"
  message?: string
  latencyMs?: number
}): Promise<null> {
  return await fetchMutation(api.payments.recordHealth, input, requireConfigured())
}
