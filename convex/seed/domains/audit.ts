import { v } from "convex/values"

import { internalMutation } from "../../_generated/server"
import {
  certificatePublicCode,
  evidenceCode,
  orderCode,
  workSlug,
} from "../lib/codes"
import { createSeedClock } from "../lib/clock"
import {
  certificateByCode,
  orderByCode,
  seedAdmin,
  submissionByCode,
  userByEmail,
  workBySlug,
} from "../lib/lookup"
import { seedEmail } from "../content/identities"

export const seedAudit = internalMutation({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const clock = createSeedClock(args.now)
    const admin = await seedAdmin(ctx)
    const bambang = await userByEmail(ctx, seedEmail("bambang"))
    const sri = await userByEmail(ctx, seedEmail("sri"))
    const sari = await userByEmail(ctx, seedEmail("sari"))
    const anisa = await userByEmail(ctx, seedEmail("anisa"))
    const order1 = await orderByCode(ctx, orderCode("order1"))
    const work = await workBySlug(ctx, workSlug("nampanBatikBambu"))
    const certificate = await certificateByCode(ctx, certificatePublicCode("anisa"))
    const aksaraCertificate = await certificateByCode(ctx, certificatePublicCode("galuh"))
    const suwardi = await userByEmail(ctx, seedEmail("suwardi"))
    const submission = await submissionByCode(ctx, evidenceCode("sariBbm1"))
    const payoutForOrder1 = (
      await ctx.db
        .query("payouts")
        .withIndex("by_orderId", (q) => q.eq("orderId", order1._id))
        .collect()
    )[0]
    const impersonation = (
      await ctx.db.query("impersonationSessions").collect()
    )[0]
    const ticket = (
      await ctx.db
        .query("supportTickets")
        .withIndex("by_code", (q) => q.eq("code", "SUP-2026-0003"))
        .unique()
    )
    const takedown = (
      await ctx.db
        .query("takedownRequests")
        .withIndex("by_code", (q) => q.eq("code", "TD-2026-0002"))
        .unique()
    )

    const events = [
      {
        actorId: admin._id,
        actorRole: "Pengelola",
        action: "platform.launch",
        entityType: "siteContent",
        entityId: "site",
        reason:
          "Rilis perdana KalaNidhi Digital untuk wilayah Daerah Istimewa Yogyakarta.",
        severity: "info" as const,
        daysAgo: 400,
      },
      {
        actorId: admin._id,
        actorRole: "Pengelola",
        action: "users.provision",
        entityType: "users",
        entityId: sari._id,
        reason: "Pendaftaran peserta melalui landing.",
        severity: "info" as const,
        daysAgo: 180,
      },
      {
        actorId: admin._id,
        actorRole: "Pengelola",
        action: "users.setRoles",
        entityType: "users",
        entityId: bambang._id,
        reason: "Verifikasi pengajar batik tulis Giriloyo.",
        severity: "info" as const,
        daysAgo: 395,
        before: { roles: ["student"] },
        after: { roles: ["teacher"] },
      },
      {
        actorId: admin._id,
        actorRole: "Pengelola",
        action: "content.publish",
        entityType: "siteContent",
        entityId: "site",
        reason: "Pembaruan konten landing edisi 2026.",
        severity: "info" as const,
        daysAgo: 60,
        before: { version: 1 },
        after: { version: 2 },
      },
      {
        actorId: sri._id,
        actorRole: "Pengajar",
        action: "assessments.grade",
        entityType: "submissions",
        entityId: submission._id,
        reason: "Penilaian tugas canting pertama.",
        severity: "info" as const,
        daysAgo: 18,
      },
      {
        actorId: admin._id,
        actorRole: "Pengelola",
        action: "certificates.issue",
        entityType: "certificates",
        entityId: certificate._id,
        reason: "Penerbitan sertifikat angkatan perintis.",
        severity: "info" as const,
        daysAgo: 330,
        after: {
          serial: certificate.serial,
          publicCode: certificate.publicCode,
          issuedAt: certificate.issuedAt,
        },
      },
      {
        actorId: admin._id,
        actorRole: "Pengelola",
        action: "commerce.publishWork",
        entityType: "works",
        entityId: work._id,
        reason: "Karya lulusan lolos peninjauan Kartu Karya.",
        severity: "info" as const,
        daysAgo: 300,
      },
      {
        actorId: admin._id,
        actorRole: "Pengelola",
        action: "payments.settle",
        entityType: "orders",
        entityId: order1._id,
        reason: "Pembayaran QRIS cocok dengan nominal unik.",
        severity: "info" as const,
        daysAgo: 24,
        before: { status: "awaiting_payment" },
        after: { status: "paid" },
      },
      {
        actorId: admin._id,
        actorRole: "Pengelola",
        action: "payouts.approve",
        entityType: "payouts",
        entityId: payoutForOrder1?._id,
        reason: "Payout disetujui setelah pesanan selesai.",
        severity: "info" as const,
        daysAgo: 10,
      },
      {
        actorId: admin._id,
        actorRole: "Pengelola",
        action: "support.resolve",
        entityType: "supportTickets",
        entityId: ticket?._id,
        reason: "Sertifikat disinkronkan dan dikonfirmasi pemohon.",
        severity: "info" as const,
        daysAgo: 5,
      },
      {
        actorId: admin._id,
        actorRole: "Pengelola",
        action: "governance.takedown",
        entityType: "takedownRequests",
        entityId: takedown?._id,
        reason: "Aset lama diarsipkan setelah penggantian foto berizin.",
        severity: "warning" as const,
        daysAgo: 15,
      },
      {
        actorId: admin._id,
        actorRole: "Pengelola",
        action: "governance.impersonation",
        entityType: "impersonationSessions",
        entityId: impersonation?._id,
        reason: "Menelusuri kendala unggah tugas.",
        severity: "warning" as const,
        daysAgo: 3,
      },
      {
        actorId: admin._id,
        actorRole: "Pengelola",
        action: "settings.featureFlag",
        entityType: "featureFlags",
        entityId: "seller_tools",
        reason: "Mengaktifkan alat penjual untuk seluruh akun terverifikasi.",
        severity: "info" as const,
        daysAgo: 50,
      },
      {
        actorId: anisa._id,
        actorRole: "Peserta",
        action: "works.submit",
        entityType: "works",
        entityId: work._id,
        reason: "Pengajuan Kartu Karya untuk nampan batik bambu.",
        severity: "info" as const,
        daysAgo: 318,
      },
      {
        actorId: sari._id,
        actorRole: "Peserta",
        action: "submissions.submit",
        entityType: "submissions",
        entityId: submission._id,
        reason: "Mengirim tugas canting pertama.",
        severity: "info" as const,
        daysAgo: 20,
      },
      {
        actorId: admin._id,
        actorRole: "Pengelola",
        action: "users.setRoles",
        entityType: "users",
        entityId: suwardi._id,
        reason: "Verifikasi pengajar aksara Jawa, Kota Yogyakarta.",
        severity: "info" as const,
        daysAgo: 259,
        before: { roles: ["student"] },
        after: { roles: ["teacher"] },
      },
      {
        actorId: admin._id,
        actorRole: "Pengelola",
        action: "certificates.issue",
        entityType: "certificates",
        entityId: aksaraCertificate._id,
        reason: "Penerbitan sertifikat jalur Aksara Jawa angkatan 1.",
        severity: "info" as const,
        daysAgo: 110,
        after: {
          serial: aksaraCertificate.serial,
          publicCode: aksaraCertificate.publicCode,
          issuedAt: aksaraCertificate.issuedAt,
        },
      },
    ]

    for (const event of events) {
      await ctx.db.insert("auditLogs", {
        actorId: event.actorId,
        actorRole: event.actorRole,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        reason: event.reason,
        severity: event.severity,
        before: "before" in event ? event.before : undefined,
        after: "after" in event ? event.after : undefined,
        createdAt: clock.ago(event.daysAgo),
      })
    }

    return { auditLogs: events.length }
  },
})
