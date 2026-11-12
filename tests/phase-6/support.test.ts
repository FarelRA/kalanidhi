import { describe, expect, it } from "vitest"

import { api } from "../../convex/_generated/api"
import {
  as,
  auditActions,
  createDb,
  errorCode,
  NOW,
  seedSla,
  seedTicket,
  seedWork,
  seedWorld,
  supportMessages,
} from "./fixtures"

describe("support / ticket lifecycle", () => {
  it("[P6-SUP-01] a ticket records priority, assignee, SLA, and links", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const workId = await seedWork(t, { makerId: world.studentId })
    const created = await as(t, "auth-student").mutation(api.support.create, {
      subject: "Karya belum tampil",
      body: "Karya saya sudah disetujui tetapi belum muncul di toko.",
      priority: "high",
    })

    await as(t, "auth-admin").mutation(api.support.assign, {
      ticketId: created.ticketId,
      assigneeId: world.adminId,
      reason: "Ditugaskan ke pengelola konten.",
    })
    await as(t, "auth-admin").mutation(api.support.link, {
      ticketId: created.ticketId,
      link: { type: "work", id: workId, label: "Kain Soga Giriloyo" },
    })

    const detail = await as(t, "auth-admin").query(api.support.get, {
      ticketId: created.ticketId,
    })
    expect(detail?.priority).toBe("high")
    expect(detail?.assigneeId).toBe(world.adminId)
    expect(detail?.assignedBy).toBe(world.adminId)
    expect(detail?.assignedByName).toBe("Nadia Kusuma")
    expect(detail?.links).toEqual([
      { type: "work", id: workId, label: "Kain Soga Giriloyo" },
    ])
    expect(detail?.slaMinutes).toBeGreaterThan(0)
    expect(detail?.firstResponseAt).toBeNull()

    const actions = await auditActions(t)
    expect(actions).toContain("support.create")
    expect(actions).toContain("support.assign")
    expect(actions).toContain("support.link")
  })

  it("[P6-SUP-02] internal notes stay hidden from the requester and do not count as first response", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const ticketId = await seedTicket(t, { requesterId: world.studentId })

    await as(t, "auth-admin").mutation(api.support.reply, {
      ticketId,
      body: "Catatan internal: cocokkan mutasi bank.",
      internal: true,
    })

    const adminDetail = await as(t, "auth-admin").query(api.support.get, {
      ticketId,
    })
    expect(adminDetail?.messages).toHaveLength(1)
    expect(adminDetail?.messages[0]?.kind).toBe("internal")
    expect(adminDetail?.firstResponseAt).toBeNull()
    expect(adminDetail?.status).toBe("open")

    const userDetail = await as(t, "auth-student").query(api.support.get, {
      ticketId,
    })
    expect(userDetail?.messages).toHaveLength(0)
    expect(userDetail?.firstResponseAt).toBeNull()

    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.support.reply, {
          ticketId,
          body: "Saya mencoba menulis catatan internal.",
          internal: true,
        }),
      ),
    ).toBe("FORBIDDEN")

    await as(t, "auth-admin").mutation(api.support.reply, {
      ticketId,
      body: "Terima kasih, kami sudah mencocokkan pembayaran Anda.",
    })
    const afterReply = await as(t, "auth-student").query(api.support.get, {
      ticketId,
    })
    expect(afterReply?.messages).toHaveLength(1)
    expect(afterReply?.firstResponseAt).not.toBeNull()
    expect(afterReply?.status).toBe("pending")

    const actions = await auditActions(t)
    expect(actions).toContain("support.note")
    expect(actions).toContain("support.reply")
  })

  it("[P6-SUP-03] escalation routes work and requires a reason", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const ticketId = await seedTicket(t, { requesterId: world.studentId })

    expect(
      await errorCode(
        as(t, "auth-admin").mutation(api.support.escalate, {
          ticketId,
          to: "trust_safety",
          reason: "x",
        }),
      ),
    ).toBe("REASON_REQUIRED")

    await as(t, "auth-admin").mutation(api.support.escalate, {
      ticketId,
      to: "trust_safety",
      reason: "Laporan berisi ancaman kepada pengajar.",
    })
    const detail = await as(t, "auth-admin").query(api.support.get, {
      ticketId,
    })
    expect(detail?.escalatedTo).toBe("trust_safety")
    expect(detail?.escalationReason).toContain("ancaman")
    expect(await auditActions(t)).toContain("support.escalate")
  })

  it("[P6-SUP-04] a ticket cannot close before a reply and a resolution", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const ticketId = await seedTicket(t, { requesterId: world.studentId })

    expect(
      await errorCode(
        as(t, "auth-admin").mutation(api.support.close, {
          ticketId,
          reason: "Menutup tanpa balasan.",
        }),
      ),
    ).toBe("INVALID_TRANSITION")

    expect(
      await errorCode(
        as(t, "auth-admin").mutation(api.support.resolve, {
          ticketId,
          resolution: "Selesai tanpa membalas.",
        }),
      ),
    ).toBe("INVALID_TRANSITION")

    await as(t, "auth-admin").mutation(api.support.reply, {
      ticketId,
      body: "Kami sudah memeriksa pesanan Anda.",
    })
    await as(t, "auth-admin").mutation(api.support.resolve, {
      ticketId,
      resolution: "Pembayaran cocok dan pesanan aktif.",
    })
    const resolved = await as(t, "auth-admin").query(api.support.get, {
      ticketId,
    })
    expect(resolved?.status).toBe("resolved")
    expect(resolved?.resolvedBy).toBe(world.adminId)
    expect(resolved?.resolvedByName).toBe("Nadia Kusuma")
    expect(resolved?.lastResponseAt).toBeTypeOf("number")

    await as(t, "auth-admin").mutation(api.support.close, {
      ticketId,
      reason: "Pengguna mengonfirmasi.",
    })
    const closed = await as(t, "auth-admin").query(api.support.get, {
      ticketId,
    })
    expect(closed?.status).toBe("closed")

    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.support.reply, {
          ticketId,
          body: "Saya ingin menambahkan sesuatu.",
        }),
      ),
    ).toBe("INVALID_TRANSITION")

    await as(t, "auth-student").mutation(api.support.reopen, {
      ticketId,
      reason: "Masalah yang sama muncul lagi.",
    })
    const reopened = await as(t, "auth-admin").query(api.support.get, {
      ticketId,
    })
    expect(reopened?.status).toBe("open")
  })

  it("[P6-SUP-07] canned replies are admin-managed", async () => {
    const t = createDb()
    await seedWorld(t)

    expect(
      await errorCode(as(t, "auth-student").query(api.support.listCannedReplies, {})),
    ).toBe("FORBIDDEN")

    await as(t, "auth-admin").mutation(api.support.saveCannedReply, {
      key: "payment.duplicate",
      title: "Pembayaran ganda",
      body: "Jangan melakukan pembayaran ulang. Kami sedang mencocokkan mutasi.",
      category: "payment",
    })
    const rows = await as(t, "auth-admin").query(
      api.support.listCannedReplies,
      {},
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]?.key).toBe("payment.duplicate")
    expect(await auditActions(t)).toContain("support.canned.save")
  })

  it("[P6-SUP-08] first-response SLA is derived from the configured policy", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    await seedSla(t, { flowKey: "support", targetMinutes: 30 })
    const ticketId = await seedTicket(t, {
      requesterId: world.studentId,
      createdAt: NOW - 60 * 60_000,
    })

    const inbox = await as(t, "auth-admin").query(api.support.list, {
      view: "inbox",
    })
    expect(inbox[0]?.slaBreached).toBe(true)
    expect(inbox[0]?.slaMinutes).toBe(30)

    const queue = await as(t, "auth-admin").query(api.support.queueSummary, {})
    expect(queue.breached).toBe(1)

    await as(t, "auth-admin").mutation(api.support.reply, {
      ticketId,
      body: "Kami sudah menerima laporan Anda.",
    })
    const afterReply = await as(t, "auth-admin").query(api.support.queueSummary, {})
    expect(afterReply.breached).toBe(0)
    expect((await supportMessages(t, ticketId)).length).toBe(1)
  })
})
