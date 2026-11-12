import { v } from "convex/values"

import { assertRupiah, MoneyError, splitAmount, uniqueOffset } from "../lib/commerce/money"
import type {
  GatewayHealthView,
  PaymentEventView,
  PaymentIntentView,
  ReconciliationSummary,
  SettlementResult,
} from "../lib/commerce/types"
import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import { enqueueWebhookDelivery } from "./dispatch"
import {
  assertInternalKey,
  assertNotOwnMoney,
  assertReason,
  commerceError,
  currentViewer,
  findByToken,
  notFound,
  now,
  PAYMENT_SKEW_MS,
  PAYMENT_TTL_SECONDS,
  requireViewer,
  writeAudit,
} from "./commerce_shared"

type ReadCtx = Pick<QueryCtx, "db" | "auth"> | MutationCtx

const SETTLE_WINDOW_LABEL = "Jendela pembayaran"

function asAmount(value: number, field: string): number {
  try {
    return assertRupiah(value, field)
  } catch (error) {
    if (error instanceof MoneyError) commerceError(error.code, error.message)
    throw error
  }
}

async function latestPayment(
  ctx: ReadCtx,
  orderId: Id<"orders">,
): Promise<Doc<"payments"> | null> {
  const rows = await ctx.db
    .query("payments")
    .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
    .collect()
  return [...rows].sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
}

async function toIntentView(
  ctx: ReadCtx,
  payment: Doc<"payments">,
): Promise<PaymentIntentView> {
  const order = await ctx.db.get(payment.orderId)
  if (!order) notFound("Pesanan tidak ditemukan.")
  const [seller, work] = await Promise.all([
    ctx.db.get(order.sellerId),
    order.workId ? ctx.db.get(order.workId) : null,
  ])

  return {
    id: payment._id,
    orderId: order._id,
    orderCode: order.code,
    buyerName: order.buyerName,
    sellerName: seller?.name ?? "Tidak ditemukan",
    workTitle: work?.title ?? "Tidak ditemukan",
    provider: payment.provider,
    providerChargeId: payment.providerChargeId,
    providerReference: payment.providerReference ?? null,
    providerTransactionId: payment.providerTransactionId ?? null,
    baseAmount: payment.baseAmount,
    uniqueAmount: payment.uniqueAmount,
    gatewayFee: payment.gatewayFee ?? null,
    qrString: payment.qrString ?? null,
    qrImageUrl: payment.qrImageUrl ?? null,
    status: payment.status,
    reconciliationState: payment.reconciliationState ?? "none",
    reconciliationReason: payment.reconciliationReason ?? null,
    expiresAt: payment.expiresAt,
    paidAt: payment.paidAt ?? null,
    createdAt: payment.createdAt,
    lastReconciledAt: payment.lastReconciledAt ?? null,
    settledEventId: payment.settledEventId ?? null,
    idempotencyKey: payment.idempotencyKey ?? null,
    isLate: payment.expiresAt + PAYMENT_SKEW_MS < now(),
  }
}

async function authorizeOrder(
  ctx: ReadCtx,
  orderId: Id<"orders">,
  token: string | undefined,
): Promise<{ order: Doc<"orders">; isAdmin: boolean; viewerId: string | null }> {
  const order = await ctx.db.get(orderId)
  if (!order) notFound("Pesanan tidak ditemukan.")

  if (token) {
    const tokenOrder = await findByToken(ctx, token)
    if (tokenOrder && tokenOrder._id === order._id) {
      return { order, isAdmin: false, viewerId: null }
    }
  }

  const current = await currentViewer(ctx)
  if (!current) commerceError("UNAUTHENTICATED", "Masuk diperlukan.")
  const isAdmin = current.viewer.capabilities.includes("payments.manage")
  if (isAdmin) return { order, isAdmin, viewerId: current.user._id }
  if (order.buyerUserId === current.user._id) {
    return { order, isAdmin: false, viewerId: current.user._id }
  }
  commerceError("FORBIDDEN", "Pesanan ini bukan milik akun tersebut.")
}

/** Creates or reuses the pending intent for an order. */
export const createIntent = mutation({
  args: {
    orderId: v.id("orders"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PaymentIntentView> => {
    const { order } = await authorizeOrder(ctx, args.orderId, args.token)
    if (!["draft", "awaiting_payment"].includes(order.status)) {
      if (order.status === "paid") {
        const paid = await latestPayment(ctx, order._id)
        if (paid) return await toIntentView(ctx, paid)
      }
      commerceError("INVALID_STATE", "Pesanan ini tidak menunggu pembayaran.")
    }

    const existing = await latestPayment(ctx, order._id)
    if (existing) {
      if (existing.status === "pending" && existing.expiresAt > now()) {
        return await toIntentView(ctx, existing)
      }
      if (existing.status === "pending") {
        const timestamp = now()
        await ctx.db.patch(existing._id, {
          status: "expired",
          updatedAt: timestamp,
          lastReconciledAt: timestamp,
        })
        await ctx.db.insert("paymentEvents", {
          eventId: `expired:${existing._id}`,
          paymentId: existing._id,
          orderId: order._id,
          kind: "expired",
          amount: existing.uniqueAmount,
          payload: { reason: "expired" },
          createdAt: timestamp,
        })
      }
      if (existing.status === "paid") return await toIntentView(ctx, existing)
    }

    const timestamp = now()
    const paymentId = await ctx.db.insert("payments", {
      orderId: order._id,
      provider: "gopay_qris",
      providerChargeId: `pending:${order.code}`,
      baseAmount: order.baseAmount,
      uniqueAmount: order.baseAmount,
      status: "pending",
      expiresAt: timestamp + PAYMENT_TTL_SECONDS * 1000,
      reconciliationState: "none",
      createdAt: timestamp,
      updatedAt: timestamp,
    })

    await ctx.db.patch(order._id, {
      status: "awaiting_payment",
      updatedAt: timestamp,
    })

    await ctx.db.insert("paymentEvents", {
      eventId: `created:${paymentId}`,
      paymentId,
      orderId: order._id,
      kind: "created",
      amount: order.baseAmount,
      payload: { provider: "gopay_qris" },
      createdAt: timestamp,
    })

    const payment = await ctx.db.get(paymentId)
    if (!payment) notFound("Intent tidak ditemukan.")
    return await toIntentView(ctx, payment)
  },
})

/** Attaches the provider charge returned by the private gateway. */
export const attachCharge = mutation({
  args: {
    orderId: v.id("orders"),
    token: v.optional(v.string()),
    chargeId: v.string(),
    baseAmount: v.number(),
    uniqueAmount: v.number(),
    qrString: v.optional(v.string()),
    qrImageUrl: v.optional(v.string()),
    expiresAt: v.number(),
    providerReference: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PaymentIntentView> => {
    const { order } = await authorizeOrder(ctx, args.orderId, args.token)
    const payment = await latestPayment(ctx, order._id)
    if (!payment) notFound("Intent tidak ditemukan.")
    if (payment.status !== "pending") {
      commerceError("INVALID_STATE", "Intent ini tidak lagi menerima tagihan.")
    }

    if (asAmount(args.baseAmount, "nilai dasar") !== order.baseAmount) {
      commerceError("INVALID_AMOUNT", "Nilai dasar tidak cocok dengan pesanan.")
    }
    try {
      uniqueOffset(args.baseAmount, args.uniqueAmount)
    } catch (error) {
      if (error instanceof MoneyError) commerceError(error.code, error.message)
      throw error
    }

    const realCharge = !payment.providerChargeId.startsWith("pending:")
    if (realCharge && payment.providerChargeId !== args.chargeId) {
      commerceError(
        "CHARGE_CONFLICT",
        "Pesanan ini sudah memiliki tagihan provider yang berbeda.",
      )
    }

    const timestamp = now()
    await ctx.db.patch(payment._id, {
      provider: "gopay_qris",
      providerChargeId: args.chargeId,
      providerReference: args.providerReference,
      baseAmount: args.baseAmount,
      uniqueAmount: args.uniqueAmount,
      qrString: args.qrString,
      qrImageUrl: args.qrImageUrl,
      expiresAt: args.expiresAt,
      updatedAt: timestamp,
      lastReconciledAt: timestamp,
    })
    await ctx.db.patch(order._id, {
      uniqueAmount: args.uniqueAmount,
      status: "awaiting_payment",
      updatedAt: timestamp,
    })

    const updated = await ctx.db.get(payment._id)
    if (!updated) notFound("Intent tidak ditemukan.")
    return await toIntentView(ctx, updated)
  },
})

/**
 * Manual transfer fallback when the gateway is unavailable. The unique offset
 * belongs to the gateway; manual transfers use the exact base amount and an
 * operator reconciles them later.
 */
export const markManualFallback = mutation({
  args: {
    orderId: v.id("orders"),
    token: v.optional(v.string()),
    reason: v.string(),
  },
  handler: async (ctx, args): Promise<PaymentIntentView> => {
    const { order } = await authorizeOrder(ctx, args.orderId, args.token)
    const payment = await latestPayment(ctx, order._id)
    if (!payment || payment.status !== "pending") notFound("Intent tidak ditemukan.")
    const reason = assertReason(args.reason, "Alasan fallback")
    const timestamp = now()
    await ctx.db.patch(payment._id, {
      provider: "manual_transfer",
      providerChargeId: `manual:${order.code}`,
      uniqueAmount: order.baseAmount,
      qrString: undefined,
      qrImageUrl: undefined,
      updatedAt: timestamp,
      reconciliationState: "unmatched",
      reconciliationReason: "Gerbang pembayaran tidak tersedia; transfer manual.",
    })
    await ctx.db.patch(order._id, { uniqueAmount: order.baseAmount, updatedAt: timestamp })
    await ctx.db.insert("paymentEvents", {
      eventId: `manual:${payment._id}`,
      paymentId: payment._id,
      orderId: order._id,
      kind: "created",
      amount: order.baseAmount,
      payload: { reason, provider: "manual_transfer" },
      createdAt: timestamp,
    })
    const updated = await ctx.db.get(payment._id)
    if (!updated) notFound("Intent tidak ditemukan.")
    return await toIntentView(ctx, updated)
  },
})

export const getIntentForOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args): Promise<PaymentIntentView | null> => {
    await authorizeOrder(ctx, args.orderId, undefined)
    const payment = await latestPayment(ctx, args.orderId)
    return payment ? await toIntentView(ctx, payment) : null
  },
})

export const getIntentByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<PaymentIntentView | null> => {
    const order = await findByToken(ctx, args.token)
    if (!order) return null
    const payment = await latestPayment(ctx, order._id)
    return payment ? await toIntentView(ctx, payment) : null
  },
})

export const listIntents = query({
  args: {},
  handler: async (ctx): Promise<PaymentIntentView[]> => {
    await requireViewer(ctx, "payments.manage")
    const rows = await ctx.db
      .query("payments")
      .withIndex("by_createdAt")
      .order("desc")
      .take(200)
    return await Promise.all(rows.map((payment) => toIntentView(ctx, payment)))
  },
})

export const getReconciliation = query({
  args: {},
  handler: async (ctx): Promise<ReconciliationSummary> => {
    await requireViewer(ctx, "payments.manage")
    const rows = await ctx.db
      .query("payments")
      .withIndex("by_createdAt")
      .order("desc")
      .take(300)
    const intents = await Promise.all(rows.map((payment) => toIntentView(ctx, payment)))
    return {
      intents,
      pendingCount: intents.filter((item) => item.status === "pending").length,
      lateCount: intents.filter(
        (item) =>
          item.reconciliationState === "late" ||
          (item.status === "pending" && item.isLate),
      ).length,
      unmatchedCount: intents.filter(
        (item) => item.reconciliationState === "unmatched",
      ).length,
      paidCount: intents.filter((item) => item.status === "paid").length,
      expiredCount: intents.filter((item) => item.status === "expired").length,
      paidTotal: intents
        .filter((item) => item.status === "paid")
        .reduce((sum, item) => sum + item.baseAmount, 0),
      baseTotal: intents
        .filter((item) => item.status === "paid")
        .reduce((sum, item) => sum + item.baseAmount, 0),
    }
  },
})

export const listPaymentEvents = query({
  args: {},
  handler: async (ctx): Promise<PaymentEventView[]> => {
    await requireViewer(ctx, "payments.manage")
    const rows = await ctx.db
      .query("paymentEvents")
      .withIndex("by_createdAt")
      .order("desc")
      .take(100)
    const views: PaymentEventView[] = []
    for (const row of rows) {
      const order = row.orderId ? await ctx.db.get(row.orderId) : null
      views.push({
        id: row._id,
        eventId: row.eventId,
        kind: row.kind,
        orderCode: order?.code ?? null,
        amount: row.amount ?? null,
        providerReference: row.providerReference ?? null,
        createdAt: row.createdAt,
      })
    }
    return views
  },
})

export const getGatewayHealth = query({
  args: {},
  handler: async (ctx): Promise<GatewayHealthView> => {
    await requireViewer(ctx, "payments.manage")
    const latest = await ctx.db
      .query("integrationHealth")
      .withIndex("by_integration_checkedAt", (q) =>
        q.eq("integration", "payment_gateway"),
      )
      .order("desc")
      .first()
    const pending = await ctx.db
      .query("payments")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect()
    const paid = await ctx.db
      .query("payments")
      .withIndex("by_status", (q) => q.eq("status", "paid"))
      .collect()
    const lastSettledAt = paid.reduce(
      (latestPaid, item) => Math.max(latestPaid, item.paidAt ?? 0),
      0,
    )

    return {
      integration: "payment_gateway",
      status: latest?.status ?? "unknown",
      message: latest?.message ?? null,
      latencyMs: latest?.latencyMs ?? null,
      checkedAt: latest?.checkedAt ?? null,
      pendingIntents: pending.length,
      lastSettledAt: lastSettledAt || null,
    }
  },
})

/** Records a gateway health probe. Called by the admin-only Next.js route. */
export const recordHealth = mutation({
  args: {
    internalKey: v.string(),
    status: v.union(
      v.literal("healthy"),
      v.literal("degraded"),
      v.literal("down"),
      v.literal("unknown"),
    ),
    message: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertInternalKey(args.internalKey)
    await ctx.db.insert("integrationHealth", {
      integration: "payment_gateway",
      status: args.status,
      message: args.message,
      latencyMs: args.latencyMs,
      checkedAt: now(),
    })
    return null
  },
})

type SettlementInput = {
  payment: Doc<"payments">
  order: Doc<"orders">
  providerTransactionId: string
  amount: number
  paidAt: number
  gatewayFee?: number
  eventId: string
  actorId: string
  actorRole: string
  reason: string
  allowOutsideWindow?: boolean
  allowExpired?: boolean
}

/**
 * Atomic settlement: payment, order, event, payout allocation, and ledger
 * entries commit together. The split uses the order `baseAmount`; the unique
 * offset is never revenue.
 */
async function settle(
  ctx: MutationCtx,
  input: SettlementInput,
): Promise<SettlementResult> {
  const { payment, order } = input
  const settleable =
    payment.status === "pending" ||
    (input.allowExpired === true && payment.status === "expired")
  if (!settleable) {
    commerceError("INVALID_STATE", "Hanya pembayaran menunggu yang dapat diselesaikan.")
  }
  if (asAmount(input.amount, "nominal") !== payment.uniqueAmount) {
    commerceError(
      "AMOUNT_MISMATCH",
      "Nominal transaksi tidak sama dengan nominal unik tagihan.",
    )
  }

  const skew = PAYMENT_SKEW_MS
  if (!Number.isFinite(input.paidAt) || input.paidAt <= 0) {
    commerceError("INVALID_EVENT", "Waktu pembayaran tidak sah.")
  }
  if (!input.allowOutsideWindow) {
    if (input.paidAt < payment.createdAt - skew) {
      commerceError(
        "OUTSIDE_WINDOW",
        `${SETTLE_WINDOW_LABEL} belum dimulai untuk transaksi ini.`,
      )
    }
    if (input.paidAt > payment.expiresAt + skew) {
      commerceError("OUTSIDE_WINDOW", `${SETTLE_WINDOW_LABEL} sudah berakhir.`)
    }
  }
  if (!input.providerTransactionId.trim()) {
    commerceError("INVALID_TRANSACTION", "ID transaksi provider wajib ada.")
  }

  const duplicate = await ctx.db
    .query("payments")
    .withIndex("by_providerTransactionId", (q) =>
      q.eq("providerTransactionId", input.providerTransactionId),
    )
    .unique()
  if (duplicate && duplicate._id !== payment._id) {
    commerceError(
      "DUPLICATE_TRANSACTION",
      "Transaksi provider ini sudah menyelesaikan pembayaran lain.",
    )
  }

  const split = splitAmount(order.baseAmount)
  const timestamp = now()
  const payoutId = await ctx.db.insert("payouts", {
    teacherId: order.sellerId,
    orderId: order._id,
    paymentId: payment._id,
    periodStart: input.paidAt,
    periodEnd: input.paidAt,
    dueAt: input.paidAt + 7 * 86_400_000,
    kind: "sale",
    reference: order.code,
    gross: order.baseAmount,
    teacherShare: split.teacherShare,
    platformShare: split.platformShare,
    communityShare: split.communityShare,
    status: "pending",
    createdAt: timestamp,
    updatedAt: timestamp,
  })

  await ctx.db.patch(payment._id, {
    status: "paid",
    paidAt: input.paidAt,
    providerTransactionId: input.providerTransactionId,
    ...(input.gatewayFee !== undefined ? { gatewayFee: input.gatewayFee } : {}),
    settledEventId: input.eventId,
    reconciliationState: "none",
    reconciliationReason: undefined,
    updatedAt: timestamp,
    lastReconciledAt: timestamp,
  })
  await ctx.db.patch(order._id, {
    status: "paid",
    paidAt: input.paidAt,
    uniqueAmount: payment.uniqueAmount,
    updatedAt: timestamp,
  })

  await ctx.db.insert("paymentEvents", {
    eventId: input.eventId,
    paymentId: payment._id,
    orderId: order._id,
    kind: "settled",
    amount: input.amount,
    providerReference: input.providerTransactionId,
    payload: {
      chargeId: payment.providerChargeId,
      providerTransactionId: input.providerTransactionId,
      amount: input.amount,
      paidAt: input.paidAt,
      gatewayFee: input.gatewayFee ?? null,
    },
    createdAt: timestamp,
  })

  const accounts = [
    { account: "teacher" as const, amount: split.teacherShare },
    { account: "platform" as const, amount: split.platformShare },
    { account: "community" as const, amount: split.communityShare },
  ]
  for (const entry of accounts) {
    await ctx.db.insert("ledgerEntries", {
      orderId: order._id,
      paymentId: payment._id,
      payoutId,
      teacherId: order.sellerId,
      account: entry.account,
      direction: "credit",
      amount: entry.amount,
      currency: "IDR",
      entryType: "sale",
      createdBy: input.actorId,
      reason: input.reason,
      createdAt: timestamp,
    })
  }

  if ((input.gatewayFee ?? 0) > 0) {
    // The gateway fee is absorbed by the platform share; teacher and community
    // shares never change.
    await ctx.db.insert("ledgerEntries", {
      orderId: order._id,
      paymentId: payment._id,
      payoutId,
      teacherId: order.sellerId,
      account: "gateway_fee",
      direction: "debit",
      amount: input.gatewayFee!,
      currency: "IDR",
      entryType: "adjustment",
      createdBy: input.actorId,
      reason: "Biaya gerbang diserap bagian platform.",
      createdAt: timestamp,
    })
  }

  await writeAudit(ctx, {
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: "payments.settled",
    entityType: "orders",
    entityId: order._id,
    reason: input.reason,
    after: {
      paymentId: payment._id,
      payoutId,
      baseAmount: order.baseAmount,
      uniqueAmount: payment.uniqueAmount,
      shares: split,
    },
  })

  return { status: "settled", orderId: order._id, paymentId: payment._id }
}

/** Verified gateway webhook → settlement. Idempotent by `eventId`. */
export const settleFromWebhook = mutation({
  args: {
    internalKey: v.string(),
    eventId: v.string(),
    chargeId: v.string(),
    orderCode: v.string(),
    providerTransactionId: v.string(),
    amount: v.number(),
    paidAt: v.number(),
    gatewayFee: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<SettlementResult> => {
    assertInternalKey(args.internalKey)
    if (!args.eventId.trim() || !args.chargeId.trim() || !args.orderCode.trim()) {
      commerceError("INVALID_EVENT", "Peristiwa pembayaran tidak lengkap.")
    }

    const existingEvent = await ctx.db
      .query("paymentEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .first()
    if (existingEvent) {
      const payload = existingEvent.payload as Record<string, unknown> | undefined
      const same =
        payload?.chargeId === args.chargeId &&
        payload?.amount === args.amount &&
        payload?.providerTransactionId === args.providerTransactionId
      if (!same) {
        await writeAudit(ctx, {
          actorId: "system",
          actorRole: "Sistem",
          action: "payments.event.conflict",
          entityType: "payments",
          entityId: existingEvent.paymentId,
          reason: "EventId yang sama dikirim dengan payload berbeda.",
          severity: "error",
        })
        if (existingEvent.paymentId && existingEvent.orderId) {
          return {
            status: "rejected",
            orderId: existingEvent.orderId,
            paymentId: existingEvent.paymentId,
            reason: "EventId ini sudah dipakai dengan payload berbeda.",
          }
        }
        commerceError(
          "EVENT_CONFLICT",
          "EventId ini sudah dipakai dengan payload berbeda.",
        )
      }
      if (existingEvent.paymentId && existingEvent.orderId) {
        return {
          status: "duplicate",
          orderId: existingEvent.orderId,
          paymentId: existingEvent.paymentId,
        }
      }
      commerceError("INVALID_EVENT", "Peristiwa ini tidak dapat diulang.")
    }

    const payment = await ctx.db
      .query("payments")
      .withIndex("by_providerChargeId", (q) => q.eq("providerChargeId", args.chargeId))
      .unique()
    if (!payment) commerceError("UNKNOWN_CHARGE", "Tagihan provider tidak dikenal.")
    const order = await ctx.db.get(payment.orderId)
    if (!order) commerceError("UNKNOWN_CHARGE", "Pesanan tagihan tidak ditemukan.")
    if (order.code !== args.orderCode) {
      commerceError("INVALID_EVENT", "Kode pesanan tidak cocok dengan tagihan.")
    }

    if (payment.status === "paid") {
      if (payment.providerTransactionId === args.providerTransactionId) {
        return { status: "duplicate", orderId: order._id, paymentId: payment._id }
      }
      commerceError("INVALID_STATE", "Tagihan ini sudah lunas.")
    }
    if (payment.status === "expired" || payment.status === "cancelled") {
      // A transfer can arrive after the QR expired or the order was cancelled.
      // It is reconciliation work, never an automatic settlement.
      const timestamp = now()
      await ctx.db.patch(payment._id, {
        reconciliationState: payment.status === "expired" ? "late" : "unmatched",
        reconciliationReason:
          payment.status === "expired"
            ? "Pembayaran masuk setelah tagihan kedaluwarsa; perlu rekonsiliasi manual."
            : "Pembayaran masuk untuk pesanan yang dibatalkan; perlu rekonsiliasi manual.",
        lastReconciledAt: timestamp,
        updatedAt: timestamp,
      })
      await ctx.db.insert("paymentEvents", {
        eventId: args.eventId,
        paymentId: payment._id,
        orderId: order._id,
        kind: "reconciled",
        amount: args.amount,
        providerReference: args.providerTransactionId,
        payload: {
          chargeId: args.chargeId,
          providerTransactionId: args.providerTransactionId,
          amount: args.amount,
          paidAt: args.paidAt,
          outcome: "late_after_expiry",
        },
        createdAt: timestamp,
      })
      return { status: "late", orderId: order._id, paymentId: payment._id }
    }
    if (payment.status !== "pending") {
      commerceError("INVALID_STATE", "Tagihan ini tidak menunggu pembayaran.")
    }

    const gatewayFee = args.gatewayFee
    if (
      gatewayFee !== undefined &&
      (!Number.isInteger(gatewayFee) || gatewayFee < 0)
    ) {
      commerceError("INVALID_AMOUNT", "Biaya gerbang tidak sah.")
    }

    if (args.paidAt < payment.createdAt - PAYMENT_SKEW_MS) {
      commerceError("OUTSIDE_WINDOW", "Waktu transaksi berada sebelum tagihan dibuat.")
    }

    // Late payments after expiry enter the reconciliation queue and are never
    // auto-settled. No ledger row is written here.
    if (args.paidAt > payment.expiresAt + PAYMENT_SKEW_MS) {
      const timestamp = now()
      await ctx.db.patch(payment._id, {
        reconciliationState: "late",
        reconciliationReason:
          "Pembayaran masuk setelah masa berlaku; perlu rekonsiliasi manual.",
        lastReconciledAt: timestamp,
        updatedAt: timestamp,
      })
      await ctx.db.insert("paymentEvents", {
        eventId: args.eventId,
        paymentId: payment._id,
        orderId: order._id,
        kind: "reconciled",
        amount: args.amount,
        providerReference: args.providerTransactionId,
        payload: {
          chargeId: args.chargeId,
          providerTransactionId: args.providerTransactionId,
          amount: args.amount,
          paidAt: args.paidAt,
          outcome: "late",
        },
        createdAt: timestamp,
      })
      return { status: "late", orderId: order._id, paymentId: payment._id }
    }

    const result = await settle(ctx, {
      payment,
      order,
      providerTransactionId: args.providerTransactionId,
      amount: args.amount,
      paidAt: args.paidAt,
      gatewayFee,
      eventId: args.eventId,
      actorId: "system",
      actorRole: "Sistem",
      reason: "Pembayaran diselesaikan dari webhook gateway terverifikasi.",
    })

    // Queue outbound partner webhooks in the same transaction. The dispatcher
    // performs the network call later; this mutation never blocks on a partner.
    await enqueueWebhookDelivery(ctx, {
      event: "order.paid",
      eventId: `order.paid:${order._id}:${args.eventId}`,
    })

    return result
  },
})

/** Admin manual match for a verified transfer or a late payment. */
export const manualMatch = mutation({
  args: {
    paymentId: v.id("payments"),
    providerTransactionId: v.string(),
    amount: v.number(),
    paidAt: v.optional(v.number()),
    reason: v.string(),
  },
  handler: async (ctx, args): Promise<SettlementResult> => {
    const { user, viewer } = await requireViewer(ctx, "payments.manage")
    const reason = assertReason(args.reason, "Alasan pencocokan manual")
    const payment = await ctx.db.get(args.paymentId)
    if (!payment) notFound("Pembayaran tidak ditemukan.")
    const order = await ctx.db.get(payment.orderId)
    if (!order) notFound("Pesanan tidak ditemukan.")
    assertNotOwnMoney(viewer, "manual_match", order)

    if (payment.status === "paid") {
      commerceError("INVALID_STATE", "Pembayaran ini sudah lunas.")
    }
    if (!["pending", "expired"].includes(payment.status)) {
      commerceError(
        "INVALID_STATE",
        "Hanya pembayaran menunggu atau kedaluwarsa yang dapat dicocokkan.",
      )
    }
    if (asAmount(args.amount, "nominal") !== payment.uniqueAmount) {
      commerceError(
        "AMOUNT_MISMATCH",
        "Nominal mutasi tidak sama dengan nominal unik tagihan.",
      )
    }

    const paidAt = args.paidAt ?? now()
    const result = await settle(ctx, {
      payment,
      order,
      providerTransactionId: args.providerTransactionId,
      amount: args.amount,
      paidAt,
      eventId: `manual:${payment._id}:${user._id}`,
      actorId: user._id,
      actorRole: viewer.roleLabel,
      reason,
      allowOutsideWindow: true,
      allowExpired: true,
    })

    await writeAudit(ctx, {
      actorId: user._id,
      actorRole: viewer.roleLabel,
      action: "payments.manualMatch",
      entityType: "payments",
      entityId: payment._id,
      reason,
      before: {
        status: payment.status,
        reconciliationState: payment.reconciliationState ?? "none",
      },
      after: { status: "paid", providerTransactionId: args.providerTransactionId },
      severity: "warning",
    })

    return result
  },
})

/**
 * Records the provider fee after settlement when the feed did not report it.
 * The fee is a platform cost: teacher and community shares never change.
 */
export const recordGatewayFee = mutation({
  args: {
    paymentId: v.id("payments"),
    gatewayFee: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { user, viewer } = await requireViewer(ctx, "payments.manage")
    const reason = assertReason(args.reason, "Alasan biaya gerbang")
    const payment = await ctx.db.get(args.paymentId)
    if (!payment) notFound("Pembayaran tidak ditemukan.")
    if (payment.status !== "paid") {
      commerceError(
        "INVALID_STATE",
        "Biaya gerbang hanya dicatat untuk pembayaran yang sudah lunas.",
      )
    }
    if (payment.gatewayFee !== undefined) {
      commerceError(
        "ALREADY_RECORDED",
        "Biaya gerbang untuk pembayaran ini sudah tercatat.",
      )
    }
    if (
      !Number.isInteger(args.gatewayFee) ||
      args.gatewayFee < 0 ||
      args.gatewayFee > payment.baseAmount
    ) {
      commerceError("INVALID_AMOUNT", "Biaya gerbang tidak sah.")
    }
    const order = await ctx.db.get(payment.orderId)
    if (!order) notFound("Pesanan tidak ditemukan.")
    assertNotOwnMoney(viewer, "record_gateway_fee", order)

    const payout = await ctx.db
      .query("payouts")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .first()
    const timestamp = now()
    await ctx.db.patch(payment._id, {
      gatewayFee: args.gatewayFee,
      updatedAt: timestamp,
    })

    if (args.gatewayFee > 0) {
      await ctx.db.insert("ledgerEntries", {
        orderId: order._id,
        paymentId: payment._id,
        payoutId: payout?._id,
        teacherId: order.sellerId,
        account: "gateway_fee",
        direction: "debit",
        amount: args.gatewayFee,
        currency: "IDR",
        entryType: "adjustment",
        createdBy: user._id,
        reason: "Biaya gerbang diserap bagian platform.",
        createdAt: timestamp,
      })
    }

    await writeAudit(ctx, {
      actorId: user._id,
      actorRole: viewer.roleLabel,
      action: "payments.recordGatewayFee",
      entityType: "payments",
      entityId: payment._id,
      reason,
      before: { gatewayFee: null },
      after: { gatewayFee: args.gatewayFee },
      severity: "warning",
    })

    return { paymentId: payment._id, gatewayFee: args.gatewayFee }
  },
})

/** Expires pending intents past the clock-skew grace. Never auto-settles. */
export const expireIntents = mutation({
  args: {},
  handler: async (ctx) => {
    const { viewer } = await requireViewer(ctx, "payments.manage")
    const deadline = now() - PAYMENT_SKEW_MS
    const pending = await ctx.db
      .query("payments")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect()
    let expired = 0
    for (const payment of pending) {
      if (payment.expiresAt >= deadline) continue
      const timestamp = now()
      await ctx.db.patch(payment._id, { status: "expired", updatedAt: timestamp })
      const existing = await ctx.db
        .query("paymentEvents")
        .withIndex("by_eventId", (q) => q.eq("eventId", `expired:${payment._id}`))
        .first()
      if (!existing) {
        await ctx.db.insert("paymentEvents", {
          eventId: `expired:${payment._id}`,
          paymentId: payment._id,
          orderId: payment.orderId,
          kind: "expired",
          amount: payment.uniqueAmount,
          payload: { reason: "expired" },
          createdAt: timestamp,
        })
      }
      expired += 1
    }
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "payments.expire",
      entityType: "payments",
      reason: "Kedaluwarsa intent dijalankan manual.",
      after: { expired },
    })
    return { expired }
  },
})
