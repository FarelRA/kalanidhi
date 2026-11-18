import { v } from "convex/values"

import { internal } from "../../_generated/api"
import type { Doc, Id } from "../../_generated/dataModel"
import { internalAction, internalMutation, type MutationCtx } from "../../_generated/server"
import { cohortCode, pathSlug } from "../lib/codes"
import { createSeedClock, DAY, HOUR } from "../lib/clock"
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
      const flaggedReplyId = await ctx.db.insert("messages", {
        conversationId: blockedConversationId,
        senderId: nanda._id,
        kind: "text",
        body: "Grup apa ini? Saya sudah daftar lewat halaman jalur, kok diajak ke tempat lain.",
        createdAt: clock.ago(7.8),
      })
      messages += 1
      void flaggedReplyId
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

/* -------------------------------------------------------------------------
 * Growth-driven activity
 *
 * The growth intake creates learners, cohorts, orders, and support tickets.
 * These batches turn those relationships into conversations and calls. Every
 * message sender is a conversation member, every timestamp sits after the
 * relationship started, and the copy is written per path instead of repeated
 * from one template.
 * ---------------------------------------------------------------------- */

const growthGroup = v.union(
  v.literal("cohort"),
  v.literal("direct"),
  v.literal("order"),
  v.literal("support"),
)

function growthPairKey(a: string, b: string): string {
  return [a, b].sort().join("|")
}

function activityTimes(
  start: number,
  end: number,
  count: number,
  seed: number,
): number[] {
  const span = Math.max(HOUR, end - start)
  const times: number[] = []
  for (let index = 0; index < count; index += 1) {
    const fraction = (index + 1) / (count + 1)
    const target = start + span * fraction
    const dayStart = Math.floor(target / DAY) * DAY
    const hour = 8 + ((seed + index * 5) % 13)
    const minute = (seed * 7 + index * 13) % 60
    times.push(
      Math.min(
        end,
        Math.max(start, dayStart + hour * HOUR + minute * 60_000),
      ),
    )
  }
  return times.sort((a, b) => a - b)
}

type PathLines = {
  teacher: string[]
  student: string[]
}

function cohortLines(pathId: string): PathLines {
  if (pathId === pathSlug("aksaraJawa")) {
    return {
      teacher: [
        "Untuk Sabtu, coba tulis ulang kalimat ketiga tanpa spasi. Bagian pasangan ra masih sering kelewat.",
        "Rekaman sesi 2 sudah saya taruh di Jadwal. Yang perlu didengar ulang itu bagian taling dan pepet, menit 14 ke atas.",
        "Jangan buru-buru naik ke kalimat panjang. Selesaikan dulu satu baris yang bersih, besok kita lanjut.",
        "Yang kemarin belum unggah, kirim foto lembarnya malam ini ya. Saya cek satu per satu.",
      ],
      student: [
        "Pak, saya sudah coba tulis ulang. Spasi di akhir kalimat masih suka muncul sendiri, itu kenapa ya?",
        "Rekaman sesi 2 muter terus di HP saya, tapi di laptop bisa. Nanti saya catat dari laptop.",
        "Punya saya masih kebalik pasangan ha dan na. Sudah saya tandai di buku, nanti saya tanya pas sesi.",
        "Siap pak, malam ini saya kirim. Aksaranya masih agak miring soalnya.",
      ],
    }
  }
  if (pathId === pathSlug("pranatacaraJawa")) {
    return {
      teacher: [
        "Rundown siraman sudah saya baca. Bagian penyerahan ke keluarga perlu satu kalimat lagi, jangan terlalu cepat.",
        "Besok latihan tempo. Bawa catatan urutan acara yang sudah ditandai, kita potong bagian yang terlalu panjang.",
        "Untuk sesi 3, coba hafalkan pembuka tanpa membaca. Sisanya boleh bawa catatan.",
        "Yang mau saya dengar besok itu kejelasan suku kata, bukan hafalan cepat.",
      ],
      student: [
        "Pak, kalimat penyerahan saya tambah satu baris, tapi jadi kepanjangan. Dipotong di mana enaknya?",
        "Saya sudah latihan tempo di rumah. Pas bagian midodareni masih suka kecepatan sendiri.",
        "Besok saya bawa catatan yang sudah ditandai. Bagian sambutan tamu saya belum hafal.",
        "Siap pak. Saya rekam latihan tadi, nanti saya kirim buat dicek.",
      ],
    }
  }
  return {
    teacher: [
      "Untuk Sabtu bawa bilah 40 cm yang sudah direbus. Kalau belum sempat, pakai yang kemarin dulu, nanti kita ulang di sesi 3.",
      "Garis lengkung kanan masih terlalu tebal. Turunkan sedikit suhu malam, jangan tambah tekanan.",
      "Rekaman sesi 2 ada di menu Jadwal. Bagian nembok menit 18 ke atas yang penting untuk tugas akhir.",
      "Yang fotonya kurang fokus, ambil ulang dari arah cahaya miring. Saya perlu lihat garisnya, bukan cuma hasil akhir.",
    ],
    student: [
      "Bu, punya saya masih ada getah di ujung. Direbus lagi atau diamplas aja?",
      "Sudah saya turunkan suhunya, Bu. Tapi malah ada bagian yang putus, apa terlalu dingin?",
      "Rekaman sesi 2 saya catat ulang. Bagian fiksasi warna masih belum saya pahami.",
      "Bu, malamnya netes ke kain yang sudah diwarnai. Masih bisa ditambal atau diulang dari awal?",
    ],
  }
}

const DIRECT_TITLES = [
  "Catatan garis dan tekanan",
  "Tanya tugas akhir",
  "Jadwal susulan",
  "Koreksi latihan minggu ini",
  "Bahan untuk sesi berikutnya",
  "Rekaman yang belum sempat diputar",
  "Tanda tangan di Kartu Karya",
  "Latihan tempo dan suara",
] as const

const DIRECT_TEACHER_LINES = [
  "Sudah saya lihat fotonya. Bagian lengkung kanan masih goyang; coba mulai dari garis lurus pendek dulu.",
  "Untuk tugas akhir, unggah prosesnya per tahap. Saya tidak perlu hasil yang sempurna, yang penting langkahnya kelihatan.",
  "Besok saya buka jam 16.00 kalau mau latihan tambahan. Bawa hasil yang kemarin, kita bedah bareng.",
  "Catatan saya sudah saya kirim di menu tugas. Poin utamanya ada di dua kalimat terakhir.",
  "Jangan lupa istirahat. Tangan yang capek biasanya bikin garis jadi tidak rata.",
  "Kalau rekamannya belum bisa diputar, pakai catatan sesi dulu. Nanti saya cek ulang.",
] as const

const DIRECT_STUDENT_LINES = [
  "Bu, ini foto latihan saya yang terbaru. Masih ada bagian yang belum rapi di ujung.",
  "Tugas akhir saya sudah saya unggah tadi malam. Takutnya fotonya kurang jelas.",
  "Besok saya bisa datang lebih awal. Mau saya bawa alat sendiri atau pakai yang di sanggar?",
  "Catatannya sudah saya baca. Bagian yang kedua masih belum saya mengerti.",
  "Saya coba latihan lagi sore ini. Kalau masih sama, saya kirim video pendek ya Bu.",
  "Rekamannya sudah bisa diputar. Saya catat bagian nembok dan fiksasi.",
] as const

const ORDER_LINES = [
  {
    buyer: "Mbak, nampannya masih ada? Yang motif parang kemarin.",
    maker: "Masih, tinggal satu. Bisa saya kirim Jumat kalau alamatnya masih yang di Bantul.",
  },
  {
    buyer: "Sudah sampai, Mbak. Motifnya rapi, tapi box-nya agak lembap di sudut.",
    maker: "Itu dari pengemasan, bukan bahannya. Jemur sebentar di tempat teduh, jangan kena matahari langsung.",
  },
  {
    buyer: "Untuk undangan 50 lembar, masih bisa selesai sebelum tanggal 20?",
    maker: "Bisa, asal teks Latin-nya masuk minggu ini. Saya tulis tangan, jadi tidak bisa dikebut di akhir.",
  },
  {
    buyer: "Jasanya untuk acara Sabtu pagi, bisa datang jam 6?",
    maker: "Bisa. Saya biasanya datang satu jam lebih awal untuk cek sound dan urutan.",
  },
  {
    buyer: "Warnanya lebih gelap dari foto. Apakah memang begitu?",
    maker: "Bilahnya beda, jadi hasilnya ikut beda. Kalau terlalu jauh, saya bisa tukar dengan yang lebih terang.",
  },
  {
    buyer: "Pak, hiasan dindingnya sudah saya gantung. Tamu banyak yang tanya.",
    maker: "Senang mendengar itu. Kalau mau, saya bisa buat ukuran yang lebih kecil untuk hadiah.",
  },
] as const

async function addMessage(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  senderId: Id<"users"> | undefined,
  body: string | undefined,
  createdAt: number,
  kind: "text" | "system" = "text",
): Promise<Id<"messages">> {
  return await ctx.db.insert("messages", {
    conversationId,
    senderId,
    kind,
    body,
    createdAt,
  })
}

export const seedGrowthMessagingBatch = internalMutation({
  args: {
    now: v.number(),
    group: growthGroup,
    start: v.number(),
    end: v.number(),
  },
  handler: async (ctx, args) => {
    let conversations = 0
    let messages = 0
    const users = await ctx.db.query("users").collect()
    const growthUsers = users.filter((user) =>
      user.authUserId.startsWith("seed-growth-"),
    )
    const growthIds = new Set(growthUsers.map((user) => user._id as string))
    const userById = new Map(users.map((user) => [user._id as string, user]))
    const admin = users.find(
      (user) => user.roles.includes("admin") && user.status === "active",
    )
    if (!admin) return { conversations, messages }

    if (args.group === "cohort") {
      const cohorts = (await ctx.db.query("cohorts").collect())
        .filter((cohort) => cohort.code.startsWith("GRW-"))
        .sort((a, b) => a.code.localeCompare(b.code))
        .slice(args.start, args.end)
      const enrollments = await ctx.db.query("enrollments").collect()
      for (const [index, cohort] of cohorts.entries()) {
        const members = enrollments
          .filter(
            (row) =>
              row.cohortId === cohort._id &&
              growthIds.has(row.studentId as string) &&
              row.status !== "pending_payment",
          )
          .sort((a, b) => a.enrolledAt - b.enrolledAt)
        if (members.length === 0) continue
        const teacher = userById.get(cohort.teacherId as string)
        if (!teacher) continue
        const createdAt = Math.max(
          cohort.startDate - 3 * DAY,
          cohort.createdAt,
        )
        const lastMessageAt = Math.min(
          args.now - HOUR,
          cohort.endDate - HOUR,
        )
        const conversationId = await ctx.db.insert("conversations", {
          kind: "cohort",
          title: `${cohort.title} • ${cohort.code}`,
          pathId: cohort.pathId,
          cohortId: cohort._id,
          createdBy: teacher._id,
          status: cohort.status === "completed" ? "archived" : "open",
          lastMessageAt,
          createdAt,
          updatedAt: lastMessageAt,
        })
        conversations += 1
        for (const member of [teacher, ...members.map((row) => userById.get(row.studentId as string))]) {
          if (!member) continue
          await ctx.db.insert("conversationMembers", {
            conversationId,
            userId: member._id,
            role: member._id === teacher._id ? "owner" : "member",
            lastReadAt: lastMessageAt,
            lastSeenAt: lastMessageAt,
            joinedAt: createdAt,
          })
        }
        const lines = cohortLines(cohort.pathId ?? "")
        const studentUsers = members
          .map((row) => userById.get(row.studentId as string))
          .filter((row): row is Doc<"users"> => row !== undefined)
        if (studentUsers.length === 0) continue
        const count = 7 + (index % 3)
        const times = activityTimes(
          createdAt + DAY,
          Math.max(createdAt + DAY + HOUR, lastMessageAt),
          count,
          index + cohort.startDate / DAY,
        )
        for (let messageIndex = 0; messageIndex < count; messageIndex += 1) {
          const isTeacher = messageIndex % 3 === 0 || messageIndex === count - 1
          const sender = isTeacher
            ? teacher
            : (studentUsers[messageIndex % studentUsers.length] as Doc<"users">)
          const pool = isTeacher ? lines.teacher : lines.student
          const body = pool[(index + messageIndex) % pool.length]
          await addMessage(
            ctx,
            conversationId,
            sender._id,
            body,
            times[messageIndex] as number,
          )
          messages += 1
        }
        await ctx.db.insert("messages", {
          conversationId,
          kind: "system",
          body:
            cohort.status === "completed"
              ? "Angkatan selesai. Rekaman dan nilai akhir tetap tersedia di menu Jadwal."
              : "Angkatan berjalan. Sesi berikutnya bisa dilihat di menu Jadwal.",
          createdAt: createdAt + 30 * 60_000,
        })
        messages += 1
      }
      return { conversations, messages }
    }

    if (args.group === "direct") {
      const enrollments = (await ctx.db.query("enrollments").collect())
        .filter(
          (row) =>
            growthIds.has(row.studentId as string) &&
            (row.status === "completed" || row.status === "active"),
        )
        .sort((a, b) => a.createdAt - b.createdAt)
      const paths = await ctx.db.query("paths").collect()
      const pathById = new Map(paths.map((path) => [path.slug, path]))
      const usedPairs = new Set<string>()
      const picked: Array<{
        student: Doc<"users">
        teacher: Doc<"users">
        enrollment: Doc<"enrollments">
      }> = []
      for (const enrollment of enrollments) {
        if (picked.length >= 9) break
        const student = userById.get(enrollment.studentId as string)
        const path = pathById.get(enrollment.pathId)
        const teacher = path?.teacherId
          ? userById.get(path.teacherId as string)
          : undefined
        if (!student || !teacher) continue
        const pair = growthPairKey(student._id as string, teacher._id as string)
        if (usedPairs.has(pair)) continue
        usedPairs.add(pair)
        picked.push({ student, teacher, enrollment })
      }
      for (const [index, row] of picked.entries()) {
        const createdAt = Math.max(
          row.enrollment.createdAt + 2 * DAY,
          row.enrollment.enrolledAt,
        )
        const lastMessageAt = Math.min(
          args.now - HOUR,
          createdAt + 25 * DAY,
        )
        const conversationId = await ctx.db.insert("conversations", {
          kind: "direct",
          title: `${DIRECT_TITLES[index % DIRECT_TITLES.length]} — ${row.student.name.split(" ")[0]}`,
          pathId: row.enrollment.pathId,
          createdBy: row.teacher._id,
          status: "open",
          pairKey: growthPairKey(
            row.student._id as string,
            row.teacher._id as string,
          ),
          lastMessageAt,
          createdAt,
          updatedAt: lastMessageAt,
        })
        conversations += 1
        for (const member of [row.teacher, row.student]) {
          await ctx.db.insert("conversationMembers", {
            conversationId,
            userId: member._id,
            role: member._id === row.teacher._id ? "owner" : "member",
            lastReadAt: lastMessageAt,
            lastSeenAt: lastMessageAt,
            joinedAt: createdAt,
          })
        }
        const count = 5 + (index % 3)
        const times = activityTimes(
          createdAt + 2 * HOUR,
          Math.max(createdAt + 3 * HOUR, lastMessageAt),
          count,
          index + 3,
        )
        for (let messageIndex = 0; messageIndex < count; messageIndex += 1) {
          const isTeacher = messageIndex % 2 === 0
          const pool = isTeacher ? DIRECT_TEACHER_LINES : DIRECT_STUDENT_LINES
          await addMessage(
            ctx,
            conversationId,
            isTeacher ? row.teacher._id : row.student._id,
            pool[(index + messageIndex) % pool.length],
            times[messageIndex] as number,
          )
          messages += 1
        }
      }
      return { conversations, messages }
    }

    if (args.group === "order") {
      const orders = (await ctx.db.query("orders").collect())
        .filter(
          (order) =>
            order.workId !== undefined &&
            order.buyerUserId !== undefined &&
            growthIds.has(order.buyerUserId as string) &&
            order.paidAt !== undefined,
        )
        .sort((a, b) => (a.paidAt ?? 0) - (b.paidAt ?? 0))
      const works = await ctx.db.query("works").collect()
      const workById = new Map(works.map((work) => [work._id as string, work]))
      const usedBuyers = new Set<string>()
      const picked: Array<{
        order: Doc<"orders">
        buyer: Doc<"users">
        maker: Doc<"users">
        work: Doc<"works">
      }> = []
      for (const order of orders) {
        if (picked.length >= 8) break
        const buyer = userById.get(order.buyerUserId as string)
        const maker = userById.get(order.sellerId as string)
        const work = order.workId ? workById.get(order.workId as string) : undefined
        if (!buyer || !maker || !work) continue
        if (usedBuyers.has(buyer._id as string)) continue
        usedBuyers.add(buyer._id as string)
        picked.push({ order, buyer, maker, work })
      }
      for (const [index, row] of picked.entries()) {
        const createdAt = row.order.createdAt
        const lastMessageAt = Math.min(
          args.now - HOUR,
          createdAt + 6 * DAY,
        )
        const conversationId = await ctx.db.insert("conversations", {
          kind: "direct",
          title: `Pesanan ${row.work.title} • ${row.order.code}`,
          pathId: row.work.pathId,
          createdBy: row.maker._id,
          status: "open",
          pairKey: growthPairKey(
            row.buyer._id as string,
            row.maker._id as string,
          ),
          lastMessageAt,
          createdAt,
          updatedAt: lastMessageAt,
        })
        conversations += 1
        for (const member of [row.buyer, row.maker]) {
          await ctx.db.insert("conversationMembers", {
            conversationId,
            userId: member._id,
            role: member._id === row.maker._id ? "owner" : "member",
            lastReadAt: lastMessageAt,
            lastSeenAt: lastMessageAt,
            joinedAt: createdAt,
          })
        }
        const count = 4 + (index % 3)
        const times = activityTimes(
          createdAt + 3 * HOUR,
          Math.max(createdAt + 4 * HOUR, lastMessageAt),
          count,
          index + 7,
        )
        for (let messageIndex = 0; messageIndex < count; messageIndex += 1) {
          const isBuyer = messageIndex % 2 === 0
          const line = ORDER_LINES[(index + messageIndex) % ORDER_LINES.length]
          if (!line) continue
          await addMessage(
            ctx,
            conversationId,
            isBuyer ? row.buyer._id : row.maker._id,
            isBuyer ? line.buyer : line.maker,
            times[messageIndex] as number,
          )
          messages += 1
        }
      }
      return { conversations, messages }
    }

    const tickets = (await ctx.db.query("supportTickets").collect())
      .filter((ticket) => ticket.code.startsWith("SUP-GRW-"))
      .sort((a, b) => a.code.localeCompare(b.code))
      .slice(args.start, args.end)
    for (const ticket of tickets) {
      if (!ticket.requesterId) continue
      const requester = userById.get(ticket.requesterId as string)
      if (!requester) continue
      const ticketMessages = await ctx.db
        .query("supportMessages")
        .withIndex("by_ticketId", (q) => q.eq("ticketId", ticket._id))
        .collect()
      if (ticketMessages.length < 2) continue
      const createdAt = ticket.createdAt - 10 * 60_000
      const lastMessageAt = Math.min(
        args.now - HOUR,
        ticket.updatedAt,
      )
      const conversationId = await ctx.db.insert("conversations", {
        kind: "support",
        title: `Bantuan: ${ticket.subject} • ${ticket.code}`,
        createdBy: requester._id,
        status:
          ticket.status === "resolved" || ticket.status === "closed"
            ? "archived"
            : "open",
        supportRequestedBy: requester._id,
        supportConsentAt: createdAt,
        lastMessageAt,
        createdAt,
        updatedAt: lastMessageAt,
      })
      conversations += 1
      for (const member of [requester, admin]) {
        await ctx.db.insert("conversationMembers", {
          conversationId,
          userId: member._id,
          role: member._id === admin._id ? "support" : "member",
          lastReadAt: lastMessageAt,
          lastSeenAt: lastMessageAt,
          joinedAt: createdAt,
        })
      }
      for (const [index, message] of ticketMessages
        .sort((a, b) => a.createdAt - b.createdAt)
        .entries()) {
        await addMessage(
          ctx,
          conversationId,
          message.authorId ?? admin._id,
          message.body,
          Math.min(lastMessageAt, createdAt + (index + 1) * 20 * 60_000),
        )
        messages += 1
      }
    }
    return { conversations, messages }
  },
})

/** Calls follow the cohort schedule: one ended review per finished window. */
export const seedGrowthCalls = internalMutation({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect()
    const userById = new Map(users.map((user) => [user._id as string, user]))
    const growthIds = new Set(
      users
        .filter((user) => user.authUserId.startsWith("seed-growth-"))
        .map((user) => user._id as string),
    )
    const cohorts = (await ctx.db.query("cohorts").collect())
      .filter((cohort) => cohort.code.startsWith("GRW-"))
      .sort((a, b) => a.code.localeCompare(b.code))
    const enrollments = await ctx.db.query("enrollments").collect()
    const sessions = await ctx.db.query("cohortSessions").collect()
    let calls = 0

    const selected = [
      cohorts[0],
      cohorts[1],
      cohorts[2],
      cohorts[3],
      cohorts[5],
      cohorts[6],
      cohorts[9],
    ].filter((cohort): cohort is Doc<"cohorts"> => cohort !== undefined)

    for (const [index, cohort] of selected.entries()) {
      const teacher = userById.get(cohort.teacherId as string)
      if (!teacher) continue
      const students = enrollments
        .filter(
          (row) =>
            row.cohortId === cohort._id &&
            growthIds.has(row.studentId as string) &&
            row.status !== "pending_payment",
        )
        .slice(0, 2)
        .map((row) => userById.get(row.studentId as string))
        .filter((row): row is Doc<"users"> => row !== undefined)
      if (students.length === 0) continue
      const cohortSessions = sessions
        .filter((session) => session.cohortId === cohort._id)
        .sort((a, b) => a.startsAt - b.startsAt)
      const scheduled = cohortSessions.find(
        (session) => session.status === "scheduled",
      )
      const ended = [...cohortSessions]
        .reverse()
        .find((session) => session.status === "ended")
      const session = scheduled ?? ended ?? cohortSessions[0]
      if (!session) continue
      const isEnded = scheduled === undefined
      const startedAt = session.startsAt
      const endedAt = startedAt + 45 * 60_000
      const roomName = `kalanidhi-${cohort.code.toLowerCase()}-${index + 1}`
      const callId = await ctx.db.insert("callSessions", {
        roomName,
        kind: "cohort",
        initiatorId: teacher._id,
        hostId: teacher._id,
        cohortId: cohort._id,
        cohortSessionId: session._id,
        title: isEnded
          ? `Tinjauan ${session.title.toLowerCase()}`
          : `${session.title} — panggilan kelas`,
        status: isEnded ? "ended" : "scheduled",
        startedAt: isEnded ? startedAt : undefined,
        endedAt: isEnded ? endedAt : undefined,
        endedBy: isEnded ? teacher._id : undefined,
        endReason: isEnded ? "Sesi selesai" : undefined,
        durationMs: isEnded ? 45 * 60_000 : undefined,
        qualitySummary: isEnded ? "Kualitas baik, sempat putus sekali." : undefined,
        scheduledAt: isEnded ? undefined : startedAt,
        scheduledEndsAt: isEnded ? undefined : startedAt + 2 * HOUR,
        recordingConsent: "pending",
        createdAt: Math.max(cohort.createdAt, startedAt - 3 * DAY),
      })
      calls += 1
      for (const [member, role] of [
        [teacher, "host"] as const,
        ...students.map((student) => [student, "guest"] as const),
      ]) {
        await ctx.db.insert("callParticipants", {
          callId,
          userId: member._id,
          role,
          status: isEnded ? "left" : "invited",
          invitedAt: startedAt - 2 * DAY,
          joinedAt: isEnded ? startedAt : undefined,
          leftAt: isEnded ? endedAt : undefined,
          quality: isEnded ? "good" : undefined,
        })
      }
      await ctx.db.insert("callEvents", {
        callId,
        kind: isEnded ? "ended" : "scheduled",
        actorId: teacher._id,
        payload: { source: "seed", cohort: cohort.code },
        createdAt: isEnded ? endedAt : startedAt - 3 * DAY,
      })
    }

    // A scheduled review for the active window, so the call board has a future.
    const active = cohorts.find((cohort) => cohort.status === "active")
    if (active) {
      const teacher = userById.get(active.teacherId as string)
      const student = enrollments
        .filter(
          (row) =>
            row.cohortId === active._id &&
            growthIds.has(row.studentId as string) &&
            row.status === "active",
        )
        .map((row) => userById.get(row.studentId as string))
        .find((row): row is Doc<"users"> => row !== undefined)
      if (teacher && student) {
        const at = args.now + 3 * DAY
        const callId = await ctx.db.insert("callSessions", {
          roomName: `kalanidhi-${active.code.toLowerCase()}-review`,
          kind: "voice",
          initiatorId: teacher._id,
          hostId: teacher._id,
          cohortId: active._id,
          title: "Konsultasi tugas akhir",
          status: "scheduled",
          scheduledAt: at,
          scheduledEndsAt: at + 30 * 60_000,
          recordingConsent: "pending",
          createdAt: args.now - 2 * HOUR,
        })
        calls += 1
        for (const [member, role] of [
          [teacher, "host"] as const,
          [student, "guest"] as const,
        ]) {
          await ctx.db.insert("callParticipants", {
            callId,
            userId: member._id,
            role,
            status: "invited",
            invitedAt: args.now - 2 * HOUR,
          })
        }
        await ctx.db.insert("callEvents", {
          callId,
          kind: "scheduled",
          actorId: teacher._id,
          payload: { source: "seed", cohort: active.code },
          createdAt: args.now - 2 * HOUR,
        })
      }
    }

    return { calls }
  },
})

/** Drives the growth activity batches after the intake has run. */
export const seedGrowthMessaging = internalAction({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const totals = { conversations: 0, messages: 0, calls: 0 }
    for (const [group, start, end] of [
      ["cohort", 0, 4],
      ["cohort", 4, 8],
      ["cohort", 8, 12],
      ["direct", 0, 9],
      ["order", 0, 8],
      ["support", 0, 6],
    ] as const) {
      const batch = await ctx.runMutation(
        internal.seed.domains.messaging.seedGrowthMessagingBatch,
        { now: args.now, group, start, end },
      )
      totals.conversations += batch.conversations
      totals.messages += batch.messages
    }
    const calls = await ctx.runMutation(
      internal.seed.domains.messaging.seedGrowthCalls,
      { now: args.now },
    )
    totals.calls += calls.calls
    return totals
  },
})
