import { afterEach, describe, expect, it, vi } from "vitest"

import { api, internal } from "../../convex/_generated/api"
import {
  as,
  createDb,
  errorCode,
  NOW,
  seedWorld,
} from "./helpers"
import {
  createChargeForCheckout,
  createCheckout,
  createTestDb,
  seedPublishedWork,
  seedSeller,
  settleViaWebhook,
} from "../phase-3/helpers"

const ENV_KEYS = [
  "EMAIL_PROVIDER_URL",
  "WHATSAPP_PROVIDER_URL",
  "PUSH_PROVIDER_URL",
  "NOTIFICATION_WEBHOOK_URL",
  "WEBHOOK_SIGNING_SECRET",
] as const

const originalEnv = new Map<string, string | undefined>()

function clearProviderEnv() {
  for (const key of ENV_KEYS) {
    if (!originalEnv.has(key)) originalEnv.set(key, process.env[key])
    delete process.env[key]
  }
}

afterEach(() => {
  for (const [key, value] of originalEnv) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  originalEnv.clear()
  vi.unstubAllGlobals()
})

async function seedEndpoint(
  t: ReturnType<typeof createDb>,
  events: string[] = ["order.paid"],
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("webhookEndpoints", {
      name: "Partner uji",
      url: "https://hooks.example.test/kalanidhi",
      secretHash: "hashed-secret",
      events,
      status: "active",
      createdBy: "system",
      createdAt: NOW,
      updatedAt: NOW,
    }),
  )
}

describe("notification dispatcher", () => {
  it("[P4-DSP-01] an unconfigured email provider fails honestly", async () => {
    clearProviderEnv()
    const t = createDb()
    const world = await seedWorld(t)
    const id = await t.run(async (ctx) =>
      ctx.db.insert("notificationOutbox", {
        channel: "email",
        recipient: "student@example.test",
        recipientId: world.studentId,
        template: "welcome",
        payload: {},
        status: "pending",
        attempts: 0,
        scheduledAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    )

    const result = await t.action(internal.notifications.processOutbox, {})
    expect(result.outbox.failed).toBe(1)

    const row = await t.run(async (ctx) => ctx.db.get(id))
    expect(row?.status).toBe("failed")
    expect(row?.attempts).toBe(1)
    expect(row?.error).toContain("Provider email belum dikonfigurasi.")
  })

  it("[P4-DSP-02] a pending in-app row is marked sent and stays readable", async () => {
    clearProviderEnv()
    const t = createDb()
    const world = await seedWorld(t)
    const id = await t.run(async (ctx) =>
      ctx.db.insert("notificationOutbox", {
        channel: "in_app",
        recipient: "student@example.test",
        recipientId: world.studentId,
        template: "manual",
        payload: {},
        status: "pending",
        attempts: 0,
        scheduledAt: NOW,
        title: "Pemberitahuan uji",
        body: "Isi pemberitahuan.",
        createdAt: NOW,
        updatedAt: NOW,
      }),
    )

    const result = await t.action(internal.notifications.processOutbox, {})
    expect(result.outbox.sent).toBe(1)

    const row = await t.run(async (ctx) => ctx.db.get(id))
    expect(row?.status).toBe("sent")
    expect(row?.sentAt).toBeTypeOf("number")

    const list = await as(t, "auth-student").query(api.notifications.list, {})
    expect(list.some((item) => item.id === id)).toBe(true)
  })

  it("[P4-DSP-07] a configured notification webhook sends email rows", async () => {
    clearProviderEnv()
    process.env.NOTIFICATION_WEBHOOK_URL = "https://notify.example.test/send"
    const t = createDb()
    const world = await seedWorld(t)
    const id = await t.run(async (ctx) =>
      ctx.db.insert("notificationOutbox", {
        channel: "email",
        recipient: "student@example.test",
        recipientId: world.studentId,
        template: "welcome",
        payload: { name: "Anisa" },
        status: "pending",
        attempts: 0,
        scheduledAt: NOW,
        title: "Selamat datang",
        body: "Halo Anisa.",
        createdAt: NOW,
        updatedAt: NOW,
      }),
    )
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 })
    vi.stubGlobal("fetch", fetchMock)

    const result = await t.action(internal.notifications.processOutbox, {})
    expect(result.outbox.sent).toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://notify.example.test/send")
    const body = JSON.parse(init.body as string) as Record<string, unknown>
    expect(body.channel).toBe("email")
    expect(body.recipient).toBe("student@example.test")

    const row = await t.run(async (ctx) => ctx.db.get(id))
    expect(row?.status).toBe("sent")
  })

  it("[P4-DSP-03] a due webhook delivery is signed and marked delivered", async () => {
    clearProviderEnv()
    process.env.WEBHOOK_SIGNING_SECRET = "test-signing-secret"
    const t = createDb()
    await seedWorld(t)
    const endpointId = await seedEndpoint(t)
    const deliveryId = await t.run(async (ctx) =>
      ctx.db.insert("webhookDeliveries", {
        endpointId,
        eventId: "evt-1",
        event: "order.paid",
        url: "https://hooks.example.test/kalanidhi",
        status: "pending",
        attempts: 0,
        nextAttemptAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    )
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal("fetch", fetchMock)

    const result = await t.action(internal.notifications.processOutbox, {})
    expect(result.deliveries.delivered).toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://hooks.example.test/kalanidhi")
    const headers = init.headers as Record<string, string>
    expect(headers["x-kalanidhi-signature"]).toMatch(/^sha256=[0-9a-f]{64}$/)
    expect(headers["x-kalanidhi-event"]).toBe("order.paid")

    const row = await t.run(async (ctx) => ctx.db.get(deliveryId))
    expect(row?.status).toBe("delivered")
    expect(row?.attempts).toBe(1)
    expect(row?.responseStatus).toBe(200)
  })

  it("[P4-DSP-04] a fifth failed attempt marks the delivery dead", async () => {
    clearProviderEnv()
    process.env.WEBHOOK_SIGNING_SECRET = "test-signing-secret"
    const t = createDb()
    await seedWorld(t)
    const deliveryId = await t.run(async (ctx) =>
      ctx.db.insert("webhookDeliveries", {
        eventId: "evt-dead",
        event: "order.paid",
        url: "https://hooks.example.test/kalanidhi",
        status: "pending",
        attempts: 4,
        nextAttemptAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    )
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    )

    const result = await t.action(internal.notifications.processOutbox, {})
    expect(result.deliveries.dead).toBe(1)

    const row = await t.run(async (ctx) => ctx.db.get(deliveryId))
    expect(row?.status).toBe("dead")
    expect(row?.attempts).toBe(5)
    expect(row?.nextAttemptAt).toBeUndefined()
  })

  it("[P4-DSP-05] settlement enqueues a pending delivery for subscribed endpoints", async () => {
    clearProviderEnv()
    const t = createTestDb()
    const seller = await seedSeller(t, { authUserId: "auth-dispatch-seller" })
    const workId = await seedPublishedWork(t, {
      makerId: seller.userId,
      price: 1_450_000,
    })
    const checkout = await createCheckout(t, { workId })
    const charge = await createChargeForCheckout(t, checkout, 37)
    await seedEndpoint(t)

    await settleViaWebhook(t, {
      chargeId: charge.chargeId,
      orderCode: charge.code,
      amount: charge.uniqueAmount,
      paidAt: charge.paymentCreatedAt + 1_000,
    })

    const rows = await t.run(async (ctx) =>
      ctx.db.query("webhookDeliveries").collect(),
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]?.event).toBe("order.paid")
    expect(rows[0]?.status).toBe("pending")
    expect(rows[0]?.endpointId).toBeTruthy()
  })

  it("[P4-DSP-06] delivery history is admin-only and includes endpoint names", async () => {
    clearProviderEnv()
    const t = createDb()
    await seedWorld(t)
    const endpointId = await seedEndpoint(t)
    await t.run(async (ctx) =>
      ctx.db.insert("webhookDeliveries", {
        endpointId,
        eventId: "evt-list",
        event: "order.paid",
        url: "https://hooks.example.test/kalanidhi",
        status: "delivered",
        attempts: 1,
        responseStatus: 200,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    )

    expect(
      await errorCode(
        as(t, "auth-student").query(api.notifications.listDeliveries, {}),
      ),
    ).toBe("FORBIDDEN")

    const rows = await as(t, "auth-admin").query(
      api.notifications.listDeliveries,
      {},
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]?.endpointName).toBe("Partner uji")
    expect(rows[0]?.responseStatus).toBe(200)
  })
})
