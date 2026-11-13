import { FLOW_SPECS } from "../lib/flows/definitions"
import type { Doc, Id } from "./_generated/dataModel"
import { internalMutation, type MutationCtx } from "./_generated/server"
import {
  DAY,
  HOUR,
  SEED_NOW as NOW,
  SEED_START,
  seedAdmin,
  seedAgo as ago,
  seedAhead as ahead,
  seedEmail,
  seedPhone,
} from "./seedIdentities"

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

async function userByEmail(
  ctx: MutationCtx,
  email: string,
): Promise<Doc<"users">> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique()
  if (!user) throw new Error(`Seed user missing: ${email}`)
  return user
}

async function workBySlug(
  ctx: MutationCtx,
  slug: string,
): Promise<Doc<"works">> {
  const work = await ctx.db
    .query("works")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique()
  if (!work) throw new Error(`Seed work missing: ${slug}`)
  return work
}

async function cohortByCode(
  ctx: MutationCtx,
  code: string,
): Promise<Doc<"cohorts">> {
  const all = await ctx.db.query("cohorts").collect()
  const cohort = all.find((item) => item.code === code)
  if (!cohort) throw new Error(`Seed cohort missing: ${code}`)
  return cohort
}

async function orderByCode(
  ctx: MutationCtx,
  code: string,
): Promise<Doc<"orders">> {
  const order = await ctx.db
    .query("orders")
    .withIndex("by_code", (q) => q.eq("code", code))
    .unique()
  if (!order) throw new Error(`Seed order missing: ${code}`)
  return order
}

async function submissionByCode(
  ctx: MutationCtx,
  code: string,
): Promise<Doc<"submissions">> {
  const submission = await ctx.db
    .query("submissions")
    .withIndex("by_code", (q) => q.eq("code", code))
    .unique()
  if (!submission) throw new Error(`Seed submission missing: ${code}`)
  return submission
}

async function certificateByCode(
  ctx: MutationCtx,
  code: string,
): Promise<Doc<"certificates">> {
  const certificate = await ctx.db
    .query("certificates")
    .withIndex("by_publicCode", (q) => q.eq("publicCode", code))
    .unique()
  if (!certificate) throw new Error(`Seed certificate missing: ${code}`)
  return certificate
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|")
}

export const seedMessaging = internalMutation({
  args: {},
  handler: async (ctx) => {
    const admin = await seedAdmin(ctx)
    const bambang = await userByEmail(ctx, seedEmail("bambang"))
    const sri = await userByEmail(ctx, seedEmail("sri"))
    const widagdo = await userByEmail(ctx, seedEmail("widagdo"))
    const sari = await userByEmail(ctx, seedEmail("sari"))
    const dimas = await userByEmail(ctx, seedEmail("dimas"))
    const rani = await userByEmail(ctx, seedEmail("rani"))
    const nanda = await userByEmail(ctx, seedEmail("nanda"))
    const yusuf = await userByEmail(ctx, seedEmail("yusuf"))
    const anisa = await userByEmail(ctx, seedEmail("anisa"))
    const dwi = await userByEmail(ctx, seedEmail("dwi"))
    const ratih = await userByEmail(ctx, seedEmail("ratih"))
    const cohort = await cohortByCode(ctx, "BTS-2026-01")
    const cohortStudents = await Promise.all(
      ["sari", "dwi", "bayu", "nanda", "ratih", "yusuf", "melati", "arif"].map(
        (key) => userByEmail(ctx, seedEmail(key)),
      ),
    )

    const voiceStorage = await ctx.storage.store(
      new Blob(["KalaNidhi seed voice note"], { type: "audio/webm" }),
    )
    const imageStorage = await ctx.storage.store(
      new Blob(["KalaNidhi seed image"], { type: "image/jpeg" }),
    )
    const recordingStorage = await ctx.storage.store(
      new Blob(["KalaNidhi seed call recording"], { type: "audio/webm" }),
    )

    const directId = await ctx.db.insert("conversations", {
      kind: "direct",
      title: "Batik: catatan canting",
      pathId: "batik-tulis-soga",
      createdBy: bambang._id,
      status: "open",
      pairKey: pairKey(bambang._id, sari._id),
      lastMessageAt: ago(1),
      createdAt: ago(20),
      updatedAt: ago(1),
    })
    await ctx.db.insert("conversationMembers", {
      conversationId: directId,
      userId: bambang._id,
      role: "owner",
      lastReadAt: ago(1),
      lastSeenAt: ago(1),
      joinedAt: ago(20),
    })
    await ctx.db.insert("conversationMembers", {
      conversationId: directId,
      userId: sari._id,
      role: "member",
      lastReadAt: ago(2),
      lastSeenAt: ago(2),
      joinedAt: ago(20),
    })

    const directMessages = [
      {
        senderId: bambang._id,
        kind: "text" as const,
        body: "Sari, foto latihan garisnya sudah saya lihat. Tekanan canting di bagian lengkung kanan masih terlalu kuat. Coba turunkan sedikit suhu malam.",
        createdAt: ago(3),
      },
      {
        senderId: sari._id,
        kind: "voice" as const,
        body: undefined,
        createdAt: ago(2),
      },
      {
        senderId: bambang._id,
        kind: "text" as const,
        body: "Voice note-nya jelas. Besok kita cek lagi di sesi live, bawa kain percamu.",
        createdAt: ago(2),
      },
      {
        senderId: sari._id,
        kind: "image" as const,
        body: "Ini hasil setelah suhu malam saya turunkan.",
        createdAt: ago(1),
      },
      {
        senderId: bambang._id,
        kind: "text" as const,
        body: "Garisnya sudah jauh lebih rata. Untuk Sabtu bawa kain primis 40 x 40 cm, kita latihan lengkung ganda.",
        createdAt: ago(0.8),
      },
      {
        senderId: sari._id,
        kind: "text" as const,
        body: "Siap, Pak. Saya juga bawa hasil pewarnaan soga terakhir untuk diperiksa.",
        createdAt: ago(0.6),
      },
      {
        senderId: bambang._id,
        kind: "text" as const,
        body: "Bagus. Datang lima belas menit lebih awal supaya sempat menyiapkan wajan.",
        createdAt: ago(0.4),
      },
    ]
    const directMessageIds: Id<"messages">[] = []
    for (const [index, message] of directMessages.entries()) {
      const messageId = await ctx.db.insert("messages", {
        conversationId: directId,
        senderId: message.senderId,
        kind: message.kind,
        body: message.body,
        createdAt: message.createdAt,
      })
      directMessageIds.push(messageId)
      if (message.kind === "voice") {
        const assetId = await ctx.db.insert("messageAssets", {
          messageId,
          storageId: voiceStorage,
          senderId: message.senderId,
          kind: "audio",
          filename: "catatan-canting.webm",
          mimeType: "audio/webm",
          size: 24_000,
          durationMs: 42_000,
          transcript:
            "Saya sudah coba suhu 66 derajat, hasilnya lebih rata di bagian lengkung.",
          createdAt: message.createdAt,
        })
        await ctx.db.patch(messageId, { assetId, durationMs: 42_000 })
      }
      if (message.kind === "image") {
        const assetId = await ctx.db.insert("messageAssets", {
          messageId,
          storageId: imageStorage,
          senderId: message.senderId,
          kind: "image",
          filename: "hasil-latihan.jpg",
          mimeType: "image/jpeg",
          size: 48_000,
          width: 1200,
          height: 900,
          createdAt: message.createdAt,
        })
        await ctx.db.patch(messageId, { assetId })
      }
      for (const member of [bambang, sari]) {
        await ctx.db.insert("messageReceipts", {
          messageId,
          userId: member._id,
          deliveredAt: message.createdAt + 1_000,
          readAt:
            member._id === message.senderId
              ? message.createdAt + 1_000
              : message.createdAt + 30_000,
        })
      }
      if (index === 0) {
        await ctx.db.insert("messageEdits", {
          messageId,
          editorId: bambang._id,
          previousBody:
            "Sari, foto latihan garisnya sudah saya lihat. Tekanan canting masih terlalu kuat.",
          nextBody:
            "Sari, foto latihan garisnya sudah saya lihat. Tekanan canting di bagian lengkung kanan masih terlalu kuat. Coba turunkan sedikit suhu malam.",
          createdAt: ago(3) + 5 * 60_000,
        })
        await ctx.db.patch(messageId, { editedAt: ago(3) + 5 * 60_000 })
      }
    }

    const cohortConversationId = await ctx.db.insert("conversations", {
      kind: "cohort",
      title: "Batik Tulis Soga — Angkatan 1",
      pathId: "batik-tulis-soga",
      cohortId: cohort._id,
      createdBy: bambang._id,
      status: "open",
      lastMessageAt: ago(1),
      createdAt: ago(40),
      updatedAt: ago(1),
    })
    for (const member of [bambang, ...cohortStudents]) {
      await ctx.db.insert("conversationMembers", {
        conversationId: cohortConversationId,
        userId: member._id,
        role: member._id === bambang._id ? "owner" : "member",
        lastReadAt: ago(1),
        lastSeenAt: ago(1),
        joinedAt: ago(40),
      })
    }
    const cohortMessages = [
      {
        senderId: undefined,
        kind: "system" as const,
        body: "Kohort dibuka. Sesi pertama dimulai 14 hari lalu, rekamannya tersedia di Jadwal.",
        createdAt: ago(40),
      },
      {
        senderId: bambang._id,
        kind: "text" as const,
        body: "Untuk sesi besok, bawa kain primis yang sudah dicuci dan disetrika. Kita mulai dari latihan lengkung ganda.",
        createdAt: ago(2),
      },
      {
        senderId: sari._id,
        kind: "text" as const,
        body: "Baik, Pak. Saya sudah siapkan dua lembar kain perca untuk latihan.",
        createdAt: ago(1.4),
      },
      {
        senderId: dwi._id,
        kind: "text" as const,
        body: "Pak, apakah kain primis boleh diganti katun biasa untuk latihan di rumah?",
        createdAt: ago(23.2),
      },
      {
        senderId: bambang._id,
        kind: "text" as const,
        body: "Untuk latihan boleh. Untuk tugas akhir tetap pakai primis supaya hasil pewarnaan bisa dibandingkan.",
        createdAt: ago(1.1),
      },
      {
        senderId: ratih._id,
        kind: "text" as const,
        body: "Catatan sesi kemarin sudah saya salin. Bagian fiksasi warna masih perlu saya ulang.",
        createdAt: ago(23.05),
      },
      {
        senderId: bambang._id,
        kind: "text" as const,
        body: "Iya, ulangi fiksasi dengan waktu yang sama. Catat suhu airnya, jangan hanya takaran bahan.",
        createdAt: ago(0.8),
      },
    ]
    for (const message of cohortMessages) {
      const messageId = await ctx.db.insert("messages", {
        conversationId: cohortConversationId,
        senderId: message.senderId,
        kind: message.kind,
        body: message.body,
        createdAt: message.createdAt,
      })
      for (const member of [bambang, ...cohortStudents]) {
        await ctx.db.insert("messageReceipts", {
          messageId,
          userId: member._id,
          deliveredAt: message.createdAt + 1_000,
          readAt:
            member._id === message.senderId
              ? message.createdAt + 1_000
              : message.createdAt + 60_000,
        })
      }
    }

    const supportConversationId = await ctx.db.insert("conversations", {
      kind: "support",
      title: "Bantuan pesanan batik",
      createdBy: sari._id,
      status: "archived",
      supportRequestedBy: sari._id,
      supportConsentAt: ago(24),
      lastMessageAt: ago(23.05),
      createdAt: ago(24),
      updatedAt: ago(23.05),
    })
    for (const member of [sari, admin]) {
      await ctx.db.insert("conversationMembers", {
        conversationId: supportConversationId,
        userId: member._id,
        role: member._id === admin._id ? "support" : "member",
        lastReadAt: ago(23.05),
        lastSeenAt: ago(23.05),
        joinedAt: ago(24),
      })
    }
    const supportMessages = [
      {
        senderId: sari._id,
        kind: "text" as const,
        body: "Saya sudah transfer untuk pesanan KN-2026-000108, tetapi statusnya belum berubah.",
        createdAt: ago(24),
      },
      {
        senderId: admin._id,
        kind: "text" as const,
        body: "Terima kasih, Sari. Saya cek mutasi gateway dan akan kabari di tiket yang sama.",
        createdAt: ago(23.6),
      },
      {
        senderId: admin._id,
        kind: "text" as const,
        body: "Mutasi sudah cocok dengan nominal unik 1.450.037. Status pesanan saya ubah ke dibayar.",
        createdAt: ago(23.2),
      },
      {
        senderId: sari._id,
        kind: "text" as const,
        body: "Sudah masuk sekarang, terima kasih. Saya tunggu kabar pengirimannya.",
        createdAt: ago(23.1),
      },
      {
        senderId: admin._id,
        kind: "text" as const,
        body: "Baik, tiket saya tutup. Kalau ada kendala lain, buka chat lagi kapan saja.",
        createdAt: ago(23.05),
      },
    ]
    for (const message of supportMessages) {
      const messageId = await ctx.db.insert("messages", {
        conversationId: supportConversationId,
        senderId: message.senderId,
        kind: message.kind,
        body: message.body,
        createdAt: message.createdAt,
      })
      for (const member of [sari, admin]) {
        await ctx.db.insert("messageReceipts", {
          messageId,
          userId: member._id,
          deliveredAt: message.createdAt + 1_000,
          readAt: message.createdAt + 20_000,
        })
      }
    }

    const raniConversationId = await ctx.db.insert("conversations", {
      kind: "direct",
      title: "Pranatacara: jadwal siraman",
      pathId: "pranatacara-jawa",
      createdBy: widagdo._id,
      status: "open",
      pairKey: pairKey(widagdo._id, rani._id),
      lastMessageAt: ago(4),
      createdAt: ago(12),
      updatedAt: ago(4),
    })
    for (const member of [widagdo, rani]) {
      await ctx.db.insert("conversationMembers", {
        conversationId: raniConversationId,
        userId: member._id,
        role: member._id === widagdo._id ? "owner" : "member",
        lastReadAt: ago(4),
        lastSeenAt: ago(4),
        joinedAt: ago(12),
      })
    }
    for (const message of [
      {
        senderId: widagdo._id,
        body: "Rani, rundown siraman sudah saya periksa. Bagian penutup perlu satu kalimat penyerahan ke keluarga.",
        createdAt: ago(5),
      },
      {
        senderId: rani._id,
        body: "Sudah saya tambahkan, Pak. Saya kirim ulang malam ini.",
        createdAt: ago(4.2),
      },
      {
        senderId: widagdo._id,
        body: "Sudah saya baca. Bagian penyerahan ke keluarga sudah pas, tinggal latih tempo bicaranya.",
        createdAt: ago(3.8),
      },
      {
        senderId: rani._id,
        body: "Baik. Saya juga sudah menyiapkan susunan keluarga untuk prosesi siraman.",
        createdAt: ago(3.5),
      },
      {
        senderId: widagdo._id,
        body: "Bagus. Besok kita gladi resik pukul 19.00 lewat panggilan, saya kirim tautannya.",
        createdAt: ago(3.2),
      },
    ]) {
      const messageId = await ctx.db.insert("messages", {
        conversationId: raniConversationId,
        senderId: message.senderId,
        kind: "text",
        body: message.body,
        createdAt: message.createdAt,
      })
      for (const member of [widagdo, rani]) {
        await ctx.db.insert("messageReceipts", {
          messageId,
          userId: member._id,
          deliveredAt: message.createdAt + 1_000,
          readAt: message.createdAt + 15_000,
        })
      }
    }

    const dimasConversationId = await ctx.db.insert("conversations", {
      kind: "direct",
      title: "Pewarnaan alami: catatan nila",
      pathId: "batik-tulis-soga",
      createdBy: sri._id,
      status: "open",
      pairKey: pairKey(sri._id, dimas._id),
      lastMessageAt: ago(6),
      createdAt: ago(15),
      updatedAt: ago(6),
    })
    for (const member of [sri, dimas]) {
      await ctx.db.insert("conversationMembers", {
        conversationId: dimasConversationId,
        userId: member._id,
        role: member._id === sri._id ? "owner" : "member",
        lastReadAt: ago(6),
        lastSeenAt: ago(6),
        joinedAt: ago(15),
      })
    }
    const dimasThread = [
      {
        senderId: sri._id,
        body: "Dimas, hasil pencelupan nila sudah bagus. Jangan lupa catat pH air sebelum pencelupan berikutnya.",
        createdAt: ago(6),
      },
      {
        senderId: dimas._id,
        body: "Baik, Bu. Saya catat pH 6,5 dan suhu 80 derajat. Hasilnya lebih gelap dari percobaan pertama.",
        createdAt: ago(5.6),
      },
      {
        senderId: sri._id,
        body: "Itu masih masuk rentang. Coba ulangi dengan kain yang sama sebagai pembanding, lalu foto berdampingan.",
        createdAt: ago(5.2),
      },
      {
        senderId: dimas._id,
        body: "Siap, sore ini saya kerjakan. Terima kasih, Bu.",
        createdAt: ago(4.9),
      },
    ]
    for (const message of dimasThread) {
      const messageId = await ctx.db.insert("messages", {
        conversationId: dimasConversationId,
        senderId: message.senderId,
        kind: "text",
        body: message.body,
        createdAt: message.createdAt,
      })
      for (const member of [sri, dimas]) {
        await ctx.db.insert("messageReceipts", {
          messageId,
          userId: member._id,
          deliveredAt: message.createdAt + 1_000,
          readAt:
            member._id === message.senderId
              ? message.createdAt + 1_000
              : message.createdAt + 25_000,
        })
      }
    }

    const orderConversationId = await ctx.db.insert("conversations", {
      kind: "direct",
      title: "Pesanan kain soga anyaman",
      pathId: "batik-tulis-soga",
      createdBy: anisa._id,
      status: "open",
      pairKey: pairKey(anisa._id, sari._id),
      lastMessageAt: ago(18),
      createdAt: ago(24),
      updatedAt: ago(18),
    })
    for (const member of [sari, anisa]) {
      await ctx.db.insert("conversationMembers", {
        conversationId: orderConversationId,
        userId: member._id,
        role: member._id === anisa._id ? "owner" : "member",
        lastReadAt: ago(18),
        lastSeenAt: ago(18),
        joinedAt: ago(24),
      })
    }
    const orderThread = [
      {
        senderId: sari._id,
        kind: "text" as const,
        body: "Mbak Anisa, kainnya sudah sampai. Motifnya rapi, terima kasih ya.",
        createdAt: ago(21),
      },
      {
        senderId: anisa._id,
        kind: "text" as const,
        body: "Alhamdulillah, senang mendengarnya. Kalau mau, saya kirim panduan perawatan kainnya.",
        createdAt: ago(20.6),
      },
      {
        senderId: sari._id,
        kind: "text" as const,
        body: "Boleh, sekalian tips menyimpan supaya warna soga tidak cepat pudar.",
        createdAt: ago(20.2),
      },
      {
        senderId: anisa._id,
        kind: "image" as const,
        body: "Sudah saya kirim panduan perawatan kainnya.",
        createdAt: ago(19),
      },
      {
        senderId: anisa._id,
        kind: "text" as const,
        body: "Hindari sinar matahari langsung, lipat dengan kertas bebas asam, dan cuci dengan sabun lembut.",
        createdAt: ago(18.6),
      },
      {
        senderId: sari._id,
        kind: "text" as const,
        body: "Sudah saya catat. Terima kasih, Mbak. Nanti saya kabari kalau mau pesan selendang.",
        createdAt: ago(18),
      },
    ]
    for (const message of orderThread) {
      const messageId = await ctx.db.insert("messages", {
        conversationId: orderConversationId,
        senderId: message.senderId,
        kind: message.kind,
        body: message.body,
        createdAt: message.createdAt,
      })
      if (message.kind === "image") {
        const assetId = await ctx.db.insert("messageAssets", {
          messageId,
          storageId: imageStorage,
          senderId: message.senderId,
          kind: "image",
          filename: "panduan-perawatan-kain.jpg",
          mimeType: "image/jpeg",
          size: 62_000,
          width: 1080,
          height: 1350,
          createdAt: message.createdAt,
        })
        await ctx.db.patch(messageId, { assetId })
      }
      for (const member of [sari, anisa]) {
        await ctx.db.insert("messageReceipts", {
          messageId,
          userId: member._id,
          deliveredAt: message.createdAt + 2_000,
          readAt:
            member._id === message.senderId
              ? message.createdAt + 2_000
              : message.createdAt + 45_000,
        })
      }
    }

    const mentorConversationId = await ctx.db.insert("conversations", {
      kind: "direct",
      title: "Bimbingan karya akhir Anisa",
      pathId: "batik-tulis-soga",
      createdBy: bambang._id,
      status: "archived",
      pairKey: pairKey(bambang._id, anisa._id),
      lastMessageAt: ago(300),
      createdAt: ago(360),
      updatedAt: ago(300),
    })
    for (const member of [bambang, anisa]) {
      await ctx.db.insert("conversationMembers", {
        conversationId: mentorConversationId,
        userId: member._id,
        role: member._id === bambang._id ? "owner" : "member",
        lastReadAt: ago(300),
        lastSeenAt: ago(300),
        joinedAt: ago(360),
        leftAt: ago(299),
      })
    }
    const mentorThread = [
      {
        senderId: anisa._id,
        body: "Pak, saya sudah menyelesaikan pelorodan. Besok saya unggah dua belas foto prosesnya.",
        createdAt: ago(356),
      },
      {
        senderId: bambang._id,
        body: "Bagus. Pastikan foto bahan dan takaran ikut, bukan hanya hasil akhir.",
        createdAt: ago(355),
      },
      {
        senderId: anisa._id,
        body: "Sudah saya susun per tahap. Ada satu foto fiksasi yang kurang fokus, saya ulang.",
        createdAt: ago(354),
      },
      {
        senderId: bambang._id,
        body: "Kirim yang jelas saja. Nanti saya nilai dan ajukan Kartu Karya.",
        createdAt: ago(353),
      },
      {
        senderId: anisa._id,
        body: "Terima kasih, Pak. Saya juga ingin mengajukan diri sebagai pengajar pendamping.",
        createdAt: ago(300),
      },
      {
        senderId: bambang._id,
        body: "Boleh. Setelah sertifikat terbit, ajukan lewat menu pengajar.",
        createdAt: ago(300),
      },
    ]
    for (const message of mentorThread) {
      const messageId = await ctx.db.insert("messages", {
        conversationId: mentorConversationId,
        senderId: message.senderId,
        kind: "text",
        body: message.body,
        createdAt: message.createdAt,
      })
      for (const member of [bambang, anisa]) {
        await ctx.db.insert("messageReceipts", {
          messageId,
          userId: member._id,
          deliveredAt: message.createdAt + 2_000,
          readAt:
            member._id === message.senderId
              ? message.createdAt + 2_000
              : message.createdAt + 60_000,
        })
      }
    }

    const blockedConversationId = await ctx.db.insert("conversations", {
      kind: "direct",
      title: "Tanya jadwal",
      createdBy: nanda._id,
      status: "flagged",
      pairKey: pairKey(nanda._id, yusuf._id),
      lastMessageAt: ago(8),
      createdAt: ago(9),
      updatedAt: ago(8),
    })
    for (const member of [nanda, yusuf]) {
      await ctx.db.insert("conversationMembers", {
        conversationId: blockedConversationId,
        userId: member._id,
        role: "member",
        lastReadAt: ago(8),
        lastSeenAt: ago(8),
        joinedAt: ago(9),
      })
    }
    const flaggedMessageId = await ctx.db.insert("messages", {
      conversationId: blockedConversationId,
      senderId: yusuf._id,
      kind: "text",
      body: "Ini tautan grup lain, gabung saja di sana.",
      containsExternalLink: true,
      createdAt: ago(8),
    })
    await ctx.db.insert("messageFlags", {
      messageId: flaggedMessageId,
      reportedBy: nanda._id,
      reason: "Pesan berisi tautan eksternal dan ajakan keluar platform.",
      status: "open",
      createdAt: ago(8),
    })
    await ctx.db.insert("blocks", {
      blockerId: nanda._id,
      blockedId: yusuf._id,
      reason: "Pesan eksternal berulang.",
      createdAt: ago(8),
    })
    await ctx.db.insert("messageAccessGrants", {
      conversationId: blockedConversationId,
      actorId: admin._id,
      reason: "Tinjauan moderasi laporan pesan.",
      expiresAt: ahead(1),
      createdAt: ago(1),
    })
    await ctx.db.insert("messagingRestrictions", {
      userId: yusuf._id,
      actorId: admin._id,
      reason: "Peringatan pengiriman tautan eksternal.",
      until: ago(1),
      liftedAt: ago(1),
      createdAt: ago(7),
    })
    await ctx.db.insert("messageUploadIntents", {
      conversationId: directId,
      senderId: sari._id,
      expiresAt: ago(1),
      consumedAt: ago(1),
      createdAt: ago(1),
    })

    const systemConversationId = await ctx.db.insert("conversations", {
      kind: "system",
      title: "Pemberitahuan platform",
      createdBy: admin._id,
      status: "open",
      lastMessageAt: ago(1),
      createdAt: ago(30),
      updatedAt: ago(1),
    })
    await ctx.db.insert("conversationMembers", {
      conversationId: systemConversationId,
      userId: admin._id,
      role: "owner",
      lastReadAt: ago(1),
      lastSeenAt: ago(1),
      joinedAt: ago(30),
    })
    for (const notice of [
      {
        body: "Pemeliharaan terjadwal Minggu, 16 November 2026 pukul 01.00–03.00 WIB. Ruang belajar tetap dapat dibuka; unggahan tugas mungkin tertunda beberapa menit.",
        createdAt: ago(1.5),
      },
      {
        body: "Sertifikat angkatan perintis sudah terbit dan dapat diverifikasi lewat halaman Verifikasi. Gunakan kode yang tertera pada sertifikat.",
        createdAt: ago(1),
      },
    ]) {
      await ctx.db.insert("messages", {
        conversationId: systemConversationId,
        kind: "system",
        body: notice.body,
        createdAt: notice.createdAt,
      })
    }

    const callId = await ctx.db.insert("callSessions", {
      roomName: "kalanidhi-bts-2026-01-review",
      kind: "voice",
      initiatorId: bambang._id,
      hostId: bambang._id,
      conversationId: directId,
      title: "Tinjauan canting bersama Sari",
      status: "ended",
      startedAt: ago(2),
      endedAt: ago(2) + 32 * 60_000,
      endedBy: bambang._id,
      endReason: "Sesi selesai",
      durationMs: 32 * 60_000,
      qualitySummary: "Kualitas baik, tanpa putus.",
      recordingConsent: "both",
      recordingConsentUserIds: [bambang._id, sari._id],
      recordingEnabled: true,
      createdAt: ago(2),
    })
    for (const [member, role] of [
      [bambang, "host"],
      [sari, "guest"],
    ] as const) {
      await ctx.db.insert("callParticipants", {
        callId,
        userId: member._id,
        role,
        status: "left",
        invitedAt: ago(2),
        joinedAt: ago(2),
        leftAt: ago(2) + 32 * 60_000,
        quality: "good",
      })
    }
    for (const event of [
      { kind: "scheduled" as const, actorId: bambang._id, at: ago(2) },
      { kind: "joined" as const, actorId: bambang._id, at: ago(2) },
      { kind: "joined" as const, actorId: sari._id, at: ago(2) + 60_000 },
      { kind: "ended" as const, actorId: bambang._id, at: ago(2) + 32 * 60_000 },
    ]) {
      await ctx.db.insert("callEvents", {
        callId,
        kind: event.kind,
        actorId: event.actorId,
        payload: { source: "seed" },
        createdAt: event.at,
      })
    }
    await ctx.db.insert("callRecordings", {
      callId,
      assetId: recordingStorage,
      consentedBy: [bambang._id, sari._id],
      retentionUntil: ahead(90),
      accessLog: [
        {
          actorId: admin._id,
          reason: "Pemeriksaan kualitas sesi",
          accessedAt: ago(1),
        },
      ],
      createdAt: ago(2) + 32 * 60_000,
    })

    const cohortSession = await ctx.db
      .query("cohortSessions")
      .withIndex("by_cohort_startsAt", (q) => q.eq("cohortId", cohort._id))
      .collect()
    const scheduledSession = cohortSession.find(
      (session) => session.status === "scheduled",
    )
    const scheduledCallId = await ctx.db.insert("callSessions", {
      roomName: "kalanidhi-bts-2026-01-sesi-3",
      kind: "cohort",
      initiatorId: bambang._id,
      hostId: bambang._id,
      cohortId: cohort._id,
      cohortSessionId: scheduledSession?._id,
      title: "Sesi 3: lengkung ganda",
      status: "scheduled",
      scheduledAt: ahead(5),
      scheduledEndsAt: ahead(5) + 2 * HOUR,
      recordingConsent: "pending",
      createdAt: ago(5),
    })
    for (const member of [bambang, ...cohortStudents]) {
      await ctx.db.insert("callParticipants", {
        callId: scheduledCallId,
        userId: member._id,
        role: member._id === bambang._id ? "host" : "guest",
        status: "invited",
        invitedAt: ago(5),
      })
    }
    await ctx.db.insert("callEvents", {
      callId: scheduledCallId,
      kind: "scheduled",
      actorId: bambang._id,
      payload: { source: "seed" },
      createdAt: ago(5),
    })

    const missedCallId = await ctx.db.insert("callSessions", {
      roomName: "kalanidhi-pra-rani-missed",
      kind: "voice",
      initiatorId: widagdo._id,
      hostId: widagdo._id,
      conversationId: raniConversationId,
      title: "Panggilan tindak lanjut rundown",
      status: "missed",
      startedAt: ago(4),
      endedAt: ago(4) + 60_000,
      endReason: "Tidak dijawab",
      durationMs: 0,
      recordingConsent: "pending",
      createdAt: ago(4),
    })
    for (const [member, role] of [
      [widagdo, "host"],
      [rani, "guest"],
    ] as const) {
      await ctx.db.insert("callParticipants", {
        callId: missedCallId,
        userId: member._id,
        role,
        status: member._id === rani._id ? "invited" : "left",
        invitedAt: ago(4),
        joinedAt: member._id === widagdo._id ? ago(4) : undefined,
        leftAt: member._id === widagdo._id ? ago(4) + 60_000 : undefined,
      })
    }
    await ctx.db.insert("callEvents", {
      callId: missedCallId,
      kind: "missed",
      actorId: widagdo._id,
      payload: { source: "seed" },
      createdAt: ago(4) + 60_000,
    })

    const cancelledCallId = await ctx.db.insert("callSessions", {
      roomName: "kalanidhi-sri-dimas-cancelled",
      kind: "voice",
      initiatorId: sri._id,
      hostId: sri._id,
      conversationId: dimasConversationId,
      title: "Konsultasi pewarnaan nila",
      status: "cancelled",
      scheduledAt: ago(3),
      scheduledEndsAt: ago(3) + 30 * 60_000,
      cancelledAt: ago(3) - 10 * 60_000,
      endReason: "Jadwal bentrok dengan sesi kohort.",
      recordingConsent: "pending",
      createdAt: ago(4),
    })
    for (const [member, role] of [
      [sri, "host"],
      [dimas, "guest"],
    ] as const) {
      await ctx.db.insert("callParticipants", {
        callId: cancelledCallId,
        userId: member._id,
        role,
        status: "declined",
        invitedAt: ago(4),
      })
    }
    await ctx.db.insert("callEvents", {
      callId: cancelledCallId,
      kind: "cancelled",
      actorId: sri._id,
      payload: { source: "seed", reason: "Jadwal bentrok" },
      createdAt: ago(3) - 10 * 60_000,
    })

    return {
      conversations: (await ctx.db.query("conversations").collect()).length,
      messages: (await ctx.db.query("messages").collect()).length,
      calls: (await ctx.db.query("callSessions").collect()).length,
    }
  },
})

export const seedOps = internalMutation({
  args: {},
  handler: async (ctx) => {
    const admin = await seedAdmin(ctx)
    const sari = await userByEmail(ctx, seedEmail("sari"))
    const bambang = await userByEmail(ctx, seedEmail("bambang"))
    const arif = await userByEmail(ctx, seedEmail("arif"))
    const dwi = await userByEmail(ctx, seedEmail("dwi"))
    const anisa = await userByEmail(ctx, seedEmail("anisa"))
    const rani = await userByEmail(ctx, seedEmail("rani"))
    const purnomo = await userByEmail(ctx, seedEmail("purnomo"))
    const order1 = await orderByCode(ctx, "KN-2026-000108")
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
    ).find((item) => item.title === "Pranatacara: jadwal siraman")
    const missedCall = (await ctx.db.query("callSessions").collect()).find(
      (item) => item.status === "missed",
    )
    const submission = await submissionByCode(ctx, "TUG-DWI-BTS-2")
    const certificate = await certificateByCode(ctx, "KN-ANISA-2026")
    const work = await workBySlug(ctx, "batik-soga-lereng")
    const anisaWork = await workBySlug(ctx, "batik-soga-anyaman")

    const leads = [
      {
        intent: "student" as const,
        name: "Ayu Sekar Melati",
        email: "ayu.sekar.melati96@gmail.com",
        whatsapp: "6281392847506",
        interest: "Batik Tulis Soga",
        message:
          "Saya ingin mulai dari kelas pemula. Apakah angkatan Oktober masih ada kursi?",
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
        interest: "Kriya ukir Bantul",
        message: "Kabari saya kalau jalur ukir kayu sudah dibuka.",
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
        interest: "Tenun Gunungkidul",
        message: "Tolong kabari kalau kelas tenun dibuka untuk pemula.",
        source: "landing",
        status: "closed" as const,
        daysAgo: 122,
      },
      {
        intent: "student" as const,
        name: "Heru Santosa",
        email: "heru.santosa84@gmail.com",
        whatsapp: "6282134908571",
        interest: "Batik Tulis Soga",
        message:
          "Saya tetangga sanggar Giriloyo, ingin ikut angkatan perintis kalau masih dibuka.",
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
        createdAt: ago(lead.daysAgo),
        updatedAt: ago(Math.max(0, lead.daysAgo - 1)),
        convertedAt:
          lead.status === "converted"
            ? ago(Math.max(1, lead.daysAgo - 2))
            : undefined,
      })
      await ctx.db.insert("leadAssignments", {
        leadId,
        ownerId: admin._id,
        assignedBy: admin._id,
        createdAt: ago(lead.daysAgo),
      })
      await ctx.db.insert("leadNotes", {
        leadId,
        authorId: admin._id,
        kind: index % 2 === 0 ? "note" : "whatsapp",
        body:
          lead.status === "spam"
            ? "Ditandai spam karena tautan promosi."
            : "Sudah dihubungi dan menunggu balasan.",
        followUpAt: lead.status === "new" ? ahead(1) : undefined,
        createdAt: ago(Math.max(0, lead.daysAgo - 1)),
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
            body: "Saya sudah transfer untuk pesanan KN-2026-000108, tetapi statusnya belum berubah.",
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
            body: "Saya ingin tahu bagian mana yang perlu diperbaiki dari tugas TUG-DWI-BTS-2.",
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
            id: raniConversation?._id ?? "Pranatacara: jadwal siraman",
            label: "Pranatacara: jadwal siraman",
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
            body: "Kartu Karya untuk kain soga sudah terbit, tetapi belum muncul di halaman karya.",
            daysAgo: 226,
          },
          {
            authorId: admin._id,
            kind: "user" as const,
            body: "Sudah saya periksa: karya belum ditautkan ke sertifikat. Sekarang sudah tampil.",
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
        firstResponseAt: ago(ticket.daysAgo - 1),
        lastResponseAt: ago(ticket.daysAgo - 1),
        assignedAt: ago(ticket.daysAgo),
        assignedBy: admin._id,
        resolvedAt:
          ticket.status === "resolved" || ticket.status === "closed"
            ? ago(ticket.daysAgo - 1)
            : undefined,
        resolvedBy:
          ticket.status === "resolved" || ticket.status === "closed"
            ? admin._id
            : undefined,
        resolutionNote:
          ticket.status === "resolved" || ticket.status === "closed"
            ? "Diselesaikan dan dikonfirmasi pemohon."
            : undefined,
        closedAt: ticket.status === "closed" ? ago(ticket.daysAgo - 1) : undefined,
        createdAt: ago(ticket.daysAgo),
        updatedAt: ago(1),
      })
      for (const message of ticket.messages) {
        await ctx.db.insert("supportMessages", {
          ticketId,
          authorId: message.authorId,
          kind: message.kind,
          body: message.body,
          createdAt: ago(message.daysAgo),
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
        createdAt: ago(300 - replyIndex * 21),
        updatedAt: NOW,
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
        readAt: ago(23.9),
        daysAgo: 24,
      },
      {
        recipient: sari,
        channel: "in_app" as const,
        template: "order.paid",
        title: "Pesanan diterima",
        body: "Pesanan KN-2026-000108 sudah dibayar dan sedang disiapkan.",
        entityType: "orders",
        entityId: order1._id,
        readAt: ago(20),
        daysAgo: 24,
      },
      {
        recipient: anisa,
        channel: "in_app" as const,
        template: "payout.released",
        title: "Payout disetujui",
        body: "Payout untuk pesanan KN-2026-000108 sudah disetujui.",
        entityType: "payouts",
        entityId: payoutForOrder1?._id,
        readAt: ago(5),
        daysAgo: 10,
      },
      {
        recipient: dwi,
        channel: "in_app" as const,
        template: "submission.graded",
        title: "Tugas dinilai",
        body: "Tugas pewarnaan soga pertama sudah dinilai. Ada catatan revisi.",
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
        body: "Pesanan KN-2026-000108 sudah dibayar.",
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
        body: "Akses ruang belajar sudah dibuka. Sesi pertama dimulai pekan depan di sanggar Giriloyo.",
        entityType: "cohorts",
        entityId: "BTS-2026-00",
        readAt: ago(387),
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
        readAt: ago(326),
        daysAgo: 327,
      },
      {
        recipient: anisa,
        channel: "in_app" as const,
        template: "work.published",
        title: "Kartu Karya terbit",
        body: "Kain Batik Soga Anyaman sudah tampil di halaman karya dengan Kartu Karya KN-8821.",
        entityType: "works",
        entityId: anisaWork._id,
        readAt: ago(316),
        daysAgo: 318,
      },
      {
        recipient: bambang,
        channel: "email" as const,
        template: "cohort.session_reminder",
        title: "Pengingat sesi live",
        body: "Sesi berikutnya angkatan BTS-2026-01 berlangsung Sabtu pukul 09.00 WIB. Tautan ruang sudah tersedia.",
        entityType: "cohorts",
        entityId: "BTS-2026-01",
        readAt: ago(2),
        daysAgo: 3,
      },
      {
        recipient: rani,
        channel: "in_app" as const,
        template: "order.paid",
        title: "Pesanan dibayar",
        body: "Pesanan KN-2026-000103 sudah dibayar. Mohon siapkan gladi resik sehari sebelum acara.",
        entityType: "orders",
        entityId: "KN-2026-000103",
        readAt: ago(152),
        daysAgo: 154,
      },
      {
        recipient: admin,
        channel: "email" as const,
        template: "payout.held",
        title: "Payout ditahan",
        body: "Payout untuk pesanan KN-2026-000111 ditahan sampai pesanan selesai. Pengajar sudah diberi tahu.",
        entityType: "payouts",
        entityId: "KN-2026-000111",
        readAt: ago(4),
        daysAgo: 5,
      },
      {
        recipient: purnomo,
        channel: "in_app" as const,
        template: "work.published",
        title: "Karya tampil di halaman publik",
        body: "Batik Tulis Soga Lereng sudah tayang. Anda dapat membagikan tautannya.",
        entityType: "works",
        entityId: work._id,
        readAt: ago(208),
        daysAgo: 210,
      },
      {
        recipient: arif,
        channel: "whatsapp" as const,
        template: "enrollment.deadline",
        title: "Tenggat tugas akhir",
        body: "Tugas akhir angkatan BTS-2026-01 jatuh tempo 10 hari lagi. Unggah dokumentasi proses bila sudah selesai.",
        entityType: "enrollments",
        entityId: "BTS-2026-01",
        readAt: undefined,
        daysAgo: 12,
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
        scheduledAt: ago(notification.daysAgo),
        sentAt: isInApp ? ago(notification.daysAgo) : undefined,
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
        createdAt: ago(notification.daysAgo),
        updatedAt: NOW,
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
        lastAttemptAt: ago(delivery.daysAgo),
        nextAttemptAt:
          delivery.status === "pending" ? NOW + 60_000 : undefined,
        responseStatus: delivery.responseStatus,
        error: delivery.error,
        createdAt: ago(delivery.daysAgo),
        updatedAt: NOW,
      })
    }

    return { leads: leads.length, tickets: tickets.length }
  },
})

export const seedSettings = internalMutation({
  args: {},
  handler: async (ctx) => {
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
            "Pendaftaran Batik Tulis Soga angkatan baru dibuka sampai 30 November.",
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
        updatedAt: NOW,
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
        updatedAt: NOW,
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
        updatedAt: NOW,
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
        checkedAt: ago(0),
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
        body: "Kode verifikasi KalaNidhi: {{token}}. Berlaku 15 menit.",
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
        updatedAt: NOW,
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
        createdAt: ago(key.daysAgo),
        lastUsedAt: key.status === "active" ? ago(1) : undefined,
        expiresAt: key.status === "active" ? ahead(180) : undefined,
        revokedAt: key.status === "revoked" ? ago(20) : undefined,
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
        createdAt: ago(200),
        lastUsedAt: ago(61),
        expiresAt: ago(60),
        revokedAt: ago(60),
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
        createdAt: ago(60),
        updatedAt: NOW,
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
        updatedAt: NOW,
      })
      for (const transition of spec.transitions) {
        await ctx.db.insert("flowTransitions", {
          flowKey: spec.key,
          fromState: transition.from,
          toState: transition.to,
          guard: transition.guard,
          slaHours: transition.slaHours,
          requiresRole: transition.requiresRole,
          createdAt: NOW,
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
        updatedAt: NOW,
      })
      for (const automation of spec.automations) {
        await ctx.db.insert("automationRules", {
          key: automation.key,
          flowKey: spec.key,
          kind: automation.kind,
          trigger: automation.trigger,
          action: automation.action,
          enabled: automation.enabled,
          updatedAt: NOW,
        })
      }
    }

    return { settings: settings.length, flows: Object.keys(FLOW_SPECS).length }
  },
})

export const seedGovernance = internalMutation({
  args: {},
  handler: async (ctx) => {
    const admin = await seedAdmin(ctx)
    const sari = await userByEmail(ctx, seedEmail("sari"))
    const dwi = await userByEmail(ctx, seedEmail("dwi"))
    const anisa = await userByEmail(ctx, seedEmail("anisa"))
    const workSoga = await workBySlug(ctx, "batik-soga-anyaman")
    const workNitik = await workBySlug(ctx, "selendang-canting-nitik")
    const workPranatacara = await workBySlug(ctx, "pranatacara-siraman")
    const assets = await ctx.db.query("mediaAssets").collect()
    const imageAsset = assets.find((asset) => asset.kind === "image")
    const call = await ctx.db.query("callSessions").collect()
    const recording = await ctx.db.query("callRecordings").collect()

    const sources = [
      {
        community: "Sanggar Soga Giriloyo",
        sourceName: "Arsip motif dan pewarnaan soga Giriloyo",
        pathId: "batik-tulis-soga",
        workId: workSoga._id,
        permissionDocumentRef: "IZIN-SG-2026-03",
        permissionDate: ago(360),
        accessLevel: "public" as const,
        attribution:
          "Sanggar Soga Giriloyo, Bantul. Pengetahuan diolah bersama pengajar dan kurator.",
        notes: "Motif geometris disusun ulang; motif sakral tidak dipakai.",
        withdrawalStatus: "active" as const,
        status: "active" as const,
      },
      {
        community: "Rumah Warna Pleret",
        sourceName: "Catatan pewarnaan alami Pleret",
        pathId: "batik-tulis-soga",
        workId: workNitik._id,
        permissionDocumentRef: "IZIN-RWL-2026-04",
        permissionDate: ago(300),
        accessLevel: "community" as const,
        attribution:
          "Rumah Warna Pleret, Bantul. Bahan dan takaran dibagikan untuk pelajar terdaftar.",
        notes: "Sebagian takaran hanya untuk pelajar terdaftar.",
        withdrawalStatus: "active" as const,
        status: "active" as const,
      },
      {
        community: "Sanggar Wicara Ngayogyakarta",
        sourceName: "Arsip tata upacara dan rundown siraman",
        pathId: "pranatacara-jawa",
        workId: workPranatacara._id,
        permissionDocumentRef: "IZIN-SW-2026-06",
        permissionDate: ago(220),
        accessLevel: "public" as const,
        attribution:
          "Sanggar Wicara Ngayogyakarta. Rundown disusun ulang untuk konteks kelas.",
        notes: "Rundown tidak memuat data keluarga nyata.",
        withdrawalStatus: "active" as const,
        status: "active" as const,
      },
      {
        community: "Sanggar Ukir Bantul",
        sourceName: "Draf pengantar ukir relief Bantul",
        pathId: "kriya-ukir-bantul",
        workId: undefined,
        permissionDocumentRef: "IZIN-SUJ-2026-11",
        permissionDate: ago(20),
        accessLevel: "restricted" as const,
        attribution:
          "Sanggar Ukir Bantul. Materi masih dalam peninjauan komunitas.",
        notes: "Belum diterbitkan; menunggu persetujuan pengajar.",
        withdrawalStatus: "withdrawal_requested" as const,
        status: "active" as const,
      },
    ]
    const sourceIds: Id<"culturalSources">[] = []
    for (const source of sources) {
      const sourceId = await ctx.db.insert("culturalSources", {
        community: source.community,
        sourceName: source.sourceName,
        pathId: source.pathId,
        workId: source.workId,
        permissionDocumentRef: source.permissionDocumentRef,
        permissionDocumentUrl: `https://kalanidhi.site/dokumen/${source.permissionDocumentRef}`,
        permissionDate: source.permissionDate,
        permissionStatus:
          source.withdrawalStatus === "withdrawal_requested"
            ? "pending"
            : "granted",
        accessLevel: source.accessLevel,
        attribution: source.attribution,
        notes: source.notes,
        withdrawalStatus: source.withdrawalStatus,
        withdrawalRequestedAt:
          source.withdrawalStatus === "withdrawal_requested"
            ? ago(2)
            : undefined,
        status: source.status,
        createdBy: admin._id,
        createdAt: source.permissionDate,
        updatedAt: NOW,
      })
      sourceIds.push(sourceId)
    }

    await ctx.db.insert("takedownRequests", {
      code: "TD-2026-0001",
      targetType: "work",
      targetId: workNitik._id,
      targetLabel: workNitik.title,
      culturalSourceId: sourceIds[1],
      requesterName: "Perwakilan Rumah Warna Pleret",
      requesterContact: "izin.rumahwarna@gmail.com",
      reason:
        "Sebagian catatan takaran pewarna belum boleh dipublikasikan.",
      evidence: "Surat permintaan peninjauan akses, 2 halaman.",
      status: "reviewing",
      createdAt: ago(3),
      updatedAt: NOW,
    })
    await ctx.db.insert("takedownRequests", {
      code: "TD-2026-0002",
      targetType: "media",
      targetId: imageAsset?._id ?? "seed-media",
      targetLabel: imageAsset?.filename ?? "Aset gambar",
      culturalSourceId: sourceIds[0],
      requesterName: "Kurator KalaNidhi",
      requesterContact: "kurator.kalanidhi@gmail.com",
      reason: "Gambar lama diganti dengan foto berizin baru.",
      status: "completed",
      decisionReason: "Aset lama diarsipkan, aset baru sudah terpasang.",
      decidedBy: admin._id,
      decidedAt: ago(15),
      completedAt: ago(15),
      effects: ["media.archived"],
      createdAt: ago(18),
      updatedAt: NOW,
    })
    await ctx.db.insert("takedownRequests", {
      code: "TD-2026-0003",
      targetType: "content",
      targetId: "site",
      targetLabel: "Konten landing",
      requesterName: "Tim kurasi",
      requesterContact: "kurasi.kalanidhi@gmail.com",
      reason: "Permintaan peninjauan teks yang sudah diperbaiki.",
      status: "rejected",
      decisionReason: "Teks sudah diperbaiki sebelum peninjauan.",
      decidedBy: admin._id,
      decidedAt: ago(40),
      createdAt: ago(42),
      updatedAt: NOW,
    })

    await ctx.db.insert("privacyRequests", {
      requesterId: sari._id,
      requesterEmail: sari.email,
      subjectUserId: sari._id,
      kind: "access",
      status: "completed",
      reason: "Meminta salinan data akun dan riwayat belajar.",
      resolution: "Salinan data dikirim melalui email terdaftar.",
      handledBy: admin._id,
      completedBy: admin._id,
      dataScope: "Profil, pendaftaran, tugas, dan sertifikat",
      evidence: "Email permintaan 12 November 2026",
      reviewedAt: ago(5),
      completedAt: ago(4),
      createdAt: ago(6),
      updatedAt: NOW,
    })
    await ctx.db.insert("privacyRequests", {
      requesterId: dwi._id,
      requesterEmail: dwi.email,
      subjectUserId: dwi._id,
      kind: "correction",
      status: "reviewing",
      reason: "Nama pada sertifikat perlu disesuaikan dengan ejaan terbaru.",
      correction: { name: "Dwi Lestari" },
      handledBy: admin._id,
      reviewedAt: ago(6),
      createdAt: ago(8),
      updatedAt: NOW,
    })
    await ctx.db.insert("privacyRequests", {
      requesterId: anisa._id,
      requesterEmail: anisa.email,
      subjectUserId: anisa._id,
      kind: "deletion",
      status: "open",
      reason: "Meminta penghapusan data lama setelah akun tidak aktif.",
      retentionHoldUntil: ahead(30),
      createdAt: ago(1),
      updatedAt: NOW,
    })

    await ctx.db.insert("impersonationSessions", {
      actorId: admin._id,
      targetId: sari._id,
      reason: "Menelusuri kendala unggah tugas.",
      readOnly: true,
      startedAt: ago(3),
      expiresAt: ago(3) + 30 * 60_000,
      endedAt: ago(3) + 20 * 60_000,
    })
    await ctx.db.insert("impersonationSessions", {
      actorId: admin._id,
      targetId: dwi._id,
      reason: "Memeriksa tampilan sertifikat setelah koreksi nama.",
      readOnly: true,
      startedAt: ago(1),
      expiresAt: ahead(1),
    })

    const recordingDoc = recording[0]
    await ctx.db.insert("breakGlassGrants", {
      actorId: admin._id,
      entityType: "call_recording",
      entityId: recordingDoc?._id ?? "seed-recording",
      reason: "Investigasi sengketa kualitas sesi.",
      expiresAt: ahead(2),
      createdAt: ago(1),
    })
    const messageAsset = (await ctx.db.query("messageAssets").collect())[0]
    if (messageAsset) {
      await ctx.db.insert("breakGlassGrants", {
        actorId: admin._id,
        entityType: "message_asset",
        entityId: messageAsset._id,
        reason: "Tinjauan laporan pesan.",
        expiresAt: ago(1),
        revokedAt: ago(1),
        revokedBy: admin._id,
        createdAt: ago(2),
      })
    }

    await ctx.db.insert("contentLocks", {
      contentKey: "site",
      holderId: admin._id,
      acquiredAt: ago(1),
      expiresAt: ago(1) + 15 * 60_000,
    })

    return { sources: sourceIds.length, calls: call.length }
  },
})

const METRIC_DEFINITIONS = [
  {
    key: "lead_conversion",
    label: "Konversi lead",
    definition: "Lead yang selesai dibagi lead yang terkualifikasi pada periode.",
    formula: "converted ÷ qualified",
    owner: "Tim pemasaran",
  },
  {
    key: "enrollment_activation",
    label: "Aktivasi pendaftaran",
    definition: "Pendaftaran aktif dibagi pendaftaran yang dibuat pada periode.",
    formula: "paid enrollments ÷ created enrollments",
    owner: "Tim operasi",
  },
  {
    key: "completion",
    label: "Penyelesaian",
    definition: "Pendaftaran selesai dibagi pendaftaran aktif dan selesai.",
    formula: "completed ÷ active enrollments",
    owner: "Tim belajar",
  },
  {
    key: "submission_rate",
    label: "Tingkat pengiriman tugas",
    definition: "Tugas terkirim dibagi tugas yang diharapkan dari pendaftaran periode.",
    formula: "submitted tasks ÷ expected tasks",
    owner: "Tim belajar",
  },
  {
    key: "assessment_sla_p50",
    label: "SLA penilaian p50",
    definition: "Median jam dari kirim tugas sampai umpan balik pertama.",
    formula: "p50(first feedback − submitted)",
    owner: "Tim pengajar",
  },
  {
    key: "assessment_sla_p90",
    label: "SLA penilaian p90",
    definition: "Persentil 90 jam dari kirim tugas sampai umpan balik pertama.",
    formula: "p90(first feedback − submitted)",
    owner: "Tim pengajar",
  },
  {
    key: "pass_rate",
    label: "Tingkat kelulusan",
    definition: "Tugas disetujui dibagi tugas yang sudah dinilai.",
    formula: "approved ÷ assessed",
    owner: "Tim pengajar",
  },
  {
    key: "certificate_issuance",
    label: "Penerbitan sertifikat",
    definition: "Sertifikat terbit dibagi tugas yang disetujui pada periode.",
    formula: "issued certificates ÷ approved assessments",
    owner: "Tim kredensial",
  },
  {
    key: "seller_activation",
    label: "Aktivasi penjual",
    definition: "Sertifikat dengan karya terbit dalam 30 hari dibagi sertifikat terbit.",
    formula: "first published listing ≤ 30 days ÷ issued certificates",
    owner: "Tim commerce",
  },
  {
    key: "gmv",
    label: "GMV",
    definition: "Nilai bruto pesanan berbayar sebelum refund.",
    formula: "sum(paid order baseAmount)",
    owner: "Tim commerce",
  },
  {
    key: "net_revenue",
    label: "Pendapatan bersih",
    definition: "GMV dikurangi refund dan biaya gerbang pembayaran.",
    formula: "GMV − refunds − gateway fees",
    owner: "Tim keuangan",
  },
  {
    key: "payout_due",
    label: "Payout jatuh tempo",
    definition: "Payout yang sudah disetujui tetapi belum dibayar.",
    formula: "sum(approved payouts gross)",
    owner: "Tim keuangan",
  },
  {
    key: "teacher_load",
    label: "Beban pengajar",
    definition: "Rata-rata peserta aktif per pengajar di kohort aktif.",
    formula: "active students ÷ active cohorts",
    owner: "Tim pengajar",
  },
  {
    key: "cohort_fill",
    label: "Keterisian kohort",
    definition: "Peserta aktif dibagi kapasitas kohort.",
    formula: "active enrolled ÷ capacity",
    owner: "Tim operasi",
  },
  {
    key: "support_first_response_p50",
    label: "Respons dukungan p50",
    definition: "Median menit dari tiket dibuat sampai balasan pertama.",
    formula: "p50(first reply − created)",
    owner: "Tim dukungan",
  },
  {
    key: "support_first_response_p90",
    label: "Respons dukungan p90",
    definition: "Persentil 90 menit dari tiket dibuat sampai balasan pertama.",
    formula: "p90(first reply − created)",
    owner: "Tim dukungan",
  },
  {
    key: "gateway_success",
    label: "Keberhasilan gateway",
    definition: "Pembayaran berhasil dibagi pembayaran yang dibuat.",
    formula: "paid payments ÷ created payments",
    owner: "Tim keuangan",
  },
  {
    key: "content_freshness",
    label: "Kesegaran konten",
    definition: "Hari sejak konten landing terakhir diperbarui.",
    formula: "now − siteContent.updatedAt",
    owner: "Tim konten",
  },
]

function jakartaDate(timestamp: number): string {
  const shifted = new Date(timestamp + 7 * HOUR)
  return shifted.toISOString().slice(0, 10)
}

/** Jakarta midnight for a timestamp, used to bucket daily metrics. */
function jakartaDayStart(timestamp: number): number {
  return Math.floor((timestamp + 7 * HOUR) / DAY) * DAY - 7 * HOUR
}

function quantile(values: number[], fraction: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(fraction * sorted.length) - 1),
  )
  return sorted[index]
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return numerator / denominator
}

export const seedMetrics = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const definition of METRIC_DEFINITIONS) {
      await ctx.db.insert("metricDefinitions", {
        key: definition.key,
        label: definition.label,
        definition: definition.definition,
        formula: definition.formula,
        owner: definition.owner,
        version: 1,
        active: true,
        updatedAt: NOW,
      })
    }

    const [
      leads,
      enrollments,
      submissions,
      assessments,
      certificates,
      works,
      orders,
      payments,
      payouts,
      tickets,
      cohorts,
      teacherRows,
      contentRows,
    ] = await Promise.all([
      ctx.db.query("leads").collect(),
      ctx.db.query("enrollments").collect(),
      ctx.db.query("submissions").collect(),
      ctx.db.query("assessments").collect(),
      ctx.db.query("certificates").collect(),
      ctx.db.query("works").collect(),
      ctx.db.query("orders").collect(),
      ctx.db.query("payments").collect(),
      ctx.db.query("payouts").collect(),
      ctx.db.query("supportTickets").collect(),
      ctx.db.query("cohorts").collect(),
      ctx.db.query("teachers").collect(),
      ctx.db.query("siteContent").collect(),
    ])

    const submissionById = new Map(
      submissions.map((submission) => [submission._id as string, submission]),
    )
    const siteUpdatedAt = contentRows.reduce(
      (latest, row) => Math.max(latest, row.updatedAt),
      SEED_START,
    )
    const teacherCount = Math.max(1, teacherRows.length)
    const activeEnrollmentStatuses = new Set(["active", "completed"])
    const settledPaymentStatuses = new Set(["paid", "refunded"])
    const unpaidPayoutStatuses = new Set([
      "pending",
      "approved",
      "held",
      "processing",
    ])

    const days: number[] = []
    for (
      let dayStart = jakartaDayStart(SEED_START);
      dayStart <= NOW;
      dayStart += DAY
    ) {
      days.push(dayStart)
    }

    for (const dayStart of days) {
      const dayEnd = dayStart + DAY
      const ref = Math.min(NOW, dayEnd)
      const inDay = (timestamp?: number) =>
        timestamp !== undefined && timestamp >= dayStart && timestamp < dayEnd
      const trailing = (timestamp: number | undefined, windowDays = 30) =>
        timestamp !== undefined &&
        timestamp > ref - windowDays * DAY &&
        timestamp <= ref

      const leads30 = leads.filter((lead) => trailing(lead.createdAt))
      const enrollments30 = enrollments.filter((row) =>
        trailing(row.createdAt),
      )
      const enrollments90 = enrollments.filter((row) =>
        trailing(row.createdAt, 90),
      )
      const activeEnrollments = enrollments.filter(
        (row) => row.status === "active",
      )
      const submissions30 = submissions.filter(
        (row) => row.submittedAt && trailing(row.submittedAt),
      )
      const graded30 = assessments.filter(
        (row) => row.status === "completed" && trailing(row.createdAt),
      )
      const certificates30 = certificates.filter((row) =>
        trailing(row.issuedAt),
      )
      const certificates90 = certificates.filter((row) =>
        trailing(row.issuedAt, 90),
      )
      const graded90 = assessments.filter(
        (row) => row.status === "completed" && trailing(row.createdAt, 90),
      )
      const payments30 = payments.filter((row) => trailing(row.createdAt))
      const tickets30 = tickets.filter(
        (row) => trailing(row.createdAt) && row.firstResponseAt,
      )

      const slaHours = graded30
        .map((assessment) => {
          const submission = submissionById.get(
            assessment.submissionId as string,
          )
          if (!submission?.submittedAt) return undefined
          return (assessment.createdAt - submission.submittedAt) / HOUR
        })
        .filter((value): value is number => value !== undefined)

      const responseMinutes = tickets30
        .map((ticket) =>
          ticket.firstResponseAt
            ? (ticket.firstResponseAt - ticket.createdAt) / 60_000
            : undefined,
        )
        .filter((value): value is number => value !== undefined)

      const gmvToday = orders
        .filter((order) => inDay(order.paidAt))
        .reduce((total, order) => total + order.baseAmount, 0)
      const netRevenueToday = Math.round(gmvToday * 0.15)

      const payoutDue = payouts
        .filter(
          (payout) =>
            payout.status !== "paid" &&
            unpaidPayoutStatuses.has(payout.status) &&
            payout.dueAt !== undefined &&
            payout.dueAt <= ref &&
            payout.createdAt <= ref,
        )
        .reduce((total, payout) => total + payout.teacherShare, 0)

      const liveCohorts = cohorts.filter(
        (cohort) => cohort.startDate <= ref && cohort.endDate >= ref,
      )
      const cohortCapacity = liveCohorts.reduce(
        (total, cohort) => total + cohort.capacity,
        0,
      )
      const cohortEnrollments = enrollments.filter(
        (row) =>
          activeEnrollmentStatuses.has(row.status) &&
          liveCohorts.some((cohort) => cohort._id === row.cohortId),
      )

      const approvedAssessments90 = graded90.filter(
        (assessment) => (assessment.score ?? 0) >= 75,
      )
      const certificatesWithWork = certificates30.filter((certificate) =>
        works.some(
          (work) =>
            work.certificateId === certificate._id &&
            work.createdAt !== undefined &&
            work.createdAt >= certificate.issuedAt &&
            work.createdAt <= certificate.issuedAt + 30 * DAY &&
            work.createdAt <= ref,
        ),
      )

      const values: Record<string, number> = {
        lead_conversion: ratio(
          leads30.filter((lead) => lead.status === "converted").length,
          leads30.filter((lead) =>
            ["qualified", "converted"].includes(lead.status),
          ).length,
        ),
        enrollment_activation: ratio(
          enrollments30.filter((row) => activeEnrollmentStatuses.has(row.status))
            .length,
          enrollments30.length,
        ),
        completion: ratio(
          enrollments90.filter(
            (row) => row.completedAt && trailing(row.completedAt),
          ).length,
          enrollments90.length,
        ),
        submission_rate: Math.min(
          1,
          ratio(submissions30.length, Math.max(1, activeEnrollments.length)),
        ),
        assessment_sla_p50: quantile(slaHours, 0.5),
        assessment_sla_p90: quantile(slaHours, 0.9),
        pass_rate: ratio(
          graded30.filter(
            (assessment) =>
              (assessment.score ?? 0) >= 75 ||
              submissionById.get(assessment.submissionId as string)
                ?.status === "approved",
          ).length,
          graded30.length,
        ),
        certificate_issuance: Math.min(
          1,
          ratio(
            certificates90.length,
            Math.max(1, approvedAssessments90.length),
          ),
        ),
        seller_activation: ratio(
          certificatesWithWork.length,
          Math.max(1, certificates30.length),
        ),
        gmv: gmvToday,
        net_revenue: netRevenueToday,
        payout_due: payoutDue,
        teacher_load: ratio(liveCohorts.length, teacherCount),
        cohort_fill: ratio(cohortEnrollments.length, cohortCapacity),
        support_first_response_p50: quantile(responseMinutes, 0.5),
        support_first_response_p90: quantile(responseMinutes, 0.9),
        gateway_success: ratio(
          payments30.filter((payment) =>
            settledPaymentStatuses.has(payment.status),
          ).length,
          Math.max(1, payments30.length),
        ),
        content_freshness: Math.max(
          0,
          Math.floor((ref - siteUpdatedAt) / DAY),
        ),
      }

      for (const definition of METRIC_DEFINITIONS) {
        await ctx.db.insert("dailyMetrics", {
          date: jakartaDate(dayStart),
          metricKey: definition.key,
          value: Math.round((values[definition.key] ?? 0) * 100) / 100,
          computedAt: Math.min(NOW, dayEnd - 1),
        })
      }
    }

    return { definitions: METRIC_DEFINITIONS.length, days: days.length }
  },
})

export const seedAudit = internalMutation({
  args: {},
  handler: async (ctx) => {
    const admin = await seedAdmin(ctx)
    const bambang = await userByEmail(ctx, seedEmail("bambang"))
    const sari = await userByEmail(ctx, seedEmail("sari"))
    const anisa = await userByEmail(ctx, seedEmail("anisa"))
    const order1 = await orderByCode(ctx, "KN-2026-000108")
    const work = await workBySlug(ctx, "batik-soga-anyaman")
    const certificate = await certificateByCode(ctx, "KN-ANISA-2026")
    const submission = await submissionByCode(ctx, "TUG-SARI-BTS-1")
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
        reason: "Verifikasi pengajar batik Giriloyo.",
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
        actorId: bambang._id,
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
        reason: "Pengajuan Kartu Karya untuk kain soga anyaman.",
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
        createdAt: ago(event.daysAgo),
      })
    }

    return { auditLogs: events.length }
  },
})
