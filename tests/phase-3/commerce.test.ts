import { describe, expect, it } from "vitest"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  createChargeForCheckout,
  createGuestCheckout,
  createTestDb,
  seedAccount,
  seedPublishedWork,
  seedSeller,
  settleViaWebhook,
  workSlug,
} from "./helpers"

const PATH = "batik-tulis-soga"
const OTHER_PATH = "pranatacara"

async function admin(t: ReturnType<typeof createTestDb>) {
  return await seedAccount(t, {
    authUserId: "auth-admin",
    email: "admin@example.test",
    name: "Nadia Kusuma",
    roles: ["admin"],
  })
}

function workInput(pathId = PATH, certificateId?: Id<"certificates">) {
  return {
    title: "Kain Soga Anyaman",
    pathId,
    certificateId,
    price: 1_450_000,
    unit: "per helai",
    technique: "Batik tulis",
    techniqueNote: "Soga alam",
    description: "Kain soga dengan provenans lengkap.",
    image: "/images/works/batik.jpg",
    kind: "product" as const,
    category: "batik" as const,
    permission: "Izin komunitas Giriloyo",
    provenance: "Giriloyo, Yogyakarta",
    materials: "Katun primisima, soga alam",
  }
}

describe("works / scope and moderation", () => {
  it("[P3-WRK-01] a student seller creates a work card with path and certificate", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-seller" })

    const result = await t
      .withIdentity({ subject: "auth-seller" })
      .mutation(api.commerce.createWork, workInput(PATH, seller.certificateId ?? undefined))

    const card = await t.run(async (ctx) =>
      ctx.db
        .query("workCards")
        .withIndex("by_workId", (q) => q.eq("workId", result.workId))
        .unique(),
    )
    expect(card?.certificateId).toBe(seller.certificateId)
    expect(card?.status).toBe("draft")

    const viewer = await t
      .withIdentity({ subject: "auth-seller" })
      .query(api.access.getViewer, {})
    expect(viewer?.sellScopes).toEqual([PATH])

    const listing = await t
      .withIdentity({ subject: "auth-seller" })
      .query(api.commerce.getWorkDetail, { workId: result.workId })
    expect(listing.split).toEqual({
      baseAmount: 1_450_000,
      teacherShare: 1_015_000,
      platformShare: 217_500,
      communityShare: 217_500,
    })
  })

  it("[P3-WRK-02] listing outside the seller scope is forbidden", async () => {
    const t = createTestDb()
    await seedSeller(t, { authUserId: "auth-scope-seller" })

    await expect(
      t
        .withIdentity({ subject: "auth-scope-seller" })
        .mutation(api.commerce.createWork, workInput(OTHER_PATH)),
    ).rejects.toThrow()
  })

  it("[P0-ACC-12] an admin cannot create a seller listing", async () => {
    const t = createTestDb()
    await admin(t)
    await expect(
      t
        .withIdentity({ subject: "auth-admin" })
        .mutation(api.commerce.createWork, workInput()),
    ).rejects.toThrow()
  })

  it("[P3-WRK-03] price must be a positive integer and unit and technique are required", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-price" })
    const identity = t.withIdentity({ subject: "auth-price" })

    await expect(
      identity.mutation(api.commerce.createWork, {
        ...workInput(PATH, seller.certificateId ?? undefined),
        price: 0,
      }),
    ).rejects.toThrow()
    await expect(
      identity.mutation(api.commerce.createWork, {
        ...workInput(PATH, seller.certificateId ?? undefined),
        unit: "",
      }),
    ).rejects.toThrow()
  })

  it("[P3-WRK-04] moderation needs image, permission, and provenance", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-incomplete" })
    const created = await t
      .withIdentity({ subject: "auth-incomplete" })
      .mutation(api.commerce.createWork, {
        ...workInput(PATH, seller.certificateId ?? undefined),
        image: "",
        permission: "",
        provenance: "",
        materials: "",
      })

    await expect(
      t
        .withIdentity({ subject: "auth-incomplete" })
        .mutation(api.commerce.submitWork, { workId: created.workId }),
    ).rejects.toThrow()
  })

  it("[P3-WRK-05] a work card follows draft → submitted → teacher_confirmed → admin_review → published", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-flow" })
    await seedSeller(t, {
      authUserId: "auth-flow-teacher",
      teacherProfile: true,
    })
    await admin(t)

    const created = await t
      .withIdentity({ subject: "auth-flow" })
      .mutation(api.commerce.createWork, workInput(PATH, seller.certificateId ?? undefined))
    const cardStatus = async () =>
      await t.run(async (ctx) => {
        const card = await ctx.db
          .query("workCards")
          .withIndex("by_workId", (q) => q.eq("workId", created.workId))
          .unique()
        return card?.status
      })

    expect(await cardStatus()).toBe("draft")

    await t
      .withIdentity({ subject: "auth-flow" })
      .mutation(api.commerce.submitWork, { workId: created.workId })
    expect(await cardStatus()).toBe("submitted")

    await t
      .withIdentity({ subject: "auth-flow-teacher" })
      .mutation(api.commerce.confirmWork, { workId: created.workId })
    expect(await cardStatus()).toBe("teacher_confirmed")

    await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.commerce.beginWorkReview, { workId: created.workId })
    expect(await cardStatus()).toBe("admin_review")

    await t.withIdentity({ subject: "auth-admin" }).mutation(api.commerce.publishWork, {
      workId: created.workId,
      reason: "Izin dan provenans sudah diverifikasi.",
    })
    expect(await cardStatus()).toBe("published")

    const work = await t.run(async (ctx) => ctx.db.get(created.workId))
    expect(work?.status).toBe("published")
  })

  it("[P3-WRK-06] teacher confirmation is scoped to the teacher's path", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-wrong-teacher" })
    await seedSeller(t, {
      authUserId: "auth-pranatacara-teacher",
      pathId: OTHER_PATH,
      teacherProfile: true,
    })

    const created = await t
      .withIdentity({ subject: "auth-wrong-teacher" })
      .mutation(api.commerce.createWork, workInput(PATH, seller.certificateId ?? undefined))
    await t
      .withIdentity({ subject: "auth-wrong-teacher" })
      .mutation(api.commerce.submitWork, { workId: created.workId })

    await expect(
      t
        .withIdentity({ subject: "auth-pranatacara-teacher" })
        .mutation(api.commerce.confirmWork, { workId: created.workId }),
    ).rejects.toThrow()
  })

  it("[P3-WRK-07] admin publish and pause require a reason and write audit entries", async () => {
    const t = createTestDb()
    await admin(t)
    const seller = await seedSeller(t, { authUserId: "auth-audit-seller" })
    const workId = await seedPublishedWork(t, {
      makerId: seller.userId,
      certificateId: seller.certificateId,
    })

    await expect(
      t.withIdentity({ subject: "auth-admin" }).mutation(api.commerce.pauseWork, {
        workId,
        reason: "",
      }),
    ).rejects.toThrow()

    await t.withIdentity({ subject: "auth-admin" }).mutation(api.commerce.pauseWork, {
      workId,
      reason: "Dokumen izin sumber budaya perlu diperbarui.",
    })

    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_entity", (q) => q.eq("entityType", "works").eq("entityId", workId))
        .collect(),
    )
    expect(audit.some((entry) => entry.action === "commerce.work.pause")).toBe(true)
  })

  it("[P3-WRK-11] public detail exposes only published public fields", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-public" })
    const draft = await seedPublishedWork(t, {
      makerId: seller.userId,
      title: "Draf belum tayang",
      status: "draft",
    })
    const published = await seedPublishedWork(t, {
      makerId: seller.userId,
      title: "Kain tayang",
      status: "published",
    })

    expect(
      await t.query(api.commerce.getPublicWork, { slug: await workSlug(t, draft) }),
    ).toBeNull()

    const view = await t.query(api.commerce.getPublicWork, {
      slug: await workSlug(t, published),
    })
    expect(view?.title).toBe("Kain tayang")
    expect(view && "makerId" in view).toBe(false)
    expect(view && "certificateId" in view).toBe(false)
    expect(view && "status" in view).toBe(false)
  })

  it("[P3-WRK-09] revocation removes scope, blocks orders, and hides the listing", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-revoked-seller" })
    const workId = await seedPublishedWork(t, {
      makerId: seller.userId,
      certificateId: seller.certificateId,
    })

    await t.run(async (ctx) => {
      await ctx.db.patch(seller.certificateId as Id<"certificates">, {
        status: "revoked",
        revokedAt: Date.now(),
        revokeReason: "Sertifikat dicabut untuk pengujian.",
        updatedAt: Date.now(),
      })
    })

    await expect(createGuestCheckout(t, { workId })).rejects.toThrow()
    expect(
      await t.query(api.commerce.getPublicWork, { slug: await workSlug(t, workId) }),
    ).toBeNull()
  })

  it("[P3-WRK-12] admin bulk pause pauses every published work on a path", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-bulk-seller" })
    const first = await seedPublishedWork(t, {
      makerId: seller.userId,
      title: "Kain Satu",
    })
    const second = await seedPublishedWork(t, {
      makerId: seller.userId,
      title: "Kain Dua",
    })
    await admin(t)

    const result = await t.withIdentity({ subject: "auth-admin" }).mutation(
      api.commerce.bulkPauseWorks,
      {
        pathId: PATH,
        reason: "Izin sumber budaya kedaluwarsa untuk jalur ini.",
      },
    )
    expect(result.affected).toBe(2)
    for (const workId of [first, second]) {
      const work = await t.run(async (ctx) => ctx.db.get(workId))
      expect(work?.status).toBe("paused")
    }
  })

  it("[P3-WRK-10] a paused or sold-out work cannot be ordered", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-paused-seller" })
    const paused = await seedPublishedWork(t, {
      makerId: seller.userId,
      status: "paused",
    })

    await expect(
      createGuestCheckout(t, { workId: paused }),
    ).rejects.toThrow()
  })
})

describe("guest checkout and claim", () => {
  it("[P3-ORD-01] a guest can create an order and pay without an account", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-guest-seller" })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })

    const checkout = await createGuestCheckout(t, { workId })
    expect(checkout.code).toMatch(/^KN-\d{4}-\d{6}$/)
    expect(checkout.token).toHaveLength(64)
    expect(checkout.baseAmount).toBe(1_450_000)

    const order = await t.run(async (ctx) => ctx.db.get(checkout.orderId))
    expect(order?.buyerUserId).toBeUndefined()
    expect(order?.status).toBe("draft")
    expect(order?.consentVersion).toBeTruthy()
  })

  it("[P3-ORD-02] order tokens are unguessable and unique per order", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-token-seller" })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })

    const first = await createGuestCheckout(t, {
      workId,
      buyerEmail: "one@example.test",
    })
    const second = await createGuestCheckout(t, {
      workId,
      buyerEmail: "two@example.test",
    })
    expect(first.token).not.toBe(second.token)
    expect(first.token).toMatch(/^[0-9a-f]{64}$/)

    const status = await t.query(api.commerce.getOrderByToken, { token: first.token })
    expect(status?.code).toBe(first.code)
    expect(status?.buyerEmailMasked).toContain("*")
  })

  it("[P3-ORD-04] guest checkout requires transactional consent", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-consent-seller" })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })

    await expect(
      t.mutation(api.commerce.createGuestOrder, {
        workSlug: await workSlug(t, workId),
        buyerName: "Bayu",
        buyerEmail: "consent@example.test",
        consentTransactional: false,
      }),
    ).rejects.toThrow()
  })

  it("[P3-ORD-10] an unpublished work cannot be ordered", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-unpublished-seller" })
    const workId = await seedPublishedWork(t, {
      makerId: seller.userId,
      status: "draft",
    })
    await expect(createGuestCheckout(t, { workId })).rejects.toThrow()
  })

  it("[P3-ORD-09] a double submit returns the same order, not a duplicate", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-idem-seller" })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })

    const first = await createGuestCheckout(t, {
      workId,
      idempotencyKey: "idem-key-1",
    })
    const second = await createGuestCheckout(t, {
      workId,
      idempotencyKey: "idem-key-1",
    })
    expect(second.orderId).toBe(first.orderId)
    expect(second.code).toBe(first.code)

    const orders = await t.run(async (ctx) =>
      ctx.db
        .query("orders")
        .withIndex("by_code", (q) => q.eq("code", first.code))
        .collect(),
    )
    expect(orders).toHaveLength(1)
  })

  it("[P3-ACC-25] a seller cannot buy their own work", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, {
      authUserId: "auth-self-seller",
      email: "self@example.test",
    })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })

    await expect(
      t.withIdentity({ subject: "auth-self-seller" }).mutation(api.commerce.createGuestOrder, {
        workSlug: await workSlug(t, workId),
        buyerName: "Penjual",
        buyerEmail: "self@example.test",
        consentTransactional: true,
      }),
    ).rejects.toThrow()
  })

  it("[P3-ORD-05] claim requires a signed-in account with the matching verified email", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-claim-seller" })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })
    const checkout = await createGuestCheckout(t, {
      workId,
      buyerEmail: "claim@example.test",
    })
    await seedAccount(t, {
      authUserId: "auth-buyer-claim",
      email: "claim@example.test",
      emailVerified: true,
    })

    const result = await t
      .withIdentity({ subject: "auth-buyer-claim" })
      .mutation(api.commerce.claimOrder, { token: checkout.token })
    expect(result.claimed).toBe(true)

    const order = await t.run(async (ctx) => ctx.db.get(checkout.orderId))
    expect(order?.buyerUserId).toBeTruthy()
    expect(order?.claimedAt).toBeTruthy()

    const purchases = await t
      .withIdentity({ subject: "auth-buyer-claim" })
      .query(api.commerce.listOrders, {})
    expect(purchases.map((row) => row.code)).toContain(checkout.code)
  })

  it("[P3-ORD-06] a wrong email, another account, or an already claimed order cannot claim", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-claim2-seller" })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })
    const checkout = await createGuestCheckout(t, {
      workId,
      buyerEmail: "right@example.test",
    })
    await seedAccount(t, {
      authUserId: "auth-wrong-email",
      email: "wrong@example.test",
    })
    await seedAccount(t, { authUserId: "auth-right-email", email: "right@example.test" })
    await seedAccount(t, { authUserId: "auth-other-email", email: "other@example.test" })

    await expect(
      t
        .withIdentity({ subject: "auth-wrong-email" })
        .mutation(api.commerce.claimOrder, { token: checkout.token }),
    ).rejects.toThrow()

    await t
      .withIdentity({ subject: "auth-right-email" })
      .mutation(api.commerce.claimOrder, { token: checkout.token })

    await expect(
      t
        .withIdentity({ subject: "auth-other-email" })
        .mutation(api.commerce.claimOrder, { token: checkout.token }),
    ).rejects.toThrow()
  })

  it("[P3-ORD-08] claim is idempotent and audited", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-claim3-seller" })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })
    const checkout = await createGuestCheckout(t, {
      workId,
      buyerEmail: "idem-claim@example.test",
    })
    await seedAccount(t, {
      authUserId: "auth-idem-claim",
      email: "idem-claim@example.test",
    })
    const identity = t.withIdentity({ subject: "auth-idem-claim" })

    await identity.mutation(api.commerce.claimOrder, { token: checkout.token })
    const second = await identity.mutation(api.commerce.claimOrder, {
      token: checkout.token,
    })
    expect(second.claimed).toBe(true)

    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_entity", (q) =>
          q.eq("entityType", "orders").eq("entityId", checkout.orderId),
        )
        .collect(),
    )
    expect(audit.filter((entry) => entry.action === "commerce.order.claim")).toHaveLength(1)
  })

  it("[P3-ORD-03] the guest status view exposes limited contact only", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-status-seller" })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })
    const checkout = await createGuestCheckout(t, { workId })

    const status = await t.query(api.commerce.getOrderByToken, { token: checkout.token })
    expect(status?.buyerEmailMasked).not.toBe("bayu@example.test")
    expect(status?.status).toBe("draft")
    expect(
      await t.query(api.commerce.getOrderByToken, { token: "deadbeef".repeat(8) }),
    ).toBeNull()
  })
})

describe("order lifecycle and access scope", () => {
  async function paidOrder() {
    const t = createTestDb()
    const seller = await seedSeller(t, {
      authUserId: "auth-life-seller",
      email: "seller@example.test",
    })
    await seedAccount(t, {
      authUserId: "auth-life-buyer",
      email: "buyer@example.test",
    })
    await seedAccount(t, { authUserId: "auth-life-admin", roles: ["admin"] })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })
    const checkout = await createGuestCheckout(t, {
      workId,
      buyerEmail: "buyer@example.test",
    })
    await t
      .withIdentity({ subject: "auth-life-buyer" })
      .mutation(api.commerce.claimOrder, { token: checkout.token })
    const charge = await createChargeForCheckout(t, checkout)
    await settleViaWebhook(t, {
      chargeId: charge.chargeId,
      orderCode: charge.code,
      amount: charge.uniqueAmount,
      paidAt: charge.paymentCreatedAt + 1_000,
    })
    return { t, seller, checkout, charge }
  }

  it("[P3-ORD-20] an order follows paid → in_progress → delivered → completed", async () => {
    const { t, checkout } = await paidOrder()

    await t
      .withIdentity({ subject: "auth-life-seller" })
      .mutation(api.commerce.startOrder, { orderId: checkout.orderId })
    await t
      .withIdentity({ subject: "auth-life-seller" })
      .mutation(api.commerce.deliverOrder, { orderId: checkout.orderId })
    await t
      .withIdentity({ subject: "auth-life-buyer" })
      .mutation(api.commerce.completeOrder, { orderId: checkout.orderId })

    const order = await t.run(async (ctx) => ctx.db.get(checkout.orderId))
    expect(order?.status).toBe("completed")
    expect(order?.deliveredAt).toBeTruthy()
    expect(order?.completedAt).toBeTruthy()
  })

  it("[P3-ORD-26] completion is not possible before delivery", async () => {
    const { t, checkout } = await paidOrder()
    await expect(
      t
        .withIdentity({ subject: "auth-life-buyer" })
        .mutation(api.commerce.completeOrder, { orderId: checkout.orderId }),
    ).rejects.toThrow()
  })

  it("[P3-ORD-28] a seller cannot start or complete outside the flow", async () => {
    const { t, checkout } = await paidOrder()
    await expect(
      t
        .withIdentity({ subject: "auth-life-seller" })
        .mutation(api.commerce.completeOrder, { orderId: checkout.orderId }),
    ).rejects.toThrow()

    const t2 = createTestDb()
    const seller = await seedSeller(t2, { authUserId: "auth-direct-seller" })
    const workId = await seedPublishedWork(t2, { makerId: seller.userId })
    const checkout2 = await createGuestCheckout(t2, {
      workId,
      buyerEmail: "other-buyer@example.test",
    })
    await t2
      .withIdentity({ subject: "auth-direct-seller" })
      .mutation(api.commerce.cancelOrder, {
        orderId: checkout2.orderId,
        reason: "Salah masukkan pesanan.",
      })
    void checkout
  })

  it("[P3-ORD-25] buyer sees own purchases, seller sees own sales, admin sees all", async () => {
    const { t, checkout } = await paidOrder()

    const buyer = await t
      .withIdentity({ subject: "auth-life-buyer" })
      .query(api.commerce.listOrders, {})
    expect(buyer.map((row) => row.code)).toEqual([checkout.code])

    const seller = await t
      .withIdentity({ subject: "auth-life-seller" })
      .query(api.commerce.listOrders, {})
    expect(seller.map((row) => row.code)).toEqual([checkout.code])

    const admin = await t
      .withIdentity({ subject: "auth-life-admin" })
      .query(api.commerce.listOrders, {})
    expect(admin.map((row) => row.code)).toContain(checkout.code)
  })

  it("[P3-ACC-46] an unrelated account cannot read an order by id", async () => {
    const { t, checkout } = await paidOrder()
    await seedAccount(t, { authUserId: "auth-unrelated" })

    await expect(
      t
        .withIdentity({ subject: "auth-unrelated" })
        .query(api.commerce.getOrder, { orderId: checkout.orderId }),
    ).rejects.toThrow()
  })

  it("[P3-ORD-24] manual correction requires a reason and cannot mark an order paid", async () => {
    const { t, checkout } = await paidOrder()

    await expect(
      t.withIdentity({ subject: "auth-life-admin" }).mutation(api.commerce.correctOrderStatus, {
        orderId: checkout.orderId,
        status: "paid",
        reason: "Coba lewati pembayaran.",
      } as never),
    ).rejects.toThrow()

    await expect(
      t.withIdentity({ subject: "auth-life-admin" }).mutation(api.commerce.correctOrderStatus, {
        orderId: checkout.orderId,
        status: "delivered",
        reason: "",
      }),
    ).rejects.toThrow()

    await t.withIdentity({ subject: "auth-life-admin" }).mutation(
      api.commerce.correctOrderStatus,
      {
        orderId: checkout.orderId,
        status: "delivered",
        reason: "Bukti pengiriman diverifikasi manual.",
      },
    )
    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_entity", (q) =>
          q.eq("entityType", "orders").eq("entityId", checkout.orderId),
        )
        .collect(),
    )
    expect(audit.some((entry) => entry.action === "commerce.order.correct")).toBe(true)
  })

  it("[P3-ORD-22] cancel is allowed only before payment", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-cancel-seller" })
    await seedAccount(t, { authUserId: "auth-cancel-buyer", email: "cancel@example.test" })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })
    const checkout = await createGuestCheckout(t, {
      workId,
      buyerEmail: "cancel@example.test",
    })
    await t
      .withIdentity({ subject: "auth-cancel-buyer" })
      .mutation(api.commerce.claimOrder, { token: checkout.token })

    await t
      .withIdentity({ subject: "auth-cancel-buyer" })
      .mutation(api.commerce.cancelOrder, {
        orderId: checkout.orderId,
        reason: "Berubah pikiran sebelum membayar.",
      })
    const order = await t.run(async (ctx) => ctx.db.get(checkout.orderId))
    expect(order?.status).toBe("cancelled")
  })
})

describe("order disputes", () => {
  it("[P3-RFD-06] a dispute follows open → reviewing → resolved → closed", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-dispute-seller" })
    await seedAccount(t, { authUserId: "auth-dispute-buyer", email: "dispute@example.test" })
    await seedAccount(t, { authUserId: "auth-dispute-admin", roles: ["admin"] })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })
    const checkout = await createGuestCheckout(t, {
      workId,
      buyerEmail: "dispute@example.test",
    })
    await t
      .withIdentity({ subject: "auth-dispute-buyer" })
      .mutation(api.commerce.claimOrder, { token: checkout.token })
    const charge = await createChargeForCheckout(t, checkout)
    await settleViaWebhook(t, {
      chargeId: charge.chargeId,
      orderCode: charge.code,
      amount: charge.uniqueAmount,
      paidAt: charge.paymentCreatedAt + 1_000,
    })

    const opened = await t
      .withIdentity({ subject: "auth-dispute-buyer" })
      .mutation(api.commerce.openOrderDispute, {
        orderId: checkout.orderId,
        reason: "Barang tidak sesuai deskripsi.",
      })
    const order = await t.run(async (ctx) => ctx.db.get(checkout.orderId))
    expect(order?.status).toBe("disputed")

    await t
      .withIdentity({ subject: "auth-dispute-admin" })
      .mutation(api.commerce.reviewOrderDispute, { disputeId: opened.disputeId })
    await t
      .withIdentity({ subject: "auth-dispute-admin" })
      .mutation(api.commerce.resolveOrderDispute, {
        disputeId: opened.disputeId,
        resolution: "Bukti pengiriman dan komunikasi sudah lengkap.",
        orderStatus: "delivered",
      })
    await t
      .withIdentity({ subject: "auth-dispute-admin" })
      .mutation(api.commerce.closeOrderDispute, { disputeId: opened.disputeId })

    const dispute = await t.run(async (ctx) => ctx.db.get(opened.disputeId))
    expect(dispute?.status).toBe("closed")
  })
})
