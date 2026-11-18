import { v } from "convex/values"

import { internal } from "../../_generated/api"
import type { Doc, Id } from "../../_generated/dataModel"
import { internalAction, internalMutation } from "../../_generated/server"
import { rubricForPath } from "../../assessments"
import { buildSubmissionAssessment } from "../lib/builders"
import {
  cohortCode,
  cohortKey,
  pathSlug,
  SUBMISSION_KEYS,
  submissionCodeForKey,
} from "../lib/codes"
import {
  createSeedClock,
  DAY,
  HOUR,
  SEED_START,
  type SeedClock,
} from "../lib/clock"
import { pathBySlug, seedAdmin, userByEmail } from "../lib/lookup"
import { evidenceStorageId } from "../lib/media"
import { seedEmail } from "../content/identities"

function cohortsFor(clock: SeedClock) {
  return [
    {
      key: cohortKey("bbm2026_01"),
      code: cohortCode("bbm2026_01"),
      pathSlug: pathSlug("batikBambu"),
      teacherKey: "sri",
      title: "Batik Bambu, Angkatan 1",
      start: clock.ago(45),
      end: clock.ahead(15),
      capacity: 12,
      status: "active" as const,
    },
    {
      key: cohortKey("bbm2025_02"),
      code: cohortCode("bbm2025_02"),
      pathSlug: pathSlug("batikBambu"),
      teacherKey: "sri",
      title: "Batik Bambu, Angkatan Perintis",
      start: clock.ago(392),
      end: clock.ago(330),
      capacity: 12,
      status: "completed" as const,
    },
    {
      key: cohortKey("pra2026_01"),
      code: cohortCode("pra2026_01"),
      pathSlug: pathSlug("pranatacaraJawa"),
      teacherKey: "widagdo",
      title: "Pranatacara Jawa, Angkatan 1",
      start: clock.ago(30),
      end: clock.ahead(30),
      capacity: 10,
      status: "active" as const,
    },
    {
      key: cohortKey("pra2026_02"),
      code: cohortCode("pra2026_02"),
      pathSlug: pathSlug("pranatacaraJawa"),
      teacherKey: "widagdo",
      title: "Pranatacara Jawa, Angkatan 2",
      start: clock.ahead(20),
      end: clock.ahead(80),
      capacity: 10,
      status: "enrolling" as const,
    },
    {
      key: cohortKey("bbm2026_03"),
      code: cohortCode("bbm2026_03"),
      pathSlug: pathSlug("batikBambu"),
      teacherKey: "sri",
      title: "Pewarnaan Alami Batik Bambu, Kelas Pendamping",
      start: clock.ago(24),
      end: clock.ahead(46),
      capacity: 8,
      status: "active" as const,
    },
    {
      key: cohortKey("bbm2026_04"),
      code: cohortCode("bbm2026_04"),
      pathSlug: pathSlug("batikBambu"),
      teacherKey: "sri",
      title: "Batik Bambu, Angkatan Lanjutan",
      start: clock.ago(150),
      end: clock.ago(115),
      capacity: 8,
      status: "completed" as const,
    },
    {
      key: cohortKey("pra2025_01"),
      code: cohortCode("pra2025_01"),
      pathSlug: pathSlug("pranatacaraJawa"),
      teacherKey: "widagdo",
      title: "Pranatacara Jawa, Angkatan Perintis",
      start: clock.ago(380),
      end: clock.ago(320),
      capacity: 10,
      status: "completed" as const,
    },
    {
      key: cohortKey("aks2026_01"),
      code: cohortCode("aks2026_01"),
      pathSlug: pathSlug("aksaraJawa"),
      teacherKey: "suwardi",
      title: "Aksara Jawa, Angkatan 1",
      start: clock.ago(150),
      end: clock.ago(115),
      capacity: 12,
      status: "completed" as const,
    },
  ]
}

const ENROLLMENTS: {
  studentKey: string
  cohortKey: string
  status: "pending_payment" | "active" | "completed" | "withdrawn"
}[] = [
  ...["sari", "dwi", "bayu", "nanda", "ratih", "yusuf", "melati", "arif"].map(
    (studentKey) => ({
      studentKey,
      cohortKey: cohortKey("bbm2026_01"),
      status: "active" as const,
    }),
  ),
  ...["anisa", "dimas", "purnomo"].map((studentKey) => ({
    studentKey,
    cohortKey: cohortKey("bbm2025_02"),
    status: "completed" as const,
  })),
  { studentKey: "dwi", cohortKey: cohortKey("bbm2026_04"), status: "completed" },
  ...["sari", "dwi", "bayu", "nanda", "dewi", "fajar"].map((studentKey) => ({
    studentKey,
    cohortKey: cohortKey("pra2026_01"),
    status: "active" as const,
  })),
  ...["ratih", "yusuf"].map((studentKey) => ({
    studentKey,
    cohortKey: cohortKey("pra2026_02"),
    status: "pending_payment" as const,
  })),
  {
    studentKey: "melati",
    cohortKey: cohortKey("pra2026_02"),
    status: "withdrawn" as const,
  },
  ...["arif", "dewi"].map((studentKey) => ({
    studentKey,
    cohortKey: cohortKey("bbm2026_03"),
    status: "active" as const,
  })),
  { studentKey: "rani", cohortKey: cohortKey("pra2025_01"), status: "completed" },
  ...["galuh", "arif"].map((studentKey) => ({
    studentKey,
    cohortKey: cohortKey("aks2026_01"),
    status: "completed" as const,
  })),
  // Melati left the aksara cohort before the final assessment, so her
  // enrollment is not completed and she holds no certificate.
  { studentKey: "melati", cohortKey: cohortKey("aks2026_01"), status: "withdrawn" },
]
type SeedSubmission = {
  key: string
  studentKey: string
  cohortKey: string
  taskTitle: string
  status:
    | "draft"
    | "submitted"
    | "under_review"
    | "revision_requested"
    | "approved"
    | "rejected"
  score?: number
  feedback?: string
  submittedDaysAgo?: number
  assessedDaysAgo?: number
  revisionCount: number
  evidenceText: string
}

const SUBMISSIONS: SeedSubmission[] = [
  {
    key: "sari-bbm-1",
    studentKey: "sari",
    cohortKey: cohortKey("bbm2026_01"),
    taskTitle: "Memegang canting dan berhenti dengan bersih",
    status: "approved",
    score: 88,
    feedback:
      "Tekanan canting sudah stabil. Perbaiki jarak antar titik pada bagian lengkung kanan.",
    submittedDaysAgo: 20,
    assessedDaysAgo: 18,
    revisionCount: 0,
    evidenceText:
      "Enam lembar latihan garis di potongan bambu, dengan catatan suhu malam dan waktu.",
  },
  {
    key: "sari-bbm-2",
    studentKey: "sari",
    cohortKey: cohortKey("bbm2026_01"),
    taskTitle: "Latihan pola",
    status: "submitted",
    submittedDaysAgo: 3,
    revisionCount: 0,
    evidenceText:
      "Satu ulangan motif geometris pada bilah 20 x 30 cm, foto jarak dekat dan foto keseluruhan.",
  },
  {
    key: "dwi-bbm-1",
    studentKey: "dwi",
    cohortKey: cohortKey("bbm2026_01"),
    taskTitle: "Memegang canting dan berhenti dengan bersih",
    status: "approved",
    score: 92,
    feedback:
      "Garis lengkung rapi. Pertahankan kecepatan tangan saat berpindah arah.",
    submittedDaysAgo: 22,
    assessedDaysAgo: 20,
    revisionCount: 0,
    evidenceText: "Delapan lembar latihan dengan variasi tekanan.",
  },
  {
    key: "dwi-bbm-2",
    studentKey: "dwi",
    cohortKey: cohortKey("bbm2026_01"),
    taskTitle: "Mbabar: warna pertama pada bambu",
    status: "revision_requested",
    score: 70,
    feedback:
      "Warna belum merata di bagian tepi. Ulangi colet tipis dengan takaran yang sama dan catat waktunya.",
    submittedDaysAgo: 8,
    assessedDaysAgo: 6,
    revisionCount: 1,
    evidenceText: "Dua bilah bambu dengan takaran warna berbeda.",
  },
  {
    key: "bayu-bbm-1",
    studentKey: "bayu",
    cohortKey: cohortKey("bbm2026_01"),
    taskTitle: "Memegang canting dan berhenti dengan bersih",
    status: "submitted",
    submittedDaysAgo: 2,
    revisionCount: 0,
    evidenceText: "Foto latihan garis dan catatan alat yang dipakai.",
  },
  {
    key: "nanda-bbm-1",
    studentKey: "nanda",
    cohortKey: cohortKey("bbm2026_01"),
    taskTitle: "Latihan pola",
    status: "under_review",
    submittedDaysAgo: 5,
    revisionCount: 0,
    evidenceText: "Foto bilah sebelum dan sesudah diamplas, plus sketsa pola.",
  },
  {
    key: "ratih-bbm-1",
    studentKey: "ratih",
    cohortKey: cohortKey("bbm2026_01"),
    taskTitle: "Memegang canting dan berhenti dengan bersih",
    status: "approved",
    score: 85,
    feedback: "Garis sudah lurus. Kurangi malam yang menumpuk di titik awal.",
    submittedDaysAgo: 19,
    assessedDaysAgo: 17,
    revisionCount: 0,
    evidenceText: "Lima lembar latihan garis dengan catatan proses.",
  },
  {
    key: "yusuf-bbm-1",
    studentKey: "yusuf",
    cohortKey: cohortKey("bbm2026_01"),
    taskTitle: "Latihan pola",
    status: "submitted",
    submittedDaysAgo: 4,
    revisionCount: 0,
    evidenceText: "Foto pola pada panel bambu yang sudah kering.",
  },
  {
    key: "melati-bbm-1",
    studentKey: "melati",
    cohortKey: cohortKey("bbm2026_01"),
    taskTitle: "Memegang canting dan berhenti dengan bersih",
    status: "draft",
    revisionCount: 0,
    evidenceText: "Draf catatan latihan, belum diunggah.",
  },
  {
    key: "arif-bbm-1",
    studentKey: "arif",
    cohortKey: cohortKey("bbm2026_01"),
    taskTitle: "Memegang canting dan berhenti dengan bersih",
    status: "approved",
    score: 90,
    feedback: "Kontrol tekanan baik. Lanjutkan ke latihan lengkung ganda.",
    submittedDaysAgo: 21,
    assessedDaysAgo: 19,
    revisionCount: 0,
    evidenceText: "Tujuh lembar latihan dengan variasi ketebalan garis.",
  },
  {
    key: "anisa-bbm-final",
    studentKey: "anisa",
    cohortKey: cohortKey("bbm2025_02"),
    taskTitle: "Nampan uji dari bambu mentah sampai finishing",
    status: "approved",
    score: 92,
    feedback:
      "Produk selesai dengan warna rata dan dokumentasi proses lengkap. Layak diajukan untuk Kartu Karya.",
    submittedDaysAgo: 350,
    assessedDaysAgo: 345,
    revisionCount: 1,
    evidenceText:
      "Dua belas foto bertanggal dari pemilihan bambu sampai pelapisan, plus catatan bahan.",
  },
  {
    key: "dimas-bbm-final",
    studentKey: "dimas",
    cohortKey: cohortKey("bbm2025_02"),
    taskTitle: "Kotak tisu uji dari bambu mentah sampai finishing",
    status: "approved",
    score: 89,
    feedback:
      "Titik canting rapat dan konsisten. Perbaiki finishing tepi anyaman pada karya berikutnya.",
    submittedDaysAgo: 348,
    assessedDaysAgo: 343,
    revisionCount: 0,
    evidenceText: "Foto detail titik dan foto keseluruhan kotak tisu.",
  },
  {
    key: "purnomo-bbm-final",
    studentKey: "purnomo",
    cohortKey: cohortKey("bbm2025_02"),
    taskTitle: "Panel uji dari bambu mentah sampai finishing",
    status: "approved",
    score: 95,
    feedback:
      "Dua warna tercatat rapi. Motif lereng disusun ulang tanpa motif sakral.",
    submittedDaysAgo: 346,
    assessedDaysAgo: 341,
    revisionCount: 2,
    evidenceText: "Jurnal proses dua warna dan foto hasil akhir.",
  },
  {
    key: "dwi-bbm-final",
    studentKey: "dwi",
    cohortKey: cohortKey("bbm2026_04"),
    taskTitle: "Nampan uji dari bambu mentah sampai finishing",
    status: "approved",
    score: 86,
    feedback:
      "Urutan langkah tercatat lengkap. Perbaiki kebersihan tepi sebelum produk diajukan.",
    submittedDaysAgo: 130,
    assessedDaysAgo: 125,
    revisionCount: 0,
    evidenceText:
      "Nampan uji diameter 30 cm dengan catatan tanggal tiap langkah dan foto tiga detail.",
  },
  {
    key: "rani-pra-final",
    studentKey: "rani",
    cohortKey: cohortKey("pra2025_01"),
    taskTitle: "Praktik akhir: siraman dan midodareni",
    status: "approved",
    score: 90,
    feedback:
      "Urutan acara jelas dan artikulasi baik. Pertahankan kontak mata dengan keluarga.",
    submittedDaysAgo: 330,
    assessedDaysAgo: 325,
    revisionCount: 1,
    evidenceText: "Rekaman praktik 18 menit dan rundown acara.",
  },
  {
    key: "sari-pra-1",
    studentKey: "sari",
    cohortKey: cohortKey("pra2026_01"),
    taskTitle: "Latihan napas dan jeda",
    status: "approved",
    score: 86,
    feedback: "Jeda kalimat sudah baik. Perjelas konsonan akhir.",
    submittedDaysAgo: 12,
    assessedDaysAgo: 10,
    revisionCount: 0,
    evidenceText: "Rekaman suara 5 menit.",
  },
  {
    key: "dwi-pra-1",
    studentKey: "dwi",
    cohortKey: cohortKey("pra2026_01"),
    taskTitle: "Menyusun rundown",
    status: "submitted",
    submittedDaysAgo: 2,
    revisionCount: 0,
    evidenceText: "Rundown 60 menit dengan penanda waktu.",
  },
  {
    key: "bayu-pra-1",
    studentKey: "bayu",
    cohortKey: cohortKey("pra2026_01"),
    taskTitle: "Latihan napas dan jeda",
    status: "under_review",
    submittedDaysAgo: 4,
    revisionCount: 0,
    evidenceText: "Rekaman suara 6 menit.",
  },
  {
    key: "nanda-pra-1",
    studentKey: "nanda",
    cohortKey: cohortKey("pra2026_01"),
    taskTitle: "Koordinasi dengan tim acara",
    status: "submitted",
    submittedDaysAgo: 1,
    revisionCount: 0,
    evidenceText: "Catatan koordinasi dengan tim acara.",
  },
  {
    key: "dewi-pra-1",
    studentKey: "dewi",
    cohortKey: cohortKey("pra2026_01"),
    taskTitle: "Latihan napas dan jeda",
    status: "approved",
    score: 84,
    feedback: "Volume cukup. Latih pernapasan sebelum kalimat panjang.",
    submittedDaysAgo: 11,
    assessedDaysAgo: 9,
    revisionCount: 0,
    evidenceText: "Rekaman suara 4 menit.",
  },
  {
    key: "fajar-pra-1",
    studentKey: "fajar",
    cohortKey: cohortKey("pra2026_01"),
    taskTitle: "Menyusun rundown",
    status: "submitted",
    submittedDaysAgo: 3,
    revisionCount: 0,
    evidenceText: "Rundown dan daftar tugas keluarga.",
  },
  {
    key: "arif-bbm-3",
    studentKey: "arif",
    cohortKey: cohortKey("bbm2026_03"),
    taskTitle: "Ekstraksi warna alami",
    status: "submitted",
    submittedDaysAgo: 1,
    revisionCount: 0,
    evidenceText: "Foto bahan dan catatan takaran.",
  },
  {
    key: "dewi-bbm-3",
    studentKey: "dewi",
    cohortKey: cohortKey("bbm2026_03"),
    taskTitle: "Ekstraksi warna alami",
    status: "draft",
    revisionCount: 0,
    evidenceText: "Draf catatan bahan.",
  },
  {
    key: "galuh-aks-1",
    studentKey: "galuh",
    cohortKey: cohortKey("aks2026_01"),
    taskTitle: "Latihan pasangan",
    status: "approved",
    score: 84,
    feedback:
      "Pasangan ra dan nya sudah benar. Perbaiki dua pasangan yang masih sejajar, bukan di bawah aksara.",
    submittedDaysAgo: 136,
    assessedDaysAgo: 133,
    revisionCount: 0,
    evidenceText:
      "Foto sepuluh kata dua suku kata dengan konsonan mati di tengah.",
  },
  {
    key: "galuh-aks-final",
    studentKey: "galuh",
    cohortKey: cohortKey("aks2026_01"),
    taskTitle: "Lembar uji aksara",
    status: "approved",
    score: 88,
    feedback:
      "Transkripsi rapi dan tanpa spasi. Lafal perlu satu putaran lagi pada taling dan pepet.",
    submittedDaysAgo: 120,
    assessedDaysAgo: 118,
    revisionCount: 1,
    evidenceText:
      "Transkripsi 28 kata, rekaman baca satu paragraf, dan lima kalimat yang ditandai lalu dibetulkan.",
  },
  {
    key: "arif-aks-1",
    studentKey: "arif",
    cohortKey: cohortKey("aks2026_01"),
    taskTitle: "Latihan hanacaraka",
    status: "approved",
    score: 82,
    feedback:
      "Dua puluh aksara terbaca. Bentuk da dan dha masih tertukar di baris kedua.",
    submittedDaysAgo: 140,
    assessedDaysAgo: 138,
    revisionCount: 0,
    evidenceText: "Foto salinan dua puluh aksara dan rekaman bacaan.",
  },
  {
    key: "arif-aks-final",
    studentKey: "arif",
    cohortKey: cohortKey("aks2026_01"),
    taskTitle: "Lembar uji aksara",
    status: "approved",
    score: 81,
    feedback:
      "Transkripsi terbaca dan pasangan berada di bawah aksara. Perbaiki dua tanda baca pada kalimat penutup.",
    submittedDaysAgo: 122,
    assessedDaysAgo: 120,
    revisionCount: 0,
    evidenceText:
      "Transkripsi 26 kata, rekaman baca satu paragraf, dan lima kalimat yang dibetulkan.",
  },
]
/** Turns a task title into the kind of filename a participant would upload. */
function evidenceFilename(seed: SeedSubmission, index: number): string {
  const slug = seed.taskTitle
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `${slug}-${seed.studentKey}-${String(index + 1).padStart(2, "0")}.jpg`
}
/**
 * One cohort's slice of the learning graph: the cohort row and its sessions,
 * enrollments, lesson progress, submissions, assessments, and the dispute that
 * belongs to this cohort. Splitting by cohort keeps every mutation inside the
 * execution budget without changing a single timestamp.
 */
export const seedLearningBatch = internalMutation({
  args: { now: v.number(), cohortKey: v.string() },
  handler: async (ctx, args) => {
    const clock = createSeedClock(args.now)
    const admin = await seedAdmin(ctx)
    const seed = cohortsFor(clock).find((row) => row.key === args.cohortKey)
    if (!seed) throw new Error(`Seed cohort key missing: ${args.cohortKey}`)

    const path = await pathBySlug(ctx, seed.pathSlug)
    const teacher = await userByEmail(ctx, seedEmail(seed.teacherKey))
    const cohortId = await ctx.db.insert("cohorts", {
      code: seed.code,
      pathId: path.slug,
      teacherId: teacher._id,
      title: seed.title,
      startDate: seed.start,
      endDate: seed.end,
      capacity: seed.capacity,
      timezone: "Asia/Jakarta",
      status: seed.status,
      createdAt: Math.min(
        clock.now - DAY,
        Math.max(SEED_START, seed.start - 45 * DAY),
      ),
      updatedAt: clock.now,
    })

    const sessionCount = seed.status === "completed" ? 4 : 3
    const sessionSpan = Math.max(DAY, seed.end - seed.start)
    for (let index = 0; index < sessionCount; index += 1) {
      // Sessions sit inside the cohort window for every status, including
      // cohorts that have not opened yet.
      const startsAt =
        seed.start + Math.round((sessionSpan * (index + 1)) / (sessionCount + 1))
      await ctx.db.insert("cohortSessions", {
        cohortId,
        title:
          index === sessionCount - 1
            ? "Penilaian akhir dan umpan balik"
            : `Sesi ${index + 1}: praktik terbimbing`,
        kind: index === sessionCount - 1 ? "assessment" : "session",
        startsAt,
        endsAt: startsAt + 2 * HOUR,
        timezone: "Asia/Jakarta",
        roomId: `kalanidhi-${seed.code.toLowerCase()}-${index + 1}`,
        status:
          startsAt < clock.now
            ? "ended"
            : startsAt - clock.now < 2 * HOUR
              ? "live"
              : "scheduled",
        createdAt: Math.min(
          clock.now - HOUR,
          Math.max(SEED_START, startsAt - 14 * DAY),
        ),
      })
    }

    const earliestSubmissionAt = new Map<string, number>()
    for (const submission of SUBMISSIONS) {
      if (submission.cohortKey !== seed.key) continue
      if (submission.submittedDaysAgo === undefined) continue
      const at = clock.ago(submission.submittedDaysAgo)
      earliestSubmissionAt.set(
        submission.studentKey,
        Math.min(earliestSubmissionAt.get(submission.studentKey) ?? at, at),
      )
    }

    const lessonsByPath = new Map<string, Doc<"lessons">[]>()
    const publishedLessonsForPath = async (
      pathId: string,
    ): Promise<Doc<"lessons">[]> => {
      const cached = lessonsByPath.get(pathId)
      if (cached) return cached
      const modules = await ctx.db
        .query("pathModules")
        .withIndex("by_path_order", (q) => q.eq("pathId", pathId))
        .collect()
      const publishedModules = modules.filter(
        (module) => module.status === "published",
      )
      const lessons = (
        await Promise.all(
          publishedModules.map((module) =>
            ctx.db
              .query("lessons")
              .withIndex("by_module_order", (q) =>
                q.eq("moduleId", module._id),
              )
              .collect(),
          ),
        )
      )
        .flat()
        .sort((a, b) => a.order - b.order)
      lessonsByPath.set(pathId, lessons)
      return lessons
    }

    const cohort = await ctx.db.get(cohortId)
    if (!cohort) throw new Error(`Seed cohort missing after insert: ${seed.key}`)

    const enrollmentIds = new Map<string, Id<"enrollments">>()
    for (const enrollment of ENROLLMENTS) {
      if (enrollment.cohortKey !== seed.key) continue
      const student = await userByEmail(
        ctx,
        seedEmail(enrollment.studentKey),
      )
      const enrolledAt = Math.min(
        clock.now - HOUR,
        enrollment.status === "pending_payment"
          ? clock.ago(3)
          : Math.max(
              SEED_START,
              student.createdAt + 2 * HOUR,
              cohort.startDate - 10 * DAY,
            ),
      )
      const enrollmentId = await ctx.db.insert("enrollments", {
        studentId: student._id,
        pathId: cohort.pathId,
        cohortId,
        status: enrollment.status,
        enrolledAt,
        completedAt:
          enrollment.status === "completed" ? cohort.endDate : undefined,
        withdrawnAt:
          enrollment.status === "withdrawn"
            ? Math.min(clock.now, cohort.startDate + 21 * DAY)
            : undefined,
        withdrawReason:
          enrollment.status === "withdrawn"
            ? "Jadwal kerja berubah; peserta menunda ke angkatan berikutnya."
            : undefined,
        lastActivityAt:
          enrollment.status === "completed"
            ? cohort.endDate
            : enrollment.status === "withdrawn"
              ? Math.min(clock.now, cohort.startDate + 21 * DAY)
              : clock.now - HOUR,
        deadlineAt: cohort.endDate,
        createdAt: enrolledAt,
        updatedAt: clock.now,
      })
      enrollmentIds.set(enrollment.studentKey, enrollmentId)

      if (enrollment.status === "pending_payment") continue

      const ordered = await publishedLessonsForPath(cohort.pathId)
      const completedCount =
        enrollment.status === "completed"
          ? ordered.length
          : Math.max(1, Math.floor(ordered.length * 0.45))
      // Progress can never run past the enrollment's first submission, the
      // cohort end, or (for completed learners) the completion timestamp.
      const progressCap = Math.min(
        clock.now - HOUR,
        cohort.endDate,
        enrollment.status === "completed"
          ? cohort.endDate
          : Number.POSITIVE_INFINITY,
        earliestSubmissionAt.get(enrollment.studentKey) ??
          Number.POSITIVE_INFINITY,
      )
      const rawWindowStart = Math.max(SEED_START, cohort.startDate)
      const windowStart = Math.max(
        enrolledAt,
        SEED_START,
        Math.min(rawWindowStart, progressCap - DAY),
      )
      const windowSpan = Math.max(DAY, progressCap - windowStart)
      for (const [index, lesson] of ordered.entries()) {
        const completedAt =
          index < completedCount
            ? Math.min(
                progressCap,
                windowStart +
                  Math.round((windowSpan * (index + 1)) / (completedCount + 2)),
              )
            : undefined
        await ctx.db.insert("lessonProgress", {
          userId: student._id,
          enrollmentId,
          lessonId: lesson._id,
          state:
            index < completedCount
              ? "completed"
              : index === completedCount
                ? "in_progress"
                : "not_started",
          attendance: index <= completedCount ? "present" : undefined,
          completedAt,
          updatedAt: completedAt ?? clock.ago(1),
        })
      }
    }

    let storageId: Id<"_storage"> | undefined
    const assessmentIds = new Map<string, Id<"assessments">>()
    const submissionIds = new Map<string, Id<"submissions">>()

    for (const [submissionIndex, submissionSeed] of SUBMISSIONS.entries()) {
      if (submissionSeed.cohortKey !== seed.key) continue
      const student = await userByEmail(
        ctx,
        seedEmail(submissionSeed.studentKey),
      )
      const enrollmentId = enrollmentIds.get(submissionSeed.studentKey)
      if (!enrollmentId) {
        throw new Error(
          `Seed enrollment missing: ${submissionSeed.studentKey}:${submissionSeed.cohortKey}`,
        )
      }
      const submittedAt =
        submissionSeed.submittedDaysAgo !== undefined
          ? clock.ago(submissionSeed.submittedDaysAgo)
          : undefined
      const pondokTeacher =
        submissionSeed.status === "draft"
          ? null
          : await ctx.db.get(cohort.teacherId)
      if (submissionSeed.status !== "draft" && !pondokTeacher) {
        throw new Error(`Seed cohort teacher missing: ${submissionSeed.cohortKey}`)
      }
      const assessor = pondokTeacher
      const assessedAt =
        submissionSeed.assessedDaysAgo !== undefined
          ? clock.ago(submissionSeed.assessedDaysAgo)
          : undefined
      const assessmentStatus =
        submissionSeed.status === "approved" ||
        submissionSeed.status === "revision_requested"
          ? "completed"
          : submissionSeed.status === "under_review"
            ? "in_review"
            : "queued"
      if (submissionSeed.status !== "draft" && storageId === undefined) {
        storageId = await evidenceStorageId(ctx)
      }
      const result = await buildSubmissionAssessment(ctx, {
        now: clock.now,
        code: submissionCodeForKey(submissionSeed.key),
        studentId: student._id,
        enrollmentId,
        cohortId,
        pathId: cohort.pathId,
        taskTitle: submissionSeed.taskTitle,
        status: submissionSeed.status,
        submittedAt,
        dueAt: submittedAt ? submittedAt + DAY : clock.ahead(6),
        evidenceText: submissionSeed.evidenceText,
        revisionCount: submissionSeed.revisionCount,
        createdAt: submittedAt ?? clock.ago(6),
        updatedAt: clock.now,
        escalatedAt:
          submissionSeed.key === SUBMISSION_KEYS.bayuBbm1
            ? clock.ago(1)
            : undefined,
        escalatedBy:
          submissionSeed.key === SUBMISSION_KEYS.bayuBbm1 ? admin._id : undefined,
        escalationReason:
          submissionSeed.key === SUBMISSION_KEYS.bayuBbm1
            ? "Melewati SLA penilaian 3 hari kerja; dinaikkan ke pengajar senior."
            : undefined,
        asset:
          submissionSeed.status !== "draft" && storageId
            ? {
                storageId,
                kind: "image",
                filename: evidenceFilename(submissionSeed, submissionIndex),
                mimeType: "image/jpeg",
                size: 48_000,
                createdAt: submittedAt ?? clock.ago(6),
              }
            : undefined,
        assessment:
          submissionSeed.status === "draft" || !assessor
            ? undefined
            : {
                assessorId: assessor._id,
                status: assessmentStatus,
                rubric: rubricForPath(cohort.pathId).map((criterion) => {
                  const label = criterion.criterion.toLowerCase()
                  const revisionNote =
                    criterion.criterion === "Kualitas garis malam" ||
                    criterion.criterion === "Warna dan kebersihan"
                      ? "Hasil belum konsisten di bagian tepi; ulangi dengan takaran yang sama."
                      : `Bagian ${label} perlu diulang sebelum dinilai lagi.`
                  const doneNote =
                    criterion.criterion === "Dokumentasi" ||
                    criterion.criterion === "Catatan proses" ||
                    criterion.criterion === "Keselamatan dan catatan"
                      ? "Dokumentasi proses lengkap, foto bertanggal dan takaran tercatat."
                      : `Catatan pengajar pada ${label} sudah lengkap.`
                  return {
                    criterion: criterion.criterion,
                    weight: criterion.weight,
                    score: submissionSeed.score,
                    comment:
                      submissionSeed.status === "revision_requested"
                        ? revisionNote
                        : (submissionSeed.feedback ??
                          (submissionSeed.status === "approved"
                            ? doneNote
                            : `Menunggu penilaian pengajar pada aspek ${label}.`)),
                  }
                }),
                score: submissionSeed.score,
                feedback: submissionSeed.feedback,
                assessedAt,
                createdAt: assessedAt ?? submittedAt ?? clock.ago(6),
                updatedAt: clock.now,
                overrideReason:
                  submissionSeed.key === SUBMISSION_KEYS.dwiBbm1
                    ? "Skor disesuaikan setelah peninjauan kedua atas dokumentasi proses."
                    : undefined,
                secondReviewerId:
                  submissionSeed.key === SUBMISSION_KEYS.dwiBbm1
                    ? admin._id
                    : undefined,
                events: [
                  {
                    kind: "assign",
                    actorId: assessor._id,
                    reason: "Penugasan penilaian",
                    createdAt: submittedAt ?? clock.ago(6),
                  },
                  ...(assessmentStatus === "completed"
                    ? [
                        {
                          kind:
                            submissionSeed.status === "revision_requested"
                              ? ("revision" as const)
                              : ("grade" as const),
                          actorId: assessor._id,
                          reason: submissionSeed.feedback,
                          previousState: "submitted",
                          nextState: submissionSeed.status,
                          scoreBefore: 0,
                          scoreAfter: submissionSeed.score,
                          createdAt: assessedAt ?? clock.now,
                        },
                      ]
                    : []),
                ],
              },
      })
      submissionIds.set(submissionSeed.key, result.submissionId)
      if (result.assessmentId) {
        assessmentIds.set(submissionSeed.key, result.assessmentId)
      }
    }

    const disputeAssessment = assessmentIds.get(SUBMISSION_KEYS.dwiBbm2)
    if (disputeAssessment) {
      const dwi = await userByEmail(ctx, seedEmail("dwi"))
      await ctx.db.insert("disputes", {
        subjectType: "assessment",
        subjectId: disputeAssessment,
        openedBy: dwi._id,
        status: "reviewing",
        reason:
          "Saya sudah mengulang pencelupan dengan waktu yang sama. Mohon tinjau ulang catatan pada bagian tepi.",
        assignedTo: admin._id,
        createdAt: clock.ago(4),
        updatedAt: clock.now,
      })
    }

    return {
      cohorts: 1,
      enrollments: enrollmentIds.size,
      submissions: submissionIds.size,
      assessments: assessmentIds.size,
    }
  },
})

/** Runs one batch per cohort, in the order the cohorts were authored. */
export const seedLearning = internalAction({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const totals = { cohorts: 0, enrollments: 0, submissions: 0, assessments: 0 }
    for (const seed of cohortsFor(createSeedClock(args.now))) {
      const batch = await ctx.runMutation(
        internal.seed.domains.learning.seedLearningBatch,
        { now: args.now, cohortKey: seed.key },
      )
      totals.cohorts += batch.cohorts
      totals.enrollments += batch.enrollments
      totals.submissions += batch.submissions
      totals.assessments += batch.assessments
    }
    return totals
  },
})
