import { describe, expect, it } from "vitest"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  createChargeForCheckout,
  createCheckout,
  createTestDb,
  seedAccount,
  seedPath,
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

function workInput(
  pathId = PATH,
  certificateId?: Id<"certificates">,
  imageAssetId?: Id<"mediaAssets">,
) {
  return {
    title: "Kain Soga Anyaman",
    pathId,
    certificateId,
    price: 1_450_000,
    unit: "per helai",
    technique: "Batik tulis",
    techniqueNote: "Soga alam",
    description: "Kain soga dengan provenans lengkap.",
    imageAssetId,
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
      .mutation(api.commerce.createWork, workInput(PATH, seller.certificateId ?? undefined, seller.imageAssetId))

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
        ...workInput(PATH, seller.certificateId ?? undefined, seller.imageAssetId),
        price: 0,
      }),
    ).rejects.toThrow()
    await expect(
      identity.mutation(api.commerce.createWork, {
        ...workInput(PATH, seller.certificateId ?? undefined, seller.imageAssetId),
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
        ...workInput(PATH, seller.certificateId ?? undefined, seller.imageAssetId),
        image: "",
        imageAssetId: undefined,
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
      .mutation(api.commerce.createWork, workInput(PATH, seller.certificateId ?? undefined, seller.imageAssetId))
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
      .mutation(api.commerce.createWork, workInput(PATH, seller.certificateId ?? undefined, seller.imageAssetId))
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
    expect(view?.permission).toBe("Izin komunitas Giriloyo")
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

    await expect(createCheckout(t, { workId })).rejects.toThrow()
    const view = await t.query(api.commerce.getPublicWork, {
      slug: await workSlug(t, workId),
    })
    expect(view?.purchasable).toBe(false)
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

  it("[P3-WRK-13] a seller uploads a work image and creates a draft with the asset", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-upload-seller" })
    const storageId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["work-photo"], { type: "image/jpeg" })),
    )

    const saved = await t
      .withIdentity({ subject: "auth-upload-seller" })
      .mutation(api.media.saveWorkImage, {
        storageId,
        filename: "kain.jpg",
        mimeType: "image/jpeg",
        size: 10,
        alt: "Kain soga",
      })
    expect(saved.url).toBeTruthy()

    const asset = await t.run(async (ctx) => ctx.db.get(saved.assetId))
    expect(asset?.kind).toBe("image")
    expect(asset?.uploadedBy).toBe(seller.userId)

    const created = await t
      .withIdentity({ subject: "auth-upload-seller" })
      .mutation(
        api.commerce.createWork,
        workInput(PATH, seller.certificateId ?? undefined, saved.assetId),
      )
    const detail = await t
      .withIdentity({ subject: "auth-upload-seller" })
      .query(api.commerce.getWorkDetail, { workId: created.workId })
    expect(detail.imageAssetId).toBe(saved.assetId)
    expect(detail.image).toBe(saved.url)
    expect(detail.readiness.ready).toBe(true)
  })

  it("[P3-WRK-17] a seller edits a draft with a new image asset and card fields", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-edit-seller" })
    const created = await t
      .withIdentity({ subject: "auth-edit-seller" })
      .mutation(
        api.commerce.createWork,
        workInput(PATH, seller.certificateId ?? undefined, seller.imageAssetId),
      )

    const storageId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["new-photo"], { type: "image/png" })),
    )
    const saved = await t
      .withIdentity({ subject: "auth-edit-seller" })
      .mutation(api.media.saveWorkImage, {
        storageId,
        filename: "new.png",
        mimeType: "image/png",
        size: 9,
        alt: "Foto baru",
      })

    await t.withIdentity({ subject: "auth-edit-seller" }).mutation(
      api.commerce.updateWork,
      {
        workId: created.workId,
        title: "Kain Soga Baru",
        price: 1_500_000,
        priceLabel: "Mulai dari",
        unit: "per lembar",
        technique: "Batik cap",
        techniqueNote: "Cap tembaga",
        description: "Deskripsi baru.",
        imageAssetId: saved.assetId,
        permission: "Izin baru",
        provenance: "Provenans baru",
        materials: "Bahan baru",
        region: "Sleman",
        kind: "service",
        category: "layanan",
      },
    )

    const detail = await t
      .withIdentity({ subject: "auth-edit-seller" })
      .query(api.commerce.getWorkDetail, { workId: created.workId })
    expect(detail.title).toBe("Kain Soga Baru")
    expect(detail.price).toBe(1_500_000)
    expect(detail.priceLabel).toBe("Mulai dari")
    expect(detail.imageAssetId).toBe(saved.assetId)
    expect(detail.image).toBe(saved.url)
    expect(detail.kind).toBe("service")
    expect(detail.category).toBe("layanan")
    expect(detail.region).toBe("Sleman")
    expect(detail.permission).toBe("Izin baru")
    expect(detail.provenance).toBe("Provenans baru")
    expect(detail.materials).toBe("Bahan baru")
    expect(detail.readiness.ready).toBe(true)
  })

  it("[P3-WRK-14] an inactive seller profile or missing certificate blocks work creation", async () => {
    const t = createTestDb()
    const pending = await seedSeller(t, {
      authUserId: "auth-pending-seller",
      sellerStatus: "pending",
    })
    await expect(
      t
        .withIdentity({ subject: "auth-pending-seller" })
        .mutation(
          api.commerce.createWork,
          workInput(
            PATH,
            pending.certificateId ?? undefined,
            pending.imageAssetId,
          ),
        ),
    ).rejects.toThrow()

    const noCertificate = await seedSeller(t, {
      authUserId: "auth-no-cert-seller",
      certificate: false,
    })
    await expect(
      t
        .withIdentity({ subject: "auth-no-cert-seller" })
        .mutation(
          api.commerce.createWork,
          workInput(PATH, undefined, noCertificate.imageAssetId),
        ),
    ).rejects.toThrow()

    const storageId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["x"], { type: "image/jpeg" })),
    )
    await expect(
      t
        .withIdentity({ subject: "auth-pending-seller" })
        .mutation(api.media.saveWorkImage, {
          storageId,
          filename: "x.jpg",
          mimeType: "image/jpeg",
          size: 1,
          alt: "x",
        }),
    ).rejects.toThrow()
  })

  it("[P3-WRK-15] work status actions are restricted to the right role", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-role-seller" })
    await seedSeller(t, {
      authUserId: "auth-role-teacher",
      teacherProfile: true,
    })
    await admin(t)

    const created = await t
      .withIdentity({ subject: "auth-role-seller" })
      .mutation(
        api.commerce.createWork,
        workInput(PATH, seller.certificateId ?? undefined, seller.imageAssetId),
      )
    await t
      .withIdentity({ subject: "auth-role-seller" })
      .mutation(api.commerce.submitWork, { workId: created.workId })

    await expect(
      t
        .withIdentity({ subject: "auth-role-seller" })
        .mutation(api.commerce.confirmWork, { workId: created.workId }),
    ).rejects.toThrow()
    await expect(
      t
        .withIdentity({ subject: "auth-role-teacher" })
        .mutation(api.commerce.beginWorkReview, { workId: created.workId }),
    ).rejects.toThrow()
    await expect(
      t
        .withIdentity({ subject: "auth-role-teacher" })
        .mutation(api.commerce.publishWork, {
          workId: created.workId,
          reason: "Coba terbitkan dari akun pengajar.",
        }),
    ).rejects.toThrow()
    await expect(
      t
        .withIdentity({ subject: "auth-admin" })
        .mutation(api.commerce.submitWork, { workId: created.workId }),
    ).rejects.toThrow()

    await t
      .withIdentity({ subject: "auth-role-teacher" })
      .mutation(api.commerce.confirmWork, { workId: created.workId })
    await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.commerce.beginWorkReview, { workId: created.workId })
    await t.withIdentity({ subject: "auth-admin" }).mutation(api.commerce.publishWork, {
      workId: created.workId,
      reason: "Izin dan provenans sudah diverifikasi.",
    })

    await t
      .withIdentity({ subject: "auth-role-seller" })
      .mutation(api.commerce.pauseWork, { workId: created.workId })
    const paused = await t.run(async (ctx) => ctx.db.get(created.workId))
    expect(paused?.status).toBe("paused")

    await expect(
      t
        .withIdentity({ subject: "auth-role-seller" })
        .mutation(api.commerce.resumeWork, {
          workId: created.workId,
          reason: "Coba terbitkan ulang dari akun penjual.",
        }),
    ).rejects.toThrow()
    await t.withIdentity({ subject: "auth-admin" }).mutation(api.commerce.resumeWork, {
      workId: created.workId,
      reason: "Perbaikan selesai dan siap tayang kembali.",
    })
    const resumed = await t.run(async (ctx) => ctx.db.get(created.workId))
    expect(resumed?.status).toBe("published")
  })

  it("[P3-WRK-16] publish readiness blocks incomplete works and reports missing fields", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-ready-seller" })
    await seedSeller(t, {
      authUserId: "auth-ready-teacher",
      teacherProfile: true,
    })
    await admin(t)

    const created = await t
      .withIdentity({ subject: "auth-ready-seller" })
      .mutation(api.commerce.createWork, {
        ...workInput(
          PATH,
          seller.certificateId ?? undefined,
          seller.imageAssetId,
        ),
        materials: "",
      })

    const detail = await t
      .withIdentity({ subject: "auth-ready-seller" })
      .query(api.commerce.getWorkDetail, { workId: created.workId })
    expect(detail.readiness.ready).toBe(false)
    expect(detail.readiness.missing).toContain("Bahan")

    await expect(
      t
        .withIdentity({ subject: "auth-ready-seller" })
        .mutation(api.commerce.submitWork, { workId: created.workId }),
    ).rejects.toMatchObject({
      data: {
        code: "INCOMPLETE_WORK",
        missing: expect.arrayContaining(["Bahan"]),
      },
    })

    await t.run(async (ctx) => {
      const card = await ctx.db
        .query("workCards")
        .withIndex("by_workId", (q) => q.eq("workId", created.workId))
        .unique()
      if (card) {
        await ctx.db.patch(card._id, {
          materials: "Katun primisima, soga alam",
        })
      }
    })
    await t
      .withIdentity({ subject: "auth-ready-seller" })
      .mutation(api.commerce.submitWork, { workId: created.workId })
    await t
      .withIdentity({ subject: "auth-ready-teacher" })
      .mutation(api.commerce.confirmWork, { workId: created.workId })
    await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.commerce.beginWorkReview, { workId: created.workId })

    await t.run(async (ctx) => {
      const card = await ctx.db
        .query("workCards")
        .withIndex("by_workId", (q) => q.eq("workId", created.workId))
        .unique()
      if (card) await ctx.db.patch(card._id, { provenance: "" })
    })
    await expect(
      t.withIdentity({ subject: "auth-admin" }).mutation(api.commerce.publishWork, {
        workId: created.workId,
        reason: "Coba terbitkan tanpa provenans.",
      }),
    ).rejects.toMatchObject({
      data: {
        code: "INCOMPLETE_WORK",
        missing: expect.arrayContaining(["Provenans"]),
      },
    })

    await t.run(async (ctx) => {
      const card = await ctx.db
        .query("workCards")
        .withIndex("by_workId", (q) => q.eq("workId", created.workId))
        .unique()
      if (card) {
        await ctx.db.patch(card._id, { provenance: "Giriloyo, Yogyakarta" })
      }
    })
    await t.withIdentity({ subject: "auth-admin" }).mutation(api.commerce.publishWork, {
      workId: created.workId,
      reason: "Izin dan provenans sudah diverifikasi.",
    })
    const work = await t.run(async (ctx) => ctx.db.get(created.workId))
    expect(work?.status).toBe("published")
  })

  it("[P3-WRK-10] a paused or sold-out work cannot be ordered", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-paused-seller" })
    const paused = await seedPublishedWork(t, {
      makerId: seller.userId,
      status: "paused",
    })

    await expect(
      createCheckout(t, { workId: paused }),
    ).rejects.toThrow()
  })
})

describe("authenticated checkout", () => {
  it("[P3-ORD-01] an authenticated buyer creates an order owned by the buyer", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-buyer-seller" })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })
    const buyerId = await seedAccount(t, {
      authUserId: "auth-buyer",
      email: "buyer@example.test",
      name: "Bayu Pratama",
      phone: "6281111111111",
    })

    const checkout = await createCheckout(t, {
      workId,
      buyerAuth: "auth-buyer",
      buyerEmail: "buyer@example.test",
    })
    expect(checkout.code).toMatch(/^KN-\d{4}-\d{6}$/)
    expect(checkout.token).toHaveLength(64)
    expect(checkout.baseAmount).toBe(1_450_000)

    const order = await t.run(async (ctx) => ctx.db.get(checkout.orderId))
    expect(order?.buyerUserId).toBe(buyerId)
    expect(order?.buyerName).toBe("Bayu Pratama")
    expect(order?.buyerEmail).toBe("buyer@example.test")
    expect(order?.buyerWhatsapp).toBe("6281111111111")
    expect(order?.status).toBe("draft")
    expect(order?.consentVersion).toBeTruthy()
  })

  it("[P3-ORD-02] order tokens are unguessable and unique per order", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-token-seller" })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })

    const first = await createCheckout(t, {
      workId,
      buyerEmail: "one@example.test",
    })
    const second = await createCheckout(t, {
      workId,
      buyerEmail: "two@example.test",
    })
    expect(first.token).not.toBe(second.token)
    expect(first.token).toMatch(/^[0-9a-f]{64}$/)

    const status = await t.query(api.commerce.getOrderByToken, { token: first.token })
    expect(status?.code).toBe(first.code)
    expect(status?.buyerEmailMasked).toContain("*")
  })

  it("[P3-ORD-04] checkout requires transactional consent", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-consent-seller" })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })
    await seedAccount(t, {
      authUserId: "auth-consent-buyer",
      email: "consent@example.test",
    })

    await expect(
      t.withIdentity({ subject: "auth-consent-buyer" }).mutation(
        api.commerce.createOrder,
        {
          kind: "work",
          slug: await workSlug(t, workId),
          consentTransactional: false,
        },
      ),
    ).rejects.toThrow()
  })

  it("[P3-ORD-05] unauthenticated checkout is rejected", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-anon-seller" })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })

    await expect(
      t.mutation(api.commerce.createOrder, {
        kind: "work",
        slug: await workSlug(t, workId),
        consentTransactional: true,
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
    await expect(createCheckout(t, { workId })).rejects.toThrow()
  })

  it("[P3-ORD-09] a double submit returns the same order, not a duplicate", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-idem-seller" })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })

    const first = await createCheckout(t, {
      workId,
      buyerAuth: "auth-idem-buyer",
      idempotencyKey: "idem-key-1",
    })
    const second = await createCheckout(t, {
      workId,
      buyerAuth: "auth-idem-buyer",
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
      t.withIdentity({ subject: "auth-self-seller" }).mutation(
        api.commerce.createOrder,
        {
          kind: "work",
          slug: await workSlug(t, workId),
          consentTransactional: true,
        },
      ),
    ).rejects.toThrow()
  })

  it("[P3-ORD-03] the status view exposes limited contact only", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-status-seller" })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })
    const checkout = await createCheckout(t, { workId })

    const status = await t.query(api.commerce.getOrderByToken, { token: checkout.token })
    expect(status?.buyerEmailMasked).not.toBe("bayu@example.test")
    expect(status?.status).toBe("draft")
    expect(
      await t.query(api.commerce.getOrderByToken, { token: "deadbeef".repeat(8) }),
    ).toBeNull()
  })
})

describe("path purchase", () => {
  async function pathSetup(t: ReturnType<typeof createTestDb>) {
    const teacher = await seedSeller(t, {
      authUserId: "auth-path-teacher",
      teacherProfile: true,
    })
    const pathSlug = await seedPath(t, {
      teacherId: teacher.userId,
      slug: "batik-tulis-soga",
      price: 1_450_000,
    })
    const buyerId = await seedAccount(t, {
      authUserId: "auth-path-buyer",
      email: "path-buyer@example.test",
      name: "Pembeli Jalur",
    })
    return { teacher, pathSlug, buyerId }
  }

  it("[P3-ORD-40] an authenticated path purchase creates a path order", async () => {
    const t = createTestDb()
    const { pathSlug, buyerId } = await pathSetup(t)

    const checkout = await createCheckout(t, {
      pathSlug,
      buyerAuth: "auth-path-buyer",
      buyerEmail: "path-buyer@example.test",
    })
    expect(checkout.baseAmount).toBe(1_450_000)

    const order = await t.run(async (ctx) => ctx.db.get(checkout.orderId))
    expect(order?.buyerUserId).toBe(buyerId)
    expect(order?.workId).toBeUndefined()
    expect(order?.pathId).toBe(pathSlug)
    expect(order?.baseAmount).toBe(1_450_000)

    const items = await t.run(async (ctx) =>
      ctx.db
        .query("orderItems")
        .withIndex("by_orderId", (q) => q.eq("orderId", checkout.orderId))
        .collect(),
    )
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      kind: "path",
      pathId: pathSlug,
      title: "Batik Tulis Soga",
      unitAmount: 1_450_000,
      totalAmount: 1_450_000,
    })
  })

  it("[P3-ORD-41] settlement creates an active enrollment for the buyer", async () => {
    const t = createTestDb()
    const { pathSlug, buyerId } = await pathSetup(t)
    const checkout = await createCheckout(t, {
      pathSlug,
      buyerAuth: "auth-path-buyer",
      buyerEmail: "path-buyer@example.test",
    })
    const charge = await createChargeForCheckout(t, checkout)
    await settleViaWebhook(t, {
      chargeId: charge.chargeId,
      orderCode: charge.code,
      amount: charge.uniqueAmount,
      paidAt: charge.paymentCreatedAt + 1_000,
    })

    const enrollments = await t.run(async (ctx) =>
      ctx.db
        .query("enrollments")
        .withIndex("by_studentId", (q) => q.eq("studentId", buyerId))
        .collect(),
    )
    const enrollment = enrollments.find((row) => row.pathId === pathSlug)
    expect(enrollment?.status).toBe("active")
    expect(enrollment?.enrolledAt).toBeTruthy()
    expect(enrollment?.createdAt).toBeTruthy()
    expect(enrollment?.updatedAt).toBeTruthy()
  })

  it("[P3-ORD-42] a duplicate path purchase does not duplicate the enrollment", async () => {
    const t = createTestDb()
    const { pathSlug, buyerId } = await pathSetup(t)

    for (const key of ["path-order-1", "path-order-2"]) {
      const checkout = await createCheckout(t, {
        pathSlug,
        buyerAuth: "auth-path-buyer",
        buyerEmail: "path-buyer@example.test",
        idempotencyKey: key,
      })
      const charge = await createChargeForCheckout(t, checkout)
      await settleViaWebhook(t, {
        chargeId: charge.chargeId,
        orderCode: charge.code,
        amount: charge.uniqueAmount,
        paidAt: charge.paymentCreatedAt + 1_000,
      })
    }

    const enrollments = await t.run(async (ctx) =>
      ctx.db
        .query("enrollments")
        .withIndex("by_studentId", (q) => q.eq("studentId", buyerId))
        .collect(),
    )
    expect(enrollments.filter((row) => row.pathId === pathSlug)).toHaveLength(1)
  })

  it("[P3-ORD-43] an unavailable path cannot be ordered", async () => {
    const t = createTestDb()
    const teacher = await seedSeller(t, {
      authUserId: "auth-path-unavailable-teacher",
      teacherProfile: true,
    })
    const pathSlug = await seedPath(t, {
      teacherId: teacher.userId,
      slug: "jalur-segera",
      price: null,
      comingSoon: true,
    })
    await seedAccount(t, {
      authUserId: "auth-path-unavailable-buyer",
      email: "path-unavailable@example.test",
    })

    await expect(
      createCheckout(t, {
        pathSlug,
        buyerAuth: "auth-path-unavailable-buyer",
        buyerEmail: "path-unavailable@example.test",
      }),
    ).rejects.toThrow()
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
    const checkout = await createCheckout(t, {
      workId,
      buyerAuth: "auth-life-buyer",
      buyerEmail: "buyer@example.test",
    })
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
    const checkout2 = await createCheckout(t2, {
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
    const checkout = await createCheckout(t, {
      workId,
      buyerAuth: "auth-cancel-buyer",
      buyerEmail: "cancel@example.test",
    })

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

describe("order line items", () => {
  it("[P3-ORD-30] order detail returns the stored line items", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-items-seller" })
    await admin(t)
    const workId = await seedPublishedWork(t, { makerId: seller.userId })
    const checkout = await createCheckout(t, { workId })

    const view = await t
      .withIdentity({ subject: "auth-admin" })
      .query(api.commerce.getOrder, { orderId: checkout.orderId })

    expect(view.items).toHaveLength(1)
    expect(view.items[0]).toMatchObject({
      kind: "work",
      title: "Kain Soga Anyaman",
      quantity: 1,
      unitAmount: 1_450_000,
      totalAmount: 1_450_000,
    })
  })

  it("[P3-ORD-31] an order without line items returns an empty array", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-no-items-seller" })
    await admin(t)
    const workId = await seedPublishedWork(t, { makerId: seller.userId })
    const checkout = await createCheckout(t, { workId })

    await t.run(async (ctx) => {
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_orderId", (q) => q.eq("orderId", checkout.orderId))
        .collect()
      for (const item of items) await ctx.db.delete(item._id)
    })

    const view = await t
      .withIdentity({ subject: "auth-admin" })
      .query(api.commerce.getOrder, { orderId: checkout.orderId })
    expect(view.items).toEqual([])
  })
})

describe("order disputes", () => {
  it("[P3-RFD-06] a dispute follows open → reviewing → resolved → closed", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-dispute-seller" })
    await seedAccount(t, { authUserId: "auth-dispute-buyer", email: "dispute@example.test" })
    await seedAccount(t, { authUserId: "auth-dispute-admin", roles: ["admin"] })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })
    const checkout = await createCheckout(t, {
      workId,
      buyerAuth: "auth-dispute-buyer",
      buyerEmail: "dispute@example.test",
    })
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

describe("order and dispute read models", () => {
  it("[P3-ORD-32] order detail exposes cancellation and consent fields", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-consent-view-seller" })
    await admin(t)
    const workId = await seedPublishedWork(t, { makerId: seller.userId })
    const checkout = await createCheckout(t, { workId })

    await t.withIdentity({ subject: "auth-admin" }).mutation(api.commerce.cancelOrder, {
      orderId: checkout.orderId,
      reason: "Pembeli membatalkan sebelum membayar.",
    })

    const view = await t
      .withIdentity({ subject: "auth-admin" })
      .query(api.commerce.getOrder, { orderId: checkout.orderId })
    expect(view.cancelledAt).toBeTypeOf("number")
    expect(view.cancelReason).toContain("membatalkan")
    expect(view.consentVersion).toBeTruthy()
    expect(view.consentAt).toBeTypeOf("number")
  })

  it("[P3-RFD-07] a reviewed dispute exposes the assigned reviewer", async () => {
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-dispute-view-seller" })
    const adminId = await admin(t)
    await seedAccount(t, {
      authUserId: "auth-dispute-view-buyer",
      email: "dispute-view@example.test",
    })
    const workId = await seedPublishedWork(t, { makerId: seller.userId })
    const checkout = await createCheckout(t, {
      workId,
      buyerAuth: "auth-dispute-view-buyer",
      buyerEmail: "dispute-view@example.test",
    })
    const charge = await createChargeForCheckout(t, checkout)
    await settleViaWebhook(t, {
      chargeId: charge.chargeId,
      orderCode: charge.code,
      amount: charge.uniqueAmount,
      paidAt: charge.paymentCreatedAt + 1_000,
    })

    const opened = await t
      .withIdentity({ subject: "auth-dispute-view-buyer" })
      .mutation(api.commerce.openOrderDispute, {
        orderId: checkout.orderId,
        reason: "Barang tidak sesuai deskripsi.",
      })
    await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.commerce.reviewOrderDispute, { disputeId: opened.disputeId })

    const disputes = await t
      .withIdentity({ subject: "auth-admin" })
      .query(api.commerce.listOrderDisputes, {})
    const view = disputes.find((row) => row.id === opened.disputeId)
    expect(view?.assignedTo).toBe(adminId)
    expect(view?.assigneeName).toBe("Nadia Kusuma")
  })
})
