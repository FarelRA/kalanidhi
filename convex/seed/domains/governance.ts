import { v } from "convex/values"

import type { Id } from "../../_generated/dataModel"
import { internalMutation } from "../../_generated/server"
import { pathSlug, workSlug } from "../lib/codes"
import { createSeedClock } from "../lib/clock"
import { seedAdmin, userByEmail, workBySlug } from "../lib/lookup"
import { seedEmail } from "../content/identities"

export const seedGovernance = internalMutation({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const clock = createSeedClock(args.now)
    const admin = await seedAdmin(ctx)
    const sari = await userByEmail(ctx, seedEmail("sari"))
    const dwi = await userByEmail(ctx, seedEmail("dwi"))
    const anisa = await userByEmail(ctx, seedEmail("anisa"))
    const workNampan = await workBySlug(ctx, workSlug("nampanBatikBambu"))
    const workAksara = await workBySlug(ctx, workSlug("jasaTulisAksara"))
    const workTari = await workBySlug(ctx, workSlug("tariKreasiAcara"))
    const workKuliner = await workBySlug(ctx, workSlug("geblekRentengBeku"))
    const assets = await ctx.db.query("mediaAssets").collect()
    const imageAsset = assets.find((asset) => asset.kind === "image")
    const call = await ctx.db.query("callSessions").collect()
    const recording = await ctx.db.query("callRecordings").collect()

    /*
     * Two kinds of record sit here. An archive row is material the platform
     * holds and may publish; a public reference is a published article or
     * profile cited for the medium, with its URL kept so the claim can be
     * checked. A reference never carries a permission date or a grant.
     */
    const sources = [
      {
        community:
          "Paguyuban Batik Tulis Giriloyo (Koperasi Jasa Kampung Batik Giriloyo), Desa Wukirsari",
        sourceName: "Materi Batik Giriloyo",
        pathId: pathSlug("batikBambu"),
        workId: workNampan._id,
        permissionDocumentRef: "Arsip dokumen pengelola platform",
        permissionDocumentUrl: undefined,
        permissionDate: Date.UTC(2022, 0, 1),
        recordedAt: Date.UTC(2026, 0, 10),
        permissionStatus: "granted" as const,
        accessLevel: "public" as const,
        attribution:
          "Materi Batik Giriloyo disusun Paguyuban Batik Tulis Giriloyo (Koperasi Jasa Kampung Batik Giriloyo), Desa Wukirsari, Bantul, untuk batik tulis di atas kain. Materi yang kami pegang hanya mencakup kain, lalu diadaptasi untuk media bambu.",
        notes:
          "Motif geometris disusun ulang, motif sakral tidak dipakai. Langkah khusus kain diganti dengan proses bambu.",
        withdrawalStatus: "active" as const,
        status: "active" as const,
      },
      {
        community: "Fitinline",
        sourceName: "Batik Bambu, Inovasi Teknik Membatik pada Media Bambu",
        pathId: pathSlug("batikBambu"),
        workId: undefined,
        permissionDocumentRef: "https://fitinline.com/article/read/batik-bambu/",
        permissionDocumentUrl: "https://fitinline.com/article/read/batik-bambu/",
        permissionDate: Date.UTC(2013, 10, 8),
        recordedAt: Date.UTC(2026, 0, 11),
        permissionStatus: "public_reference" as const,
        accessLevel: "public" as const,
        attribution:
          "Rujukan publik Fitinline, 8 November 2013, memuat urutan bambu, pilih bambu, rebus, jemur kering, amplas, beri pola, batik, warna, tutup motif dengan malam, warna dasar, rebus untuk melepas malam, jemur, lalu finishing.",
        notes:
          "Artikel juga menyebut Krebet dan Lopati sebagai sentra batik bambu serta pelapisan NC.",
        withdrawalStatus: "active" as const,
        status: "active" as const,
      },
      {
        community: "Desa Wisata Krebet, Jadesta Kementerian Pariwisata",
        sourceName: "Profil Desa Wisata Krebet",
        pathId: pathSlug("batikBambu"),
        workId: undefined,
        permissionDocumentRef: "https://jadesta.kemenpar.go.id/desa/krebet",
        permissionDocumentUrl: "https://jadesta.kemenpar.go.id/desa/krebet",
        permissionDate: Date.UTC(2026, 0, 14),
        recordedAt: Date.UTC(2026, 0, 14),
        permissionStatus: "public_reference" as const,
        accessLevel: "public" as const,
        attribution:
          "Profil resmi Desa Wisata Krebet di Jadesta Kementerian Pariwisata menempatkan Krebet di Sendangsari, Pajangan, Bantul, sebagai desa wisata batik kayu dan menampilkan nampan bambu batik sebagai suvenir.",
        notes:
          "Jadesta juga mencatat alat batik yang disiapkan untuk kunjungan, canting, kompor, lilin, celemek, pensil, dan obat keselamatan.",
        withdrawalStatus: "active" as const,
        status: "active" as const,
      },
      {
        community: "Perajin pewarna alami Pleret",
        sourceName: "Catatan pewarnaan alami Pleret",
        pathId: pathSlug("batikBambu"),
        workId: workNampan._id,
        permissionDocumentRef: "Arsip dokumen pengelola platform",
        permissionDocumentUrl: undefined,
        permissionDate: Date.UTC(2026, 1, 2),
        recordedAt: Date.UTC(2026, 1, 2),
        permissionStatus: "granted" as const,
        accessLevel: "community" as const,
        attribution:
          "Catatan pewarna alami dari lingkungan perajin Pleret, Bantul. Bahan dan takaran dibagikan untuk pelajar terdaftar, dokumen sumber diarsipkan pengelola platform.",
        notes: "Sebagian takaran hanya untuk pelajar terdaftar.",
        withdrawalStatus: "active" as const,
        status: "active" as const,
      },
      {
        community: "Arsip pengelola platform",
        sourceName: "Draf pengantar gerabah Kasongan",
        pathId: pathSlug("kriyaGerabahBantul"),
        workId: undefined,
        permissionDocumentRef: "Arsip dokumen pengelola platform",
        permissionDocumentUrl: undefined,
        permissionDate: Date.UTC(2026, 2, 2),
        recordedAt: Date.UTC(2026, 2, 2),
        permissionStatus: "pending" as const,
        accessLevel: "restricted" as const,
        attribution:
          "Materi pengantar gerabah Kasongan dari arsip pengelola platform, disusun untuk kelas yang belum dibuka.",
        notes: "Belum diterbitkan.",
        withdrawalStatus: "withdrawal_requested" as const,
        status: "active" as const,
      },
      {
        community: "Arsip pengelola platform",
        sourceName: "Materi aksara Jawa dan tabel sandhangan",
        pathId: pathSlug("aksaraJawa"),
        workId: workAksara._id,
        permissionDocumentRef: "Arsip dokumen pengelola platform",
        permissionDocumentUrl: undefined,
        permissionDate: Date.UTC(2026, 10, 13),
        recordedAt: Date.UTC(2026, 10, 13),
        permissionStatus: "granted" as const,
        accessLevel: "public" as const,
        attribution:
          "Dokumen sumber aksara Jawa dan tabel sandhangan dipegang pengelola platform, dipakai sebagai bahan ajar kelas ini.",
        notes:
          "Contoh tulisan memakai kalimat sumber, moral paragraf penutup tidak dipakai sebagai ajaran kursus.",
        withdrawalStatus: "active" as const,
        status: "active" as const,
      },
      {
        community: "Arsip pengelola platform",
        sourceName: "Materi Apresiasi Karya Seni Tari",
        pathId: pathSlug("tariKreasi"),
        workId: workTari._id,
        permissionDocumentRef: "Arsip dokumen pengelola platform",
        permissionDocumentUrl: undefined,
        permissionDate: Date.UTC(2026, 10, 10),
        recordedAt: Date.UTC(2026, 10, 10),
        permissionStatus: "granted" as const,
        accessLevel: "public" as const,
        attribution:
          "Materi kelas Tari Kreasi disusun dari laporan Apresiasi Karya Seni Tari yang mengutip Hadi (1990) untuk definisi tari, serta unsur gerak, ruang, waktu, tenaga, bentuk penyajian, dan fungsi tari. Laporan itu adalah laporan siswa, bukan rujukan primer.",
        notes:
          "Contoh Legong, Saman, dan Bedhaya dipakai sebagai contoh dari laporan, detail gerak tidak ditambahkan di luar catatan laporan.",
        withdrawalStatus: "active" as const,
        status: "active" as const,
      },
      {
        community: "Arsip pengelola platform",
        sourceName: "Laporan Gastronomi Nusantara",
        pathId: pathSlug("kulinerNusantara"),
        workId: workKuliner._id,
        permissionDocumentRef: "Arsip dokumen pengelola platform",
        permissionDocumentUrl: undefined,
        permissionDate: Date.UTC(2026, 10, 11),
        recordedAt: Date.UTC(2026, 10, 11),
        permissionStatus: "granted" as const,
        accessLevel: "public" as const,
        attribution:
          "Materi kelas Kuliner Nusantara disusun dari Laporan Gastronomi Nusantara, laporan siswa tentang filosofi, identitas, dan pelestarian makanan tradisional. Daftar pustakanya masih berupa rujukan awal, sehingga klaim sejarah diperlakukan sebagai bahan telusur.",
        notes:
          "Tafsiran geblek dan tumpeng ditulis sebagai interpretasi budaya, sesuai catatan laporan, bukan makna baku.",
        withdrawalStatus: "active" as const,
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
        permissionDocumentUrl: source.permissionDocumentUrl,
        permissionDate: source.permissionDate,
        permissionStatus: source.permissionStatus,
        accessLevel: source.accessLevel,
        attribution: source.attribution,
        notes: source.notes,
        withdrawalStatus: source.withdrawalStatus,
        withdrawalRequestedAt:
          source.withdrawalStatus === "withdrawal_requested"
            ? clock.ago(2)
            : undefined,
        status: source.status,
        createdBy: admin._id,
        createdAt: source.recordedAt,
        updatedAt: clock.now,
      })
      sourceIds.push(sourceId)
    }

    await ctx.db.insert("takedownRequests", {
      code: "TD-2026-0001",
      targetType: "work",
      targetId: workNampan._id,
      targetLabel: workNampan.title,
      culturalSourceId: sourceIds[3],
      requesterName: "Perwakilan perajin pewarna alami Pleret",
      requesterContact: "izin.pewarna.pleret@gmail.com",
      reason:
        "Sebagian catatan takaran pewarna belum boleh dipublikasikan.",
      evidence: "Surat permintaan peninjauan akses, 2 halaman.",
      status: "reviewing",
      createdAt: clock.ago(3),
      updatedAt: clock.now,
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
      decidedAt: clock.ago(15),
      completedAt: clock.ago(15),
      effects: ["media.archived"],
      createdAt: clock.ago(18),
      updatedAt: clock.now,
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
      decidedAt: clock.ago(40),
      createdAt: clock.ago(42),
      updatedAt: clock.now,
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
      reviewedAt: clock.ago(5),
      completedAt: clock.ago(4),
      createdAt: clock.ago(6),
      updatedAt: clock.now,
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
      reviewedAt: clock.ago(6),
      createdAt: clock.ago(8),
      updatedAt: clock.now,
    })
    await ctx.db.insert("privacyRequests", {
      requesterId: anisa._id,
      requesterEmail: anisa.email,
      subjectUserId: anisa._id,
      kind: "deletion",
      status: "open",
      reason: "Meminta penghapusan data lama setelah akun tidak aktif.",
      retentionHoldUntil: clock.ahead(30),
      createdAt: clock.ago(1),
      updatedAt: clock.now,
    })

    await ctx.db.insert("impersonationSessions", {
      actorId: admin._id,
      targetId: sari._id,
      reason: "Menelusuri kendala unggah tugas.",
      readOnly: true,
      startedAt: clock.ago(3),
      expiresAt: clock.ago(3) + 30 * 60_000,
      endedAt: clock.ago(3) + 20 * 60_000,
    })
    await ctx.db.insert("impersonationSessions", {
      actorId: admin._id,
      targetId: dwi._id,
      reason: "Memeriksa tampilan sertifikat setelah koreksi nama.",
      readOnly: true,
      startedAt: clock.ago(1),
      expiresAt: clock.ahead(1),
    })

    const recordingDoc = recording[0]
    if (recordingDoc) {
      await ctx.db.insert("breakGlassGrants", {
        actorId: admin._id,
        entityType: "call_recording",
        entityId: recordingDoc._id,
        reason: "Investigasi sengketa kualitas sesi.",
        expiresAt: clock.ahead(2),
        createdAt: clock.ago(1),
      })
    }
    const messageAsset = (await ctx.db.query("messageAssets").collect())[0]
    if (messageAsset) {
      await ctx.db.insert("breakGlassGrants", {
        actorId: admin._id,
        entityType: "message_asset",
        entityId: messageAsset._id,
        reason: "Tinjauan laporan pesan.",
        expiresAt: clock.ago(1),
        revokedAt: clock.ago(1),
        revokedBy: admin._id,
        createdAt: clock.ago(2),
      })
    }

    await ctx.db.insert("contentLocks", {
      contentKey: "site",
      holderId: admin._id,
      acquiredAt: clock.ago(1),
      expiresAt: clock.ago(1) + 15 * 60_000,
    })

    return { sources: sourceIds.length, calls: call.length }
  },
})
