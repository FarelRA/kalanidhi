import { v } from "convex/values"

import { internalMutation } from "../../_generated/server"
import {
  certificatePublicCode,
  cohortCode,
  evidenceCode,
  workSlug,
} from "../lib/codes"
import { createSeedClock } from "../lib/clock"
import {
  certificateByCode,
  orderByIdempotency,
  seedAdmin,
  submissionByCode,
  userByEmail,
  workBySlug,
} from "../lib/lookup"
import { seedEmail, seedPhone } from "../content/identities"

export const seedOps = internalMutation({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const clock = createSeedClock(args.now)
    const admin = await seedAdmin(ctx)
    const sari = await userByEmail(ctx, seedEmail("sari"))
    const sri = await userByEmail(ctx, seedEmail("sri"))
    const arif = await userByEmail(ctx, seedEmail("arif"))
    const dwi = await userByEmail(ctx, seedEmail("dwi"))
    const anisa = await userByEmail(ctx, seedEmail("anisa"))
    const rani = await userByEmail(ctx, seedEmail("rani"))
    const purnomo = await userByEmail(ctx, seedEmail("purnomo"))
    const order1 = await orderByIdempotency(ctx, "seed-idem-order-1")
    const order3 = await orderByIdempotency(ctx, "seed-idem-order-3")
    const order9 = await orderByIdempotency(ctx, "seed-idem-order-9")
    const payoutForOrder1 = (
      await ctx.db
        .query("payouts")
        .withIndex("by_orderId", (q) => q.eq("orderId", order1._id))
        .collect()
    )[0]
    const paymentForOrder1 = (
      await ctx.db
        .query("payments")
        .withIndex("by_orderId", (q) => q.eq("orderId", order1._id))
        .collect()
    )[0]
    const raniConversation = (
      await ctx.db.query("conversations").collect()
    ).find((item) => item.title === "Pranatacara, jadwal siraman")
    const missedCall = (await ctx.db.query("callSessions").collect()).find(
      (item) => item.status === "missed",
    )
    const submission = await submissionByCode(ctx, evidenceCode("dwiBbm2"))
    const certificate = await certificateByCode(ctx, certificatePublicCode("anisa"))
    const aksaraCertificate = await certificateByCode(ctx, certificatePublicCode("galuh"))
    const galuh = await userByEmail(ctx, seedEmail("galuh"))
    const work = await workBySlug(ctx, workSlug("hiasanDindingBatikBambu"))
    const anisaWork = await workBySlug(ctx, workSlug("nampanBatikBambu"))

    const leads = [
      {
        intent: "student" as const,
        name: "Ayu Sekar Melati",
        email: "ayu.sekar.melati96@gmail.com",
        whatsapp: "6281392847506",
        interest: "Batik Bambu",
        message:
          "Saya ingin mulai dari kelas pemula. Apakah angkatan Oktober masih ada tempat?",
        source: "landing",
        status: "new" as const,
        daysAgo: 1,
      },
      {
        intent: "student" as const,
        name: "Rina Kusumawati",
        email: "rina.kusumawati88@gmail.com",
        whatsapp: "6281392847506",
        interest: "Pranatacara Jawa",
        message:
          "Saya sudah pernah membantu acara keluarga di Sleman, ingin belajar susunan acara yang lebih rapi.",
        source: "instagram",
        status: "contacted" as const,
        daysAgo: 4,
      },
      {
        intent: "institution" as const,
        name: "Dwi Lestari",
        email: seedEmail("dwi"),
        whatsapp: seedPhone("dwi"),
        institution: "SD Negeri Mlati 2, Sleman",
        institutionType: "Sekolah dasar",
        participants: 28,
        interest: "Muatan lokal batik",
        message:
          "Kami butuh program 6 pekan untuk kelas 5 dan 6, jadwal Jumat siang.",
        source: "referral",
        status: "qualified" as const,
        daysAgo: 8,
      },
      {
        intent: "consultation" as const,
        name: "Bayu Pratama",
        email: seedEmail("bayu"),
        whatsapp: seedPhone("bayu"),
        interest: "Pembawa acara siraman",
        message:
          "Apakah bisa konsultasi paket siraman dan midodareni untuk akad Desember?",
        source: "landing",
        status: "converted" as const,
        daysAgo: 12,
      },
      {
        intent: "notify" as const,
        name: "Nanda Kusuma",
        email: seedEmail("nanda"),
        whatsapp: seedPhone("nanda"),
        interest: "Kriya gerabah Bantul",
        message: "Kabari saya kalau jalur gerabah Kasongan sudah dibuka.",
        source: "footer",
        status: "closed" as const,
        daysAgo: 20,
      },
      {
        intent: "student" as const,
        name: "Bagas Prakoso",
        email: "bagas.prakoso23@gmail.com",
        whatsapp: "6281228475903",
        interest: "Promo kaus",
        message: "Klik tautan ini untuk promo kaus murah, stok terbatas.",
        source: "unknown",
        status: "spam" as const,
        daysAgo: 2,
      },
      {
        intent: "institution" as const,
        name: "Retno Palupi",
        email: "retno.palupi80@gmail.com",
        whatsapp: "6285728103946",
        institution: "Sanggar Tari Kembang Setaman",
        institutionType: "Sanggar seni",
        participants: 16,
        interest: "Kelas pranatacara untuk pengurus sanggar",
        message:
          "Kami ingin menyiapkan enam pengurus agar bisa memandu acara sanggar.",
        source: "referral",
        status: "converted" as const,
        daysAgo: 186,
      },
      {
        intent: "consultation" as const,
        name: "Yoga Pratama",
        email: "yoga.pratama91@gmail.com",
        whatsapp: "6282137604589",
        interest: "Pewarnaan alami",
        message:
          "Saya punya usaha batik kecil di Imogiri, ingin belajar ekstraksi nila yang lebih stabil.",
        source: "whatsapp",
        status: "converted" as const,
        daysAgo: 264,
      },
      {
        intent: "notify" as const,
        name: "Lintang Ayu",
        email: "lintang.ayu04@gmail.com",
        whatsapp: "6281290653742",
        interest: "Batik bambu",
        message: "Tolong kabari kalau kelas batik bambu dibuka untuk pemula.",
        source: "landing",
        status: "closed" as const,
        daysAgo: 122,
      },
      {
        intent: "student" as const,
        name: "Heru Santosa",
        email: "heru.santosa84@gmail.com",
        whatsapp: "6282134908571",
        interest: "Batik Bambu",
        message:
          "Saya warga Krebet, ingin ikut angkatan perintis kalau masih dibuka.",
        source: "referral",
        status: "converted" as const,
        daysAgo: 382,
      },
    ]

    for (const [index, lead] of leads.entries()) {
      const leadId = await ctx.db.insert("leads", {
        intent: lead.intent,
        name: lead.name,
        email: lead.email,
        whatsapp: lead.whatsapp,
        institution: lead.institution,
        institutionType: lead.institutionType,
        participants: lead.participants,
        interest: lead.interest,
        message: lead.message,
        source: lead.source,
        consent: lead.status !== "spam",
        status: lead.status,
        createdAt: clock.ago(lead.daysAgo),
        updatedAt: clock.ago(Math.max(0, lead.daysAgo - 1)),
        convertedAt:
          lead.status === "converted"
            ? clock.ago(Math.max(1, lead.daysAgo - 2))
            : undefined,
      })
      await ctx.db.insert("leadAssignments", {
        leadId,
        ownerId: admin._id,
        assignedBy: admin._id,
        createdAt: clock.ago(lead.daysAgo),
      })
      await ctx.db.insert("leadNotes", {
        leadId,
        authorId: admin._id,
        kind: index % 2 === 0 ? "note" : "whatsapp",
        body:
          lead.status === "spam"
            ? "Ditandai spam karena tautan promosi."
            : "Sudah dihubungi dan menunggu balasan.",
        followUpAt: lead.status === "new" ? clock.ahead(1) : undefined,
        createdAt: clock.ago(Math.max(0, lead.daysAgo - 1)),
      })
    }

    const tickets = [
      {
        code: "SUP-2026-0005",
        requester: sari,
        subject: "Pembayaran belum masuk",
        priority: "high" as const,
        status: "closed" as const,
        channel: "chat" as const,
        linkedRecords: [
          { type: "order" as const, id: order1._id, label: order1.code },
          {
            type: "payment" as const,
            id: paymentForOrder1?._id ?? order1.code,
            label: "QRIS",
          },
        ],
        messages: [
          {
            authorId: sari._id,
            kind: "user" as const,
            body: "Saya sudah transfer untuk pesanan nampan batik, tetapi statusnya belum berubah.",
            daysAgo: 24,
          },
          {
            authorId: admin._id,
            kind: "internal" as const,
            body: "Cek mutasi gateway dan cocokkan nominal unik 1.450.037.",
            daysAgo: 23,
          },
        ],
        daysAgo: 24,
      },
      {
        code: "SUP-2026-0004",
        requester: dwi,
        subject: "Tugas ditolak tanpa catatan lengkap",
        priority: "normal" as const,
        status: "pending" as const,
        channel: "chat" as const,
        linkedRecords: [
          {
            type: "account" as const,
            id: dwi._id,
            label: dwi.name,
          },
        ],
        messages: [
          {
            authorId: dwi._id,
            kind: "user" as const,
            body: "Saya ingin tahu bagian mana yang perlu diperbaiki dari tugas TUG-DWI-BBM-2.",
            daysAgo: 3,
          },
          {
            authorId: admin._id,
            kind: "user" as const,
            body: "Kami sudah meneruskan ke pengajar. Catatan akan ditambahkan hari ini.",
            daysAgo: 2,
          },
        ],
        daysAgo: 3,
      },
      {
        code: "SUP-2026-0003",
        requester: anisa,
        subject: "Sertifikat belum muncul di profil",
        priority: "normal" as const,
        status: "resolved" as const,
        channel: "whatsapp" as const,
        linkedRecords: [
          {
            type: "certificate" as const,
            id: certificate._id,
            label: certificate.publicCode,
          },
        ],
        messages: [
          {
            authorId: anisa._id,
            kind: "user" as const,
            body: "Sertifikat saya sudah terbit, tetapi belum tampil di halaman profil.",
            daysAgo: 6,
          },
          {
            authorId: admin._id,
            kind: "user" as const,
            body: "Sudah disinkronkan. Silakan muat ulang halaman sertifikat.",
            daysAgo: 5,
          },
        ],
        daysAgo: 6,
      },
      {
        code: "SUP-2026-0002",
        requester: rani,
        subject: "Akses rekaman sesi",
        priority: "low" as const,
        status: "closed" as const,
        channel: "email" as const,
        linkedRecords: [
          {
            type: "conversation" as const,
            id: raniConversation?._id ?? "Pranatacara, jadwal siraman",
            label: "Pranatacara, jadwal siraman",
          },
        ],
        messages: [
          {
            authorId: rani._id,
            kind: "user" as const,
            body: "Bisakah saya mendapatkan rekaman sesi latihan?",
            daysAgo: 10,
          },
          {
            authorId: admin._id,
            kind: "user" as const,
            body: "Rekaman tersedia selama 90 hari. Tautan sudah dikirim ke email.",
            daysAgo: 9,
          },
        ],
        daysAgo: 10,
      },
      {
        code: "SUP-2026-0001",
        requester: anisa,
        subject: "Kartu Karya belum muncul di halaman karya",
        priority: "normal" as const,
        status: "closed" as const,
        channel: "chat" as const,
        linkedRecords: [
          { type: "work" as const, id: anisaWork._id, label: anisaWork.title },
        ],
        messages: [
          {
            authorId: anisa._id,
            kind: "user" as const,
            body: "Kartu Karya untuk nampan bambu sudah terbit, tetapi belum muncul di halaman karya.",
            daysAgo: 226,
          },
          {
            authorId: admin._id,
            kind: "user" as const,
            body: "Sudah saya periksa, karya belum ditautkan ke sertifikat. Sekarang sudah tampil.",
            daysAgo: 225,
          },
        ],
        daysAgo: 226,
      },
      {
        code: "SUP-2026-0006",
        requester: purnomo,
        subject: "Karya belum tampil di etalase",
        priority: "normal" as const,
        status: "open" as const,
        channel: "chat" as const,
        linkedRecords: [
          { type: "work" as const, id: work._id, label: work.title },
        ],
        messages: [
          {
            authorId: purnomo._id,
            kind: "user" as const,
            body: "Karya saya sudah terbit, tetapi belum muncul di halaman karya.",
            daysAgo: 1,
          },
        ],
        daysAgo: 1,
      },
    ]

    const ticketResolutionNotes: Record<string, string> = {
      "SUP-2026-0005":
        "Mutasi QRIS dicocokkan dengan nominal unik, pesanan ditandai lunas.",
      "SUP-2026-0003":
        "Sertifikat disinkronkan ulang dan sudah tampil di profil.",
      "SUP-2026-0002":
        "Tautan rekaman dikirim ke email peserta, berlaku 90 hari.",
      "SUP-2026-0001":
        "Karya ditautkan ke sertifikat dan sekarang tampil di etalase.",
    }

    for (const ticket of tickets) {
      const ticketId = await ctx.db.insert("supportTickets", {
        code: ticket.code,
        requesterId: ticket.requester._id,
        requesterEmail: ticket.requester.email,
        requesterName: ticket.requester.name,
        subject: ticket.subject,
        priority: ticket.priority,
        status: ticket.status,
        assigneeId: admin._id,
        channel: ticket.channel,
        linkedRecords: ticket.linkedRecords,
        firstResponseAt: clock.ago(ticket.daysAgo - 1),
        lastResponseAt: clock.ago(ticket.daysAgo - 1),
        assignedAt: clock.ago(ticket.daysAgo),
        assignedBy: admin._id,
        resolvedAt:
          ticket.status === "resolved" || ticket.status === "closed"
            ? clock.ago(ticket.daysAgo - 1)
            : undefined,
        resolvedBy:
          ticket.status === "resolved" || ticket.status === "closed"
            ? admin._id
            : undefined,
        resolutionNote:
          ticket.status === "resolved" || ticket.status === "closed"
            ? ticketResolutionNotes[ticket.code]
            : undefined,
        closedAt: ticket.status === "closed" ? clock.ago(ticket.daysAgo - 1) : undefined,
        createdAt: clock.ago(ticket.daysAgo),
        updatedAt: clock.ago(1),
      })
      for (const message of ticket.messages) {
        await ctx.db.insert("supportMessages", {
          ticketId,
          authorId: message.authorId,
          kind: message.kind,
          body: message.body,
          createdAt: clock.ago(message.daysAgo),
        })
      }
    }

    const cannedReplies = [
      {
        key: "payment-check",
        title: "Cek pembayaran",
        body: "Kami sedang mencocokkan mutasi gateway. Mohon kirim bukti transfer dan kode pesanan.",
        category: "payment" as const,
      },
      {
        key: "assessment-note",
        title: "Catatan penilaian",
        body: "Kami sudah meneruskan permintaan catatan tambahan ke pengajar. Balasan dikirim dalam 1 x 24 jam.",
        category: "content" as const,
      },
      {
        key: "certificate-sync",
        title: "Sinkronisasi sertifikat",
        body: "Sertifikat sudah disinkronkan. Silakan muat ulang halaman sertifikat.",
        category: "technical" as const,
      },
      {
        key: "recording-access",
        title: "Akses rekaman",
        body: "Rekaman sesi tersedia selama 90 hari. Tautan dikirim ke email terdaftar.",
        category: "trust_safety" as const,
      },
    ]
    for (const [replyIndex, reply] of cannedReplies.entries()) {
      await ctx.db.insert("supportCannedReplies", {
        key: reply.key,
        title: reply.title,
        body: reply.body,
        category: reply.category,
        active: true,
        createdBy: admin._id,
        createdAt: clock.ago(300 - replyIndex * 21),
        updatedAt: clock.now,
      })
    }

    const notifications = [
      {
        recipient: admin,
        channel: "in_app" as const,
        template: "support.created",
        title: "Tiket dukungan baru",
        body: "Sari Wulandari membuka tiket pembayaran belum masuk.",
        entityType: "supportTickets",
        entityId: "SUP-2026-0005",
        readAt: clock.ago(23.9),
        daysAgo: 24,
      },
      {
        recipient: sari,
        channel: "in_app" as const,
        template: "order.paid",
        title: "Pesanan diterima",
        body: "Pesanan nampan batik sudah dibayar dan sedang disiapkan.",
        entityType: "orders",
        entityId: order1._id,
        readAt: clock.ago(20),
        daysAgo: 24,
      },
      {
        recipient: anisa,
        channel: "in_app" as const,
        template: "payout.released",
        title: "Payout disetujui",
        body: "Payout untuk pesanan nampan batik sudah disetujui.",
        entityType: "payouts",
        entityId: payoutForOrder1?._id,
        readAt: clock.ago(5),
        daysAgo: 10,
      },
      {
        recipient: dwi,
        channel: "in_app" as const,
        template: "submission.graded",
        title: "Tugas dinilai",
        body: "Tugas pewarnaan pertama sudah dinilai. Ada catatan revisi.",
        entityType: "submissions",
        entityId: submission._id,
        readAt: undefined,
        daysAgo: 6,
      },
      {
        recipient: admin,
        channel: "email" as const,
        template: "support.digest",
        title: "Ringkasan dukungan harian",
        body: "Ada 2 tiket terbuka dan 1 tiket menunggu balasan.",
        entityType: "supportTickets",
        entityId: "SUP-2026-0001",
        readAt: undefined,
        daysAgo: 1,
      },
      {
        recipient: sari,
        channel: "whatsapp" as const,
        template: "order.paid",
        title: "Pesanan diterima",
        body: "Pesanan nampan batik sudah dibayar.",
        entityType: "orders",
        entityId: order1._id,
        readAt: undefined,
        daysAgo: 24,
      },
      {
        recipient: rani,
        channel: "push" as const,
        template: "call.missed",
        title: "Panggilan tak terjawab",
        body: "Widagdo Saputra mencoba menghubungi Anda.",
        entityType: "callSessions",
        entityId: missedCall?._id ?? "Panggilan tak terjawab",
        readAt: undefined,
        daysAgo: 4,
      },
      {
        recipient: anisa,
        channel: "email" as const,
        template: "enrollment.welcome",
        title: "Selamat datang di angkatan perintis",
        body: "Akses ruang belajar sudah dibuka. Sesi pertama dimulai pekan depan di Krebet.",
        entityType: "cohorts",
        entityId: cohortCode("bbm2025_02"),
        readAt: clock.ago(387),
        daysAgo: 390,
      },
      {
        recipient: anisa,
        channel: "email" as const,
        template: "certificate.issued",
        title: "Sertifikat sudah terbit",
        body: "Sertifikat KN-ANISA-2026 sudah terbit dan dapat diverifikasi publik.",
        entityType: "certificates",
        entityId: certificate._id,
        readAt: clock.ago(326),
        daysAgo: 327,
      },
      {
        recipient: anisa,
        channel: "in_app" as const,
        template: "work.published",
        title: "Kartu Karya terbit",
        body: "Nampan Batik Bambu sudah tampil di halaman karya dengan Kartu Karya KN-8821.",
        entityType: "works",
        entityId: anisaWork._id,
        readAt: clock.ago(316),
        daysAgo: 318,
      },
      {
        recipient: sri,
        channel: "email" as const,
        template: "cohort.session_reminder",
        title: "Pengingat sesi live",
        body: "Sesi berikutnya angkatan BBM-2026-01 berlangsung Sabtu pukul 09.00 WIB. Tautan ruang sudah tersedia.",
        entityType: "cohorts",
        entityId: cohortCode("bbm2026_01"),
        readAt: clock.ago(2),
        daysAgo: 3,
      },
      {
        recipient: rani,
        channel: "in_app" as const,
        template: "order.paid",
        title: "Pesanan dibayar",
        body: `Pesanan ${order9.code} sudah dibayar. Mohon siapkan gladi resik sehari sebelum acara.`,
        entityType: "orders",
        entityId: order9.code,
        readAt: clock.ago(152),
        daysAgo: 154,
      },
      {
        recipient: admin,
        channel: "email" as const,
        template: "payout.held",
        title: "Payout ditahan",
        body: `Payout untuk pesanan ${order3.code} ditahan sampai pesanan selesai. Pengajar sudah diberi tahu.`,
        entityType: "payouts",
        entityId: order3.code,
        readAt: clock.ago(4),
        daysAgo: 5,
      },
      {
        recipient: purnomo,
        channel: "in_app" as const,
        template: "work.published",
        title: "Karya tampil di halaman publik",
        body: "Hiasan Dinding Batik Bambu sudah tayang. Anda dapat membagikan tautannya.",
        entityType: "works",
        entityId: work._id,
        readAt: clock.ago(208),
        daysAgo: 210,
      },
      {
        recipient: arif,
        channel: "whatsapp" as const,
        template: "enrollment.deadline",
        title: "Tenggat tugas akhir",
        body: "Tugas akhir angkatan BBM-2026-01 jatuh tempo 10 hari lagi. Unggah dokumentasi proses bila sudah selesai.",
        entityType: "enrollments",
        entityId: cohortCode("bbm2026_01"),
        readAt: undefined,
        daysAgo: 12,
      },
      {
        recipient: galuh,
        channel: "in_app" as const,
        template: "certificate.issued",
        title: "Sertifikat jalur Aksara Jawa terbit",
        body: "Sertifikat KN-GALUH-2026 sudah terbit. Kartu Karya jasa tulis aksaramu bisa dibuka dari halaman karya.",
        entityType: "certificates",
        entityId: aksaraCertificate._id,
        readAt: clock.ago(108),
        daysAgo: 110,
      },
    ]
    for (const notification of notifications) {
      const isInApp = notification.channel === "in_app"
      await ctx.db.insert("notificationOutbox", {
        channel: notification.channel,
        recipient: notification.recipient.email,
        template: notification.template,
        payload: {
          title: notification.title,
          body: notification.body,
          entityType: notification.entityType,
          entityId: notification.entityId,
        },
        status: isInApp ? "sent" : "failed",
        attempts: isInApp ? 1 : 1,
        scheduledAt: clock.ago(notification.daysAgo),
        sentAt: isInApp ? clock.ago(notification.daysAgo) : undefined,
        error: isInApp
          ? undefined
          : `Provider ${notification.channel} belum dikonfigurasi.`,
        idempotencyKey: `seed-notification-${notification.template}-${notification.recipient.email}`,
        recipientId: notification.recipient._id,
        readAt: isInApp ? notification.readAt : undefined,
        title: notification.title,
        body: notification.body,
        entityType: notification.entityType,
        entityId: notification.entityId,
        createdAt: clock.ago(notification.daysAgo),
        updatedAt: clock.now,
      })
    }

    const endpoints = await ctx.db.query("webhookEndpoints").collect()
    const gatewayEndpoint = endpoints.find(
      (endpoint) => endpoint.name === "Gateway pembayaran",
    )
    const opsEndpoint = endpoints.find(
      (endpoint) => endpoint.name === "Notifikasi internal",
    )
    const deliveries = [
      {
        endpointId: gatewayEndpoint?._id,
        eventId: "seed-delivery-1",
        event: "order.paid",
        url: gatewayEndpoint?.url ?? "https://payments.kalanidhi.site/webhooks/kalanidhi",
        status: "delivered" as const,
        attempts: 1,
        responseStatus: 200,
        daysAgo: 24,
      },
      {
        endpointId: gatewayEndpoint?._id,
        eventId: "seed-delivery-2",
        event: "payment.settled",
        url: gatewayEndpoint?.url ?? "https://payments.kalanidhi.site/webhooks/kalanidhi",
        status: "delivered" as const,
        attempts: 1,
        responseStatus: 200,
        daysAgo: 16,
      },
      {
        endpointId: opsEndpoint?._id,
        eventId: "seed-delivery-3",
        event: "support.created",
        url: opsEndpoint?.url ?? "https://ops.kalanidhi.site/hooks/kalanidhi",
        status: "failed" as const,
        attempts: 2,
        responseStatus: 503,
        error: "Endpoint sementara tidak tersedia.",
        daysAgo: 2,
      },
      {
        endpointId: gatewayEndpoint?._id,
        eventId: "seed-delivery-4",
        event: "refund.paid",
        url: gatewayEndpoint?.url ?? "https://payments.kalanidhi.site/webhooks/kalanidhi",
        status: "pending" as const,
        attempts: 0,
        responseStatus: undefined,
        daysAgo: 0,
      },
      {
        endpointId: opsEndpoint?._id,
        eventId: "seed-delivery-5",
        event: "work.published",
        url: opsEndpoint?.url ?? "https://ops.kalanidhi.site/hooks/kalanidhi",
        status: "dead" as const,
        attempts: 5,
        responseStatus: 500,
        error: "Batas percobaan habis.",
        daysAgo: 12,
      },
      {
        endpointId: gatewayEndpoint?._id,
        eventId: "seed-delivery-6",
        event: "order.paid",
        url: gatewayEndpoint?.url ?? "https://payments.kalanidhi.site/webhooks/kalanidhi",
        status: "delivered" as const,
        attempts: 1,
        responseStatus: 200,
        daysAgo: 214,
      },
      {
        endpointId: gatewayEndpoint?._id,
        eventId: "seed-delivery-7",
        event: "payment.settled",
        url: gatewayEndpoint?.url ?? "https://payments.kalanidhi.site/webhooks/kalanidhi",
        status: "delivered" as const,
        attempts: 1,
        responseStatus: 200,
        daysAgo: 158,
      },
      {
        endpointId: opsEndpoint?._id,
        eventId: "seed-delivery-8",
        event: "work.published",
        url: opsEndpoint?.url ?? "https://ops.kalanidhi.site/hooks/kalanidhi",
        status: "delivered" as const,
        attempts: 1,
        responseStatus: 200,
        daysAgo: 96,
      },
    ]
    for (const delivery of deliveries) {
      await ctx.db.insert("webhookDeliveries", {
        endpointId: delivery.endpointId,
        eventId: delivery.eventId,
        event: delivery.event,
        url: delivery.url,
        status: delivery.status,
        attempts: delivery.attempts,
        lastAttemptAt: clock.ago(delivery.daysAgo),
        nextAttemptAt:
          delivery.status === "pending" ? clock.now + 60_000 : undefined,
        responseStatus: delivery.responseStatus,
        error: delivery.error,
        createdAt: clock.ago(delivery.daysAgo),
        updatedAt: clock.now,
      })
    }

    return { leads: leads.length, tickets: tickets.length }
  },
})

