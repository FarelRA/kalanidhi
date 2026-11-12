import { defineTable } from "convex/server"
import { v } from "convex/values"

import { jsonBagValidator } from "./common"

const orderStatus = v.union(
  v.literal("draft"),
  v.literal("awaiting_payment"),
  v.literal("paid"),
  v.literal("in_progress"),
  v.literal("delivered"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("refunded"),
  v.literal("disputed"),
)

const paymentStatus = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("expired"),
  v.literal("failed"),
  v.literal("cancelled"),
  v.literal("refunded"),
)

const payoutStatus = v.union(
  v.literal("pending"),
  v.literal("held"),
  v.literal("approved"),
  v.literal("paid"),
  v.literal("reversed"),
)

export const commerceTables = {
  orders: defineTable({
    code: v.string(),
    buyerUserId: v.optional(v.id("users")),
    buyerName: v.string(),
    buyerEmail: v.string(),
    buyerWhatsapp: v.optional(v.string()),
    sellerId: v.id("users"),
    workId: v.optional(v.id("works")),
    pathId: v.optional(v.string()),
    baseAmount: v.number(),
    uniqueAmount: v.optional(v.number()),
    status: orderStatus,
    channel: v.union(
      v.literal("web"),
      v.literal("whatsapp"),
      v.literal("institution"),
    ),
    note: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    paidAt: v.optional(v.number()),
    // Phase 3 additive fields. Guest checkout is scoped by an unguessable
    // token hash, never by a client-supplied role or email.
    tokenHash: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    consentVersion: v.optional(v.string()),
    consentAt: v.optional(v.number()),
    claimedAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    cancelReason: v.optional(v.string()),
  })
    .index("by_code", ["code"])
    .index("by_buyerUserId", ["buyerUserId"])
    .index("by_sellerId", ["sellerId"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"])
    .index("by_tokenHash", ["tokenHash"])
    .index("by_idempotencyKey", ["idempotencyKey"])
    .index("by_workId", ["workId"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    kind: v.union(
      v.literal("work"),
      v.literal("path"),
      v.literal("service"),
    ),
    refId: v.optional(v.string()),
    pathId: v.optional(v.string()),
    title: v.string(),
    quantity: v.number(),
    unitAmount: v.number(),
    totalAmount: v.number(),
  }).index("by_orderId", ["orderId"]),

  payments: defineTable({
    orderId: v.id("orders"),
    provider: v.union(
      v.literal("gopay_qris"),
      v.literal("manual_transfer"),
      v.literal("other"),
    ),
    providerChargeId: v.string(),
    providerReference: v.optional(v.string()),
    providerTransactionId: v.optional(v.string()),
    baseAmount: v.number(),
    uniqueAmount: v.number(),
    status: paymentStatus,
    idempotencyKey: v.optional(v.string()),
    expiresAt: v.number(),
    paidAt: v.optional(v.number()),
    lastReconciledAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Phase 3 additive fields. Base amount, unique amount, and gateway fee are
    // recorded separately: the offset covers reconciliation only, never revenue.
    gatewayFee: v.optional(v.number()),
    qrString: v.optional(v.string()),
    qrImageUrl: v.optional(v.string()),
    reconciliationState: v.optional(
      v.union(
        v.literal("none"),
        v.literal("late"),
        v.literal("unmatched"),
        v.literal("duplicate"),
      ),
    ),
    reconciliationReason: v.optional(v.string()),
    settledEventId: v.optional(v.string()),
  })
    .index("by_orderId", ["orderId"])
    .index("by_status", ["status"])
    .index("by_providerChargeId", ["providerChargeId"])
    .index("by_providerTransactionId", ["providerTransactionId"])
    .index("by_uniqueAmount", ["uniqueAmount"])
    .index("by_idempotencyKey", ["idempotencyKey"])
    .index("by_createdAt", ["createdAt"]),

  paymentEvents: defineTable({
    eventId: v.string(),
    paymentId: v.optional(v.id("payments")),
    orderId: v.optional(v.id("orders")),
    kind: v.union(
      v.literal("created"),
      v.literal("settled"),
      v.literal("expired"),
      v.literal("failed"),
      v.literal("cancelled"),
      v.literal("refunded"),
      v.literal("reconciled"),
    ),
    amount: v.optional(v.number()),
    providerReference: v.optional(v.string()),
    /** JSON bag: raw provider payload, retained for reconciliation and audit. */
    payload: jsonBagValidator,
    createdAt: v.number(),
  })
    .index("by_eventId", ["eventId"])
    .index("by_paymentId", ["paymentId"])
    .index("by_orderId", ["orderId"])
    .index("by_createdAt", ["createdAt"]),

  payouts: defineTable({
    teacherId: v.id("users"),
    periodStart: v.number(),
    periodEnd: v.number(),
    gross: v.number(),
    teacherShare: v.number(),
    platformShare: v.number(),
    communityShare: v.number(),
    status: payoutStatus,
    approvedBy: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    reason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Phase 3 additive fields: one allocation row per settled order, plus
    // compensating rows for refunds after release. Negative rows are new
    // entries; a paid row is never rewritten.
    orderId: v.optional(v.id("orders")),
    paymentId: v.optional(v.id("payments")),
    dueAt: v.optional(v.number()),
    kind: v.optional(v.union(v.literal("sale"), v.literal("reversal"))),
    reversalOf: v.optional(v.id("payouts")),
    holdReason: v.optional(v.string()),
    paidAmount: v.optional(v.number()),
    reference: v.optional(v.string()),
  })
    .index("by_teacherId", ["teacherId"])
    .index("by_status", ["status"])
    .index("by_periodStart", ["periodStart"])
    .index("by_orderId", ["orderId"])
    .index("by_teacherId_status", ["teacherId", "status"]),

  refunds: defineTable({
    orderId: v.id("orders"),
    paymentId: v.optional(v.id("payments")),
    requestedBy: v.optional(v.id("users")),
    amount: v.number(),
    reason: v.string(),
    status: v.union(
      v.literal("requested"),
      v.literal("reviewing"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("paid"),
    ),
    decidedBy: v.optional(v.string()),
    decisionReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    paidAt: v.optional(v.number()),
    // Phase 3 additive fields.
    evidence: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_orderId", ["orderId"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  /** Append-only. Corrections are reversal entries, never edits. */
  ledgerEntries: defineTable({
    orderId: v.optional(v.id("orders")),
    paymentId: v.optional(v.id("payments")),
    payoutId: v.optional(v.id("payouts")),
    refundId: v.optional(v.id("refunds")),
    teacherId: v.optional(v.id("users")),
    account: v.union(
      v.literal("teacher"),
      v.literal("platform"),
      v.literal("community"),
      v.literal("gateway_fee"),
      v.literal("negative_balance"),
    ),
    direction: v.union(v.literal("debit"), v.literal("credit")),
    amount: v.number(),
    currency: v.literal("IDR"),
    entryType: v.union(
      v.literal("sale"),
      v.literal("payout"),
      v.literal("refund"),
      v.literal("reversal"),
      v.literal("adjustment"),
    ),
    reversalOf: v.optional(v.id("ledgerEntries")),
    createdBy: v.optional(v.string()),
    reason: v.string(),
    createdAt: v.number(),
  })
    .index("by_orderId", ["orderId"])
    .index("by_payoutId", ["payoutId"])
    .index("by_refundId", ["refundId"])
    .index("by_account", ["account"])
    .index("by_teacherId", ["teacherId"])
    .index("by_createdAt", ["createdAt"]),
}
