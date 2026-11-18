import { v } from "convex/values"

import { internal } from "../../_generated/api"
import { internalAction, internalMutation } from "../../_generated/server"
import { cohortCode, pathSlug } from "../lib/codes"
import { createSeedClock, HOUR } from "../lib/clock"
import {
  cohortByCode,
  conversationByTitle,
  seedAdmin,
  userByEmail,
} from "../lib/lookup"
import { seedEmail } from "../content/identities"

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|")
}

/** Stores the three shared blobs once per run, before any batch uses them. */
export const seedMessagingStorage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const voiceStorage = await ctx.storage.store(
      new Blob(["KalaNidhi seed voice note"], { type: "audio/webm" }),
    )
    const imageStorage = await ctx.storage.store(
      new Blob(["KalaNidhi seed image"], { type: "image/jpeg" }),
    )
    const recordingStorage = await ctx.storage.store(
      new Blob(["KalaNidhi seed call recording"], { type: "audio/webm" }),
    )
    return { voiceStorage, imageStorage, recordingStorage }
  },
})

const messagingGroup = v.union(
  v.literal("direct"),
  v.literal("groups"),
  v.literal("calls"),
)

/**
 * One conversation group per mutation. The three storage blobs are created
 * once by `seedMessagingStorage` and passed in, so no batch re-uploads a blob.
 */
export const seedMessagingBatch = internalMutation({
  args: {
    now: v.number(),
    group: messagingGroup,
    voiceStorage: v.id("_storage"),
    imageStorage: v.id("_storage"),
    recordingStorage: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const clock = createSeedClock(args.now)
    let conversations = 0
    let messages = 0
    let calls = 0

    if (args.group === "direct") {
      const admin = await seedAdmin(ctx)
      const sri = await userByEmail(ctx, seedEmail("sri"))
      const sari = await userByEmail(ctx, seedEmail("sari"))
      const dimas = await userByEmail(ctx, seedEmail("dimas"))
      const rani = await userByEmail(ctx, seedEmail("rani"))
      const nanda = await userByEmail(ctx, seedEmail("nanda"))
      const yusuf = await userByEmail(ctx, seedEmail("yusuf"))
      const anisa = await userByEmail(ctx, seedEmail("anisa"))
      const suwardi = await userByEmail(ctx, seedEmail("suwardi"))
      const galuh = await userByEmail(ctx, seedEmail("galuh"))

      const directId = await ctx.db.insert("conversations", {
        kind: "direct",
        title: "Batik: catatan canting",
        pathId: pathSlug("batikBambu"),
        createdBy: sri._id,
        status: "open",
        pairKey: pairKey(sri._id, sari._id),
        lastMessageAt: clock.ago(1),
        createdAt: clock.ago(20),
        updatedAt: clock.ago(1),
      })
      conversations += 1
      await ctx.db.insert("conversationMembers", {
        conversationId: directId,
        userId: sri._id,
        role: "owner",
        lastReadAt: clock.ago(1),
        lastSeenAt: clock.ago(1),
        joinedAt: clock.ago(20),
      })
      await ctx.db.insert("conversationMembers", {
        conversationId: directId,
        userId: sari._id,
        role: "member",
        lastReadAt: clock.ago(2),
        lastSeenAt: clock.ago(2),
        joinedAt: clock.ago(20),
      })

      const directMessages = [
        {
          senderId: sri._id,
          kind: "text" as const,
          body: "Sari, foto latihan garisnya sudah saya lihat. Tekanan canting di bagian lengkung kanan masih terlalu kuat. Coba turunkan sedikit suhu malam.",
          createdAt: clock.ago(3),
        },
        {
          senderId: sari._id,
          kind: "voice" as const,
          body: undefined,
          createdAt: clock.ago(2),
        },
        {
          senderId: sri._id,
          kind: "text" as const,
          body: "Voice note-nya jelas. Besok kita cek lagi di sesi live, bawa potongan bambu sisa.",
          createdAt: clock.ago(2),
        },
        {
          senderId: sari._id,
          kind: "image" as const,
          body: "Ini hasil setelah suhu malam saya turunkan.",
          createdAt: clock.ago(1),
        },
        {
          senderId: sri._id,
          kind: "text" as const,
          body: "Garisnya sudah jauh lebih rata. Untuk Sabtu bawa bilah bambu 40 cm, kita latihan lengkung ganda.",
          createdAt: clock.ago(0.8),
        },
        {
          senderId: sari._id,
          kind: "text" as const,
          body: "Siap, Bu. Saya juga bawa hasil pewarnaan terakhir untuk diperiksa.",
          createdAt: clock.ago(0.6),
        },
        {
          senderId: sri._id,
          kind: "text" as const,
          body: "Bagus. Datang lima belas menit lebih awal supaya sempat menyiapkan wajan.",
          createdAt: clock.ago(0.4),
        },
      ]
      for (const [index, message] of directMessages.entries()) {
        const messageId = await ctx.db.insert("messages", {
          conversationId: directId,
          senderId: message.senderId,
          kind: message.kind,
          body: message.body,
          createdAt: message.createdAt,
        })
        messages += 1
        if (message.kind === "voice") {
          const assetId = await ctx.db.insert("messageAssets", {
            messageId,
            storageId: args.voiceStorage,
            senderId: message.senderId,
            kind: "audio",
            filename: "catatan-canting.webm",
            mimeType: "audio/webm",
            size: 24_000,
            durationMs: 42_000,
            transcript:
              "Saya sudah coba menurunkan suhu malam, hasilnya lebih rata di bagian lengkung.",
            createdAt: message.createdAt,
          })
          await ctx.db.patch(messageId, { assetId, durationMs: 42_000 })
        }
        if (message.kind === "image") {
          const assetId = await ctx.db.insert("messageAssets", {
            messageId,
            storageId: args.imageStorage,
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
        for (const member of [sri, sari]) {
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
            editorId: sri._id,
            previousBody:
              "Sari, foto latihan garisnya sudah saya lihat. Tekanan canting masih terlalu kuat.",
            nextBody:
              "Sari, foto latihan garisnya sudah saya lihat. Tekanan canting di bagian lengkung kanan masih terlalu kuat. Coba turunkan sedikit suhu malam.",
            createdAt: clock.ago(3) + 5 * 60_000,
          })
          await ctx.db.patch(messageId, { editedAt: clock.ago(3) + 5 * 60_000 })
        }
      }

      const raniConversationId = await ctx.db.insert("conversations", {
        kind: "direct",
        title: "Pranatacara: jadwal siraman",
        pathId: pathSlug("pranatacaraJawa"),
        createdBy: (await userByEmail(ctx, seedEmail("widagdo")))._id,
        status: "open",
        pairKey: pairKey(
          (await userByEmail(ctx, seedEmail("widagdo")))._id,
          rani._id,
        ),
        lastMessageAt: clock.ago(4),
        createdAt: clock.ago(12),
        updatedAt: clock.ago(4),
      })
      conversations += 1
      const widagdo = await userByEmail(ctx, seedEmail("widagdo"))
      for (const member of [widagdo, rani]) {
        await ctx.db.insert("conversationMembers", {
          conversationId: raniConversationId,
          userId: member._id,
          role: member._id === widagdo._id ? "owner" : "member",
          lastReadAt: clock.ago(4),
          lastSeenAt: clock.ago(4),
          joinedAt: clock.ago(12),
        })
      }
      for (const message of [
        {
          senderId: widagdo._id,
          body: "Rani, rundown siraman sudah saya periksa. Bagian penutup perlu satu kalimat penyerahan ke keluarga.",
          createdAt: clock.ago(5),
        },
        {
          senderId: rani._id,
          body: "Sudah saya tambahkan, Pak. Saya kirim ulang malam ini.",
          createdAt: clock.ago(4.2),
        },
        {
          senderId: widagdo._id,
          body: "Sudah saya baca. Bagian penyerahan ke keluarga sudah pas, tinggal latih tempo bicaranya.",
          createdAt: clock.ago(3.8),
        },
        {
          senderId: rani._id,
          body: "Baik. Saya juga sudah menyiapkan susunan keluarga untuk prosesi siraman.",
          createdAt: clock.ago(3.5),
        },
        {
          senderId: widagdo._id,
          body: "Bagus. Besok kita gladi resik pukul 19.00 lewat panggilan, saya kirim tautannya.",
          createdAt: clock.ago(3.2),
        },
      ]) {
        const messageId = await ctx.db.insert("messages", {
          conversationId: raniConversationId,
          senderId: message.senderId,
          kind: "text",
          body: message.body,
          createdAt: message.createdAt,
        })
        messages += 1
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
        pathId: pathSlug("batikBambu"),
        createdBy: sri._id,
        status: "open",
        pairKey: pairKey(sri._id, dimas._id),
        lastMessageAt: clock.ago(6),
        createdAt: clock.ago(15),
        updatedAt: clock.ago(6),
      })
      conversations += 1
      for (const member of [sri, dimas]) {
        await ctx.db.insert("conversationMembers", {
          conversationId: dimasConversationId,
          userId: member._id,
          role: member._id === sri._id ? "owner" : "member",
          lastReadAt: clock.ago(6),
          lastSeenAt: clock.ago(6),
          joinedAt: clock.ago(15),
        })
      }
      for (const message of [
        {
          senderId: sri._id,
          body: "Dimas, hasil pencelupan nila sudah bagus. Jangan lupa catat pH air sebelum pencelupan berikutnya.",
          createdAt: clock.ago(6),
        },
        {
          senderId: dimas._id,
          body: "Baik, Bu. Saya catat takaran dan waktunya. Hasilnya lebih gelap dari percobaan pertama.",
          createdAt: clock.ago(5.6),
        },
        {
          senderId: sri._id,
          body: "Itu masih masuk rentang. Coba ulangi dengan bilah bambu yang sama sebagai pembanding, lalu foto berdampingan.",
          createdAt: clock.ago(5.2),
        },
        {
          senderId: dimas._id,
          body: "Siap, sore ini saya kerjakan. Terima kasih, Bu.",
          createdAt: clock.ago(4.9),
        },
      ]) {
        const messageId = await ctx.db.insert("messages", {
          conversationId: dimasConversationId,
          senderId: message.senderId,
          kind: "text",
          body: message.body,
          createdAt: message.createdAt,
        })
        messages += 1
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
        title: "Pesanan nampan batik bambu",
        pathId: pathSlug("batikBambu"),
        createdBy: anisa._id,
        status: "open",
        pairKey: pairKey(anisa._id, sari._id),
        lastMessageAt: clock.ago(18),
        createdAt: clock.ago(24),
        updatedAt: clock.ago(18),
      })
      conversations += 1
      for (const member of [sari, anisa]) {
        await ctx.db.insert("conversationMembers", {
          conversationId: orderConversationId,
          userId: member._id,
          role: member._id === anisa._id ? "owner" : "member",
          lastReadAt: clock.ago(18),
          lastSeenAt: clock.ago(18),
          joinedAt: clock.ago(24),
        })
      }
      for (const message of [
        {
          senderId: sari._id,
          kind: "text" as const,
          body: "Mbak Anisa, nampannya sudah sampai. Motifnya rapi, terima kasih ya.",
          createdAt: clock.ago(21),
        },
        {
          senderId: anisa._id,
          kind: "text" as const,
          body: "Alhamdulillah, senang mendengarnya. Kalau mau, saya kirim panduan perawatan produk bambunya.",
          createdAt: clock.ago(20.6),
        },
        {
          senderId: sari._id,
          kind: "text" as const,
          body: "Boleh, sekalian tips menyimpan supaya warna tidak cepat pudar.",
          createdAt: clock.ago(20.2),
        },
        {
          senderId: anisa._id,
          kind: "image" as const,
          body: "Sudah saya kirim panduan perawatan produk bambunya.",
          createdAt: clock.ago(19),
        },
        {
          senderId: anisa._id,
          kind: "text" as const,
          body: "Hindari sinar matahari langsung, lipat dengan kertas bebas asam, dan cuci dengan sabun lembut.",
          createdAt: clock.ago(18.6),
        },
        {
          senderId: sari._id,
          kind: "text" as const,
          body: "Sudah saya catat. Terima kasih, Mbak. Nanti saya kabari kalau mau pesan box tisu.",
          createdAt: clock.ago(18),
        },
      ]) {
        const messageId = await ctx.db.insert("messages", {
          conversationId: orderConversationId,
          senderId: message.senderId,
          kind: message.kind,
          body: message.body,
          createdAt: message.createdAt,
        })
        messages += 1
        if (message.kind === "image") {
          const assetId = await ctx.db.insert("messageAssets", {
            messageId,
            storageId: args.imageStorage,
            senderId: message.senderId,
            kind: "image",
            filename: "panduan-perawatan-produk-bambu.jpg",
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
        pathId: pathSlug("batikBambu"),
        createdBy: sri._id,
        status: "archived",
        pairKey: pairKey(sri._id, anisa._id),
        lastMessageAt: clock.ago(300),
        createdAt: clock.ago(360),
        updatedAt: clock.ago(300),
      })
      conversations += 1
      for (const member of [sri, anisa]) {
        await ctx.db.insert("conversationMembers", {
          conversationId: mentorConversationId,
          userId: member._id,
          role: member._id === sri._id ? "owner" : "member",
          lastReadAt: clock.ago(300),
          lastSeenAt: clock.ago(300),
          joinedAt: clock.ago(360),
          leftAt: clock.ago(299),
        })
      }
      for (const message of [
        {
          senderId: anisa._id,
          body: "Bu, saya sudah menyelesaikan pelorodan. Besok saya unggah enam foto prosesnya.",
          createdAt: clock.ago(356),
        },
        {
          senderId: sri._id,
          body: "Bagus. Pastikan foto bahan dan takaran ikut, bukan hanya hasil akhir.",
          createdAt: clock.ago(355),
        },
        {
          senderId: anisa._id,
          body: "Sudah saya susun per tahap. Ada satu foto fiksasi yang kurang fokus, saya ulang.",
          createdAt: clock.ago(354),
        },
        {
          senderId: sri._id,
          body: "Kirim yang jelas saja. Nanti saya nilai dan ajukan Kartu Karya.",
          createdAt: clock.ago(353),
        },
        {
          senderId: anisa._id,
          body: "Terima kasih, Bu. Saya juga ingin mengajukan diri sebagai pengajar pendamping.",
          createdAt: clock.ago(300),
        },
        {
          senderId: sri._id,
          body: "Boleh. Setelah sertifikat terbit, ajukan lewat menu pengajar.",
          createdAt: clock.ago(300),
        },
      ]) {
        const messageId = await ctx.db.insert("messages", {
          conversationId: mentorConversationId,
          senderId: message.senderId,
          kind: "text",
          body: message.body,
          createdAt: message.createdAt,
        })
        messages += 1
        for (const member of [sri, anisa]) {
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
        lastMessageAt: clock.ago(8),
        createdAt: clock.ago(9),
        updatedAt: clock.ago(8),
      })
      conversations += 1
      for (const member of [nanda, yusuf]) {
        await ctx.db.insert("conversationMembers", {
          conversationId: blockedConversationId,
          userId: member._id,
          role: "member",
          lastReadAt: clock.ago(8),
          lastSeenAt: clock.ago(8),
          joinedAt: clock.ago(9),
        })
      }
      const flaggedMessageId = await ctx.db.insert("messages", {
        conversationId: blockedConversationId,
        senderId: yusuf._id,
        kind: "text",
        body: "Ini tautan grup lain, gabung saja di sana.",
        containsExternalLink: true,
        createdAt: clock.ago(8),
      })
      messages += 1
      await ctx.db.insert("messageFlags", {
        messageId: flaggedMessageId,
        reportedBy: nanda._id,
        reason: "Pesan berisi tautan eksternal dan ajakan keluar platform.",
        status: "open",
        createdAt: clock.ago(8),
      })
      await ctx.db.insert("blocks", {
        blockerId: nanda._id,
        blockedId: yusuf._id,
        reason: "Pesan eksternal berulang.",
        createdAt: clock.ago(8),
      })
      await ctx.db.insert("messageAccessGrants", {
        conversationId: blockedConversationId,
        actorId: admin._id,
        reason: "Tinjauan moderasi laporan pesan.",
        expiresAt: clock.ahead(1),
        createdAt: clock.ago(1),
      })
      await ctx.db.insert("messagingRestrictions", {
        userId: yusuf._id,
        actorId: admin._id,
        reason: "Peringatan pengiriman tautan eksternal.",
        until: clock.ago(1),
        liftedAt: clock.ago(1),
        createdAt: clock.ago(7),
      })
      await ctx.db.insert("messageUploadIntents", {
        conversationId: directId,
        senderId: sari._id,
        expiresAt: clock.ago(1),
        consumedAt: clock.ago(1),
        createdAt: clock.ago(1),
      })

      const aksaraConversationId = await ctx.db.insert("conversations", {
        kind: "direct",
        title: "Aksara: koreksi pasangan dan spasi",
        pathId: pathSlug("aksaraJawa"),
        createdBy: suwardi._id,
        status: "open",
        pairKey: pairKey(suwardi._id, galuh._id),
        lastMessageAt: clock.ago(122),
        createdAt: clock.ago(124),
        updatedAt: clock.ago(122),
      })
      conversations += 1
      for (const member of [suwardi, galuh]) {
        await ctx.db.insert("conversationMembers", {
          conversationId: aksaraConversationId,
          userId: member._id,
          role: member._id === suwardi._id ? "owner" : "member",
          lastReadAt: clock.ago(122),
          lastSeenAt: clock.ago(122),
          joinedAt: clock.ago(124),
        })
      }
      for (const message of [
        {
          senderId: suwardi._id,
          body: "Galuh, draf lembar uji aksara-mu sudah saya baca. Pasangan ra sudah benar, tetapi masih ada spasi di tengah kalimat ketiga.",
          createdAt: clock.ago(123.6),
        },
        {
          senderId: galuh._id,
          body: "Terima kasih, Pak. Saya kira spasi setelah pada lingsa masih boleh.",
          createdAt: clock.ago(123.2),
        },
        {
          senderId: suwardi._id,
          body: "Pada lingsa tetap menempel tanpa spasi, sama seperti aksara lain di sekitarnya.",
          createdAt: clock.ago(122.8),
        },
        {
          senderId: galuh._id,
          body: "Sudah saya perbaiki dan unggah ulang. Bagian taling dan pepet juga saya rekam lagi.",
          createdAt: clock.ago(122.4),
        },
        {
          senderId: suwardi._id,
          body: "Bagus. Untuk undangan yang kamu tulis, kirim dulu ejaan Latin-nya supaya saya bisa cek nama sebelum naik ke aksara.",
          createdAt: clock.ago(122),
        },
      ]) {
        const messageId = await ctx.db.insert("messages", {
          conversationId: aksaraConversationId,
          senderId: message.senderId,
          kind: "text",
          body: message.body,
          createdAt: message.createdAt,
        })
        messages += 1
        for (const member of [suwardi, galuh]) {
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
    }

    if (args.group === "groups") {
      const admin = await seedAdmin(ctx)
      const sri = await userByEmail(ctx, seedEmail("sri"))
      const sari = await userByEmail(ctx, seedEmail("sari"))
      const dwi = await userByEmail(ctx, seedEmail("dwi"))
      const ratih = await userByEmail(ctx, seedEmail("ratih"))
      const cohort = await cohortByCode(ctx, cohortCode("bbm2026_01"))
      const cohortStudents = await Promise.all(
        ["sari", "dwi", "bayu", "nanda", "ratih", "yusuf", "melati", "arif"].map(
          (key) => userByEmail(ctx, seedEmail(key)),
        ),
      )

      const cohortConversationId = await ctx.db.insert("conversations", {
        kind: "cohort",
        title: "Batik Bambu, Angkatan 1",
        pathId: pathSlug("batikBambu"),
        cohortId: cohort._id,
        createdBy: sri._id,
        status: "open",
        lastMessageAt: clock.ago(1),
        createdAt: clock.ago(40),
        updatedAt: clock.ago(1),
      })
      conversations += 1
      for (const member of [sri, ...cohortStudents]) {
        await ctx.db.insert("conversationMembers", {
          conversationId: cohortConversationId,
          userId: member._id,
          role: member._id === sri._id ? "owner" : "member",
          lastReadAt: clock.ago(1),
          lastSeenAt: clock.ago(1),
          joinedAt: clock.ago(40),
        })
      }
      for (const message of [
        {
          senderId: undefined,
          kind: "system" as const,
          body: "Kohort dibuka. Sesi pertama dimulai 14 hari lalu, rekamannya tersedia di Jadwal.",
          createdAt: clock.ago(40),
        },
        {
          senderId: sri._id,
          kind: "text" as const,
          body: "Untuk sesi besok, bawa bilah bambu yang sudah direbus dan diamplas. Kita mulai dari latihan lengkung ganda.",
          createdAt: clock.ago(2),
        },
        {
          senderId: sari._id,
          kind: "text" as const,
          body: "Baik, Bu. Saya sudah siapkan dua potong bambu sisa untuk latihan.",
          createdAt: clock.ago(1.4),
        },
        {
          senderId: dwi._id,
          kind: "text" as const,
          body: "Bu, apakah bilah bambu boleh diganti jenis lain untuk latihan di rumah?",
          createdAt: clock.ago(23.2),
        },
        {
          senderId: sri._id,
          kind: "text" as const,
          body: "Untuk latihan boleh. Untuk tugas akhir tetap pakai primis supaya hasil pewarnaan bisa dibandingkan.",
          createdAt: clock.ago(1.1),
        },
        {
          senderId: ratih._id,
          kind: "text" as const,
          body: "Catatan sesi kemarin sudah saya salin. Bagian fiksasi warna masih perlu saya ulang.",
          createdAt: clock.ago(23.05),
        },
        {
          senderId: sri._id,
          kind: "text" as const,
          body: "Iya, ulangi fiksasi dengan waktu yang sama. Catat suhu airnya, jangan hanya takaran bahan.",
          createdAt: clock.ago(0.8),
        },
      ]) {
        const messageId = await ctx.db.insert("messages", {
          conversationId: cohortConversationId,
          senderId: message.senderId,
          kind: message.kind,
          body: message.body,
          createdAt: message.createdAt,
        })
        messages += 1
        for (const member of [sri, ...cohortStudents]) {
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
        supportConsentAt: clock.ago(24),
        lastMessageAt: clock.ago(23.05),
        createdAt: clock.ago(24),
        updatedAt: clock.ago(23.05),
      })
      conversations += 1
      for (const member of [sari, admin]) {
        await ctx.db.insert("conversationMembers", {
          conversationId: supportConversationId,
          userId: member._id,
          role: member._id === admin._id ? "support" : "member",
          lastReadAt: clock.ago(23.05),
          lastSeenAt: clock.ago(23.05),
          joinedAt: clock.ago(24),
        })
      }
      for (const message of [
        {
          senderId: sari._id,
          body: "Saya sudah transfer untuk pesanan KN-2026-000108, tetapi statusnya belum berubah.",
          createdAt: clock.ago(24),
        },
        {
          senderId: admin._id,
          body: "Terima kasih, Sari. Saya cek mutasi gateway dan akan kabari di tiket yang sama.",
          createdAt: clock.ago(23.6),
        },
        {
          senderId: admin._id,
          body: "Mutasi sudah cocok dengan nominal unik 1.450.037. Status pesanan saya ubah ke dibayar.",
          createdAt: clock.ago(23.2),
        },
        {
          senderId: sari._id,
          body: "Sudah masuk sekarang, terima kasih. Saya tunggu kabar pengirimannya.",
          createdAt: clock.ago(23.1),
        },
        {
          senderId: admin._id,
          body: "Baik, tiket saya tutup. Kalau ada kendala lain, buka chat lagi kapan saja.",
          createdAt: clock.ago(23.05),
        },
      ]) {
        const messageId = await ctx.db.insert("messages", {
          conversationId: supportConversationId,
          senderId: message.senderId,
          kind: "text",
          body: message.body,
          createdAt: message.createdAt,
        })
        messages += 1
        for (const member of [sari, admin]) {
          await ctx.db.insert("messageReceipts", {
            messageId,
            userId: member._id,
            deliveredAt: message.createdAt + 1_000,
            readAt: message.createdAt + 20_000,
          })
        }
      }

      const systemConversationId = await ctx.db.insert("conversations", {
        kind: "system",
        title: "Pemberitahuan platform",
        createdBy: admin._id,
        status: "open",
        lastMessageAt: clock.ago(1),
        createdAt: clock.ago(30),
        updatedAt: clock.ago(1),
      })
      conversations += 1
      await ctx.db.insert("conversationMembers", {
        conversationId: systemConversationId,
        userId: admin._id,
        role: "owner",
        lastReadAt: clock.ago(1),
        lastSeenAt: clock.ago(1),
        joinedAt: clock.ago(30),
      })
      for (const notice of [
        {
          body: "Pemeliharaan terjadwal Minggu, 16 November 2026 pukul 01.00–03.00 WIB. Ruang belajar tetap dapat dibuka; unggahan tugas mungkin tertunda beberapa menit.",
          createdAt: clock.ago(1.5),
        },
        {
          body: "Sertifikat angkatan perintis sudah terbit dan dapat diverifikasi lewat halaman Verifikasi. Gunakan kode yang tertera pada sertifikat.",
          createdAt: clock.ago(1),
        },
      ]) {
        await ctx.db.insert("messages", {
          conversationId: systemConversationId,
          kind: "system",
          body: notice.body,
          createdAt: notice.createdAt,
        })
        messages += 1
      }
    }

    if (args.group === "calls") {
      const admin = await seedAdmin(ctx)
      const sri = await userByEmail(ctx, seedEmail("sri"))
      const sari = await userByEmail(ctx, seedEmail("sari"))
      const widagdo = await userByEmail(ctx, seedEmail("widagdo"))
      const rani = await userByEmail(ctx, seedEmail("rani"))
      const dimas = await userByEmail(ctx, seedEmail("dimas"))
      const cohort = await cohortByCode(ctx, cohortCode("bbm2026_01"))
      const direct = await conversationByTitle(ctx, "Batik: catatan canting")
      const raniConversation = await conversationByTitle(
        ctx,
        "Pranatacara: jadwal siraman",
      )
      const dimasConversation = await conversationByTitle(
        ctx,
        "Pewarnaan alami: catatan nila",
      )
      const cohortStudents = await Promise.all(
        ["sari", "dwi", "bayu", "nanda", "ratih", "yusuf", "melati", "arif"].map(
          (key) => userByEmail(ctx, seedEmail(key)),
        ),
      )

      const callId = await ctx.db.insert("callSessions", {
        roomName: "kalanidhi-bbm-2026-01-review",
        kind: "voice",
        initiatorId: sri._id,
        hostId: sri._id,
        conversationId: direct._id,
        title: "Tinjauan canting bersama Sari",
        status: "ended",
        startedAt: clock.ago(2),
        endedAt: clock.ago(2) + 32 * 60_000,
        endedBy: sri._id,
        endReason: "Sesi selesai",
        durationMs: 32 * 60_000,
        qualitySummary: "Kualitas baik, tanpa putus.",
        recordingConsent: "both",
        recordingConsentUserIds: [sri._id, sari._id],
        recordingEnabled: true,
        createdAt: clock.ago(2),
      })
      calls += 1
      for (const [member, role] of [
        [sri, "host"],
        [sari, "guest"],
      ] as const) {
        await ctx.db.insert("callParticipants", {
          callId,
          userId: member._id,
          role,
          status: "left",
          invitedAt: clock.ago(2),
          joinedAt: clock.ago(2),
          leftAt: clock.ago(2) + 32 * 60_000,
          quality: "good",
        })
      }
      for (const event of [
        { kind: "scheduled" as const, actorId: sri._id, at: clock.ago(2) },
        { kind: "joined" as const, actorId: sri._id, at: clock.ago(2) },
        {
          kind: "joined" as const,
          actorId: sari._id,
          at: clock.ago(2) + 60_000,
        },
        {
          kind: "ended" as const,
          actorId: sri._id,
          at: clock.ago(2) + 32 * 60_000,
        },
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
        assetId: args.recordingStorage,
        consentedBy: [sri._id, sari._id],
        retentionUntil: clock.ahead(90),
        accessLog: [
          {
            actorId: admin._id,
            reason: "Pemeriksaan kualitas sesi",
            accessedAt: clock.ago(1),
          },
        ],
        createdAt: clock.ago(2) + 32 * 60_000,
      })

      const cohortSessions = await ctx.db
        .query("cohortSessions")
        .withIndex("by_cohort_startsAt", (q) => q.eq("cohortId", cohort._id))
        .collect()
      const scheduledSession = cohortSessions.find(
        (session) => session.status === "scheduled",
      )
      const scheduledCallId = await ctx.db.insert("callSessions", {
        roomName: "kalanidhi-bbm-2026-01-sesi-3",
        kind: "cohort",
        initiatorId: sri._id,
        hostId: sri._id,
        cohortId: cohort._id,
        cohortSessionId: scheduledSession?._id,
        title: "Sesi 3: lengkung ganda",
        status: "scheduled",
        scheduledAt: clock.ahead(5),
        scheduledEndsAt: clock.ahead(5) + 2 * HOUR,
        recordingConsent: "pending",
        createdAt: clock.ago(5),
      })
      calls += 1
      for (const member of [sri, ...cohortStudents]) {
        await ctx.db.insert("callParticipants", {
          callId: scheduledCallId,
          userId: member._id,
          role: member._id === sri._id ? "host" : "guest",
          status: "invited",
          invitedAt: clock.ago(5),
        })
      }
      await ctx.db.insert("callEvents", {
        callId: scheduledCallId,
        kind: "scheduled",
        actorId: sri._id,
        payload: { source: "seed" },
        createdAt: clock.ago(5),
      })

      const missedCallId = await ctx.db.insert("callSessions", {
        roomName: "kalanidhi-pra-rani-missed",
        kind: "voice",
        initiatorId: widagdo._id,
        hostId: widagdo._id,
        conversationId: raniConversation._id,
        title: "Panggilan tindak lanjut rundown",
        status: "missed",
        startedAt: clock.ago(4),
        endedAt: clock.ago(4) + 60_000,
        endReason: "Tidak dijawab",
        durationMs: 0,
        recordingConsent: "pending",
        createdAt: clock.ago(4),
      })
      calls += 1
      for (const [member, role] of [
        [widagdo, "host"],
        [rani, "guest"],
      ] as const) {
        await ctx.db.insert("callParticipants", {
          callId: missedCallId,
          userId: member._id,
          role,
          status: member._id === rani._id ? "invited" : "left",
          invitedAt: clock.ago(4),
          joinedAt: member._id === widagdo._id ? clock.ago(4) : undefined,
          leftAt:
            member._id === widagdo._id
              ? clock.ago(4) + 60_000
              : undefined,
        })
      }
      await ctx.db.insert("callEvents", {
        callId: missedCallId,
        kind: "missed",
        actorId: widagdo._id,
        payload: { source: "seed" },
        createdAt: clock.ago(4) + 60_000,
      })

      const cancelledCallId = await ctx.db.insert("callSessions", {
        roomName: "kalanidhi-sri-dimas-cancelled",
        kind: "voice",
        initiatorId: sri._id,
        hostId: sri._id,
        conversationId: dimasConversation._id,
        title: "Konsultasi pewarnaan nila",
        status: "cancelled",
        scheduledAt: clock.ago(3),
        scheduledEndsAt: clock.ago(3) + 30 * 60_000,
        cancelledAt: clock.ago(3) - 10 * 60_000,
        endReason: "Jadwal bentrok dengan sesi kohort.",
        recordingConsent: "pending",
        createdAt: clock.ago(4),
      })
      calls += 1
      for (const [member, role] of [
        [sri, "host"],
        [dimas, "guest"],
      ] as const) {
        await ctx.db.insert("callParticipants", {
          callId: cancelledCallId,
          userId: member._id,
          role,
          status: "declined",
          invitedAt: clock.ago(4),
        })
      }
      await ctx.db.insert("callEvents", {
        callId: cancelledCallId,
        kind: "cancelled",
        actorId: sri._id,
        payload: { source: "seed", reason: "Jadwal bentrok" },
        createdAt: clock.ago(3) - 10 * 60_000,
      })
    }

    return { conversations, messages, calls }
  },
})

/** Drives the three conversation groups; storage blobs are created once. */
export const seedMessaging = internalAction({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const storage = await ctx.runMutation(
      internal.seed.domains.messaging.seedMessagingStorage,
      {},
    )
    const totals = { conversations: 0, messages: 0, calls: 0 }
    for (const group of ["direct", "groups", "calls"] as const) {
      const batch = await ctx.runMutation(
        internal.seed.domains.messaging.seedMessagingBatch,
        {
          now: args.now,
          group,
          voiceStorage: storage.voiceStorage,
          imageStorage: storage.imageStorage,
          recordingStorage: storage.recordingStorage,
        },
      )
      totals.conversations += batch.conversations
      totals.messages += batch.messages
      totals.calls += batch.calls
    }
    return totals
  },
})
