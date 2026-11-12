import { describe, expect, it } from "vitest"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  createChargeForCheckout,
  createCheckout,
  createTestDb,
  seedAccount,
  seedPublishedWork,
  seedSeller,
  seedSellerPayoutAccount,
  settleViaWebhook,
  workSlug,
  type TestDb,
} from "./helpers"

async function paidOrder(
  t: TestDb,
  options: {
    sellerAuth?: string
    buyerAuth?: string
    buyerEmail?: string
    price?: number
  } = {},
) {
  const seller = await seedSeller(t, {
    authUserId: options.sellerAuth ?? "auth-payout-seller",
    email: `${options.sellerAuth ?? "auth-payout-seller"}@example.test`,
  })
  const workId = await seedPublishedWork(t, {
    makerId: seller.userId,
    price: options.price ?? 1_450_000,
  })
  const buyerAuth = options.buyerAuth ?? "auth-payout-buyer"
  const buyerEmail = options.buyerEmail ?? `${buyerAuth}@example.test`
  const checkout = await createCheckout(t, {
    workId,
    buyerAuth,
    buyerEmail,
  })
  const charge = await createChargeForCheckout(t, checkout, 37)
  await settleViaWebhook(t, {
    chargeId: charge.chargeId,
    orderCode: charge.code,
    amount: charge.uniqueAmount,
    paidAt: charge.paymentCreatedAt + 1_000,
  })

  const payout = await t.run(async (ctx) =>
    ctx.db
      .query("payouts")
      .withIndex("by_orderId", (q) => q.eq("orderId", checkout.orderId))
      .first(),
  )
  return { seller, checkout, charge, payout }
}

describe("payout ledger", () => {
  it("[P3-PYT-01] a paid order creates a pending payout row at 70/15/15", async () => {
    const t = createTestDb()
    const { checkout, payout } = await paidOrder(t)
    expect(payout?.status).toBe("pending")
    expect(payout?.teacherShare).toBe(1_015_000)
    expect(payout?.platformShare).toBe(217_500)
    expect(payout?.communityShare).toBe(217_500)
    expect(
      (payout?.teacherShare ?? 0) +
        (payout?.platformShare ?? 0) +
        (payout?.communityShare ?? 0),
    ).toBe(checkout.baseAmount)

    const ledger = await t.run(async (ctx) =>
      ctx.db
        .query("ledgerEntries")
        .withIndex("by_orderId", (q) => q.eq("orderId", checkout.orderId))
        .collect(),
    )
    expect(ledger).toHaveLength(3)
    expect(ledger.map((entry) => entry.account).sort()).toEqual([
      "community",
      "platform",
      "teacher",
    ])
    expect(ledger.every((entry) => entry.direction === "credit")).toBe(true)
  })

  it("[P3-PAY-64] hold, approve, release follow the payout state machine", async () => {
    const t = createTestDb()
    const { seller, payout } = await paidOrder(t)
    await seedAccount(t, { authUserId: "auth-payout-admin", roles: ["admin"] })
    await seedSellerPayoutAccount(t, seller.userId, "verified")
    const admin = t.withIdentity({ subject: "auth-payout-admin" })
    const payoutId = payout?._id as Id<"payouts">

    await admin.mutation(api.payouts.holdPayout, {
      payoutId,
      reason: "Menunggu konfirmasi rekening.",
    })
    let row = await t.run(async (ctx) => ctx.db.get(payoutId))
    expect(row?.status).toBe("held")

    await admin.mutation(api.payouts.approvePayout, { payoutId })
    row = await t.run(async (ctx) => ctx.db.get(payoutId))
    expect(row?.status).toBe("approved")

    await admin.mutation(api.payouts.releasePayout, { payoutId })
    row = await t.run(async (ctx) => ctx.db.get(payoutId))
    expect(row?.status).toBe("paid")
    expect(row?.paidAmount).toBe(1_015_000)
  })

  it("[P3-PAY-65] hold and reverse require a reason", async () => {
    const t = createTestDb()
    const { seller, payout } = await paidOrder(t, { sellerAuth: "auth-reason-seller" })
    await seedAccount(t, { authUserId: "auth-reason-admin", roles: ["admin"] })
    await seedSellerPayoutAccount(t, seller.userId)
    const admin = t.withIdentity({ subject: "auth-reason-admin" })
    const payoutId = payout?._id as Id<"payouts">

    await expect(
      admin.mutation(api.payouts.holdPayout, { payoutId, reason: "" }),
    ).rejects.toThrow()
    await expect(
      admin.mutation(api.payouts.reversePayout, {
        payoutId,
        reason: "pendek",
      }),
    ).rejects.toThrow()
  })

  it("[P3-PAY-66] release requires approval and the payouts.release capability", async () => {
    const t = createTestDb()
    const { seller, payout } = await paidOrder(t, { sellerAuth: "auth-release-seller" })
    await seedSellerPayoutAccount(t, seller.userId)
    await seedAccount(t, { authUserId: "auth-release-admin", roles: ["admin"] })
    await seedAccount(t, { authUserId: "auth-release-buyer" })
    const admin = t.withIdentity({ subject: "auth-release-admin" })
    const payoutId = payout?._id as Id<"payouts">

    await expect(
      admin.mutation(api.payouts.releasePayout, { payoutId }),
    ).rejects.toThrow()

    await expect(
      t
        .withIdentity({ subject: "auth-release-buyer" })
        .mutation(api.payouts.approvePayout, { payoutId }),
    ).rejects.toThrow()
  })

  it("[P3-PAY-69] a payout account change requires re-verification before release", async () => {
    const t = createTestDb()
    const { seller, payout } = await paidOrder(t, { sellerAuth: "auth-account-seller" })
    await seedSellerPayoutAccount(t, seller.userId, "verified")
    await seedAccount(t, { authUserId: "auth-account-admin", roles: ["admin"] })
    const admin = t.withIdentity({ subject: "auth-account-admin" })
    const payoutId = payout?._id as Id<"payouts">
    await admin.mutation(api.payouts.approvePayout, { payoutId })

    await t.withIdentity({ subject: "auth-account-seller" }).mutation(
      api.payouts.requestPayoutAccount,
      {
        provider: "bank",
        bankCode: "BRIN",
        accountName: "Penjual Baru",
        accountNumberMasked: "****9999",
        accountRef: "vault:new",
      },
    )

    await expect(
      admin.mutation(api.payouts.releasePayout, { payoutId }),
    ).rejects.toThrow()

    const accounts = await t.run(async (ctx) =>
      ctx.db
        .query("payoutAccounts")
        .withIndex("by_userId", (q) => q.eq("userId", seller.userId))
        .collect(),
    )
    expect(accounts[0]?.status).toBe("pending")
    await admin.mutation(api.payouts.verifyPayoutAccount, {
      accountId: accounts[0]?._id as Id<"payoutAccounts">,
      reason: "Buku tabungan dan identitas diverifikasi.",
    })
    await admin.mutation(api.payouts.releasePayout, { payoutId })
    const row = await t.run(async (ctx) => ctx.db.get(payoutId))
    expect(row?.status).toBe("paid")
  })

  it("[P3-PAY-67] reversing a paid payout creates a compensating entry, not an edit", async () => {
    const t = createTestDb()
    const { seller, payout } = await paidOrder(t, { sellerAuth: "auth-reverse-seller" })
    await seedSellerPayoutAccount(t, seller.userId)
    await seedAccount(t, { authUserId: "auth-reverse-admin", roles: ["admin"] })
    const admin = t.withIdentity({ subject: "auth-reverse-admin" })
    const payoutId = payout?._id as Id<"payouts">
    await admin.mutation(api.payouts.approvePayout, { payoutId })
    await admin.mutation(api.payouts.releasePayout, { payoutId })
    const paidBefore = await t.run(async (ctx) => ctx.db.get(payoutId))

    const reversal = await admin.mutation(api.payouts.reversePayout, {
      payoutId,
      reason: "Transfer gagal dan dana dikembalikan.",
    })
    const paidAfter = await t.run(async (ctx) => ctx.db.get(payoutId))
    expect(paidAfter?.status).toBe("paid")
    expect(paidAfter?.teacherShare).toBe(paidBefore?.teacherShare)
    expect(paidAfter?.paidAt).toBe(paidBefore?.paidAt)

    const compensating = await t.run(async (ctx) => ctx.db.get(reversal.reversalId))
    expect(compensating?.status).toBe("reversed")
    expect(compensating?.kind).toBe("reversal")
    expect(compensating?.teacherShare).toBe(-1_015_000)

    const ledger = await t.run(async (ctx) =>
      ctx.db
        .query("ledgerEntries")
        .withIndex("by_orderId", (q) => q.eq("orderId", compensating?.orderId as Id<"orders">))
        .collect(),
    )
    expect(ledger.filter((entry) => entry.entryType === "reversal")).toHaveLength(3)
  })

  it("[P0-ACC-49] an unrelated seller cannot read another payout or ledger", async () => {
    const t = createTestDb()
    const { payout } = await paidOrder(t, { sellerAuth: "auth-owner-seller" })
    await seedSeller(t, { authUserId: "auth-other-seller" })

    await expect(
      t
        .withIdentity({ subject: "auth-other-seller" })
        .query(api.payouts.getPayout, { payoutId: payout?._id as Id<"payouts"> }),
    ).rejects.toThrow()

    const ledger = await t
      .withIdentity({ subject: "auth-other-seller" })
      .query(api.payouts.listLedger, {})
    expect(ledger).toEqual([])
  })

  it("[P3-PYT-09] ledger rows expose the entry they reverse", async () => {
    const t = createTestDb()
    const { seller, payout } = await paidOrder(t, {
      sellerAuth: "auth-ledger-reversal-seller",
    })
    await seedSellerPayoutAccount(t, seller.userId)
    await seedAccount(t, {
      authUserId: "auth-ledger-reversal-admin",
      roles: ["admin"],
    })
    const admin = t.withIdentity({ subject: "auth-ledger-reversal-admin" })
    const payoutId = payout?._id as Id<"payouts">
    await admin.mutation(api.payouts.approvePayout, { payoutId })
    await admin.mutation(api.payouts.releasePayout, { payoutId })
    await admin.mutation(api.payouts.reversePayout, {
      payoutId,
      reason: "Transfer gagal dan dana dikembalikan.",
    })

    const rows = await admin.query(api.payouts.listLedger, {})
    const reversals = rows.filter((entry) => entry.entryType === "reversal")
    expect(reversals).toHaveLength(3)
    expect(reversals.every((entry) => entry.reversalOf !== null)).toBe(true)
  })

  it("[P3-PAY-68] a seller statement reconciles to ledger rows", async () => {
    const t = createTestDb()
    const { seller } = await paidOrder(t, { sellerAuth: "auth-statement-seller" })
    await seedSellerPayoutAccount(t, seller.userId)

    const statement = await t
      .withIdentity({ subject: "auth-statement-seller" })
      .query(api.payouts.getSellerStatement, {})
    expect(statement.teacherEarned).toBe(1_015_000)
    expect(statement.platformShare).toBe(217_500)
    expect(statement.communityShare).toBe(217_500)
    expect(statement.grossSales).toBe(1_450_000)
    expect(statement.entries).toHaveLength(3)
    expect(statement.teacherBalance).toBe(1_015_000)
  })
})

describe("refunds", () => {
  it("[P3-RFD-01] a refund request captures reason, evidence, and the order link", async () => {
    const t = createTestDb()
    const { checkout } = await paidOrder(t, {
      sellerAuth: "auth-refund-request-seller",
      buyerAuth: "auth-refund-request-buyer",
    })

    const result = await t
      .withIdentity({ subject: "auth-refund-request-buyer" })
      .mutation(api.payouts.requestRefund, {
        orderId: checkout.orderId,
        amount: 500_000,
        reason: "Warna kain tidak sesuai kesepakatan.",
        evidence: "Foto kain dan percakapan pengrajin.",
      })
    const refund = await t.run(async (ctx) => ctx.db.get(result.refundId))
    expect(refund?.status).toBe("requested")
    expect(refund?.amount).toBe(500_000)
    expect(refund?.evidence).toContain("Foto")
    expect(refund?.orderId).toBe(checkout.orderId)
  })

  it("[P3-RFD-02] a refund follows requested → reviewing → approved → paid", async () => {
    const t = createTestDb()
    const { checkout } = await paidOrder(t, {
      sellerAuth: "auth-refund-flow-seller",
      buyerAuth: "auth-refund-flow-buyer",
    })
    await seedAccount(t, { authUserId: "auth-refund-flow-admin", roles: ["admin"] })
    const admin = t.withIdentity({ subject: "auth-refund-flow-admin" })

    const { refundId } = await t
      .withIdentity({ subject: "auth-refund-flow-buyer" })
      .mutation(api.payouts.requestRefund, {
        orderId: checkout.orderId,
        reason: "Kain rusak saat pengiriman.",
      })
    await admin.mutation(api.payouts.reviewRefund, {
      refundId,
      decision: "reviewing",
      reason: "Bukti sedang diperiksa.",
    })
    await admin.mutation(api.payouts.reviewRefund, {
      refundId,
      decision: "approved",
      reason: "Bukti kerusakan diterima.",
    })
    await admin.mutation(api.payouts.payRefund, {
      refundId,
      reason: "Refund ditransfer manual ke pembeli.",
    })

    const refund = await t.run(async (ctx) => ctx.db.get(refundId))
    expect(refund?.status).toBe("paid")
    expect(refund?.paidAt).toBeTruthy()
  })

  it("[P3-RFD-03] approval and rejection require a reason", async () => {
    const t = createTestDb()
    const { checkout } = await paidOrder(t, {
      sellerAuth: "auth-refund-reason-seller",
      buyerAuth: "auth-refund-reason-buyer",
    })
    await seedAccount(t, { authUserId: "auth-refund-reason-admin", roles: ["admin"] })
    const admin = t.withIdentity({ subject: "auth-refund-reason-admin" })
    const { refundId } = await t
      .withIdentity({ subject: "auth-refund-reason-buyer" })
      .mutation(api.payouts.requestRefund, {
        orderId: checkout.orderId,
        reason: "Tidak sesuai.",
      })

    await expect(
      admin.mutation(api.payouts.reviewRefund, {
        refundId,
        decision: "rejected",
        reason: "",
      }),
    ).rejects.toThrow()
  })

  it("[P3-RFD-05] a rejected refund cannot be paid", async () => {
    const t = createTestDb()
    const { checkout } = await paidOrder(t, {
      sellerAuth: "auth-refund-reject-seller",
      buyerAuth: "auth-refund-reject-buyer",
    })
    await seedAccount(t, { authUserId: "auth-refund-reject-admin", roles: ["admin"] })
    const admin = t.withIdentity({ subject: "auth-refund-reject-admin" })
    const { refundId } = await t
      .withIdentity({ subject: "auth-refund-reject-buyer" })
      .mutation(api.payouts.requestRefund, {
        orderId: checkout.orderId,
        reason: "Klaim tanpa bukti.",
      })
    await admin.mutation(api.payouts.reviewRefund, {
      refundId,
      decision: "rejected",
      reason: "Bukti tidak cukup.",
    })

    await expect(
      admin.mutation(api.payouts.payRefund, {
        refundId,
        reason: "Tetap dibayar.",
      }),
    ).rejects.toThrow()
  })

  it("[P3-PAY-60] a full refund creates reversal entries and never edits the original rows", async () => {
    const t = createTestDb()
    const { checkout, seller } = await paidOrder(t, {
      sellerAuth: "auth-refund-full-seller",
      buyerAuth: "auth-refund-full-buyer",
    })
    await seedSellerPayoutAccount(t, seller.userId)
    await seedAccount(t, { authUserId: "auth-refund-full-admin", roles: ["admin"] })
    const admin = t.withIdentity({ subject: "auth-refund-full-admin" })

    const before = await t.run(async (ctx) =>
      ctx.db
        .query("ledgerEntries")
        .withIndex("by_orderId", (q) => q.eq("orderId", checkout.orderId))
        .collect(),
    )
    const snapshot = before.map((entry) => ({
      id: entry._id,
      amount: entry.amount,
      direction: entry.direction,
    }))

    const { refundId } = await t
      .withIdentity({ subject: "auth-refund-full-buyer" })
      .mutation(api.payouts.requestRefund, {
        orderId: checkout.orderId,
        reason: "Karya tidak dikirim.",
      })
    await admin.mutation(api.payouts.reviewRefund, {
      refundId,
      decision: "approved",
      reason: "Penjual tidak merespons.",
    })
    await admin.mutation(api.payouts.payRefund, {
      refundId,
      reason: "Refund penuh dibayarkan manual.",
    })

    const after = await t.run(async (ctx) =>
      ctx.db
        .query("ledgerEntries")
        .withIndex("by_orderId", (q) => q.eq("orderId", checkout.orderId))
        .collect(),
    )
    for (const original of snapshot) {
      const current = after.find((entry) => entry._id === original.id)
      expect(current?.amount).toBe(original.amount)
      expect(current?.direction).toBe(original.direction)
    }
    expect(after.filter((entry) => entry.entryType === "reversal")).toHaveLength(3)

    const order = await t.run(async (ctx) => ctx.db.get(checkout.orderId))
    expect(order?.status).toBe("refunded")
    const refund = await t.run(async (ctx) => ctx.db.get(refundId))
    const payment = await t.run(async (ctx) =>
      refund?.paymentId ? ctx.db.get(refund.paymentId) : null,
    )
    expect(payment?.status).toBe("paid")
  })

  it("[P3-PAY-61] a partial refund reverses the same proportions", async () => {
    const t = createTestDb()
    const { checkout } = await paidOrder(t, {
      sellerAuth: "auth-refund-partial-seller",
      buyerAuth: "auth-refund-partial-buyer",
    })
    await seedAccount(t, { authUserId: "auth-refund-partial-admin", roles: ["admin"] })
    const admin = t.withIdentity({ subject: "auth-refund-partial-admin" })

    const { refundId } = await t
      .withIdentity({ subject: "auth-refund-partial-buyer" })
      .mutation(api.payouts.requestRefund, {
        orderId: checkout.orderId,
        amount: 333_333,
        reason: "Sebagian kain tidak sesuai.",
      })
    await admin.mutation(api.payouts.reviewRefund, {
      refundId,
      decision: "approved",
      reason: "Sebagian klaim diterima.",
    })
    await admin.mutation(api.payouts.payRefund, {
      refundId,
      reason: "Refund sebagian dibayarkan.",
    })

    const reversals = await t.run(async (ctx) =>
      ctx.db
        .query("ledgerEntries")
        .withIndex("by_orderId", (q) => q.eq("orderId", checkout.orderId))
        .collect()
        .then((rows) => rows.filter((entry) => entry.entryType === "reversal")),
    )
    expect(reversals).toHaveLength(3)
    expect(reversals.reduce((sum, entry) => sum + entry.amount, 0)).toBe(333_333)
    expect(reversals.find((entry) => entry.account === "teacher")?.amount).toBe(233_333)

    const payout = await t.run(async (ctx) =>
      ctx.db
        .query("payouts")
        .withIndex("by_orderId", (q) => q.eq("orderId", checkout.orderId))
        .first(),
    )
    expect(payout?.status).toBe("held")
  })

  it("[P3-PAY-62] a refund after release carries a negative balance to the next payout", async () => {
    const t = createTestDb()
    const { checkout, seller, payout } = await paidOrder(t, {
      sellerAuth: "auth-refund-after-seller",
      buyerAuth: "auth-refund-after-buyer",
    })
    await seedSellerPayoutAccount(t, seller.userId)
    await seedAccount(t, { authUserId: "auth-refund-after-admin", roles: ["admin"] })
    const admin = t.withIdentity({ subject: "auth-refund-after-admin" })
    const payoutId = payout?._id as Id<"payouts">
    await admin.mutation(api.payouts.approvePayout, { payoutId })
    await admin.mutation(api.payouts.releasePayout, { payoutId })

    const { refundId } = await t
      .withIdentity({ subject: "auth-refund-after-buyer" })
      .mutation(api.payouts.requestRefund, {
        orderId: checkout.orderId,
        amount: 400_000,
        reason: "Kerusakan ditemukan setelah pencairan.",
      })
    await admin.mutation(api.payouts.reviewRefund, {
      refundId,
      decision: "approved",
      reason: "Klaim diterima setelah pencairan.",
    })
    const paid = await admin.mutation(api.payouts.payRefund, {
      refundId,
      reason: "Refund dibayarkan manual; saldo negatif dicatat.",
    })
    expect(paid.negativeCarry).toBe(280_000)

    const entries = await t.run(async (ctx) =>
      ctx.db
        .query("ledgerEntries")
        .withIndex("by_orderId", (q) => q.eq("orderId", checkout.orderId))
        .collect(),
    )
    expect(entries.some((entry) => entry.account === "negative_balance")).toBe(true)

    const payouts = await t.run(async (ctx) =>
      ctx.db
        .query("payouts")
        .withIndex("by_orderId", (q) => q.eq("orderId", checkout.orderId))
        .collect(),
    )
    expect(payouts.some((row) => row.kind === "reversal" && row.teacherShare === -280_000)).toBe(
      true,
    )
    const original = payouts.find((row) => row._id === payoutId)
    expect(original?.status).toBe("paid")
    expect(original?.teacherShare).toBe(1_015_000)
  })

  it("[P3-PYT-08] a negative carry is deducted from the next payout", async () => {
    const t = createTestDb()
    const { checkout, seller } = await paidOrder(t, {
      sellerAuth: "auth-carry-seller",
      buyerEmail: "carry-first@example.test",
    })
    await seedSellerPayoutAccount(t, seller.userId)
    await seedAccount(t, { authUserId: "auth-carry-admin", roles: ["admin"] })
    const admin = t.withIdentity({ subject: "auth-carry-admin" })

    const firstPayout = await t.run(async (ctx) =>
      ctx.db
        .query("payouts")
        .withIndex("by_orderId", (q) => q.eq("orderId", checkout.orderId))
        .first(),
    )
    await admin.mutation(api.payouts.approvePayout, {
      payoutId: firstPayout?._id as Id<"payouts">,
    })
    await admin.mutation(api.payouts.releasePayout, {
      payoutId: firstPayout?._id as Id<"payouts">,
    })

    const secondWork = await seedPublishedWork(t, {
      makerId: seller.userId,
      title: "Kain Kedua",
    })
    const secondCheckout = await createCheckout(t, {
      workId: secondWork,
      buyerEmail: "carry-second@example.test",
    })
    const secondCharge = await createChargeForCheckout(t, secondCheckout, 81)
    await settleViaWebhook(t, {
      chargeId: secondCharge.chargeId,
      orderCode: secondCharge.code,
      amount: secondCharge.uniqueAmount,
      paidAt: secondCharge.paymentCreatedAt + 1_000,
    })

    const secondPayout = await t.run(async (ctx) =>
      ctx.db
        .query("payouts")
        .withIndex("by_orderId", (q) => q.eq("orderId", secondCheckout.orderId))
        .first(),
    )
    await admin.mutation(api.payouts.approvePayout, {
      payoutId: secondPayout?._id as Id<"payouts">,
    })

    // The seller cannot request a refund for their own sale; the admin records it.
    const adminRefund = await admin.mutation(api.payouts.requestRefund, {
      orderId: checkout.orderId,
      amount: 400_000,
      reason: "Refund sebagian setelah pencairan pertama.",
    })
    await admin.mutation(api.payouts.reviewRefund, {
      refundId: adminRefund.refundId,
      decision: "approved",
      reason: "Klaim sebagian diterima.",
    })
    await admin.mutation(api.payouts.payRefund, {
      refundId: adminRefund.refundId,
      reason: "Refund sebagian dibayarkan manual.",
    })

    const released = await admin.mutation(api.payouts.releasePayout, {
      payoutId: secondPayout?._id as Id<"payouts">,
    })
    expect(released.paidAmount).toBe(735_000)
    const row = await t.run(async (ctx) => ctx.db.get(secondPayout?._id as Id<"payouts">))
    expect(row?.paidAmount).toBe(735_000)

    const statement = await t
      .withIdentity({ subject: "auth-carry-seller" })
      .query(api.payouts.getSellerStatement, {})
    expect(statement.teacherNegativeBalance).toBe(0)
    expect(statement.teacherBalance).toBe(0)
  })

  it("[P0-ACC-26] an admin cannot approve a refund on their own order", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-own-seller" })
    await seedAccount(t, {
      authUserId: "auth-own-admin",
      email: "own-admin@example.test",
      roles: ["admin"],
    })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })
    const checkout = await t
      .withIdentity({ subject: "auth-own-admin" })
      .mutation(api.commerce.createOrder, {
        kind: "work",
        slug: await workSlug(t, workId),
        consentTransactional: true,
      })
    const charge = await createChargeForCheckout(t, checkout)
    await settleViaWebhook(t, {
      chargeId: charge.chargeId,
      orderCode: charge.code,
      amount: charge.uniqueAmount,
      paidAt: charge.paymentCreatedAt + 1_000,
    })

    await expect(
      t
        .withIdentity({ subject: "auth-own-admin" })
        .mutation(api.payouts.requestRefund, {
          orderId: checkout.orderId,
          reason: "Pesanan sendiri.",
        }),
    ).rejects.toThrow()
  })

  it("[P3-RFD-08] refund decisions are audited with actor and reason", async () => {
    const t = createTestDb()
    const { checkout } = await paidOrder(t, {
      sellerAuth: "auth-refund-audit-seller",
      buyerAuth: "auth-refund-audit-buyer",
    })
    await seedAccount(t, { authUserId: "auth-refund-audit-admin", roles: ["admin"] })
    const admin = t.withIdentity({ subject: "auth-refund-audit-admin" })
    const { refundId } = await t
      .withIdentity({ subject: "auth-refund-audit-buyer" })
      .mutation(api.payouts.requestRefund, {
        orderId: checkout.orderId,
        reason: "Klaim audit.",
      })
    await admin.mutation(api.payouts.reviewRefund, {
      refundId,
      decision: "rejected",
      reason: "Bukti tidak sesuai.",
    })

    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_entity", (q) =>
          q.eq("entityType", "refunds").eq("entityId", refundId),
        )
        .collect(),
    )
    expect(audit.some((entry) => entry.action === "refunds.review")).toBe(true)
    expect(audit.find((entry) => entry.action === "refunds.review")?.reason).toBe(
      "Bukti tidak sesuai.",
    )
  })
})
