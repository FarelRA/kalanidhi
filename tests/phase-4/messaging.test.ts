import { describe, expect, it, vi } from "vitest"

import { api } from "../../convex/_generated/api"
import {
  as,
  auditActions,
  createDb,
  enroll,
  errorCode,
  NOW,
  seedCohort,
  seedWorld,
  sendText,
  setSetting,
} from "./helpers"

describe("chat membership", () => {
  it("[P4-MSG-01] direct conversation requires a shared cohort enrollment", async () => {
    const t = createDb()
    const world = await seedWorld(t)

    const conversationId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })
    expect(conversationId).toBeTruthy()

    const duplicate = await as(
      t,
      "auth-teacher",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.studentId,
    })
    expect(duplicate).toBe(conversationId)

    expect(
      await errorCode(
        as(t, "auth-outsider").mutation(
          api.messaging.startDirect,
          { peerUserId: world.teacherId },
        ),
      ),
    ).toBe("FORBIDDEN")

    expect(
      await errorCode(
        as(t, "auth-teacher").mutation(
          api.messaging.startDirect,
          { peerUserId: world.outsiderId },
        ),
      ),
    ).toBe("FORBIDDEN")

    expect(
      await errorCode(
        as(t, "auth-student").mutation(
          api.messaging.startDirect,
          { peerUserId: world.studentId },
        ),
      ),
    ).toBe("SELF_DEALING")
  })

  it("[P4-MSG-46] the contact list only returns shared-cohort peers", async () => {
    const t = createDb()
    const world = await seedWorld(t)

    const studentContacts = await as(t, "auth-student").query(
      api.messaging.listContacts,
      {},
    )
    expect(studentContacts.map((item) => item.userId)).toEqual([
      world.teacherId,
    ])
    expect(studentContacts[0]?.roleLabel).toBe("Pengajar")

    const teacherContacts = await as(t, "auth-teacher").query(
      api.messaging.listContacts,
      {},
    )
    expect(teacherContacts.map((item) => item.userId)).toEqual([
      world.studentId,
    ])
    expect(teacherContacts[0]?.roleLabel).toBe("Peserta")

    const otherTeacherContacts = await as(
      t,
      "auth-teacher-other",
    ).query(api.messaging.listContacts, {})
    expect(
      otherTeacherContacts.map((item) => item.userId),
    ).not.toContain(world.studentId)
  })

  it("[P4-MSG-02] cohort conversation includes the teacher and enrolled students only", async () => {
    const t = createDb()
    const world = await seedWorld(t)

    const conversationId = await as(
      t,
      "auth-teacher",
    ).mutation(api.messaging.startCohort, {
      cohortId: world.cohortId,
    })

    const members = await t.run(async (ctx) =>
      ctx.db
        .query("conversationMembers")
        .withIndex("by_conversationId", (q) =>
          q.eq("conversationId", conversationId),
        )
        .collect(),
    )
    expect(members.map((member) => member.userId).sort()).toEqual(
      [world.teacherId, world.studentId].sort(),
    )

    const studentView = await as(t, "auth-student").query(
      api.messaging.listMessages,
      { conversationId },
    )
    expect(studentView.messages).toHaveLength(1)
    expect(studentView.messages[0]?.kind).toBe("system")

    expect(
      await errorCode(
        as(t, "auth-outsider").query(api.messaging.listMessages, {
          conversationId,
        }),
      ),
    ).toBe("NOT_FOUND")

    expect(
      await errorCode(
        as(t, "auth-teacher-other").mutation(
          api.messaging.startCohort,
          { cohortId: world.cohortId },
        ),
      ),
    ).toBe("FORBIDDEN")
  })

  it("[P4-MSG-03] support conversation requires a request; admin joins with consent", async () => {
    const t = createDb()
    const world = await seedWorld(t)

    const supportId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startSupport, {
      subject: "Bantuan tugas batik",
    })

    const support = await t.run(async (ctx) => ctx.db.get(supportId))
    expect(support?.supportRequestedBy).toBe(world.studentId)

    await as(t, "auth-admin").mutation(
      api.messaging.joinSupport,
      { conversationId: supportId, reason: "Permintaan dukungan pengguna" },
    )
    const supportMember = await t.run(async (ctx) =>
      ctx.db
        .query("conversationMembers")
        .withIndex("by_conversation_user", (q) =>
          q.eq("conversationId", supportId).eq("userId", world.adminId),
        )
        .unique(),
    )
    expect(supportMember?.role).toBe("support")
    expect(await auditActions(t)).toContain("messaging.support.join")

    const noConsentId = await t.run(async (ctx) =>
      ctx.db.insert("conversations", {
        kind: "support",
        title: "Tanpa permintaan",
        status: "open",
        createdAt: NOW,
        updatedAt: NOW,
      }),
    )
    const deniedJoin = await as(t, "auth-admin").mutation(
      api.messaging.joinSupport,
      { conversationId: noConsentId },
    )
    expect(deniedJoin.joined).toBe(false)
    const deniedContent = await as(t, "auth-admin").mutation(
      api.messaging.readContent,
      { conversationId: noConsentId },
    )
    expect(deniedContent.access).toBe("denied")
    expect(await auditActions(t)).toContain("messaging.breakGlass.denied")
  })

  it("[P4-MSG-04] system conversation is generated internally, not user-created", async () => {
    const t = createDb()
    const world = await seedWorld(t)

    const conversationId = await t.mutation(
      api.messaging.ensureSystemConversation,
      {
        userId: world.studentId,
        title: "Pengingat kohort",
        body: "Sesi kohort dimulai besok pukul 09.00.",
      },
    )
    const conversation = await t.run(async (ctx) => ctx.db.get(conversationId))
    expect(conversation?.kind).toBe("system")

    const messages = await as(t, "auth-student").query(
      api.messaging.listMessages,
      { conversationId },
    )
    expect(messages.messages[0]?.kind).toBe("system")
    expect(messages.messages[0]?.senderId).toBeNull()
  })

  it("[P4-MSG-05] a non-member cannot read, send, search, or enumerate messages", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })
    await sendText(t, "auth-student", conversationId, "Kain soga selesai.")

    const list = await as(t, "auth-outsider").query(
      api.messaging.listConversations,
      {},
    )
    expect(list.map((item) => item.id)).not.toContain(conversationId)

    expect(
      await errorCode(
        as(t, "auth-outsider").query(api.messaging.getConversation, {
          conversationId,
        }),
      ),
    ).toBe("NOT_FOUND")
    expect(
      await errorCode(
        as(t, "auth-outsider").query(api.messaging.listMessages, {
          conversationId,
        }),
      ),
    ).toBe("NOT_FOUND")
    expect(
      await errorCode(
        as(t, "auth-outsider").query(api.messaging.searchMessages, {
          conversationId,
          term: "soga",
        }),
      ),
    ).toBe("NOT_FOUND")
    expect(
      await errorCode(
        as(t, "auth-outsider").mutation(api.messaging.sendMessage, {
          conversationId,
          kind: "text",
          body: "Halo",
        }),
      ),
    ).toBe("NOT_FOUND")
    expect(
      await errorCode(
        as(t, "auth-outsider").mutation(
          api.messaging.markRead,
          { conversationId },
        ),
      ),
    ).toBe("NOT_FOUND")
    expect(
      await errorCode(
        as(t, "auth-outsider").query(api.messaging.listReceipts, {
          conversationId,
        }),
      ),
    ).toBe("NOT_FOUND")
    expect(
      await errorCode(
        as(t, "auth-outsider").query(api.messaging.listPresence, {
          conversationId,
        }),
      ),
    ).toBe("NOT_FOUND")
  })
})

describe("messages", () => {
  it("[P4-MSG-07] replies, edits, and soft delete preserve history", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })

    const firstId = await sendText(
      t,
      "auth-teacher",
      conversationId,
      "Teknik soga butuh dua celupan.",
    )
    const replyId = await as(t, "auth-student").mutation(
      api.messaging.sendMessage,
      {
        conversationId,
        kind: "text",
        body: "Baik, saya coba.",
        replyToId: firstId,
      },
    )

    const afterReply = await as(t, "auth-student").query(
      api.messaging.listMessages,
      { conversationId },
    )
    const reply = afterReply.messages.find((item) => item.id === replyId)
    expect(reply?.replyTo?.id).toBe(firstId)
    expect(reply?.replyTo?.body).toContain("dua celupan")

    await as(t, "auth-teacher").mutation(api.messaging.editMessage, {
      messageId: firstId,
      body: "Teknik soga butuh tiga celupan.",
    })
    const edits = await t.run(async (ctx) =>
      ctx.db
        .query("messageEdits")
        .withIndex("by_messageId", (q) => q.eq("messageId", firstId))
        .collect(),
    )
    expect(edits).toHaveLength(1)
    expect(edits[0]?.previousBody).toContain("dua celupan")
    expect(edits[0]?.nextBody).toContain("tiga celupan")

    const edited = await as(t, "auth-student").query(
      api.messaging.listMessages,
      { conversationId },
    )
    expect(
      typeof edited.messages.find((item) => item.id === firstId)?.editedAt,
    ).toBe("number")

    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.messaging.editMessage, {
          messageId: firstId,
          body: "Tidak boleh.",
        }),
      ),
    ).toBe("FORBIDDEN")

    await as(t, "auth-student").mutation(api.messaging.removeMessage, {
      messageId: replyId,
    })
    const removed = await as(t, "auth-teacher").query(
      api.messaging.listMessages,
      { conversationId },
    )
    const tombstone = removed.messages.find((item) => item.id === replyId)
    expect(typeof tombstone?.deletedAt).toBe("number")
    expect(tombstone?.body).toBeNull()
    const row = await t.run(async (ctx) => ctx.db.get(replyId))
    expect(row?._id).toBe(replyId)
  })

  it("[P4-MSG-45] a reply cannot cross conversations", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const directId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })
    const outsideId = await sendText(
      t,
      "auth-student",
      directId,
      "Pesan di percakapan langsung.",
    )
    const supportId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startSupport, {})

    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.messaging.sendMessage, {
          conversationId: supportId,
          kind: "text",
          body: "Balasan salah ruang.",
          replyToId: outsideId,
        }),
      ),
    ).toBe("INVALID_ARGUMENT")
  })

  it("[P4-MSG-08] read receipts are per member and monotonic", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })
    const messageId = await sendText(
      t,
      "auth-teacher",
      conversationId,
      "Sudah melihat hasilnya?",
    )

    const first = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.markRead, { conversationId })
    const second = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.markRead, { conversationId })
    expect(second.lastReadAt).toBeGreaterThanOrEqual(first.lastReadAt)

    const receipts = await t.run(async (ctx) =>
      ctx.db
        .query("messageReceipts")
        .withIndex("by_message_user", (q) =>
          q.eq("messageId", messageId).eq("userId", world.studentId),
        )
        .unique(),
    )
    expect(typeof receipts?.readAt).toBe("number")

    const view = await as(t, "auth-teacher").query(
      api.messaging.listReceipts,
      { conversationId },
    )
    expect(view.find((item) => item.userId === world.studentId)?.readCount).toBe(
      1,
    )
  })

  it("[P4-MSG-09] typing and presence are scoped to the conversation", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })

    await as(t, "auth-student").mutation(
      api.messaging.setTyping,
      { conversationId, typing: true },
    )
    const presence = await as(t, "auth-teacher").query(
      api.messaging.listPresence,
      { conversationId },
    )
    const student = presence.find((item) => item.userId === world.studentId)
    expect(student?.typingUntil).toBeGreaterThan(Date.now())

    await as(t, "auth-student").mutation(
      api.messaging.setTyping,
      { conversationId, typing: false },
    )
    const cleared = await as(t, "auth-teacher").query(
      api.messaging.listPresence,
      { conversationId },
    )
    expect(
      cleared.find((item) => item.userId === world.studentId)?.typingUntil,
    ).toBeNull()

    expect(
      await errorCode(
        as(t, "auth-outsider").query(api.messaging.listPresence, {
          conversationId,
        }),
      ),
    ).toBe("NOT_FOUND")
  })

  it("[P4-MSG-10] message search is scoped to one conversation", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const directId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })
    const supportId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startSupport, {})

    await sendText(t, "auth-student", directId, "Kain soga direndam malam.")
    await sendText(t, "auth-student", supportId, "Kain soga dari kohort.")

    const directResults = await as(t, "auth-student").query(
      api.messaging.searchMessages,
      { conversationId: directId, term: "soga" },
    )
    expect(directResults).toHaveLength(1)
    expect(directResults[0]?.body).toContain("direndam")

    const supportResults = await as(t, "auth-student").query(
      api.messaging.searchMessages,
      { conversationId: supportId, term: "soga" },
    )
    expect(supportResults).toHaveLength(1)
    expect(supportResults[0]?.body).toContain("kohort")
  })

  it("[P4-MSG-11] external links are flagged without storing a preview", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })
    const messageId = await sendText(
      t,
      "auth-student",
      conversationId,
      "Rujukan ada di https://example.test/kain",
    )

    const view = await as(t, "auth-teacher").query(
      api.messaging.listMessages,
      { conversationId },
    )
    const message = view.messages.find((item) => item.id === messageId)
    expect(message?.containsExternalLink).toBe(true)
    expect(message && "preview" in message).toBe(false)
  })

  it("[P4-MSG-12] rate limits and spam checks stop burst sending", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })

    await setSetting(t, "messaging.rateLimitPerMinute", 3)
    await sendText(t, "auth-student", conversationId, "Satu")
    await sendText(t, "auth-student", conversationId, "Dua")
    await sendText(t, "auth-student", conversationId, "Tiga")
    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.messaging.sendMessage, {
          conversationId,
          kind: "text",
          body: "Empat",
        }),
      ),
    ).toBe("RATE_LIMITED")

    const spamConversation = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startSupport, {})
    await setSetting(t, "messaging.rateLimitPerMinute", 50)
    for (let index = 0; index < 4; index += 1) {
      await sendText(
        t,
        "auth-student",
        spamConversation,
        "Pesan berulang yang sama",
      )
    }
    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.messaging.sendMessage, {
          conversationId: spamConversation,
          kind: "text",
          body: "Pesan berulang yang sama",
        }),
      ),
    ).toBe("SPAM_SUSPECTED")
  })

  it("[P4-MSG-13] a block stops new direct messages without touching cohort chat", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const directId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })
    const cohortId = await as(
      t,
      "auth-teacher",
    ).mutation(api.messaging.startCohort, {
      cohortId: world.cohortId,
    })

    await as(t, "auth-student").mutation(api.messaging.blockUser, {
      userId: world.teacherId,
      reason: "Pesan tidak diinginkan",
    })
    const adminSummary = (
      await as(t, "auth-admin").query(api.messaging.listConversations, {})
    ).find((item) => item.id === directId)
    expect(adminSummary?.blockedPair).toBe(true)

    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.messaging.sendMessage, {
          conversationId: directId,
          kind: "text",
          body: "Halo",
        }),
      ),
    ).toBe("BLOCKED")
    expect(
      await errorCode(
        as(t, "auth-teacher").mutation(api.messaging.sendMessage, {
          conversationId: directId,
          kind: "text",
          body: "Halo",
        }),
      ),
    ).toBe("BLOCKED")
    expect(
      await errorCode(
        as(t, "auth-student").mutation(
          api.messaging.startDirect,
          { peerUserId: world.teacherId },
        ),
      ),
    ).toBe("BLOCKED")

    await sendText(t, "auth-student", cohortId, "Pesan kohort tetap jalan.")

    await as(t, "auth-student").mutation(api.messaging.unblockUser, {
      userId: world.teacherId,
    })
    await sendText(t, "auth-student", directId, "Blokir dibuka.")
  })

  it("[P4-MSG-14] a report creates a moderation flag with the message reference", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })
    const messageId = await sendText(
      t,
      "auth-teacher",
      conversationId,
      "Tautan luar mencurigakan https://example.test",
    )

    const flagId = await as(t, "auth-student").mutation(
      api.messaging.reportMessage,
      { messageId, reason: "Tautan luar tidak diminta" },
    )
    const flag = await t.run(async (ctx) => ctx.db.get(flagId))
    expect(flag?.messageId).toBe(messageId)
    expect(flag?.status).toBe("open")
    const conversation = await t.run(async (ctx) =>
      ctx.db.get(conversationId),
    )
    expect(conversation?.status).toBe("flagged")

    expect(
      await errorCode(
        as(t, "auth-teacher").mutation(api.messaging.reportMessage, {
          messageId,
          reason: "Melaporkan pesan sendiri",
        }),
      ),
    ).toBe("SELF_DEALING")

    const flags = await as(t, "auth-admin").query(
      api.messaging.listFlags,
      {},
    )
    expect(flags[0]?.messageId).toBe(messageId)
    expect(flags[0]?.reporterId).toBe(world.studentId)
    expect(flags[0] && "messageBody" in flags[0]).toBe(false)
  })

  it("[P4-MSG-15] mute suppresses notifications without hiding messages", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })

    await as(t, "auth-student").mutation(api.messaging.muteConversation, {
      conversationId,
      hours: 8,
    })
    await sendText(t, "auth-teacher", conversationId, "Pesan pagi.")

    const notifications = await t.run(async (ctx) =>
      ctx.db
        .query("notificationOutbox")
        .withIndex("by_recipientId", (q) =>
          q.eq("recipientId", world.studentId),
        )
        .collect(),
    )
    expect(notifications).toHaveLength(0)

    const list = await as(t, "auth-student").query(
      api.messaging.listConversations,
      {},
    )
    const summary = list.find((item) => item.id === conversationId)
    expect(summary?.unreadCount).toBe(1)
  })

  it("[P4-MSG-16] retention hides expired messages from normal reads", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })
    await setSetting(t, "messaging.retentionDays", 2)
    await sendText(t, "auth-student", conversationId, "Pesan baru.")
    await t.run(async (ctx) =>
      ctx.db.insert("messages", {
        conversationId,
        senderId: world.teacherId,
        kind: "text",
        body: "Pesan kedaluwarsa.",
        createdAt: Date.now() - 3 * 86_400_000,
      }),
    )

    const view = await as(t, "auth-student").query(
      api.messaging.listMessages,
      { conversationId },
    )
    expect(view.messages.map((item) => item.body)).toEqual(["Pesan baru."])
  })

  it("[P4-MSG-17] admin sees metadata while content requires break-glass reason and audit", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })
    const messageId = await sendText(
      t,
      "auth-teacher",
      conversationId,
      "Isi percakapan privat.",
    )

    const adminList = await as(t, "auth-admin").query(
      api.messaging.listConversations,
      {},
    )
    const adminSummary = adminList.find((item) => item.id === conversationId)
    expect(adminSummary?.isMember).toBe(false)
    expect(adminSummary?.contentLocked).toBe(true)
    expect(adminSummary?.members).toHaveLength(2)

    const detail = await as(t, "auth-admin").query(
      api.messaging.getConversation,
      { conversationId },
    )
    expect(detail.canReadContent).toBe(false)
    expect(detail.contentLocked).toBe(true)

    const deniedRead = await as(t, "auth-admin").mutation(
      api.messaging.readContent,
      { conversationId },
    )
    expect(deniedRead.access).toBe("denied")
    expect(await auditActions(t)).toContain("messaging.breakGlass.denied")

    const shortReason = await as(t, "auth-admin").mutation(
      api.messaging.grantBreakGlass,
      { conversationId, reason: "pendek" },
    )
    expect(shortReason.granted).toBe(false)
    const unflagged = await as(t, "auth-admin").mutation(
      api.messaging.grantBreakGlass,
      { conversationId, reason: "Meninjau laporan pengguna" },
    )
    expect(unflagged.granted).toBe(false)

    await as(t, "auth-student").mutation(api.messaging.reportMessage, {
      messageId,
      reason: "Pesan melanggar pedoman",
    })
    const grant = await as(t, "auth-admin").mutation(
      api.messaging.grantBreakGlass,
      {
        conversationId,
        reason: "Meninjau laporan pesan pengguna",
      },
    )
    expect(grant.granted).toBe(true)
    if (!grant.granted) throw new Error("grant expected")
    expect(grant.expiresAt).toBeGreaterThan(Date.now())

    const content = await as(t, "auth-admin").mutation(
      api.messaging.readContent,
      { conversationId },
    )
    expect(content.access).toBe("granted")
    expect(content.messages[0]?.body).toContain("privat")
    const audit = await auditActions(t)
    expect(audit).toContain("messaging.breakGlass.grant")
    expect(audit).toContain("messaging.breakGlass.access")

    expect(
      await errorCode(
        as(t, "auth-admin").mutation(api.messaging.sendMessage, {
          conversationId,
          kind: "text",
          body: "Admin tidak boleh menulis.",
        }),
      ),
    ).toBe("NOT_FOUND")
  })

  it("[P4-MSG-44] a break-glass grant expires and never widens to another conversation", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW))
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })
    const otherId = await as(
      t,
      "auth-outsider",
    ).mutation(api.messaging.startSupport, {})
    const messageId = await sendText(
      t,
      "auth-teacher",
      conversationId,
      "Isi terlindungi.",
    )
    await as(t, "auth-student").mutation(api.messaging.reportMessage, {
      messageId,
      reason: "Meninjau pedoman percakapan",
    })
    await as(t, "auth-admin").mutation(
      api.messaging.grantBreakGlass,
      {
        conversationId,
        reason: "Meninjau laporan pengguna",
        minutes: 1,
      },
    )
    const outsideGrant = await as(t, "auth-admin").mutation(
      api.messaging.readContent,
      { conversationId: otherId },
    )
    expect(outsideGrant.access).toBe("denied")

    vi.advanceTimersByTime(2 * 60_000)
    const expired = await as(t, "auth-admin").mutation(
      api.messaging.readContent,
      { conversationId },
    )
    expect(expired.access).toBe("denied")
    vi.useRealTimers()
  })

  it("[P4-MSG-18] moderation remove, warn, mute, suspend, and close are audited", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })
    const firstMessage = await sendText(
      t,
      "auth-teacher",
      conversationId,
      "Pesan pertama.",
    )
    const secondMessage = await sendText(
      t,
      "auth-teacher",
      conversationId,
      "Pesan kedua.",
    )
    const flagId = await as(t, "auth-student").mutation(
      api.messaging.reportMessage,
      { messageId: firstMessage, reason: "Pesan tidak pantas" },
    )

    expect(
      await errorCode(
        as(t, "auth-admin").mutation(api.messaging.moderateMessage, {
          conversationId,
          action: "warn",
          targetUserId: world.adminId,
          reason: "Peringatan untuk diri sendiri",
        }),
      ),
    ).toBe("SELF_DEALING")

    expect(
      await errorCode(
        as(t, "auth-admin").mutation(api.messaging.resolveFlag, {
          flagId,
          decision: "resolved",
          resolution: "singkat",
        }),
      ),
    ).toBe("REASON_REQUIRED")

    await as(t, "auth-admin").mutation(api.messaging.resolveFlag, {
      flagId,
      decision: "resolved",
      resolution: "Pesan dihapus setelah tinjauan.",
      removeMessage: true,
    })
    const removed = await t.run(async (ctx) => ctx.db.get(firstMessage))
    expect(removed?.removedBy).toBe(world.adminId)

    await as(t, "auth-admin").mutation(api.messaging.moderateMessage, {
      conversationId,
      action: "warn",
      targetUserId: world.teacherId,
      reason: "Peringatan pedoman percakapan",
    })
    const warning = await t.run(async (ctx) =>
      ctx.db
        .query("notificationOutbox")
        .withIndex("by_recipientId", (q) =>
          q.eq("recipientId", world.teacherId),
        )
        .collect(),
    )
    expect(warning.some((row) => row.template === "moderation.warning")).toBe(
      true,
    )

    await as(t, "auth-admin").mutation(api.messaging.moderateMessage, {
      conversationId,
      action: "mute",
      targetUserId: world.teacherId,
      reason: "Membisukan notifikasi sementara",
    })
    const mutedMember = await t.run(async (ctx) =>
      ctx.db
        .query("conversationMembers")
        .withIndex("by_conversation_user", (q) =>
          q.eq("conversationId", conversationId).eq("userId", world.teacherId),
        )
        .unique(),
    )
    expect(mutedMember?.mutedUntil).toBeGreaterThan(Date.now())

    await as(t, "auth-admin").mutation(api.messaging.moderateMessage, {
      conversationId,
      action: "suspend_messaging",
      targetUserId: world.teacherId,
      reason: "Pengiriman pesan berulang",
    })
    expect(
      await errorCode(
        as(t, "auth-teacher").mutation(api.messaging.sendMessage, {
          conversationId,
          kind: "text",
          body: "Masih mengirim.",
        }),
      ),
    ).toBe("MESSAGING_SUSPENDED")

    await as(t, "auth-admin").mutation(api.messaging.moderateMessage, {
      conversationId,
      action: "close_conversation",
      reason: "Percakapan ditutup untuk peninjauan",
    })
    const closed = await t.run(async (ctx) => ctx.db.get(conversationId))
    expect(closed?.status).toBe("archived")

    await as(t, "auth-admin").mutation(api.messaging.moderateMessage, {
      conversationId,
      action: "remove_message",
      messageId: secondMessage,
      reason: "Pesan kedua juga melanggar",
    })
    const secondRemoved = await t.run(async (ctx) => ctx.db.get(secondMessage))
    expect(typeof secondRemoved?.deletedAt).toBe("number")

    const audit = await auditActions(t)
    expect(audit).toContain("messaging.moderation.remove")
    expect(audit).toContain("messaging.moderation.warn")
    expect(audit).toContain("messaging.moderation.mute")
    expect(audit).toContain("messaging.moderation.suspend")
    expect(audit).toContain("messaging.moderation.close")
  })

  it("[P4-MSG-43] a suspended messaging account keeps read access", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })
    await sendText(t, "auth-teacher", conversationId, "Pesan untuk dibaca.")

    await t.run(async (ctx) =>
      ctx.db.insert("messagingRestrictions", {
        userId: world.studentId,
        actorId: world.adminId,
        reason: "Uji pembatasan",
        createdAt: NOW,
      }),
    )

    const readable = await as(t, "auth-student").query(
      api.messaging.listMessages,
      { conversationId },
    )
    expect(readable.messages).toHaveLength(1)
    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.messaging.sendMessage, {
          conversationId,
          kind: "text",
          body: "Tidak boleh terkirim.",
        }),
      ),
    ).toBe("MESSAGING_SUSPENDED")
  })
})

describe("conversation list metadata", () => {
  it("[P4-MSG-40] the list derives unread counts and last previews from records", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })
    const first = await sendText(
      t,
      "auth-teacher",
      conversationId,
      "Pesan pertama.",
    )
    await sendText(t, "auth-teacher", conversationId, "Pesan terakhir.")
    await as(t, "auth-student").mutation(api.messaging.markRead, {
      conversationId,
    })
    await sendText(t, "auth-teacher", conversationId, "Pesan baru setelah dibaca.")

    const list = await as(t, "auth-student").query(
      api.messaging.listConversations,
      {},
    )
    const summary = list.find((item) => item.id === conversationId)
    expect(summary?.unreadCount).toBe(1)
    expect(summary?.lastMessagePreview).toBe("Pesan baru setelah dibaca.")
    expect(summary?.messageCount).toBe(3)
    expect(first).toBeTruthy()
  })

  it("[P4-MSG-47] message history paginates inside one conversation", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })
    await sendText(t, "auth-student", conversationId, "Pesan satu.")
    await sendText(t, "auth-student", conversationId, "Pesan dua.")
    await sendText(t, "auth-student", conversationId, "Pesan tiga.")

    const first = await as(t, "auth-student").query(
      api.messaging.listMessagePage,
      {
        conversationId,
        paginationOpts: { numItems: 2, cursor: null },
      },
    )
    expect(first.page).toHaveLength(2)
    expect(first.page[0]?.body).toBe("Pesan tiga.")
    expect(first.isDone).toBe(false)

    const second = await as(t, "auth-student").query(
      api.messaging.listMessagePage,
      {
        conversationId,
        paginationOpts: { numItems: 2, cursor: first.continueCursor },
      },
    )
    expect(second.page).toHaveLength(1)
    expect(second.page[0]?.body).toBe("Pesan satu.")
    expect(second.isDone).toBe(true)

    const cursorPage = await as(t, "auth-student").query(
      api.messaging.listMessages,
      {
        conversationId,
        limit: 2,
        before: first.page[1]?.createdAt,
      },
    )
    expect(cursorPage.messages.map((item) => item.body)).toEqual(["Pesan satu."])
  })

  it("[P4-MSG-41] the schema indexes direct pairs and member lookups", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })
    const conversation = await t.run(async (ctx) => ctx.db.get(conversationId))
    expect(conversation?.pairKey).toBe(
      [world.studentId, world.teacherId].sort().join("|"),
    )
    const found = await t.run(async (ctx) =>
      ctx.db
        .query("conversations")
        .withIndex("by_pairKey", (q) =>
          q.eq("pairKey", conversation?.pairKey ?? ""),
        )
        .unique(),
    )
    expect(found?._id).toBe(conversationId)
  })

  it("[P4-MSG-42] admin metadata does not expose message bodies", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })
    void conversationId
    const studentCohort = await seedCohort(t, {
      teacherId: world.teacherId,
      code: "KOH-EXTRA",
    })
    await enroll(t, {
      studentId: world.studentId,
      cohortId: studentCohort,
    })
    const otherId = await as(t, "auth-teacher").mutation(
      api.messaging.startCohort,
      { cohortId: studentCohort },
    )
    const summary = (
      await as(t, "auth-admin").query(api.messaging.listConversations, {})
    ).find((item) => item.id === otherId)
    expect(summary?.lastMessagePreview).toBeNull()
  })
})
