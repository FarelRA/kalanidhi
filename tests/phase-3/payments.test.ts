import { describe, expect, it } from "vitest"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  createChargeForCheckout,
  createCheckout,
  createTestDb,
  INTERNAL_KEY,
  PAYMENT_SKEW_MS,
  seedAccount,
  seedPublishedWork,
  seedSeller,
  settleViaWebhook,
  type TestDb,
} from "./helpers"

async function setupCheckout(t: TestDb) {
  const seller = await seedSeller(t, { authUserId: "auth-pay-seller" })
  const workId = await seedPublishedWork(t, { makerId: seller.userId, price: 1_450_000 })
  const checkout = await createCheckout(t, { workId })
  const charge = await createChargeForCheckout(t, checkout, 37)
  return { seller, checkout, charge }
}

function ledgerCount(t: TestDb, orderId: Id<"orders">) {
  return t.run(async (ctx) =>
    ctx.db
      .query("ledgerEntries")
      .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
      .collect(),
  )
}

describe("payment settlement", () => {
  it("[P3-PAY-40] settlement requires the exact unique amount", async () => {
    const t = createTestDb()
    const { checkout, charge } = await setupCheckout(t)

    await expect(
      settleViaWebhook(t, {
        chargeId: charge.chargeId,
        orderCode: charge.code,
        amount: charge.uniqueAmount + 1,
        paidAt: charge.paymentCreatedAt + 1_000,
      }),
    ).rejects.toThrow()

    const payment = await t.run(async (ctx) => ctx.db.get(charge.paymentId))
    expect(payment?.status).toBe("pending")
    expect(await ledgerCount(t, checkout.orderId)).toHaveLength(0)
  })

  it("[P3-PAY-41] a double-scaled amount is rejected", async () => {
    const t = createTestDb()
    const { charge } = await setupCheckout(t)

    await expect(
      settleViaWebhook(t, {
        chargeId: charge.chargeId,
        orderCode: charge.code,
        amount: charge.uniqueAmount * 100,
        paidAt: charge.paymentCreatedAt + 1_000,
      }),
    ).rejects.toThrow()
  })

  it("[P3-PAY-43] a transaction id that already settled another payment is rejected", async () => {
    const t = createTestDb()
    const first = await setupCheckout(t)
    const seller = await seedSeller(t, { authUserId: "auth-pay-seller-2" })
    const workId = await seedPublishedWork(t, {
      makerId: seller.userId,
      title: "Kain Kedua",
    })
    const secondCheckout = await createCheckout(t, {
      workId,
      buyerEmail: "second@example.test",
    })
    const second = await createChargeForCheckout(t, secondCheckout, 81)

    await settleViaWebhook(t, {
      chargeId: first.charge.chargeId,
      orderCode: first.charge.code,
      providerTransactionId: "TRX-SAME",
      amount: first.charge.uniqueAmount,
      paidAt: first.charge.paymentCreatedAt + 1_000,
    })
    await expect(
      settleViaWebhook(t, {
        chargeId: second.chargeId,
        orderCode: second.code,
        providerTransactionId: "TRX-SAME",
        amount: second.uniqueAmount,
        paidAt: second.paymentCreatedAt + 1_000,
      }),
    ).rejects.toThrow()
  })

  it("[P3-PAY-44] only a pending payment can settle", async () => {
    const t = createTestDb()
    const { charge } = await setupCheckout(t)
    await settleViaWebhook(t, {
      chargeId: charge.chargeId,
      orderCode: charge.code,
      amount: charge.uniqueAmount,
      paidAt: charge.paymentCreatedAt + 1_000,
    })

    await expect(
      settleViaWebhook(t, {
        eventId: "evt_second",
        chargeId: charge.chargeId,
        orderCode: charge.code,
        providerTransactionId: "TRX-SECOND",
        amount: charge.uniqueAmount,
        paidAt: charge.paymentCreatedAt + 2_000,
      }),
    ).rejects.toThrow()
  })

  it("[P3-PAY-45] the start boundary is inclusive and one millisecond earlier is rejected", async () => {
    const t = createTestDb()
    const accepted = await setupCheckout(t)
    await settleViaWebhook(t, {
      chargeId: accepted.charge.chargeId,
      orderCode: accepted.charge.code,
      amount: accepted.charge.uniqueAmount,
      paidAt: accepted.charge.paymentCreatedAt - PAYMENT_SKEW_MS,
    })

    const seller = await seedSeller(t, { authUserId: "auth-skew-seller" })
    const workId = await seedPublishedWork(t, {
      makerId: seller.userId,
      title: "Kain Skew",
    })
    const rejectedCheckout = await createCheckout(t, {
      workId,
      buyerEmail: "skew@example.test",
    })
    const rejected = await createChargeForCheckout(t, rejectedCheckout, 42)
    await expect(
      settleViaWebhook(t, {
        chargeId: rejected.chargeId,
        orderCode: rejected.code,
        amount: rejected.uniqueAmount,
        paidAt: rejected.paymentCreatedAt - PAYMENT_SKEW_MS - 1,
      }),
    ).rejects.toThrow()
  })

  it("[P3-PAY-46] the end boundary is inclusive; one millisecond later is late, not settled", async () => {
    const t = createTestDb()
    const accepted = await setupCheckout(t)
    await settleViaWebhook(t, {
      chargeId: accepted.charge.chargeId,
      orderCode: accepted.charge.code,
      amount: accepted.charge.uniqueAmount,
      paidAt: accepted.charge.expiresAt + PAYMENT_SKEW_MS,
    })

    const seller = await seedSeller(t, { authUserId: "auth-late-seller" })
    const workId = await seedPublishedWork(t, {
      makerId: seller.userId,
      title: "Kain Telat",
    })
    const lateCheckout = await createCheckout(t, {
      workId,
      buyerEmail: "late@example.test",
    })
    const late = await createChargeForCheckout(t, lateCheckout, 55)
    const result = await settleViaWebhook(t, {
      chargeId: late.chargeId,
      orderCode: late.code,
      amount: late.uniqueAmount,
      paidAt: late.expiresAt + PAYMENT_SKEW_MS + 1,
    })
    expect(result.status).toBe("late")
    expect(await ledgerCount(t, lateCheckout.orderId)).toHaveLength(0)
  })

  it("[P3-PAY-47] a duplicate eventId is idempotent and writes no second ledger row", async () => {
    const t = createTestDb()
    const { checkout, charge } = await setupCheckout(t)
    const payload = {
      chargeId: charge.chargeId,
      orderCode: charge.code,
      providerTransactionId: "TRX-IDEM",
      amount: charge.uniqueAmount,
      paidAt: charge.paymentCreatedAt + 1_000,
      eventId: "evt_idem",
    }
    const first = await settleViaWebhook(t, payload)
    const second = await settleViaWebhook(t, payload)
    expect(first.status).toBe("settled")
    expect(second.status).toBe("duplicate")
    expect(await ledgerCount(t, checkout.orderId)).toHaveLength(3)
  })

  it("[P3-PAY-48] the same eventId with a different payload is rejected and audited", async () => {
    const t = createTestDb()
    const { charge } = await setupCheckout(t)
    await settleViaWebhook(t, {
      chargeId: charge.chargeId,
      orderCode: charge.code,
      amount: charge.uniqueAmount,
      paidAt: charge.paymentCreatedAt + 1_000,
      eventId: "evt_conflict",
    })

    const rejected = await settleViaWebhook(t, {
      chargeId: charge.chargeId,
      orderCode: charge.code,
      amount: charge.uniqueAmount + 1,
      paidAt: charge.paymentCreatedAt + 1_000,
      eventId: "evt_conflict",
    })
    expect(rejected.status).toBe("rejected")

    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) => q.eq("action", "payments.event.conflict"))
        .collect(),
    )
    expect(audit).toHaveLength(1)
  })

  it("[P3-PAY-49] two different events for one charge settle at most once", async () => {
    const t = createTestDb()
    const { charge } = await setupCheckout(t)
    await settleViaWebhook(t, {
      chargeId: charge.chargeId,
      orderCode: charge.code,
      providerTransactionId: "TRX-ONE",
      amount: charge.uniqueAmount,
      paidAt: charge.paymentCreatedAt + 1_000,
      eventId: "evt_first",
    })
    const second = await settleViaWebhook(t, {
      chargeId: charge.chargeId,
      orderCode: charge.code,
      providerTransactionId: "TRX-ONE",
      amount: charge.uniqueAmount,
      paidAt: charge.paymentCreatedAt + 1_000,
      eventId: "evt_second",
    })
    expect(second.status).toBe("duplicate")
  })

  it("[P3-PAY-50] a late payment enters reconciliation and is never auto-settled", async () => {
    const t = createTestDb()
    const { checkout, charge } = await setupCheckout(t)
    await settleViaWebhook(t, {
      chargeId: charge.chargeId,
      orderCode: charge.code,
      amount: charge.uniqueAmount,
      paidAt: charge.expiresAt + PAYMENT_SKEW_MS + 1,
    })

    const payment = await t.run(async (ctx) => ctx.db.get(charge.paymentId))
    expect(payment?.status).toBe("pending")
    expect(payment?.reconciliationState).toBe("late")
    const order = await t.run(async (ctx) => ctx.db.get(checkout.orderId))
    expect(order?.status).toBe("awaiting_payment")
  })

  it("[P3-PAY-50] a payment that arrives after expiry is queued, not settled", async () => {
    const t = createTestDb()
    const { charge } = await setupCheckout(t)
    await t.run(async (ctx) => {
      await ctx.db.patch(charge.paymentId, { status: "expired" })
    })
    const result = await settleViaWebhook(t, {
      eventId: "evt_after_expiry",
      chargeId: charge.chargeId,
      orderCode: charge.code,
      amount: charge.uniqueAmount,
      paidAt: charge.paymentCreatedAt + 1_000,
    })
    expect(result.status).toBe("late")
    const payment = await t.run(async (ctx) => ctx.db.get(charge.paymentId))
    expect(payment?.status).toBe("expired")
    expect(payment?.reconciliationState).toBe("late")
  })

  it("[P3-PAY-53] settlement commits payment, order, ledger, and payout together", async () => {
    const t = createTestDb()
    const { checkout, charge } = await setupCheckout(t)
    await settleViaWebhook(t, {
      chargeId: charge.chargeId,
      orderCode: charge.code,
      amount: charge.uniqueAmount,
      paidAt: charge.paymentCreatedAt + 1_000,
    })

    const [payment, order, entries, payouts] = await Promise.all([
      t.run(async (ctx) => ctx.db.get(charge.paymentId)),
      t.run(async (ctx) => ctx.db.get(checkout.orderId)),
      ledgerCount(t, checkout.orderId),
      t.run(async (ctx) =>
        ctx.db
          .query("payouts")
          .withIndex("by_orderId", (q) => q.eq("orderId", checkout.orderId))
          .collect(),
      ),
    ])
    expect(payment?.status).toBe("paid")
    expect(order?.status).toBe("paid")
    expect(payouts).toHaveLength(1)
    expect(entries).toHaveLength(3)
    expect(entries.reduce((sum, entry) => sum + entry.amount, 0)).toBe(
      checkout.baseAmount,
    )
    expect(entries.every((entry) => entry.entryType === "sale")).toBe(true)
  })

  it("[P3-PAY-54] an unknown charge is rejected without a partial write", async () => {
    const t = createTestDb()
    const before = await t.run(async (ctx) =>
      ctx.db.query("paymentEvents").collect(),
    )
    await expect(
      settleViaWebhook(t, {
        chargeId: "ch_unknown",
        orderCode: "KN-2026-999999",
        amount: 1,
        paidAt: Date.now(),
      }),
    ).rejects.toThrow()
    const after = await t.run(async (ctx) => ctx.db.query("paymentEvents").collect())
    expect(after).toHaveLength(before.length)
  })

  it("[P3-PAY-06] a gateway fee is recorded separately and does not change the 70/15/15 split", async () => {
    const t = createTestDb()
    const { checkout, charge } = await setupCheckout(t)
    await settleViaWebhook(t, {
      chargeId: charge.chargeId,
      orderCode: charge.code,
      amount: charge.uniqueAmount,
      paidAt: charge.paymentCreatedAt + 1_000,
      gatewayFee: 5_000,
    })

    const entries = await ledgerCount(t, checkout.orderId)
    const teacher = entries.find((entry) => entry.account === "teacher")
    const platform = entries.find((entry) => entry.account === "platform")
    const fee = entries.find((entry) => entry.account === "gateway_fee")
    expect(teacher?.amount).toBe(1_015_000)
    expect(platform?.amount).toBe(217_500)
    expect(fee?.amount).toBe(5_000)

    const payment = await t.run(async (ctx) => ctx.db.get(charge.paymentId))
    expect(payment?.gatewayFee).toBe(5_000)
    expect(payment?.baseAmount).toBe(1_450_000)
    expect(payment?.uniqueAmount).toBe(1_450_037)
  })
})

describe("payment intents and reconciliation", () => {
  it("[P3-PAY-25] creating an intent twice reuses the same pending payment", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-intent-seller" })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })
    const checkout = await createCheckout(t, { workId })

    const first = await t.mutation(api.payments.createIntent, {
      orderId: checkout.orderId,
      token: checkout.token,
    })
    const second = await t.mutation(api.payments.createIntent, {
      orderId: checkout.orderId,
      token: checkout.token,
    })
    expect(second.id).toBe(first.id)

    const order = await t.run(async (ctx) => ctx.db.get(checkout.orderId))
    expect(order?.status).toBe("awaiting_payment")
  })

  it("[P3-PAY-26] attaching a different real charge to the same intent is a conflict", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-charge-seller" })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })
    const checkout = await createCheckout(t, { workId })
    const charge = await createChargeForCheckout(t, checkout)

    await expect(
      t.mutation(api.payments.attachCharge, {
        orderId: checkout.orderId,
        token: checkout.token,
        chargeId: "ch_other",
        baseAmount: charge.baseAmount,
        uniqueAmount: charge.uniqueAmount,
        expiresAt: charge.expiresAt,
      }),
    ).rejects.toThrow()
  })

  it("[P3-PAY-51] a manual match requires a reason, actor, and audit entry", async () => {
    const t = createTestDb()
    const { charge } = await setupCheckout(t)
    await seedAccount(t, { authUserId: "auth-match-admin", roles: ["admin"] })

    await expect(
      t.withIdentity({ subject: "auth-match-admin" }).mutation(api.payments.manualMatch, {
        paymentId: charge.paymentId,
        providerTransactionId: "TRX-MANUAL",
        amount: charge.uniqueAmount,
        reason: "",
      }),
    ).rejects.toThrow()

    const result = await t
      .withIdentity({ subject: "auth-match-admin" })
      .mutation(api.payments.manualMatch, {
        paymentId: charge.paymentId,
        providerTransactionId: "TRX-MANUAL",
        amount: charge.uniqueAmount,
        reason: "Mutasi bank 1.450.037 terverifikasi.",
      })
    expect(result.status).toBe("settled")

    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) => q.eq("action", "payments.manualMatch"))
        .collect(),
    )
    expect(audit).toHaveLength(1)
    expect(audit[0]?.actorId).toBeTruthy()
  })

  it("[P3-PAY-51] a late payment can be settled by an explicit admin match", async () => {
    const t = createTestDb()
    const { charge } = await setupCheckout(t)
    await seedAccount(t, { authUserId: "auth-late-match-admin", roles: ["admin"] })

    await t.run(async (ctx) => {
      await ctx.db.patch(charge.paymentId, {
        expiresAt: Date.now() - PAYMENT_SKEW_MS - 1,
      })
    })
    await t.withIdentity({ subject: "auth-late-match-admin" }).mutation(
      api.payments.expireIntents,
      {},
    )
    const expired = await t.run(async (ctx) => ctx.db.get(charge.paymentId))
    expect(expired?.status).toBe("expired")

    const result = await t
      .withIdentity({ subject: "auth-late-match-admin" })
      .mutation(api.payments.manualMatch, {
        paymentId: charge.paymentId,
        providerTransactionId: "TRX-LATE-MANUAL",
        amount: charge.uniqueAmount,
        reason: "Mutasi terlambat diverifikasi dari rekening koran.",
      })
    expect(result.status).toBe("settled")
    const payment = await t.run(async (ctx) => ctx.db.get(charge.paymentId))
    expect(payment?.status).toBe("paid")
  })

  it("[P3-PAY-52] a client-reported payment status cannot settle an order", async () => {
    const t = createTestDb()
    const { checkout } = await setupCheckout(t)
    await seedAccount(t, { authUserId: "auth-status-admin", roles: ["admin"] })

    await expect(
      t.withIdentity({ subject: "auth-status-admin" }).mutation(
        api.commerce.correctOrderStatus,
        {
          orderId: checkout.orderId,
          status: "paid",
          reason: "Pembayaran diklaim klien.",
        } as never,
      ),
    ).rejects.toThrow()

    const order = await t.run(async (ctx) => ctx.db.get(checkout.orderId))
    expect(order?.status).toBe("awaiting_payment")
  })

  it("[P3-PAY-55] guest status polling reads Convex records and is not exposed to non-admins", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-poll-seller" })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })
    const checkout = await createCheckout(t, { workId })
    await createChargeForCheckout(t, checkout)

    const view = await t.query(api.payments.getIntentByToken, {
      token: checkout.token,
    })
    expect(view?.orderCode).toBe(checkout.code)
    expect(view?.uniqueAmount).toBe(checkout.baseAmount + 37)

    expect(
      await t.query(api.payments.getIntentByToken, { token: "deadbeef".repeat(8) }),
    ).toBeNull()

    await expect(
      t.mutation(api.payments.createIntent, {
        orderId: checkout.orderId,
        token: "not-the-token".repeat(4),
      }),
    ).rejects.toThrow()
  })

  it("[P3-PAY-56] a settled intent exposes the settlement event and idempotency key", async () => {
    const t = createTestDb()
    const { checkout, charge } = await setupCheckout(t)
    await t.run(async (ctx) => {
      await ctx.db.patch(charge.paymentId, { idempotencyKey: "pay-idem-1" })
    })
    await settleViaWebhook(t, {
      chargeId: charge.chargeId,
      orderCode: charge.code,
      amount: charge.uniqueAmount,
      paidAt: charge.paymentCreatedAt + 1_000,
      eventId: "evt_view",
    })

    const view = await t.query(api.payments.getIntentByToken, {
      token: checkout.token,
    })
    expect(view?.settledEventId).toBe("evt_view")
    expect(view?.idempotencyKey).toBe("pay-idem-1")
  })

  it("[P3-PAY-70] health records require the internal key", async () => {
    const t = createTestDb()
    await expect(
      t.mutation(api.payments.recordHealth, {
        internalKey: "wrong-key",
        status: "healthy",
      }),
    ).rejects.toThrow()

    await t.mutation(api.payments.recordHealth, {
      internalKey: INTERNAL_KEY,
      status: "healthy",
      message: "Session valid",
      latencyMs: 42,
    })
    await seedAccount(t, { authUserId: "auth-health-admin", roles: ["admin"] })
    const health = await t
      .withIdentity({ subject: "auth-health-admin" })
      .query(api.payments.getGatewayHealth, {})
    expect(health.status).toBe("healthy")
    expect(health.message).toBe("Session valid")
  })

  it("[P3-PAY-83] expiry only releases intents past the clock-skew grace", async () => {
    const t = createTestDb()
    const { charge } = await setupCheckout(t)
    await seedAccount(t, { authUserId: "auth-expire-admin", roles: ["admin"] })

    const result = await t
      .withIdentity({ subject: "auth-expire-admin" })
      .mutation(api.payments.expireIntents, {})
    expect(result.expired).toBe(0)

    await t.run(async (ctx) => {
      await ctx.db.patch(charge.paymentId, {
        expiresAt: Date.now() - PAYMENT_SKEW_MS - 1,
      })
    })
    const second = await t
      .withIdentity({ subject: "auth-expire-admin" })
      .mutation(api.payments.expireIntents, {})
    expect(second.expired).toBe(1)
  })
})

describe("settlement accounting", () => {
  it("[P3-PAY-10] per-order ledger shares sum to the order base amount", async () => {
    const t = createTestDb()
    const { checkout, charge } = await setupCheckout(t)
    await settleViaWebhook(t, {
      chargeId: charge.chargeId,
      orderCode: charge.code,
      amount: charge.uniqueAmount,
      paidAt: charge.paymentCreatedAt + 1_000,
    })
    const entries = await ledgerCount(t, checkout.orderId)
    expect(entries.reduce((sum, entry) => sum + entry.amount, 0)).toBe(1_450_000)
    expect(entries.reduce((sum, entry) => sum + entry.amount, 0)).not.toBe(
      charge.uniqueAmount,
    )
  })

  it("[P3-PAY-07] an unreported gateway fee stays unknown instead of becoming zero", async () => {
    const t = createTestDb()
    const { checkout, charge } = await setupCheckout(t)
    await settleViaWebhook(t, {
      chargeId: charge.chargeId,
      orderCode: charge.code,
      amount: charge.uniqueAmount,
      paidAt: charge.paymentCreatedAt + 1_000,
    })

    const payment = await t.run(async (ctx) => ctx.db.get(charge.paymentId))
    expect(payment?.gatewayFee).toBeUndefined()
    const entries = await ledgerCount(t, checkout.orderId)
    expect(entries.some((entry) => entry.account === "gateway_fee")).toBe(false)
  })

  it("[P3-PAY-08] an operator records a late gateway fee once, without changing the split", async () => {
    const t = createTestDb()
    const { checkout, charge } = await setupCheckout(t)
    await settleViaWebhook(t, {
      chargeId: charge.chargeId,
      orderCode: charge.code,
      amount: charge.uniqueAmount,
      paidAt: charge.paymentCreatedAt + 1_000,
    })
    await seedAccount(t, {
      authUserId: "auth-fee-admin",
      roles: ["admin"],
      name: "Nadia Kusuma",
    })
    const identity = t.withIdentity({ subject: "auth-fee-admin" })

    await identity.mutation(api.payments.recordGatewayFee, {
      paymentId: charge.paymentId,
      gatewayFee: 5_000,
      reason: "Biaya MDR dari laporan settlement GoBiz",
    })

    const payment = await t.run(async (ctx) => ctx.db.get(charge.paymentId))
    expect(payment?.gatewayFee).toBe(5_000)
    const entries = await ledgerCount(t, checkout.orderId)
    expect(entries.find((entry) => entry.account === "teacher")?.amount).toBe(
      1_015_000,
    )
    expect(entries.find((entry) => entry.account === "gateway_fee")?.amount).toBe(
      5_000,
    )

    await expect(
      identity.mutation(api.payments.recordGatewayFee, {
        paymentId: charge.paymentId,
        gatewayFee: 5_000,
        reason: "Percobaan pencatatan kedua",
      }),
    ).rejects.toThrow()
  })

  it("[P3-PAY-05] the unique offset is not recorded as revenue", async () => {
    const t = createTestDb()
    const { checkout, charge } = await setupCheckout(t)
    await settleViaWebhook(t, {
      chargeId: charge.chargeId,
      orderCode: charge.code,
      amount: charge.uniqueAmount,
      paidAt: charge.paymentCreatedAt + 1_000,
    })
    const entries = await ledgerCount(t, checkout.orderId)
    expect(
      entries.some((entry) => entry.amount === 37 && entry.account !== "gateway_fee"),
    ).toBe(false)
  })
})
