import { describe, expect, it } from "vitest"

import { api } from "../../convex/_generated/api"
import {
  as,
  auditActions,
  createDb,
  errorCode,
  NOW,
  seedSetting,
  seedUser,
  seedWorld,
} from "./fixtures"

async function seedSession(
  t: ReturnType<typeof createDb>,
  input: { userId: Awaited<ReturnType<typeof seedUser>>; deviceName?: string },
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("sessions", {
      userId: input.userId,
      authSessionId: `session-${Math.random().toString(36).slice(2, 8)}`,
      deviceName: input.deviceName ?? "Chrome · Linux",
      userAgent: "test",
      createdAt: NOW,
      lastSeenAt: NOW,
      expiresAt: NOW + 86_400_000,
    }),
  )
}

describe("settings / profile and sessions", () => {
  it("[P6-SET-01] a user updates profile, preferences, consents, and own sessions", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const sessionId = await seedSession(t, { userId: world.studentId })
    const otherSession = await seedSession(t, {
      userId: world.outsiderId,
      deviceName: "Safari · iPhone",
    })

    await as(t, "auth-student").mutation(api.settings.updateProfile, {
      name: "Anisa Rahmawati",
      region: "Giriloyo, Yogyakarta",
    })
    await as(t, "auth-student").mutation(api.settings.updatePreferences, {
      whatsapp: "+62 812 0000 1111",
      bio: "Pengrajin batik tulis.",
      notifications: {
        tasks: true,
        messages: true,
        sessionReminders: false,
        weeklyDigest: true,
        promotions: false,
      },
    })
    await as(t, "auth-student").mutation(api.settings.setConsent, {
      kind: "recording",
      granted: true,
    })
    await as(t, "auth-student").mutation(api.settings.revokeSession, {
      sessionId,
      reason: "Perangkat lama tidak dipakai.",
    })

    const profile = await as(t, "auth-student").query(api.settings.profile, {})
    expect(profile.name).toBe("Anisa Rahmawati")
    expect(profile.region).toContain("Giriloyo")
    expect(profile.preferences.whatsapp).toBe("+62 812 0000 1111")
    expect(profile.preferences.notifications.sessionReminders).toBe(false)
    expect(profile.consents.some((item) => item.kind === "recording" && item.granted)).toBe(true)
    expect(profile.sessions.find((item) => item.id === sessionId)?.revokedAt).not.toBeNull()

    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.settings.revokeSession, {
          sessionId: otherSession,
        }),
      ),
    ).toBe("NOT_FOUND")
    expect(await auditActions(t)).toContain("settings.profile.update")
    expect(await auditActions(t)).toContain("settings.preferences.update")
  })
})

describe("settings / platform administration", () => {
  it("[P6-SET-02] platform settings update with audit and the revenue split is read-only", async () => {
    const t = createDb()
    await seedWorld(t)

    await as(t, "auth-admin").mutation(api.settings.updateSetting, {
      key: "platform.maintenance",
      value: { enabled: true, message: "Pemeliharaan singkat malam ini." },
      reason: "Pemeliharaan terjadwal.",
    })
    await as(t, "auth-admin").mutation(api.settings.updateSetting, {
      key: "platform.banner",
      value: { enabled: true, message: "Pendaftaran jalur baru dibuka." },
      reason: "Pengumuman jalur baru.",
    })

    const state = await as(t, "auth-admin").query(api.settings.adminState, {})
    expect(state.maintenance.enabled).toBe(true)
    expect(state.banner.enabled).toBe(true)
    expect(state.revenueSplit.editable).toBe(false)

    expect(
      await errorCode(
        as(t, "auth-admin").mutation(api.settings.updateSetting, {
          key: "platform.split.teacher",
          value: 80,
          reason: "Mencoba mengubah bagi hasil.",
        }),
      ),
    ).toBe("READ_ONLY_SETTING")

    expect(
      await errorCode(
        as(t, "auth-admin").mutation(api.settings.updateSetting, {
          key: "unknown.key",
          value: true,
          reason: "Kunci tidak dikenal.",
        }),
      ),
    ).toBe("UNKNOWN_SETTING")

    const actions = await auditActions(t)
    expect(actions).toContain("settings.platform.update")
  })

  it("[P6-GOV-10] feature flags are audited and gate release surfaces", async () => {
    const t = createDb()
    await seedWorld(t)

    await as(t, "auth-admin").mutation(api.settings.setFeatureFlag, {
      key: "calls",
      description: "Panggilan suara dan video.",
      enabled: false,
      rolloutPercent: 0,
      reason: "Menahan panggilan sampai uji LiveKit selesai.",
    })
    const state = await as(t, "auth-admin").query(api.settings.adminState, {})
    const flag = state.flags.find((item) => item.key === "calls")
    expect(flag?.enabled).toBe(false)
    expect(flag?.rolloutPercent).toBe(0)
    expect(await auditActions(t)).toContain("settings.flag.update")

    expect(
      await errorCode(
        as(t, "auth-admin").mutation(api.settings.setFeatureFlag, {
          key: "Bad Key",
          enabled: true,
          reason: "Kunci tidak sah.",
        }),
      ),
    ).toBe("INVALID_FLAG")
  })

  it("[P6-GOV-11] integration health is reported without secrets", async () => {
    const t = createDb()
    await seedWorld(t)
    await t.run(async (ctx) => {
      await ctx.db.insert("integrationHealth", {
        integration: "payment_gateway",
        status: "healthy",
        message: "Sesi provider valid.",
        latencyMs: 120,
        checkedAt: NOW,
      })
      await ctx.db.insert("integrationHealth", {
        integration: "whatsapp",
        status: "degraded",
        message: "Antrean pengiriman melambat.",
        checkedAt: NOW,
      })
    })

    const state = await as(t, "auth-admin").query(api.settings.adminState, {})
    const gateway = state.integrations.find(
      (item) => item.integration === "payment_gateway",
    )
    const whatsapp = state.integrations.find(
      (item) => item.integration === "whatsapp",
    )
    expect(gateway?.status).toBe("healthy")
    expect(whatsapp?.status).toBe("degraded")
    const serialized = JSON.stringify(state)
    expect(serialized).not.toContain("sessionToken")
    expect(serialized).not.toContain("secret")
  })
})

describe("settings / API keys, webhooks, templates", () => {
  it("[P6-GOV-12] API keys are scoped, rotatable, and the secret is shown once", async () => {
    const t = createDb()
    await seedWorld(t)
    const identity = as(t, "auth-admin")

    const created = await identity.mutation(api.settings.createApiKey, {
      name: "gateway-webhook",
      scopes: ["payments:write"],
      reason: "Integrasi gerbang pembayaran.",
    })
    expect(created.token.startsWith("kn_")).toBe(true)
    expect(created.keyPrefix).toBe(created.token.slice(0, 8))

    const state = await identity.query(api.settings.adminState, {})
    const metadata = state.apiKeys.find((item) => item.id === created.keyId)
    expect(metadata?.scopes).toEqual(["payments:write"])
    expect(JSON.stringify(metadata)).not.toContain(created.token)
    expect(JSON.stringify(state.apiKeys)).not.toContain("keyHash")

    const rotated = await identity.mutation(api.settings.rotateApiKey, {
      keyId: created.keyId,
      reason: "Rotasi rutin.",
    })
    expect(rotated.token).not.toBe(created.token)
    const afterRotate = await identity.query(api.settings.adminState, {})
    expect(
      afterRotate.apiKeys.find((item) => item.id === created.keyId)?.status,
    ).toBe("revoked")
    expect(
      afterRotate.apiKeys.find((item) => item.id === rotated.keyId)?.status,
    ).toBe("active")

    await identity.mutation(api.settings.revokeApiKey, {
      keyId: rotated.keyId,
      reason: "Integrasi dihentikan.",
    })
    const afterRevoke = await identity.query(api.settings.adminState, {})
    expect(
      afterRevoke.apiKeys.find((item) => item.id === rotated.keyId)?.status,
    ).toBe("revoked")
    const actions = await auditActions(t)
    expect(actions).toContain("settings.apiKey.create")
    expect(actions).toContain("settings.apiKey.rotate")
    expect(actions).toContain("settings.apiKey.revoke")
  })

  it("[P6-SET-03] webhook endpoints expose metadata only and reject private hosts", async () => {
    const t = createDb()
    await seedWorld(t)
    const identity = as(t, "auth-admin")

    expect(
      await errorCode(
        identity.mutation(api.settings.createWebhookEndpoint, {
          name: "Lokal",
          url: "https://127.0.0.1/hook",
          events: ["order.paid"],
        }),
      ),
    ).toBe("INVALID_URL")

    const created = await identity.mutation(
      api.settings.createWebhookEndpoint,
      {
        name: "Partner gudang",
        url: "https://hooks.example.test/kalanidhi",
        events: ["order.paid", "payout.paid"],
      },
    )
    expect(created.secret.startsWith("whsec_")).toBe(true)

    const state = await identity.query(api.settings.adminState, {})
    const endpoint = state.webhooks.find((item) => item.id === created.endpointId)
    expect(endpoint?.url).toBe("https://hooks.example.test/kalanidhi")
    expect(JSON.stringify(endpoint)).not.toContain(created.secret)
    expect(JSON.stringify(state.webhooks)).not.toContain("secretHash")

    await identity.mutation(api.settings.setWebhookStatus, {
      endpointId: created.endpointId,
      status: "paused",
      reason: "Partner meminta jeda.",
    })
    const afterPause = await identity.query(api.settings.adminState, {})
    expect(
      afterPause.webhooks.find((item) => item.id === created.endpointId)?.status,
    ).toBe("paused")
  })

  it("[P6-SET-04] notification templates save, list, and audit without secrets", async () => {
    const t = createDb()
    await seedWorld(t)
    const identity = as(t, "auth-admin")

    await identity.mutation(api.settings.saveNotificationTemplate, {
      key: "support.reply",
      channel: "in_app",
      subject: "Balasan dukungan",
      body: "Tim dukungan sudah membalas tiket Anda.",
    })
    const state = await identity.query(api.settings.adminState, {})
    const template = state.templates.find(
      (item) => item.key === "support.reply",
    )
    expect(template?.channel).toBe("in_app")
    expect(template?.subject).toBe("Balasan dukungan")
    expect(await auditActions(t)).toContain("settings.template.save")
  })

  it("[P6-SET-05] SLA thresholds and regions are exposed as admin settings", async () => {
    const t = createDb()
    await seedWorld(t)
    await seedSetting(t, "platform.regions", ["Yogyakarta", "Jawa Tengah"])
    await seedSetting(t, "platform.timezone", "Asia/Jakarta")
    await as(t, "auth-admin").mutation(api.flows.saveSlaPolicy, {
      flowKey: "support",
      name: "Respons dukungan",
      targetMinutes: 90,
    })

    const state = await as(t, "auth-admin").query(api.settings.adminState, {})
    expect(state.regions).toEqual(["Yogyakarta", "Jawa Tengah"])
    expect(state.timezone).toBe("Asia/Jakarta")
    expect(
      state.slas.find((item) => item.flowKey === "support")?.targetMinutes,
    ).toBe(90)
  })
})
