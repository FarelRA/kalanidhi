import { readFile } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { api } from "../../convex/_generated/api"
import {
  as,
  createDb,
  errorCode,
  seedWorld,
  sendText,
} from "./helpers"

describe("in-app notifications", () => {
  it("[P4-NOT-01] a new message creates an unread in-app record for the other member", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })
    await sendText(t, "auth-student", conversationId, "Kain sudah selesai.")

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("notificationOutbox")
        .withIndex("by_recipientId", (q) =>
          q.eq("recipientId", world.teacherId),
        )
        .collect(),
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]?.channel).toBe("in_app")
    expect(rows[0]?.status).toBe("sent")
    expect(rows[0]?.template).toBe("message.new")
    expect(rows[0]?.title).toContain("Pesan")

    const unread = await as(t, "auth-teacher").query(
      api.notifications.unreadCount,
      {},
    )
    expect(unread).toBe(1)

    const list = await as(t, "auth-teacher").query(api.notifications.list, {})
    expect(list).toHaveLength(1)
    expect(list[0]?.conversationId).toBe(conversationId)
    expect(list[0]?.readAt).toBeNull()
  })

  it("[P4-NOT-02] mark read is scoped to the recipient", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })
    await sendText(t, "auth-student", conversationId, "Pesan pertama.")
    const notification = (
      await as(t, "auth-teacher").query(api.notifications.list, {})
    )[0]
    expect(notification).toBeTruthy()

    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.notifications.markRead, {
          notificationId: notification?.id as never,
        }),
      ),
    ).toBe("NOT_FOUND")

    await as(t, "auth-teacher").mutation(api.notifications.markRead, {
      notificationId: notification?.id as never,
    })
    expect(
      await as(t, "auth-teacher").query(api.notifications.unreadCount, {}),
    ).toBe(0)
  })

  it("[P4-NOT-03] mark all read clears only the viewer's unread records", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startDirect, {
      peerUserId: world.teacherId,
    })
    await sendText(t, "auth-student", conversationId, "Satu.")
    await sendText(t, "auth-student", conversationId, "Dua.")

    const marked = await as(
      t,
      "auth-teacher",
    ).mutation(api.notifications.markAllRead, {})
    expect(marked).toBe(2)
    expect(
      await as(t, "auth-teacher").query(api.notifications.unreadCount, {}),
    ).toBe(0)
    expect(
      await as(t, "auth-student").query(api.notifications.unreadCount, {}),
    ).toBe(0)
  })

  it("[P4-NOT-04] a support reply notifies the requester", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const supportId = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.startSupport, {})
    await as(t, "auth-admin").mutation(
      api.messaging.joinSupport,
      { conversationId: supportId, reason: "Permintaan dukungan pengguna" },
    )
    await as(t, "auth-admin").mutation(api.messaging.sendMessage, {
      conversationId: supportId,
      kind: "text",
      body: "Kami sudah meninjau permintaanmu.",
    })

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("notificationOutbox")
        .withIndex("by_recipientId", (q) =>
          q.eq("recipientId", world.studentId),
        )
        .collect(),
    )
    expect(rows.some((row) => row.template === "support.reply")).toBe(true)
    const unread = await as(t, "auth-student").query(
      api.notifications.unreadCount,
      {},
    )
    expect(unread).toBeGreaterThanOrEqual(1)
  })

  it("[P4-NOT-05] notifications stay in-app; no email or WhatsApp provider is used", async () => {
    const source = await readFile(
      path.join(process.cwd(), "convex/notifications.ts"),
      "utf8",
    )
    expect(source).not.toMatch(/fetch\(/)
    expect(source).not.toMatch(/channel:\s*"whatsapp"/i)
    expect(source).not.toMatch(/resend|postmark|ses\b/i)
  })
})
