import { v } from "convex/values"

import { FLOW_SPECS } from "../../../lib/flows/definitions"
import { internalMutation } from "../../_generated/server"
import { createSeedClock } from "../lib/clock"
import { sha256 } from "../lib/hash"
import { seedAdmin, userByEmail } from "../lib/lookup"
import { seedEmail } from "../content/identities"

export const seedSettings = internalMutation({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const clock = createSeedClock(args.now)
    const admin = await seedAdmin(ctx)
    const sari = await userByEmail(ctx, seedEmail("sari"))
    const bambang = await userByEmail(ctx, seedEmail("bambang"))
    const anisa = await userByEmail(ctx, seedEmail("anisa"))

    const settings = [
      {
        key: "platform.maintenance",
        value: { enabled: false, message: "" },
      },
      {
        key: "platform.banner",
        value: {
          enabled: true,
          message:
            "Pendaftaran angkatan baru Batik Bambu dan Aksara Jawa dibuka sampai 30 November.",
        },
      },
      {
        key: "platform.regions",
        value: ["DI Yogyakarta"],
      },
      { key: "platform.timezone", value: "Asia/Jakarta" },
      {
        key: "platform.uploadLimits",
        value: { maxAssetBytes: 26_214_400, maxAssetsPerSubmission: 5 },
      },
      { key: "support.firstResponseMinutes", value: 240 },
      { key: "messaging.retentionDays", value: 365 },
    ]
    for (const setting of settings) {
      await ctx.db.insert("settings", {
        key: setting.key,
        value: setting.value,
        updatedBy: admin._id,
        updatedAt: clock.now,
      })
    }

    for (const user of [admin, sari, bambang, anisa]) {
      await ctx.db.insert("settings", {
        key: `profile.preferences.${user._id}`,
        value: {
          whatsapp: user.phone,
          bio:
            user._id === admin._id
              ? "Mengelola operasional platform di Kota Yogyakarta."
              : "Praktisi budaya di Daerah Istimewa Yogyakarta.",
          locale: "id",
          timezone: "Asia/Jakarta",
          dataSaver: false,
          notifications: {
            tasks: true,
            messages: true,
            sessionReminders: true,
            weeklyDigest: user._id === admin._id,
            promotions: false,
          },
        },
        updatedBy: user._id,
        updatedAt: clock.now,
      })
    }

    const flags = [
      {
        key: "seller_tools",
        description: "Alat penjual untuk mengelola karya dan payout.",
        enabled: true,
        rolloutPercent: 100,
      },
      {
        key: "live_calls",
        description: "Panggilan suara dan video di ruang kerja.",
        enabled: true,
        rolloutPercent: 100,
      },
      {
        key: "whatsapp_verification",
        description: "Verifikasi akun melalui pesan WhatsApp.",
        enabled: true,
        rolloutPercent: 100,
      },
      {
        key: "institution_portal",
        description: "Portal institusi untuk memantau peserta.",
        enabled: false,
        rolloutPercent: 0,
      },
      {
        key: "content_preview",
        description: "Pratinjau revisi konten sebelum terbit.",
        enabled: true,
        rolloutPercent: 50,
      },
      {
        key: "payout_auto_release",
        description: "Pelepasan payout otomatis setelah masa tahan.",
        enabled: false,
        rolloutPercent: 0,
      },
    ]
    for (const flag of flags) {
      await ctx.db.insert("featureFlags", {
        key: flag.key,
        description: flag.description,
        enabled: flag.enabled,
        rolloutPercent: flag.rolloutPercent,
        updatedBy: admin._id,
        updatedAt: clock.now,
      })
    }

    const integrations = [
      {
        integration: "payment_gateway" as const,
        status: "healthy" as const,
        message: "GoPay QRIS merespons normal.",
        latencyMs: 180,
      },
      {
        integration: "email" as const,
        status: "degraded" as const,
        message: "Provider email belum dikonfigurasi.",
        latencyMs: undefined,
      },
      {
        integration: "whatsapp" as const,
        status: "healthy" as const,
        message: "Sesi WAHA kalanidhi aktif.",
        latencyMs: 240,
      },
      {
        integration: "livekit" as const,
        status: "healthy" as const,
        message: "Server media dan TURN merespons.",
        latencyMs: 95,
      },
      {
        integration: "storage" as const,
        status: "healthy" as const,
        message: "Penyimpanan Convex tersedia.",
        latencyMs: 60,
      },
    ]
    for (const integration of integrations) {
      await ctx.db.insert("integrationHealth", {
        integration: integration.integration,
        status: integration.status,
        message: integration.message,
        latencyMs: integration.latencyMs,
        checkedAt: clock.ago(0),
      })
    }

    const templates = [
      {
        key: "welcome",
        channel: "email" as const,
        subject: "Selamat datang di KalaNidhi Digital",
        body: "Halo {{name}}, akunmu sudah dibuat. Lengkapi profil dan verifikasi WhatsApp untuk mulai belajar.",
      },
      {
        key: "verification",
        channel: "whatsapp" as const,
        subject: undefined,
        body: "Kode verifikasi KalaNidhi, {{token}}. Berlaku 15 menit.",
      },
      {
        key: "order.paid",
        channel: "email" as const,
        subject: "Pesanan {{code}} diterima",
        body: "Pembayaran pesanan {{code}} sudah kami terima. Penjual akan menyiapkan karyamu.",
      },
      {
        key: "submission.graded",
        channel: "in_app" as const,
        subject: undefined,
        body: "Tugas {{task}} sudah dinilai. Buka ruang tugas untuk membaca catatan pengajar.",
      },
      {
        key: "payout.released",
        channel: "email" as const,
        subject: "Payout {{reference}} sudah dikirim",
        body: "Payout sebesar {{amount}} sudah dikirim ke rekening terverifikasi.",
      },
      {
        key: "support.reply",
        channel: "in_app" as const,
        subject: undefined,
        body: "Ada balasan baru pada tiket {{code}}.",
      },
      {
        key: "call.missed",
        channel: "push" as const,
        subject: undefined,
        body: "Panggilan dari {{name}} tidak terjawab.",
      },
    ]
    for (const template of templates) {
      await ctx.db.insert("notificationTemplates", {
        key: template.key,
        channel: template.channel,
        subject: template.subject,
        body: template.body,
        locale: "id",
        updatedAt: clock.now,
      })
    }

    const apiKeys = [
      {
        name: "Gateway pembayaran",
        token: "seed-gateway-key",
        scopes: ["payments.write", "orders.read"],
        status: "active" as const,
        prefix: "kn_live_",
        daysAgo: 60,
      },
      {
        name: "Integrasi sekolah",
        token: "seed-school-key",
        scopes: ["leads.write"],
        status: "active" as const,
        prefix: "kn_sch_",
        daysAgo: 30,
      },
      {
        name: "Kunci lama",
        token: "seed-old-key",
        scopes: ["orders.read"],
        status: "revoked" as const,
        prefix: "kn_old_",
        daysAgo: 120,
      },
    ]
    for (const key of apiKeys) {
      await ctx.db.insert("apiKeys", {
        name: key.name,
        keyHash: await sha256(key.token),
        scopes: key.scopes,
        status: key.status,
        createdBy: admin._id,
        createdAt: clock.ago(key.daysAgo),
        lastUsedAt: key.status === "active" ? clock.ago(1) : undefined,
        expiresAt: key.status === "active" ? clock.ahead(180) : undefined,
        revokedAt: key.status === "revoked" ? clock.ago(20) : undefined,
        keyPrefix: key.prefix,
      })
    }

    const allKeys = await ctx.db.query("apiKeys").collect()
    const gatewayKey = allKeys.find(
      (key) => key.name === "Gateway pembayaran",
    )
    if (gatewayKey) {
      const previousKeyId = await ctx.db.insert("apiKeys", {
        name: "Gateway pembayaran (lama)",
        keyHash: await sha256("seed-gateway-key-previous"),
        scopes: ["payments.write", "orders.read"],
        status: "revoked",
        createdBy: admin._id,
        createdAt: clock.ago(200),
        lastUsedAt: clock.ago(61),
        expiresAt: clock.ago(60),
        revokedAt: clock.ago(60),
        keyPrefix: "kn_old_",
        rotatedTo: gatewayKey._id,
      })
      await ctx.db.patch(gatewayKey._id, { rotatedFrom: previousKeyId })
    }

    const endpoints = [
      {
        name: "Gateway pembayaran",
        url: "https://payments.kalanidhi.site/webhooks/kalanidhi",
        secret: "seed-webhook-gateway",
        events: ["order.paid", "payment.settled", "refund.paid"],
        status: "active" as const,
      },
      {
        name: "Notifikasi internal",
        url: "https://ops.kalanidhi.site/hooks/kalanidhi",
        secret: "seed-webhook-ops",
        events: ["support.created", "work.published"],
        status: "paused" as const,
      },
    ]
    for (const endpoint of endpoints) {
      await ctx.db.insert("webhookEndpoints", {
        name: endpoint.name,
        url: endpoint.url,
        secretHash: await sha256(endpoint.secret),
        events: endpoint.events,
        status: endpoint.status,
        createdBy: admin._id,
        createdAt: clock.ago(60),
        updatedAt: clock.now,
      })
    }

    for (const spec of Object.values(FLOW_SPECS)) {
      await ctx.db.insert("flowDefinitions", {
        key: spec.key,
        name: spec.name,
        owner: spec.owner,
        description: spec.description,
        version: 1,
        active: true,
        updatedAt: clock.now,
      })
      for (const transition of spec.transitions) {
        await ctx.db.insert("flowTransitions", {
          flowKey: spec.key,
          fromState: transition.from,
          toState: transition.to,
          guard: transition.guard,
          slaHours: transition.slaHours,
          requiresRole: transition.requiresRole,
          createdAt: clock.now,
        })
      }
      await ctx.db.insert("slaPolicies", {
        key: spec.sla.key,
        flowKey: spec.key,
        name: spec.sla.name,
        targetMinutes: spec.sla.targetMinutes,
        escalationMinutes: spec.sla.escalationMinutes,
        owner: spec.sla.owner,
        active: true,
        updatedAt: clock.now,
      })
      for (const automation of spec.automations) {
        await ctx.db.insert("automationRules", {
          key: automation.key,
          flowKey: spec.key,
          kind: automation.kind,
          trigger: automation.trigger,
          action: automation.action,
          enabled: automation.enabled,
          updatedAt: clock.now,
        })
      }
    }

    return { settings: settings.length, flows: Object.keys(FLOW_SPECS).length }
  },
})

