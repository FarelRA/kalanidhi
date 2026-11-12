import { describe, expect, it } from "vitest"

import { api } from "../../convex/_generated/api"
import {
  as,
  auditActions,
  createDb,
  errorCode,
  NOW,
  seedWork,
  seedWorkCard,
  seedWorld,
} from "./fixtures"

async function seedSource(
  t: ReturnType<typeof createDb>,
  input: {
    workId?: Awaited<ReturnType<typeof seedWork>>
    pathId?: string
    community?: string
  } = {},
) {
  return await as(t, "auth-admin").mutation(api.governance.createCulturalSource, {
    community: input.community ?? "Giriloyo",
    sourceName: "Sumber batik soga",
    pathId: input.pathId ?? "batik-tulis-soga",
    workId: input.workId,
    permissionDocumentRef: "IZIN-GIRILOYO-2026",
    permissionDate: NOW,
    accessLevel: "community",
    attribution: "Komunitas batik Giriloyo",
  })
}

describe("governance / cultural sources", () => {
  it("[P6-GOV-02] source withdrawal pauses dependent listings and records the effect", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const workId = await seedWork(t, { makerId: world.studentId })
    const cardId = await seedWorkCard(t, {
      workId,
      makerId: world.studentId,
    })
    const relatedId = await seedWork(t, {
      makerId: world.studentId,
      slug: "kain-soga-kedua",
      title: "Kain Soga Kedua",
    })
    const source = await seedSource(t, { workId })

    const listed = await as(t, "auth-admin").query(
      api.governance.listCulturalSources,
      {},
    )
    expect(listed).toHaveLength(1)
    expect(listed[0]?.permissionStatus).toBe("granted")

    await as(t, "auth-admin").mutation(api.governance.requestWithdrawal, {
      sourceId: source.sourceId,
      reason: "Komunitas meminta peninjauan ulang izin.",
    })
    await as(t, "auth-admin").mutation(api.governance.withdrawCulturalSource, {
      sourceId: source.sourceId,
      reason: "Izin dicabut oleh komunitas Giriloyo.",
    })

    const work = await t.run(async (ctx) => ctx.db.get(workId))
    const card = await t.run(async (ctx) => ctx.db.get(cardId))
    const related = await t.run(async (ctx) => ctx.db.get(relatedId))
    expect(work?.status).toBe("paused")
    expect(card?.status).toBe("paused")
    expect(related?.status).toBe("paused")

    const detail = await as(t, "auth-admin").query(
      api.governance.getCulturalSource,
      { sourceId: source.sourceId },
    )
    expect(detail?.withdrawalStatus).toBe("withdrawn")
    expect(detail?.permissionStatus).toBe("withdrawn")

    const actions = await auditActions(t)
    expect(actions).toContain("governance.source.withdrawal.request")
    expect(actions).toContain("governance.source.withdraw")
    expect(actions).toContain("governance.source.pauseListings")

    await as(t, "auth-admin").mutation(api.governance.restoreCulturalSource, {
      sourceId: source.sourceId,
      reason: "Izin baru diterima dan diverifikasi ulang.",
    })
    const restored = await as(t, "auth-admin").query(
      api.governance.getCulturalSource,
      { sourceId: source.sourceId },
    )
    expect(restored?.withdrawalStatus).toBe("active")
    expect(restored?.permissionStatus).toBe("granted")
  })

  it("[P6-GOV-03] takedown unpublishes work, freezes related listings, notifies, and audits", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const workId = await seedWork(t, { makerId: world.studentId })
    await seedWorkCard(t, { workId, makerId: world.studentId })
    await seedWork(t, {
      makerId: world.studentId,
      slug: "kain-soga-takedown",
      title: "Kain Soga Terkait",
    })

    const created = await as(t, "auth-admin").mutation(
      api.governance.createTakedown,
      {
        targetType: "work",
        targetId: workId,
        targetLabel: "Kain Soga Giriloyo",
        requesterName: "Perwakilan komunitas",
        requesterContact: "komunitas@example.test",
        reason: "Motif tidak memiliki izin dari komunitas.",
      },
    )

    await as(t, "auth-admin").mutation(api.governance.reviewTakedown, {
      takedownId: created.takedownId,
      decision: "approved",
      reason: "Bukti izin tidak ditemukan.",
    })
    const executed = await as(t, "auth-admin").mutation(
      api.governance.executeTakedown,
      {
        takedownId: created.takedownId,
        reason: "Menjalankan takedown yang disetujui.",
      },
    )
    expect(executed.effects.length).toBeGreaterThan(0)

    const work = await t.run(async (ctx) => ctx.db.get(workId))
    expect(work?.status).toBe("paused")

    const related = await t.run(async (ctx) =>
      ctx.db
        .query("works")
        .withIndex("by_slug", (q) => q.eq("slug", "kain-soga-takedown"))
        .unique(),
    )
    expect(related?.status).toBe("paused")

    const notifications = await t.run(async (ctx) =>
      ctx.db.query("notificationOutbox").collect(),
    )
    expect(
      notifications.some((row) => row.template === "governance.takedown"),
    ).toBe(true)

    const actions = await auditActions(t)
    expect(actions).toContain("governance.takedown.create")
    expect(actions).toContain("governance.takedown.approved")
    expect(actions).toContain("governance.takedown.execute")

    await as(t, "auth-admin").mutation(api.governance.reverseTakedown, {
      takedownId: created.takedownId,
      reason: "Izin ditemukan dan permintaan ditarik oleh pemohon.",
    })
    const restored = await t.run(async (ctx) => ctx.db.get(workId))
    expect(restored?.status).toBe("published")
  })
})

describe("governance / privacy requests", () => {
  it("[P6-GOV-10] access and correction requests complete with an audit trail", async () => {
    const t = createDb()
    const world = await seedWorld(t)

    const access = await as(t, "auth-admin").mutation(
      api.governance.createPrivacyRequest,
      {
        kind: "access",
        subjectUserId: world.studentId,
        reason: "Permintaan salinan data pribadi.",
      },
    )
    await as(t, "auth-admin").mutation(api.governance.reviewPrivacyRequest, {
      requestId: access.requestId,
      decision: "completed",
      resolution: "Salinan data diberikan melalui tautan bertanda tangan.",
    })

    const correction = await as(t, "auth-admin").mutation(
      api.governance.createPrivacyRequest,
      {
        kind: "correction",
        subjectUserId: world.studentId,
        reason: "Nama pada akun salah eja.",
        correction: { name: "Anisa Rahmawati Baru" },
      },
    )
    await as(t, "auth-admin").mutation(api.governance.reviewPrivacyRequest, {
      requestId: correction.requestId,
      decision: "completed",
      resolution: "Nama diperbaiki sesuai dokumen.",
    })

    const user = await t.run(async (ctx) => ctx.db.get(world.studentId))
    expect(user?.name).toBe("Anisa Rahmawati Baru")
    const actions = await auditActions(t)
    expect(actions).toContain("governance.privacy.completed")
    expect(actions).toContain("governance.privacy.correct")
  })

  it("[P6-GOV-11] retention hold blocks deletion; deletion anonymizes but preserves records", async () => {
    const t = createDb()
    const world = await seedWorld(t)

    const hold = await as(t, "auth-admin").mutation(
      api.governance.createPrivacyRequest,
      {
        kind: "hold",
        subjectUserId: world.studentId,
        reason: "Investigasi sengketa pembayaran aktif.",
      },
    )
    await as(t, "auth-admin").mutation(api.governance.reviewPrivacyRequest, {
      requestId: hold.requestId,
      decision: "completed",
      resolution: "Retensi diberlakukan sampai sengketa selesai.",
      retentionHoldUntil: Date.now() + 30 * 86_400_000,
    })

    const deletion = await as(t, "auth-admin").mutation(
      api.governance.createPrivacyRequest,
      {
        kind: "deletion",
        subjectUserId: world.studentId,
        reason: "Pemilik akun meminta penghapusan.",
      },
    )
    expect(
      await errorCode(
        as(t, "auth-admin").mutation(api.governance.reviewPrivacyRequest, {
          requestId: deletion.requestId,
          decision: "completed",
          resolution: "Mencoba menghapus saat hold aktif.",
        }),
      ),
    ).toBe("RETENTION_HOLD")

    const order = await t.run(async (ctx) =>
      ctx.db.insert("orders", {
        code: "KN-2026-000777",
        buyerUserId: world.studentId,
        buyerName: "Anisa Rahmawati",
        buyerEmail: "auth-student@example.test",
        sellerId: world.teacherId,
        baseAmount: 850_000,
        status: "paid",
        channel: "web",
        createdAt: NOW,
        updatedAt: NOW,
      }),
    )
    await t.run(async (ctx) =>
      ctx.db.insert("ledgerEntries", {
        orderId: order,
        teacherId: world.teacherId,
        account: "teacher",
        direction: "credit",
        amount: 595_000,
        currency: "IDR",
        entryType: "sale",
        reason: "Uji retensi ledger.",
        createdAt: NOW,
      }),
    )

    // End the hold with a past expiry, then deletion can proceed.
    await t.run(async (ctx) =>
      ctx.db.patch(hold.requestId, {
        retentionHoldUntil: NOW - 86_400_000,
        updatedAt: NOW,
      }),
    )

    await as(t, "auth-admin").mutation(api.governance.reviewPrivacyRequest, {
      requestId: deletion.requestId,
      decision: "completed",
      resolution: "Hold berakhir; penghapusan dijalankan.",
    })

    const anonymized = await t.run(async (ctx) => ctx.db.get(world.studentId))
    expect(anonymized?.name).toBe("Akun dihapus")
    expect(anonymized?.email).toContain("kalanidhi.invalid")
    expect(anonymized?.status).toBe("deleted")

    const ledger = await t.run(async (ctx) =>
      ctx.db
        .query("ledgerEntries")
        .withIndex("by_orderId", (q) => q.eq("orderId", order))
        .collect(),
    )
    expect(ledger).toHaveLength(1)
    expect(await auditActions(t)).toContain("governance.privacy.delete")
  })
})

describe("governance / impersonation registry", () => {
  it("[P6-GOV-12] impersonation sessions are read-only, expiring, and audited", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const session = await as(t, "auth-admin").mutation(
      api.governance.startImpersonation,
      {
        targetId: world.studentId,
        reason: "Menelusuri laporan galat tampilan peserta.",
        minutes: 5,
      },
    )
    expect(session.readOnly).toBe(true)
    const record = await t.run(async (ctx) => ctx.db.get(session.sessionId))
    expect(record?.readOnly).toBe(true)
    expect(record?.expiresAt).toBeGreaterThan(record?.startedAt ?? 0)

    await as(t, "auth-admin").mutation(api.governance.endImpersonation, {
      sessionId: session.sessionId,
      reason: "Pemeriksaan selesai.",
    })
    const ended = await t.run(async (ctx) => ctx.db.get(session.sessionId))
    expect(ended?.endedAt).toBeTruthy()
    expect(await auditActions(t)).toContain("governance.impersonation.end")
  })
})
