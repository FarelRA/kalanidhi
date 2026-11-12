import { describe, expect, it } from "vitest"

import { api } from "../../convex/_generated/api"
import {
  as,
  auditActions,
  createDb,
  errorCode,
  seedConversation,
  seedTicket,
  seedUser,
  seedWork,
  seedWorkCard,
  seedWorld,
} from "./fixtures"

describe("governance / admin-only surfaces", () => {
  it("[P6-GOV-00] students cannot read governance, flows, or platform settings", async () => {
    const t = createDb()
    await seedWorld(t)

    expect(
      await errorCode(as(t, "auth-student").query(api.governance.listCulturalSources, {})),
    ).toBe("FORBIDDEN")
    expect(
      await errorCode(as(t, "auth-student").query(api.flows.listDefinitions, {})),
    ).toBe("FORBIDDEN")
    expect(
      await errorCode(as(t, "auth-student").query(api.settings.adminState, {})),
    ).toBe("FORBIDDEN")

    const sources = await as(t, "auth-admin").query(
      api.governance.listCulturalSources,
      {},
    )
    const definitions = await as(t, "auth-admin").query(
      api.flows.listDefinitions,
      {},
    )
    const settings = await as(t, "auth-admin").query(api.settings.adminState, {})
    expect(sources).toEqual([])
    expect(definitions).toHaveLength(14)
    expect(settings.revenueSplit).toMatchObject({
      teacher: 70,
      platform: 15,
      community: 15,
      editable: false,
    })
  })

  it("[P6-GOV-01] a student cannot create or withdraw a cultural source", async () => {
    const t = createDb()
    await seedWorld(t)
    const workId = await seedWork(t, { makerId: await seedUser(t, { authUserId: "auth-maker" }) })

    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.governance.createCulturalSource, {
          community: "Giriloyo",
          sourceName: "Sumber",
          workId,
          permissionDocumentRef: "IZIN-01",
          permissionDate: 1_760_000_000_000,
          accessLevel: "community",
          attribution: "Komunitas Giriloyo",
        }),
      ),
    ).toBe("FORBIDDEN")
  })
})

describe("support / ownership and IDOR", () => {
  it("[P0-ACC-50] another user cannot read or reply to a support ticket", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const created = await as(t, "auth-student").mutation(api.support.create, {
      subject: "Pembayaran belum cocok",
      body: "Saya sudah transfer tetapi pesanan belum berubah.",
    })

    const stolen = await as(t, "auth-outsider").query(api.support.get, {
      ticketId: created.ticketId,
    })
    expect(stolen).toBeNull()

    expect(
      await errorCode(
        as(t, "auth-outsider").mutation(api.support.reply, {
          ticketId: created.ticketId,
          body: "Saya ingin ikut campur.",
        }),
      ),
    ).toBe("NOT_FOUND")

    const mine = await as(t, "auth-student").query(api.support.get, {
      ticketId: created.ticketId,
    })
    expect(mine?.code).toBe(created.code)
    expect(mine?.requesterId).toBe(world.studentId)

    const adminView = await as(t, "auth-admin").query(api.support.get, {
      ticketId: created.ticketId,
    })
    expect(adminView?.code).toBe(created.code)
  })

  it("[P6-SUP-05] support management actions are admin-only", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const ticketId = await seedTicket(t, { requesterId: world.studentId })

    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.support.assign, {
          ticketId,
          assigneeId: world.studentId,
          reason: "Saya menugaskan diri sendiri.",
        }),
      ),
    ).toBe("FORBIDDEN")
    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.support.escalate, {
          ticketId,
          to: "payment",
          reason: "Eskalasi sendiri.",
        }),
      ),
    ).toBe("FORBIDDEN")
    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.support.resolve, {
          ticketId,
          resolution: "Selesai sendiri.",
        }),
      ),
    ).toBe("FORBIDDEN")
  })
})

describe("governance / impersonation and break-glass limits", () => {
  it("[P6-GOV-20] impersonation is read-only, time-boxed, and cannot target an admin", async () => {
    const t = createDb()
    const world = await seedWorld(t)

    const session = await as(t, "auth-admin").mutation(
      api.governance.startImpersonation,
      {
        targetId: world.studentId,
        reason: "Memeriksa tampilan peserta yang melaporkan galat.",
        minutes: 10,
      },
    )
    expect(session.readOnly).toBe(true)
    expect(session.expiresAt).toBeGreaterThan(Date.now())

    const stored = await t.run(async (ctx) => ctx.db.get(session.sessionId))
    expect(stored?.readOnly).toBe(true)
    expect(
      await auditActions(t),
    ).toContain("governance.impersonation.start")

    expect(
      await errorCode(
        as(t, "auth-admin").mutation(api.governance.startImpersonation, {
          targetId: world.adminTwoId,
          reason: "Mencoba melihat pengelola lain.",
        }),
      ),
    ).toBe("INVALID_TARGET")
    expect(
      await errorCode(
        as(t, "auth-admin").mutation(api.governance.startImpersonation, {
          targetId: world.adminId,
          reason: "Mencoba melihat diri sendiri.",
        }),
      ),
    ).toBe("SELF_DEALING")

    const hidden = await as(t, "auth-admin-two").query(
      api.governance.getImpersonation,
      { sessionId: session.sessionId },
    )
    expect(hidden).toBeNull()
  })

  it("[P6-GOV-21] break-glass requires a reason, expiry, and writes an audit entry", async () => {
    const t = createDb()
    await seedWorld(t)
    const workId = await seedWork(t, { makerId: await seedUser(t, { authUserId: "auth-maker-2" }) })
    await seedWorkCard(t, { workId, makerId: await seedUser(t, { authUserId: "auth-maker-3" }) })

    expect(
      await errorCode(
        as(t, "auth-admin").mutation(api.governance.grantBreakGlass, {
          entityType: "call_recording",
          entityId: "rec-1",
          reason: "pendek",
        }),
      ),
    ).toBe("REASON_REQUIRED")

    const grant = await as(t, "auth-admin").mutation(
      api.governance.grantBreakGlass,
      {
        entityType: "call_recording",
        entityId: "rec-1",
        reason: "Meninjau sengketa panggilan yang dilaporkan.",
        minutes: 5,
      },
    )
    expect(grant.expiresAt).toBeGreaterThan(Date.now())

    const allowed = await as(t, "auth-admin").mutation(
      api.governance.logBreakGlassAccess,
      { entityType: "call_recording", entityId: "rec-1" },
    )
    expect(allowed.grantId).toBe(grant.grantId)

    const denied = await as(t, "auth-admin-two").mutation(
      api.governance.logBreakGlassAccess,
      { entityType: "call_recording", entityId: "rec-1" },
    )
    expect(denied.allowed).toBe(false)

    const actions = await auditActions(t)
    expect(actions).toContain("governance.breakGlass.grant")
    expect(actions).toContain("governance.breakGlass.access")
    expect(actions).toContain("governance.breakGlass.denied")
  })

  it("[P0-ACC-52] a support conversation ticket does not copy chat messages", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await seedConversation(t, {
      userId: world.studentId,
    })

    const created = await as(t, "auth-student").mutation(
      api.support.createFromConversation,
      { conversationId, subject: "Tindak lanjut percakapan" },
    )
    const detail = await as(t, "auth-admin").query(api.support.get, {
      ticketId: created.ticketId,
    })
    expect(detail?.sourceConversationId).toBe(conversationId)
    expect(detail?.messages).toHaveLength(0)
    expect(
      await t.run(async (ctx) =>
        ctx.db
          .query("messages")
          .withIndex("by_conversation_createdAt", (q) =>
            q.eq("conversationId", conversationId),
          )
          .collect(),
      ),
    ).toHaveLength(1)
  })
})
