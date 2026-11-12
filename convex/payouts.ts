import { v } from "convex/values"

import {
  assertRupiah,
  MoneyError,
  reverseSplit,
} from "../lib/commerce/money"
import type {
  LedgerEntryView,
  PayoutView,
  RefundView,
  SellerStatement,
} from "../lib/commerce/types"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import type { Doc, Id } from "./_generated/dataModel"
import {
  assertNotOwnMoney,
  assertReason,
  commerceError,
  currentViewer,
  DAY_MS,
  notFound,
  now,
  requireViewer,
  writeAudit,
} from "./commerce_shared"

type ReadCtx = Pick<QueryCtx, "db" | "auth"> | MutationCtx

function assertAmount(value: number, field: string): number {
  try {
    return assertRupiah(value, field)
  } catch (error) {
    if (error instanceof MoneyError) commerceError(error.code, error.message)
    throw error
  }
}

async function toPayoutView(
  ctx: ReadCtx,
  payout: Doc<"payouts">,
): Promise<PayoutView> {
  const [teacher, order, work] = await Promise.all([
    ctx.db.get(payout.teacherId),
    payout.orderId ? ctx.db.get(payout.orderId) : null,
    payout.orderId
      ? (async () => {
          const doc = await ctx.db.get(payout.orderId as Id<"orders">)
          return doc?.workId ? await ctx.db.get(doc.workId) : null
        })()
      : null,
  ])

  return {
    id: payout._id,
    teacherId: payout.teacherId,
    teacherName: teacher?.name ?? "Tidak ditemukan",
    orderId: payout.orderId ?? null,
    orderCode: order?.code ?? null,
    workTitle: work?.title ?? null,
    reference: payout.reference ?? null,
    periodStart: payout.periodStart,
    periodEnd: payout.periodEnd,
    dueAt: payout.dueAt ?? null,
    gross: payout.gross,
    teacherShare: payout.teacherShare,
    platformShare: payout.platformShare,
    communityShare: payout.communityShare,
    paidAmount: payout.paidAmount ?? null,
    status: payout.status,
    kind: payout.kind ?? "sale",
    reversalOf: payout.reversalOf ?? null,
    holdReason: payout.holdReason ?? null,
    reason: payout.reason ?? null,
    approvedBy: payout.approvedBy ?? null,
    paidAt: payout.paidAt ?? null,
    createdAt: payout.createdAt,
  }
}

async function toLedgerView(
  ctx: ReadCtx,
  entry: Doc<"ledgerEntries">,
): Promise<LedgerEntryView> {
  const order = entry.orderId ? await ctx.db.get(entry.orderId) : null
  return {
    id: entry._id,
    orderId: entry.orderId ?? null,
    orderCode: order?.code ?? null,
    payoutId: entry.payoutId ?? null,
    refundId: entry.refundId ?? null,
    teacherId: entry.teacherId ?? null,
    account: entry.account,
    direction: entry.direction,
    amount: entry.amount,
    entryType: entry.entryType,
    reversalOf: entry.reversalOf ?? null,
    reason: entry.reason,
    createdAt: entry.createdAt,
  }
}

async function sellerOrAdmin(
  ctx: ReadCtx,
  capability: "payouts.view.own" | "payouts.release",
): Promise<{ viewerId: string; isAdmin: boolean; roleLabel: string }> {
  const current = await currentViewer(ctx)
  if (!current) commerceError("UNAUTHENTICATED", "Masuk diperlukan.")
  const isAdmin = current.viewer.capabilities.includes("payouts.release")
  if (isAdmin) {
    return {
      viewerId: current.user._id,
      isAdmin: true,
      roleLabel: current.viewer.roleLabel,
    }
  }
  if (!current.viewer.capabilities.includes(capability)) {
    commerceError("FORBIDDEN", "Akun ini tidak memiliki akses pendapatan.")
  }
  return {
    viewerId: current.user._id,
    isAdmin: false,
    roleLabel: current.viewer.roleLabel,
  }
}

export const listPayouts = query({
  args: {},
  handler: async (ctx): Promise<PayoutView[]> => {
    const scope = await sellerOrAdmin(ctx, "payouts.view.own")
    const rows = scope.isAdmin
      ? await ctx.db.query("payouts").withIndex("by_periodStart").order("desc").take(300)
      : await ctx.db
          .query("payouts")
          .withIndex("by_teacherId", (q) => q.eq("teacherId", scope.viewerId as Id<"users">))
          .collect()
    const views = await Promise.all(rows.map((row) => toPayoutView(ctx, row)))
    return views.sort((a, b) => b.createdAt - a.createdAt)
  },
})

export const getPayout = query({
  args: { payoutId: v.id("payouts") },
  handler: async (ctx, args): Promise<PayoutView> => {
    const scope = await sellerOrAdmin(ctx, "payouts.view.own")
    const payout = await ctx.db.get(args.payoutId)
    if (!payout) notFound("Payout tidak ditemukan.")
    if (!scope.isAdmin && payout.teacherId !== scope.viewerId) notFound()
    return await toPayoutView(ctx, payout)
  },
})

export const listLedger = query({
  args: {
    teacherId: v.optional(v.id("users")),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<LedgerEntryView[]> => {
    const scope = await sellerOrAdmin(ctx, "payouts.view.own")
    const teacherId = scope.isAdmin
      ? (args.teacherId ?? null)
      : (scope.viewerId as Id<"users">)

    let rows: Doc<"ledgerEntries">[]
    if (teacherId) {
      rows = await ctx.db
        .query("ledgerEntries")
        .withIndex("by_teacherId", (q) => q.eq("teacherId", teacherId))
        .collect()
    } else {
      rows = await ctx.db
        .query("ledgerEntries")
        .withIndex("by_createdAt")
        .order("desc")
        .take(500)
    }

    const filtered = rows.filter(
      (row) =>
        (!args.from || row.createdAt >= args.from) &&
        (!args.to || row.createdAt <= args.to),
    )
    const views = await Promise.all(filtered.map((row) => toLedgerView(ctx, row)))
    return views.sort((a, b) => b.createdAt - a.createdAt)
  },
})

export const getSellerStatement = query({
  args: {
    teacherId: v.optional(v.id("users")),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<SellerStatement> => {
    const scope = await sellerOrAdmin(ctx, "payouts.view.own")
    const teacherId = scope.isAdmin
      ? (args.teacherId ?? null)
      : (scope.viewerId as Id<"users">)

    if (!teacherId) {
      commerceError("INVALID_INPUT", "Pilih pengajar untuk statement.")
    }
    const teacher = await ctx.db.get(teacherId)
    if (!teacher) notFound("Pengajar tidak ditemukan.")

    const [entries, payouts] = await Promise.all([
      ctx.db
        .query("ledgerEntries")
        .withIndex("by_teacherId", (q) => q.eq("teacherId", teacherId))
        .collect(),
      ctx.db
        .query("payouts")
        .withIndex("by_teacherId", (q) => q.eq("teacherId", teacherId))
        .collect(),
    ])

    const inRange = (value: number) =>
      (!args.from || value >= args.from) && (!args.to || value <= args.to)
    const filteredEntries = entries.filter((entry) => inRange(entry.createdAt))
    const filteredPayouts = payouts.filter((payout) => inRange(payout.createdAt))

    let grossSales = 0
    let teacherEarned = 0
    let teacherPaid = 0
    let teacherReversed = 0
    let teacherNegativeBalance = 0
    let platformShare = 0
    let communityShare = 0
    let gatewayFees = 0

    for (const entry of filteredEntries) {
      if (entry.account === "teacher") {
        if (entry.entryType === "sale") teacherEarned += entry.amount
        else if (entry.entryType === "payout") teacherPaid += entry.amount
        else if (entry.entryType === "reversal") teacherReversed += entry.amount
      }
      if (entry.account === "negative_balance") {
        teacherNegativeBalance +=
          entry.direction === "debit" ? entry.amount : -entry.amount
      }
      if (entry.account === "platform" && entry.entryType === "sale") {
        platformShare += entry.amount
      }
      if (entry.account === "community" && entry.entryType === "sale") {
        communityShare += entry.amount
      }
      if (entry.account === "gateway_fee") gatewayFees += entry.amount
    }

    for (const payout of filteredPayouts) {
      if ((payout.kind ?? "sale") === "sale" && payout.status !== "reversed") {
        grossSales += payout.gross
      }
    }

    const [entryViews, payoutViews] = await Promise.all([
      Promise.all(filteredEntries.map((entry) => toLedgerView(ctx, entry))),
      Promise.all(filteredPayouts.map((payout) => toPayoutView(ctx, payout))),
    ])

    return {
      teacherId,
      teacherName: teacher.name,
      from: args.from ?? null,
      to: args.to ?? null,
      grossSales,
      teacherEarned,
      teacherPaid,
      teacherReversed,
      teacherNegativeBalance,
      teacherBalance:
        teacherEarned - teacherReversed - teacherPaid - teacherNegativeBalance,
      platformShare,
      communityShare,
      gatewayFees,
      payoutCount: filteredPayouts.filter(
        (payout) => (payout.kind ?? "sale") === "sale",
      ).length,
      entries: entryViews.sort((a, b) => b.createdAt - a.createdAt),
      payouts: payoutViews.sort((a, b) => b.createdAt - a.createdAt),
    }
  },
})

async function requirePayout(
  ctx: MutationCtx,
  payoutId: Id<"payouts">,
): Promise<Doc<"payouts">> {
  const payout = await ctx.db.get(payoutId)
  if (!payout) notFound("Payout tidak ditemukan.")
  return payout
}

export const holdPayout = mutation({
  args: { payoutId: v.id("payouts"), reason: v.string() },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "payouts.release")
    const payout = await requirePayout(ctx, args.payoutId)
    const reason = assertReason(args.reason, "Alasan penahanan")
    if (!["pending", "approved"].includes(payout.status)) {
      commerceError("INVALID_STATE", "Payout ini tidak dapat ditahan.")
    }
    await ctx.db.patch(payout._id, {
      status: "held",
      holdReason: reason,
      reason,
      updatedAt: now(),
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "payouts.hold",
      entityType: "payouts",
      entityId: payout._id,
      reason,
      before: { status: payout.status },
      after: { status: "held" },
      severity: "warning",
    })
    return null
  },
})

export const approvePayout = mutation({
  args: { payoutId: v.id("payouts") },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "payouts.release")
    const payout = await requirePayout(ctx, args.payoutId)
    if (!["pending", "held"].includes(payout.status)) {
      commerceError("INVALID_STATE", "Payout ini tidak dapat disetujui.")
    }
    await ctx.db.patch(payout._id, {
      status: "approved",
      approvedBy: viewer.userId,
      updatedAt: now(),
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "payouts.approve",
      entityType: "payouts",
      entityId: payout._id,
      reason: "Payout disetujui pengelola.",
      before: { status: payout.status },
      after: { status: "approved" },
    })
    return null
  },
})

async function verifiedPayoutAccount(
  ctx: MutationCtx,
  teacherId: Id<"users">,
): Promise<Doc<"payoutAccounts">> {
  const accounts = await ctx.db
    .query("payoutAccounts")
    .withIndex("by_userId", (q) => q.eq("userId", teacherId))
    .collect()
  const account = accounts.find((row) => row.status === "verified")
  if (!account) {
    commerceError(
      "PAYOUT_ACCOUNT_UNVERIFIED",
      "Rekening payout belum terverifikasi.",
    )
  }
  return account
}

export const releasePayout = mutation({
  args: { payoutId: v.id("payouts") },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "payouts.release")
    const payout = await requirePayout(ctx, args.payoutId)
    if (payout.status !== "approved") {
      commerceError(
        "INVALID_STATE",
        "Payout harus disetujui sebelum dicairkan.",
      )
    }
    await verifiedPayoutAccount(ctx, payout.teacherId)

    if (payout.orderId) {
      const disputes = await ctx.db
        .query("disputes")
        .withIndex("by_subject", (q) =>
          q.eq("subjectType", "order").eq("subjectId", payout.orderId as string),
        )
        .collect()
      if (disputes.some((row) => ["open", "reviewing"].includes(row.status))) {
        commerceError(
          "DISPUTE_OPEN",
          "Sengketa pesanan masih terbuka; tahan payout sampai selesai.",
        )
      }
    }

    const entries = payout.orderId
      ? await ctx.db
          .query("ledgerEntries")
          .withIndex("by_orderId", (q) => q.eq("orderId", payout.orderId as Id<"orders">))
          .collect()
      : []
    const net = entries
      .filter((entry) => entry.account === "teacher")
      .reduce((sum, entry) => {
        if (entry.entryType === "sale") return sum + entry.amount
        if (entry.entryType === "reversal") return sum - entry.amount
        return sum
      }, 0)

    // A refund after release writes a negative balance. The next release nets it
    // before paying; the paid row itself is never edited.
    const teacherEntries = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_teacherId", (q) => q.eq("teacherId", payout.teacherId))
      .collect()
    const carry = teacherEntries
      .filter((entry) => entry.account === "negative_balance")
      .reduce(
        (sum, entry) =>
          sum + (entry.direction === "debit" ? entry.amount : -entry.amount),
        0,
      )

    const carryApplied = Math.min(Math.max(carry, 0), Math.max(net, 0))
    const paidAmount = net - carryApplied

    if (net <= 0 || paidAmount <= 0) {
      await ctx.db.patch(payout._id, {
        status: "held",
        holdReason:
          "Saldo bersih nol atau tertutup saldo negatif; perlu pemeriksaan manual.",
        updatedAt: now(),
      })
      await writeAudit(ctx, {
        actorId: viewer.userId,
        actorRole: viewer.roleLabel,
        action: "payouts.release.blocked",
        entityType: "payouts",
        entityId: payout._id,
        reason: "Saldo bersih tidak cukup untuk dicairkan.",
        before: { net, carry },
        severity: "warning",
      })
      commerceError(
        "NEGATIVE_BALANCE",
        "Saldo bersih payout ini nol atau tertutup saldo negatif; tahan untuk pemeriksaan.",
      )
    }

    const timestamp = now()
    await ctx.db.patch(payout._id, {
      status: "paid",
      paidAt: timestamp,
      paidAmount,
      updatedAt: timestamp,
    })
    if (carryApplied > 0) {
      await ctx.db.insert("ledgerEntries", {
        orderId: payout.orderId,
        paymentId: payout.paymentId,
        payoutId: payout._id,
        teacherId: payout.teacherId,
        account: "negative_balance",
        direction: "credit",
        amount: carryApplied,
        currency: "IDR",
        entryType: "adjustment",
        createdBy: viewer.userId,
        reason: "Saldo negatif dipotong dari payout berikutnya.",
        createdAt: timestamp,
      })
    }
    await ctx.db.insert("ledgerEntries", {
      orderId: payout.orderId,
      paymentId: payout.paymentId,
      payoutId: payout._id,
      teacherId: payout.teacherId,
      account: "teacher",
      direction: "debit",
      amount: paidAmount,
      currency: "IDR",
      entryType: "payout",
      createdBy: viewer.userId,
      reason: "Payout dicairkan ke rekening terverifikasi.",
      createdAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "payouts.release",
      entityType: "payouts",
      entityId: payout._id,
      reason: "Payout dicairkan.",
      before: { status: payout.status },
      after: { status: "paid", paidAmount, carryApplied },
    })
    return { paidAmount, carryApplied }
  },
})

export const reversePayout = mutation({
  args: { payoutId: v.id("payouts"), reason: v.string() },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "payouts.release")
    const payout = await requirePayout(ctx, args.payoutId)
    const reason = assertReason(args.reason, "Alasan pembalikan")
    if (payout.status !== "paid") {
      commerceError("INVALID_STATE", "Hanya payout yang sudah dibayar dapat dibalik.")
    }

    const timestamp = now()
    const reversalId = await ctx.db.insert("payouts", {
      teacherId: payout.teacherId,
      orderId: payout.orderId,
      paymentId: payout.paymentId,
      periodStart: timestamp,
      periodEnd: timestamp,
      dueAt: timestamp,
      kind: "reversal",
      reversalOf: payout._id,
      reference: payout.reference,
      gross: -payout.gross,
      teacherShare: -payout.teacherShare,
      platformShare: -payout.platformShare,
      communityShare: -payout.communityShare,
      paidAmount: -(payout.paidAmount ?? payout.teacherShare),
      status: "reversed",
      reason,
      createdAt: timestamp,
      updatedAt: timestamp,
    })

    const originalEntries = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_payoutId", (q) => q.eq("payoutId", payout._id))
      .collect()

    for (const entry of [
      { account: "teacher" as const, amount: payout.teacherShare },
      { account: "platform" as const, amount: payout.platformShare },
      { account: "community" as const, amount: payout.communityShare },
    ]) {
      const original = originalEntries.find(
        (row) => row.account === entry.account && row.entryType === "sale",
      )
      await ctx.db.insert("ledgerEntries", {
        orderId: payout.orderId,
        paymentId: payout.paymentId,
        payoutId: reversalId,
        teacherId: payout.teacherId,
        account: entry.account,
        direction: "debit",
        amount: entry.amount,
        currency: "IDR",
        entryType: "reversal",
        reversalOf: original?._id,
        createdBy: viewer.userId,
        reason,
        createdAt: timestamp,
      })
    }

    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "payouts.reverse",
      entityType: "payouts",
      entityId: payout._id,
      reason,
      before: { status: payout.status },
      after: { status: "paid", reversalId },
      severity: "warning",
    })
    return { reversalId }
  },
})

/* --------------------------------------------------------------- accounts */

export const requestPayoutAccount = mutation({
  args: {
    provider: v.union(v.literal("bank"), v.literal("gopay"), v.literal("other")),
    bankCode: v.string(),
    accountName: v.string(),
    accountNumberMasked: v.string(),
    accountRef: v.string(),
  },
  handler: async (ctx, args) => {
    const { user, viewer } = await requireViewer(ctx, "payouts.view.own")
    if (!args.accountName.trim() || !args.accountNumberMasked.trim()) {
      commerceError("INVALID_ACCOUNT", "Nama dan nomor rekening wajib diisi.")
    }
    const timestamp = now()
    const existing = await ctx.db
      .query("payoutAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first()

    const payload = {
      provider: args.provider,
      bankCode: args.bankCode.trim(),
      accountName: args.accountName.trim(),
      accountNumberMasked: args.accountNumberMasked.trim(),
      accountRef: args.accountRef.trim(),
      status: "pending" as const,
      verifiedBy: undefined,
      verifiedAt: undefined,
      updatedAt: timestamp,
    }

    let accountId: Id<"payoutAccounts">
    if (existing) {
      await ctx.db.patch(existing._id, payload)
      accountId = existing._id
    } else {
      accountId = await ctx.db.insert("payoutAccounts", {
        userId: user._id,
        ...payload,
        createdAt: timestamp,
      })
    }

    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "payouts.account.change",
      entityType: "payoutAccounts",
      entityId: accountId,
      reason: "Rekening payout diubah; verifikasi ulang diperlukan.",
      before: existing
        ? { status: existing.status, masked: existing.accountNumberMasked }
        : undefined,
      after: { status: "pending", masked: payload.accountNumberMasked },
      severity: "warning",
    })
    return { accountId }
  },
})

export const verifyPayoutAccount = mutation({
  args: { accountId: v.id("payoutAccounts"), reason: v.string() },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "people.manage")
    const reason = assertReason(args.reason, "Alasan verifikasi")
    const account = await ctx.db.get(args.accountId)
    if (!account) notFound("Rekening tidak ditemukan.")
    await ctx.db.patch(account._id, {
      status: "verified",
      verifiedBy: viewer.userId,
      verifiedAt: now(),
      updatedAt: now(),
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "payouts.account.verify",
      entityType: "payoutAccounts",
      entityId: account._id,
      reason,
      before: { status: account.status },
      after: { status: "verified" },
    })
    return null
  },
})

/* ---------------------------------------------------------------- refunds */

async function toRefundView(
  ctx: ReadCtx,
  refund: Doc<"refunds">,
): Promise<RefundView> {
  const order = await ctx.db.get(refund.orderId)
  if (!order) notFound("Pesanan tidak ditemukan.")
  const [seller, work, payouts] = await Promise.all([
    ctx.db.get(order.sellerId),
    order.workId ? ctx.db.get(order.workId) : null,
    ctx.db
      .query("payouts")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .collect(),
  ])
  const payout = payouts.find((row) => (row.kind ?? "sale") === "sale")

  return {
    id: refund._id,
    orderId: order._id,
    orderCode: order.code,
    buyerName: order.buyerName,
    sellerName: seller?.name ?? "Tidak ditemukan",
    workTitle: work?.title ?? "Tidak ditemukan",
    amount: refund.amount,
    baseAmount: order.baseAmount,
    reason: refund.reason,
    evidence: refund.evidence ?? null,
    status: refund.status,
    requestedBy: refund.requestedBy ?? null,
    decidedBy: refund.decidedBy ?? null,
    decisionReason: refund.decisionReason ?? null,
    payoutReleased: payout?.status === "paid",
    createdAt: refund.createdAt,
    reviewedAt: refund.reviewedAt ?? null,
    paidAt: refund.paidAt ?? null,
  }
}

export const requestRefund = mutation({
  args: {
    orderId: v.id("orders"),
    amount: v.optional(v.number()),
    reason: v.string(),
    evidence: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const current = await currentViewer(ctx)
    if (!current) commerceError("UNAUTHENTICATED", "Masuk diperlukan.")
    const { user, viewer } = current
    const order = await ctx.db.get(args.orderId)
    if (!order) notFound("Pesanan tidak ditemukan.")

    const isAdmin = viewer.capabilities.includes("payments.manage")
    if (isAdmin) {
      assertNotOwnMoney(viewer, "request_refund", order)
    } else if (order.buyerUserId !== user._id) {
      notFound("Pesanan tidak ditemukan.")
    }
    if (!["paid", "in_progress", "delivered", "completed", "disputed"].includes(order.status)) {
      commerceError("INVALID_STATE", "Pesanan ini belum dapat dimintakan refund.")
    }

    const reason = assertReason(args.reason, "Alasan refund")
    const amount =
      args.amount !== undefined
        ? assertAmount(args.amount, "Nilai refund")
        : order.baseAmount
    if (amount > order.baseAmount) {
      commerceError("REFUND_EXCEEDS_BASE", "Refund melebihi nilai pesanan.")
    }

    const existing = await ctx.db
      .query("refunds")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .collect()
    const committed = existing
      .filter((row) => row.status !== "rejected")
      .reduce((sum, row) => sum + row.amount, 0)
    if (committed + amount > order.baseAmount) {
      commerceError(
        "REFUND_EXCEEDS_BASE",
        "Total refund melebihi nilai dasar pesanan.",
      )
    }

    const payment = await ctx.db
      .query("payments")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .collect()
    const latest = [...payment].sort((a, b) => b.createdAt - a.createdAt)[0]

    const timestamp = now()
    const refundId = await ctx.db.insert("refunds", {
      orderId: order._id,
      paymentId: latest?._id,
      requestedBy: user._id,
      amount,
      reason,
      evidence: args.evidence?.trim() || undefined,
      status: "requested",
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "refunds.request",
      entityType: "refunds",
      entityId: refundId,
      reason,
      after: { orderId: order._id, amount },
    })
    return { refundId }
  },
})

async function holdOrderPayout(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  reason: string,
): Promise<void> {
  const payouts = await ctx.db
    .query("payouts")
    .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
    .collect()
  for (const payout of payouts) {
    if (
      (payout.kind ?? "sale") === "sale" &&
      ["pending", "approved"].includes(payout.status)
    ) {
      await ctx.db.patch(payout._id, {
        status: "held",
        holdReason: reason,
        updatedAt: now(),
      })
    }
  }
}

export const reviewRefund = mutation({
  args: {
    refundId: v.id("refunds"),
    decision: v.union(
      v.literal("reviewing"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "payments.manage")
    const reason = assertReason(args.reason, "Alasan keputusan refund")
    const refund = await ctx.db.get(args.refundId)
    if (!refund) notFound("Refund tidak ditemukan.")
    const order = await ctx.db.get(refund.orderId)
    if (!order) notFound("Pesanan tidak ditemukan.")
    assertNotOwnMoney(viewer, "review_refund", order)

    const allowed: Record<string, string[]> = {
      requested: ["reviewing", "approved", "rejected"],
      reviewing: ["approved", "rejected"],
    }
    if (!allowed[refund.status]?.includes(args.decision)) {
      commerceError("INVALID_STATE", "Keputusan refund tidak sah untuk status ini.")
    }

    const timestamp = now()
    await ctx.db.patch(refund._id, {
      status: args.decision,
      decidedBy: viewer.userId,
      decisionReason: reason,
      reviewedAt: timestamp,
      updatedAt: timestamp,
    })
    if (args.decision === "approved") {
      await holdOrderPayout(
        ctx,
        order._id,
        "Refund disetujui; payout ditahan sampai refund dibayar.",
      )
    }
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "refunds.review",
      entityType: "refunds",
      entityId: refund._id,
      reason,
      before: { status: refund.status },
      after: { status: args.decision },
      severity: args.decision === "approved" ? "warning" : "info",
    })
    return null
  },
})

export const payRefund = mutation({
  args: { refundId: v.id("refunds"), reason: v.string() },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "payments.manage")
    const reason = assertReason(args.reason, "Alasan pembayaran refund")
    const refund = await ctx.db.get(args.refundId)
    if (!refund) notFound("Refund tidak ditemukan.")
    if (refund.status !== "approved") {
      commerceError(
        "INVALID_STATE",
        "Hanya refund yang disetujui dapat dibayarkan.",
      )
    }
    const order = await ctx.db.get(refund.orderId)
    if (!order) notFound("Pesanan tidak ditemukan.")
    assertNotOwnMoney(viewer, "pay_refund", order)

    const amount = assertAmount(refund.amount, "Nilai refund")
    if (amount > order.baseAmount) {
      commerceError("REFUND_EXCEEDS_BASE", "Refund melebihi nilai pesanan.")
    }
    const split = reverseSplit(order.baseAmount, amount)
    const timestamp = now()

    const salePayouts = await ctx.db
      .query("payouts")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .collect()
    const payout = salePayouts.find((row) => (row.kind ?? "sale") === "sale") ?? null
    const payoutReleased = payout?.status === "paid"
    const fullRefund = amount === order.baseAmount

    // The payment stays `paid`; the refund is recorded separately. Only
    // reversal entries are added to the append-only ledger.
    const originalEntries = await ctx.db
      .query("ledgerEntries")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .collect()
    for (const entry of [
      { account: "teacher" as const, amount: split.teacherShare },
      { account: "platform" as const, amount: split.platformShare },
      { account: "community" as const, amount: split.communityShare },
    ]) {
      const original = originalEntries.find(
        (row) => row.account === entry.account && row.entryType === "sale",
      )
      await ctx.db.insert("ledgerEntries", {
        orderId: order._id,
        paymentId: refund.paymentId,
        payoutId: payout?._id,
        refundId: refund._id,
        teacherId: order.sellerId,
        account: entry.account,
        direction: "debit",
        amount: entry.amount,
        currency: "IDR",
        entryType: "reversal",
        reversalOf: original?._id,
        createdBy: viewer.userId,
        reason,
        createdAt: timestamp,
      })
    }

    if (payoutReleased && payout) {
      // The payout was already released. Carry a negative balance forward as a
      // new entry; the paid row and the paid payout are never edited.
      await ctx.db.insert("ledgerEntries", {
        orderId: order._id,
        paymentId: refund.paymentId,
        payoutId: payout._id,
        refundId: refund._id,
        teacherId: order.sellerId,
        account: "negative_balance",
        direction: "debit",
        amount: split.teacherShare,
        currency: "IDR",
        entryType: "reversal",
        createdBy: viewer.userId,
        reason: "Saldo negatif dibawa ke payout berikutnya.",
        createdAt: timestamp,
      })
      await ctx.db.insert("payouts", {
        teacherId: order.sellerId,
        orderId: order._id,
        paymentId: refund.paymentId,
        periodStart: timestamp,
        periodEnd: timestamp,
        dueAt: timestamp,
        kind: "reversal",
        reversalOf: payout._id,
        reference: order.code,
        gross: -amount,
        teacherShare: -split.teacherShare,
        platformShare: -split.platformShare,
        communityShare: -split.communityShare,
        status: "reversed",
        reason,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    } else if (payout) {
      if (fullRefund) {
        await ctx.db.patch(payout._id, {
          status: "reversed",
          reason,
          updatedAt: timestamp,
        })
      } else {
        await holdOrderPayout(
          ctx,
          order._id,
          "Refund sebagian; payout menunggu penyesuaian.",
        )
      }
    }

    if (fullRefund) {
      await ctx.db.patch(order._id, { status: "refunded", updatedAt: timestamp })
    }
    await ctx.db.patch(refund._id, {
      status: "paid",
      paidAt: timestamp,
      decisionReason: refund.decisionReason ?? reason,
      updatedAt: timestamp,
    })
    await ctx.db.insert("paymentEvents", {
      eventId: `refund:${refund._id}`,
      paymentId: refund.paymentId,
      orderId: order._id,
      kind: "refunded",
      amount,
      payload: {
        refundId: refund._id,
        amount,
        payoutReleased,
        shares: split,
      },
      createdAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "refunds.pay",
      entityType: "refunds",
      entityId: refund._id,
      reason,
      before: { status: refund.status, orderStatus: order.status },
      after: {
        status: "paid",
        orderStatus: fullRefund ? "refunded" : order.status,
        payoutReleased,
        negativeCarry: payoutReleased ? split.teacherShare : 0,
      },
      severity: "warning",
    })

    return { paid: amount, negativeCarry: payoutReleased ? split.teacherShare : 0 }
  },
})

export const listRefunds = query({
  args: {},
  handler: async (ctx): Promise<RefundView[]> => {
    const current = await currentViewer(ctx)
    if (!current) commerceError("UNAUTHENTICATED", "Masuk diperlukan.")
    const { viewer } = current

    const rows = await ctx.db
      .query("refunds")
      .withIndex("by_createdAt")
      .order("desc")
      .take(300)
    const views: RefundView[] = []
    for (const refund of rows) {
      const order = await ctx.db.get(refund.orderId)
      if (!order) continue
      const isAdmin = viewer.capabilities.includes("payments.manage")
      const related =
        order.buyerUserId === viewer.userId || order.sellerId === viewer.userId
      if (!isAdmin && !related) continue
      views.push(await toRefundView(ctx, refund))
    }
    return views
  },
})

/** Due payouts sorted by due date for the release queue. */
export const listDuePayouts = query({
  args: {},
  handler: async (ctx): Promise<PayoutView[]> => {
    await requireViewer(ctx, "payouts.release")
    const rows = await ctx.db.query("payouts").collect()
    const due = rows
      .filter(
        (row) =>
          (row.kind ?? "sale") === "sale" &&
          ["pending", "held", "approved"].includes(row.status) &&
          (row.dueAt ?? row.periodEnd) <= now() + 30 * DAY_MS,
      )
      .sort((a, b) => (a.dueAt ?? a.periodEnd) - (b.dueAt ?? b.periodEnd))
    return await Promise.all(due.map((row) => toPayoutView(ctx, row)))
  },
})
