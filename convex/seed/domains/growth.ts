import { v } from "convex/values"

import { rubricForPath } from "../../assessments"
import {
  buildCertificateChain,
  buildPaidOrder,
  buildPayoutAllocation,
  buildRefundReversal,
  buildSubmissionAssessment,
} from "../lib/builders"
import { internal } from "../../_generated/api"
import { writeAudit } from "../../commerce_shared"
import type { Doc, Id } from "../../_generated/dataModel"
import {
  internalAction,
  internalMutation,
  type MutationCtx,
} from "../../_generated/server"
import { DAY, HOUR, jakartaDayStart, SEED_START } from "../lib/clock"
import { insertSeedUser } from "../lib/identity"
import { openPaths, type OpenPath } from "../lib/lookup"
import { evidenceStorageId } from "../lib/media"
import { pathSlug } from "../lib/codes"

/**
 * Growth intake for the workspace.
 *
 * The base seed describes a studio that opened in January 2026 with a handful
 * of people. This module fills the same calendar with a real operating year:
 * a rising stream of signups, buyers who only buy craft, learners who repeat a
 * path, cohorts that finish, withdrawals with and without refunds, and a
 * support queue that reads like it was written by people.
 *
 * The plan is deterministic: every monthly count is a constant below, every
 * identity is derived from the row index, and every timestamp is computed from
 * the seed clock. Reseeding reproduces the same people and the same curve.
 */

export const GROWTH_MONTHS = 11

/**
 * New buyers per month: a person who pays for a path or a work for the first
 * time. January is small, March crosses five, and the year rises.
 */
export const GROWTH_MONTHLY_BUYERS = [2, 3, 8, 9, 10, 10, 11, 12, 13, 13, 14] as const

/** Buyers who never enroll; they buy one to three craft works over time. */
export const GROWTH_MONTHLY_WORK_ONLY = [0, 0, 1, 2, 2, 2, 2, 2, 2, 3, 4] as const

/** Path buyers = buyers minus work-only customers. */
export const GROWTH_MONTHLY_PATH = GROWTH_MONTHLY_BUYERS.map(
  (buyers, month) => buyers - (GROWTH_MONTHLY_WORK_ONLY[month] as number),
)

/** Browsers who leave a lead and never pay. */
export const GROWTH_MONTHLY_LEADS = [2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 3] as const

/** All new accounts in a month. */
export const GROWTH_MONTHLY_SIGNUPS = GROWTH_MONTHLY_BUYERS.map(
  (buyers, month) => buyers + (GROWTH_MONTHLY_LEADS[month] as number),
)

/** Backwards-compatible names used by older seed tooling. */
export const GROWTH_SIGNUPS = GROWTH_MONTHLY_SIGNUPS
export const GROWTH_LEADS = GROWTH_MONTHLY_LEADS
export const GROWTH_ENROLLED = GROWTH_MONTHLY_PATH

export const GROWTH_TOTAL_SIGNUPS = GROWTH_MONTHLY_SIGNUPS.reduce(
  (total, count) => total + count,
  0,
)
export const GROWTH_TOTAL_BUYERS = GROWTH_MONTHLY_BUYERS.reduce(
  (total, count) => total + count,
  0,
)
export const GROWTH_TOTAL_WORK_ONLY = GROWTH_MONTHLY_WORK_ONLY.reduce<number>(
  (total, count) => total + count,
  0,
)
export const GROWTH_TOTAL_PATH_BUYERS = GROWTH_MONTHLY_PATH.reduce(
  (total, count) => total + count,
  0,
)
export const GROWTH_TOTAL_LEADS = GROWTH_MONTHLY_LEADS.reduce(
  (total, count) => total + count,
  0,
)

const MONTH_LABELS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
] as const

const FIRST_NAMES = [
  "Ayu",
  "Bagas",
  "Cahya",
  "Dian",
  "Eka",
  "Fitri",
  "Galih",
  "Hesti",
  "Indah",
  "Joko",
  "Krisna",
  "Laras",
  "Maya",
  "Nur",
  "Oki",
  "Pandu",
  "Ratna",
  "Sinta",
  "Teguh",
  "Umi",
  "Wahyu",
  "Yani",
  "Zahra",
  "Arum",
  "Bimo",
  "Candra",
  "Dewi",
  "Endah",
  "Fajar",
  "Gilang",
  "Hana",
  "Indra",
  "Jatmiko",
  "Kurnia",
  "Mira",
  "Nanda",
  "Putri",
  "Rizki",
  "Sekar",
  "Tirta",
  "Untari",
  "Wulan",
  "Yoga",
  "Damar",
  "Prita",
  "Aji",
  "Sari",
  "Bambang",
  "Retno",
  "Galih",
  "Sekar",
  "Bagas",
] as const

const LAST_NAMES = [
  "Prasetyo",
  "Wijaya",
  "Kusuma",
  "Nugraha",
  "Puspita",
  "Handayani",
  "Setiawan",
  "Rahayu",
  "Saputra",
  "Wulandari",
  "Kurniawan",
  "Lestari",
  "Hidayat",
  "Permata",
  "Anggraini",
  "Susanti",
  "Firmansyah",
  "Maulana",
  "Suryani",
  "Prakoso",
  "Haryanto",
  "Wibowo",
  "Rahmawati",
  "Prabowo",
  "Utami",
  "Ningsih",
  "Sulistyowati",
  "Wardani",
  "Pamungkas",
  "Kusumawati",
] as const

const EMAIL_DOMAINS = [
  "gmail.com",
  "gmail.com",
  "gmail.com",
  "gmail.com",
  "yahoo.co.id",
  "outlook.com",
] as const

const PHONE_PREFIXES = [
  "62812",
  "62813",
  "62821",
  "62822",
  "62851",
  "62857",
  "62877",
  "62881",
  "62895",
  "62856",
] as const

const REGIONS = [
  "Kota Yogyakarta",
  "Bantul",
  "Sleman",
  "Kulon Progo",
  "Gunungkidul",
] as const

const WITHDRAW_REASONS = [
  "Kerjaan lagi padat, jadi saya pilih angkatan berikutnya saja.",
  "Ada urusan keluarga di luar kota hampir sebulan, takut ketinggalan jauh.",
  "Tempo kelasnya kerasa cepat buat saya yang baru pertama kali pegang canting.",
  "Saya pindah domisili ke Magelang, jadwal sesi jadi bentrok.",
] as const

const NO_REFUND_REASON =
  "Mengundurkan diri setelah sesi kedua; biaya angkatan tidak dikembalikan sesuai ketentuan yang disetujui saat mendaftar."

const LEAD_MESSAGES = [
  "Saya lihat jadwal angkatan Juli di halaman jalur. Masih ada tempat untuk yang kerja kantor?",
  "Bu, kalau belum pernah megang canting sama sekali, boleh langsung ikut jalur batik bambu?",
  "Saya guru SD di Bantul. Kalau bawa 12 anak, bisa dibuat kelas sendiri?",
  "Kak, rekaman sesi kemarin katanya bisa diputar ulang. Berlaku sampai kapan ya?",
  "Tertarik jalur aksara, tapi saya lebih nyaman kelas malam. Ada pilihan jam?",
  "Saya mau tanya paket bahan. Kalau ikut dari luar kota, alatnya dikirim juga?",
  "Undangan saya sudah dicetak, tinggal aksara Jawa-nya. Bisa dibantu cek ejaan dulu?",
  "Angkatan Oktober masih buka? Saya baru tahu dari teman di Sleman.",
  "Untuk pranatacara, apakah harus sudah pernah jadi MC sebelumnya?",
  "Saya ikut kelas batik di kampung, mau lanjut ke level yang dinilai sertifikat.",
  "Apakah bisa cicil? Saya lihat nominalnya cukup besar untuk ukuran saya.",
  "Mau daftar untuk dua orang, saya dan adik. Bisa satu formulir?",
] as const

const LEAD_NOTES = [
  "Sudah dibalas lewat WA. Dia minta dihubungi lagi awal September setelah urusan keluarga selesai.",
  "Tanya soal jadwal kelas malam. Saya kirim tautan angkatan Oktober dan bilang rekaman tersedia 30 hari.",
  "Guru SD, minta penawaran rombongan. Sudah saya teruskan ke pengelola institusi, tunggu balasan.",
  "Baru tanya-tanya, belum yakin. Saya catat minat aksara dan janji kabari kalau ada kelas Sabtu.",
  "Sudah dihubungi dua kali, belum dijawab. Terakhir online kemarin sore.",
  "Minta contoh hasil karya sebelum memutuskan. Sudah saya kirim tiga Kartu Karya dari angkatan lalu.",
  "Dia sudah pernah ikut kelas batik di kampung, jadi saya arahkan langsung ke angkatan lanjutan.",
  "Tanya soal cicilan. Saya jelaskan belum ada skema cicilan, tapi bisa bayar QRIS penuh.",
  "Mau daftar bareng adiknya. Saya kirim dua tautan pendaftaran dan catat keduanya.",
  "Tinggal di luar kota, tanya paket bahan. Sudah saya cek ongkir ke Magelang.",
  "Minta dihubungi setelah gajian tanggal 25. Saya pasang pengingat.",
  "Masih membandingkan dua jalur. Saya sarankan datang ke sesi terbuka dulu.",
  "Sudah saya kirim jadwal angkatan Juli dan tautan pendaftaran; dia akan cek dulu dengan suami.",
  "Kerja shift malam, jadi saya tawarkan rekaman sesi dan sesi susulan akhir pekan.",
  "Minta rincian biaya bahan. Sudah saya jelaskan apa saja yang termasuk dan ongkirnya.",
  "Dia baru pindah ke Sleman, minta rekomendasi jalur yang dekat. Saya arahkan ke batik bambu.",
  "Sudah saya kirim contoh tugas akhir dua lulusan; dia minta waktu sampai akhir bulan.",
  "Tanya apakah sertifikat bisa dipakai untuk kenaikan jenjang. Saya jelaskan ini sertifikat platform.",
  "Mau ikut berdua dengan teman kantor. Saya kirim dua tautan dan catat keduanya.",
  "Belum pernah pegang canting, agak ragu. Saya tawarkan datang ke sesi terbuka dulu.",
  "Minta dihubungi lewat telepon, bukan WA. Sudah saya catat nomornya dan jadwalkan sore.",
  "Tanya soal aksara untuk undangan pernikahan. Saya kirim contoh dan tarif jasa tulis.",
  "Sudah saya kabari jadwal angkatan Agustus; dia minta pengingat H-3.",
  "Tertarik pranatacara untuk acara keluarga. Saya sarankan ikut angkatan Oktober.",
] as const

const SUPPORT_SCENARIOS = [
  {
    subject: "Canting bocor di menit terakhir",
    body: "Bu, canting saya bocor waktu latihan lengkung. Malamnya netes ke bagian yang sudah diwarnai, jadi ada bercak di tengah motif. Harus diulang dari nol atau bisa ditambal?",
    reply:
      "Bercaknya masih bisa ditutup kalau belum difiksasi. Keringkan dulu semalaman, lalu tutup tipis dengan malam dingin. Jangan dipanaskan lagi di bagian yang sudah berwarna.",
    priority: "high" as const,
    resolution:
      "Canting pengganti dikirim Senin; {name} lanjut latihan di sesi susulan.",
  },
  {
    subject: "Video sesi kemarin tidak bisa diputar",
    body: "Sesi 2 kemarin saya buka ulang tapi muter terus. Sudah coba pakai WiFi kantor dan data HP, sama saja. Rekaman yang lain normal.",
    reply:
      "Rekaman sesi 2 sedang diproses ulang, biasanya selesai 2x24 jam. Sementara itu catatan sesi dan foto papan sudah saya taruh di materi modul.",
    priority: "normal" as const,
    resolution:
      "Rekaman sesi 2 diunggah ulang dan {name} mengonfirmasi bisa diputar.",
  },
  {
    subject: "Paket bahan belum sampai",
    body: "Paket bahan untuk angkatan Juli belum saya terima. Kurir bilang alamat tidak ditemukan, padahal rumah saya di Jalan Imogiri Timur, patokannya masjid Al-Huda.",
    reply:
      "Sudah saya teruskan ke gudang, alamat akan dikirim ulang besok pagi. Kalau kurir menelepon lagi, minta antar ke masjid Al-Huda saja.",
    priority: "high" as const,
    resolution:
      "Paket dikirim ulang ke masjid Al-Huda dan diterima {name} dua hari kemudian.",
  },
  {
    subject: "Sertifikat belum muncul di akun",
    body: "Tugas akhir saya sudah dinilai Bu Sri minggu lalu, tapi sertifikat belum ada di halaman akun. Apakah ada yang kurang?",
    reply:
      "Sudah saya cek, penilaiannya masuk dan sertifikat terbit hari ini. Coba muat ulang halaman verifikasi; kalau masih kosong, kirim tangkapan layarnya ke sini.",
    priority: "normal" as const,
    resolution:
      "Sertifikat disinkronkan ulang dan sudah muncul di akun {name}.",
  },
  {
    subject: "Nominal transfer beda 37 rupiah",
    body: "Saya transfer 1.250.037 tapi di invoice tertulis 1.250.000. Yang 37 rupiah itu buat apa ya? Takutnya nanti statusnya belum lunas.",
    reply:
      "Tiga puluh tujuh rupiah itu kode unik untuk mencocokkan mutasi, bukan biaya tambahan. Statusnya sudah lunas, tidak perlu transfer lagi.",
    priority: "high" as const,
    resolution:
      "Selisih 37 rupiah dikonfirmasi sebagai kode unik; pesanan {name} lunas.",
  },
  {
    subject: "Mau pindah jadwal sesi",
    body: "Sabtu ini saya ada acara keluarga di Kulon Progo. Bisa ikut sesi susulan atau minta rekamannya saja?",
    reply:
      "Bisa ikut sesi susulan minggu depan, atau pakai rekaman kalau lebih pas. Saya catat izinnya, tugas tetap dikumpulkan sesuai tenggat.",
    priority: "normal" as const,
    resolution:
      "{name} dijadwalkan ikut sesi susulan minggu berikutnya.",
  },
  {
    subject: "Aksara di undangan kebalik",
    body: "Mas, saya baru sadar pasangan aksara di nama mempelai perempuan kebalik. Undangan sudah dicetak 200 lembar. Ada cara cepat membetulkannya?",
    reply:
      "Kalau yang salah cuma satu blok, bisa ditambal dengan stiker kertas bebas asam. Saya kirim versi aksara yang benar malam ini, sekalian ejaan Latin-nya.",
    priority: "low" as const,
    resolution:
      "Blok aksara yang benar dikirim ulang; undangan {name} ditambal dengan stiker.",
  },
  {
    subject: "Belum dapat kabar jadwal wawancara",
    body: "Saya daftar jadi pengajar pendamping bulan lalu. Katanya akan dihubungi untuk wawancara, tapi sampai sekarang belum ada kabar.",
    reply:
      "Berkasnya sudah masuk daftar tunggu. Wawancara gelombang berikutnya minggu ketiga November; saya kabari lewat WA begitu jadwalnya keluar.",
    priority: "normal" as const,
    resolution:
      "Berkas {name} masuk gelombang wawancara November dan dikabari lewat WA.",
  },
  {
    subject: "Karya yang saya pesan warnanya beda",
    body: "Nampannya sudah sampai, tapi warna dasarnya lebih gelap dari foto di etalase. Apakah memang begitu, atau ada kesalahan pewarnaan?",
    reply:
      "Warna alami memang bisa sedikit berbeda tergantung bilah. Kalau terlalu jauh dari foto, kirim foto dengan cahaya siang; kalau memang beda jauh, kami tawarkan penukaran.",
    priority: "normal" as const,
    resolution:
      "Foto cahaya siang diminta; {name} mengirim ulang foto untuk pengecekan warna.",
  },
  {
    subject: "Tidak bisa unggah tugas dari HP",
    body: "Mau unggah foto tugas dari HP tapi terus gagal. Ukurannya 4 MB, katanya maksimal 5 MB. Sudah coba Chrome dan Safari.",
    reply:
      "Coba kecilkan ke 2 MB dulu atau unggah lewat laptop. Kalau masih gagal, kirim fotonya ke WA saya dan saya unggah atas nama Anda.",
    priority: "high" as const,
    resolution:
      "Foto diperkecil ke 2 MB dan tugas {name} berhasil diunggah sebelum tenggat.",
  },
  {
    subject: "Refund belum masuk rekening",
    body: "Saya mengundurkan diri bulan lalu dan katanya refund disetujui. Sampai hari ini belum masuk ke rekening BCA saya.",
    reply:
      "Refund sudah diproses tanggal 12, biasanya masuk 3-5 hari kerja. Saya kirim bukti transfernya lewat email supaya bisa dicek ke bank.",
    priority: "high" as const,
    resolution:
      "Refund {name} diproses 12 Oktober; bukti transfer dikirim lewat email.",
  },
  {
    subject: "Jadwal sesi bentrok dengan kerja",
    body: "Sesi ketiga jatuh di hari Selasa, padahal saya shift pagi. Apakah semua sesi wajib hadir langsung?",
    reply:
      "Tidak wajib. Sesi bisa disusul lewat rekaman, yang penting tugas praktik tetap dikumpulkan. Kalau butuh bantuan, saya bisa jadwalkan panggilan singkat.",
    priority: "normal" as const,
    resolution:
      "{name} memakai rekaman sesi dan tetap mengumpulkan tugas praktik.",
  },
] as const

type EnrollmentStatus =
  | "completed"
  | "active"
  | "withdrawn"
  | "pending_payment"

type RowKind = "lead" | "path" | "work-only" | "repeat"

type PlanRow = {
  monthIndex: number
  rowIndex: number
  globalIndex: number
  kind: RowKind
  period: number
  cohortIndex: number
  cohortOrdinal: number
  plannedStatus: EnrollmentStatus
  workPurchases: number
  sourceGlobalIndex?: number
  leadIndex?: number
}

type CohortPlanRow = {
  index: number
  period: number
  pathIndex: number
  ordinal: number
  size: number
}

/**
 * Twelve cohorts across four intake windows. Sizes sum to the path rows in
 * each window: 12, 23, 34 (30 new + 4 repeats), and 27 (20 new + 7 repeats).
 */
export const COHORT_PLAN: CohortPlanRow[] = [
  { index: 0, period: 0, pathIndex: 0, ordinal: 0, size: 6 },
  { index: 1, period: 0, pathIndex: 1, ordinal: 0, size: 6 },
  { index: 2, period: 1, pathIndex: 0, ordinal: 0, size: 8 },
  { index: 3, period: 1, pathIndex: 1, ordinal: 0, size: 8 },
  { index: 4, period: 1, pathIndex: 2, ordinal: 0, size: 7 },
  { index: 5, period: 2, pathIndex: 0, ordinal: 0, size: 9 },
  { index: 6, period: 2, pathIndex: 1, ordinal: 0, size: 9 },
  { index: 7, period: 2, pathIndex: 2, ordinal: 0, size: 8 },
  { index: 8, period: 2, pathIndex: 0, ordinal: 1, size: 8 },
  { index: 9, period: 3, pathIndex: 0, ordinal: 0, size: 9 },
  { index: 10, period: 3, pathIndex: 1, ordinal: 0, size: 9 },
  { index: 11, period: 3, pathIndex: 2, ordinal: 0, size: 9 },
]

const COHORT_DAYS = 110

function monthStart(monthIndex: number): number {
  return monthIndex === 0 ? SEED_START : Date.UTC(2026, monthIndex, 1, 8, 0, 0)
}

/** Cohort windows start in January, April, July, and October. */
function periodStart(period: number): number {
  return period === 0 ? SEED_START + 3 * DAY : Date.UTC(2026, period * 3, 5, 9)
}

/** mulberry32, seeded from (month, row) so every reseed is identical. */
function rngFor(monthIndex: number, rowIndex: number): () => number {
  let state = (monthIndex * 10_007 + rowIndex * 131 + 2_026) >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
}

function signupDay(monthIndex: number, rowIndex: number, count: number): number {
  const span = 18
  const step = span / Math.max(1, count)
  return 2 + Math.min(span - 1, Math.floor(rowIndex * step + 0.5))
}

function signupTimestamp(
  monthIndex: number,
  rowIndex: number,
  count: number,
  now: number,
): number {
  const day = signupDay(monthIndex, rowIndex, count)
  const rng = rngFor(monthIndex, rowIndex)
  const hour = 7 + Math.floor(rng() * 14)
  const minute = Math.floor(rng() * 60)
  const candidate = Date.UTC(2026, monthIndex, day, hour, minute)
  return Math.min(now - 4 * DAY, Math.max(monthStart(monthIndex), candidate))
}

/** Path rows for one intake window, filled into the pre-sized cohorts. */
function assignCohorts(
  rows: PlanRow[],
  period: number,
): void {
  const slots = COHORT_PLAN.filter((cohort) => cohort.period === period)
  const remaining = new Map(slots.map((slot) => [slot.index, slot.size]))
  const ordered = rows
    .filter(
      (row) =>
        row.period === period &&
        (row.kind === "path" || row.kind === "repeat"),
    )
    .sort((a, b) =>
      a.monthIndex === b.monthIndex
        ? a.rowIndex - b.rowIndex
        : a.monthIndex - b.monthIndex,
    )
  let cursor = 0
  for (const row of ordered) {
    while (
      cursor < slots.length &&
      (remaining.get(slots[cursor]?.index as number) ?? 0) <= 0
    ) {
      cursor += 1
    }
    const slot = slots[cursor]
    if (!slot) break
    row.cohortIndex = slot.index
    row.cohortOrdinal = slot.size - (remaining.get(slot.index) ?? 0)
    remaining.set(slot.index, (remaining.get(slot.index) ?? 0) - 1)
  }
}

/** Builds the whole lifecycle plan; each batch only slices it by month. */
export function buildGrowthPlan(): PlanRow[] {
  const rows: PlanRow[] = []
  let globalIndex = 0
  let leadIndex = 0

  for (let monthIndex = 0; monthIndex < GROWTH_MONTHS; monthIndex += 1) {
    const period = Math.floor(monthIndex / 3)
    let rowIndex = 0
    for (let i = 0; i < (GROWTH_MONTHLY_PATH[monthIndex] as number); i += 1) {
      globalIndex += 1
      rows.push({
        monthIndex,
        rowIndex: rowIndex++,
        globalIndex,
        kind: "path",
        period,
        cohortIndex: -1,
        cohortOrdinal: -1,
        plannedStatus: "active",
        workPurchases: 0,
      })
    }
    for (let i = 0; i < (GROWTH_MONTHLY_WORK_ONLY[monthIndex] as number); i += 1) {
      globalIndex += 1
      rows.push({
        monthIndex,
        rowIndex: rowIndex++,
        globalIndex,
        kind: "work-only",
        period,
        cohortIndex: -1,
        cohortOrdinal: -1,
        plannedStatus: "active",
        workPurchases: 1 + ((globalIndex * 3 + i) % 3),
      })
    }
    for (let i = 0; i < (GROWTH_MONTHLY_LEADS[monthIndex] as number); i += 1) {
      globalIndex += 1
      rows.push({
        monthIndex,
        rowIndex: rowIndex++,
        globalIndex,
        kind: "lead",
        period,
        cohortIndex: -1,
        cohortOrdinal: -1,
        plannedStatus: "active",
        workPurchases: 0,
        leadIndex: leadIndex++,
      })
    }
  }

  for (let period = 0; period < 4; period += 1) {
    assignCohorts(rows, period)
  }

  // Repeat purchases: learners who already finished take another path.
  const graduates = rows
    .filter(
      (row) =>
        row.kind === "path" &&
        row.period <= 1 &&
        row.cohortOrdinal >= 0,
    )
    .sort((a, b) => a.globalIndex - b.globalIndex)
  const repeatSources = graduates.filter((_, index) => index % 3 === 1).slice(0, 11)
  const repeatMonths = [7, 7, 8, 8, 9, 9, 9, 10, 10, 10, 10]
  const repeats: PlanRow[] = []
  for (const [index, source] of repeatSources.entries()) {
    const monthIndex = repeatMonths[index] ?? 10
    repeats.push({
      monthIndex,
      rowIndex: 900 + index,
      globalIndex: source.globalIndex,
      kind: "repeat",
      period: Math.floor(monthIndex / 3),
      cohortIndex: -1,
      cohortOrdinal: -1,
      plannedStatus: "active",
      workPurchases: 0,
      sourceGlobalIndex: source.globalIndex,
    })
  }
  rows.push(...repeats)
  assignCohorts(rows, 2)
  assignCohorts(rows, 3)

  // Statuses are keyed by cohort and position so they stay stable.
  const withdrawnRows = new Set([
    "0:0",
    "1:0",
    "2:0",
    "3:0",
    "5:0",
    "6:0",
  ])
  for (const row of rows) {
    if (row.kind !== "path" && row.kind !== "repeat") continue
    const cohort = COHORT_PLAN[row.cohortIndex]
    if (!cohort) continue
    const key = `${row.cohortIndex}:${row.cohortOrdinal}`
    if (cohort.period <= 2) {
      row.plannedStatus = withdrawnRows.has(key) ? "withdrawn" : "completed"
    } else if (row.cohortOrdinal === 0 || row.cohortOrdinal === 1) {
      row.plannedStatus = "pending_payment"
    } else if (row.cohortOrdinal === 3 || row.cohortOrdinal === 4) {
      row.plannedStatus = "withdrawn"
    } else {
      row.plannedStatus = "active"
    }
  }

  // A subset of learners also buys a craft work after their certificate.
  for (const row of rows) {
    if (row.kind !== "path" && row.kind !== "repeat") continue
    if (row.plannedStatus === "completed" && row.globalIndex % 4 === 1) {
      row.workPurchases = row.globalIndex % 12 === 1 ? 2 : 1
    } else if (row.plannedStatus === "active" && row.globalIndex % 7 === 0) {
      row.workPurchases = 1
    }
  }

  return rows.sort((a, b) =>
    a.monthIndex === b.monthIndex
      ? a.rowIndex - b.rowIndex
      : a.monthIndex - b.monthIndex,
  )
}

function growthName(globalIndex: number): string {
  const first =
    FIRST_NAMES[(globalIndex * 7 + 3) % FIRST_NAMES.length] ??
    FIRST_NAMES[0]
  const last =
    LAST_NAMES[(globalIndex * 11 + 5) % LAST_NAMES.length] ?? LAST_NAMES[0]
  return `${first} ${last}`
}

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2)
}

export function growthEmail(globalIndex: number): string {
  const name = growthName(globalIndex)
  const [first, last] = name.toLowerCase().split(" ")
  const domain = EMAIL_DOMAINS[globalIndex % EMAIL_DOMAINS.length]
  return `${first}.${last}${100 + globalIndex}@${domain}`
}

export function growthPhone(globalIndex: number): string {
  const prefix = PHONE_PREFIXES[globalIndex % PHONE_PREFIXES.length]
  const local = String(
    10_000_000 + ((globalIndex * 7_349 + 13_117) % 89_999_999),
  ).padStart(8, "0")
  return `${prefix}${local}`
}

export function growthAuthId(globalIndex: number): string {
  return `seed-growth-${String(globalIndex).padStart(3, "0")}`
}

function pathSlugToken(slug: string): string {
  return slug.replace(/-/g, "").toUpperCase().slice(0, 10)
}

function cohortStatusFor(
  startDate: number,
  endDate: number,
  now: number,
): "completed" | "active" | "enrolling" {
  if (endDate < now) return "completed"
  if (startDate <= now) return "active"
  return "enrolling"
}

/** Sequential, well-formed codes; the counter lives in the growth context. */
function formatCode(prefix: string, serial: number, width: number): string {
  return `${prefix}${String(serial).padStart(width, "0")}`
}

function nextOrderCode(context: GrowthContext, used: Set<string>): string {
  let serial = context.nextOrderSerial
  let code = formatCode("KN-2026-", serial, 6)
  while (used.has(code)) {
    serial += 1
    code = formatCode("KN-2026-", serial, 6)
  }
  context.nextOrderSerial = serial + 1
  used.add(code)
  return code
}

function nextSerial(context: GrowthContext, used: Set<string>): string {
  let serial = context.nextCertificateSerial
  let code = formatCode("KN-2026-", serial, 4)
  while (used.has(code)) {
    serial += 1
    code = formatCode("KN-2026-", serial, 4)
  }
  context.nextCertificateSerial = serial + 1
  used.add(code)
  return code
}

/** 1..999 offset that is unique across the whole payments table. */
function uniqueAmount(
  baseAmount: number,
  used: Set<number>,
  seed: number,
): number {
  let offset = 1 + (Math.abs(seed) % 999)
  for (let attempt = 0; attempt < 999; attempt += 1) {
    const candidate = baseAmount + offset
    if (!used.has(candidate)) {
      used.add(candidate)
      return candidate
    }
    offset = offset === 999 ? 1 : offset + 1
  }
  throw new Error("Seed growth: tidak ada nominal unik yang tersisa.")
}

async function publishedLessons(
  ctx: MutationCtx,
  pathSlug: string,
  cache: Map<string, Doc<"lessons">[]>,
): Promise<Doc<"lessons">[]> {
  const cached = cache.get(pathSlug)
  if (cached) return cached
  const modules = await ctx.db
    .query("pathModules")
    .withIndex("by_path_order", (q) => q.eq("pathId", pathSlug))
    .collect()
  const published = modules.filter((module) => module.status === "published")
  const lessons = (
    await Promise.all(
      published.map((module) =>
        ctx.db
          .query("lessons")
          .withIndex("by_module_order", (q) => q.eq("moduleId", module._id))
          .collect(),
      ),
    )
  )
    .flat()
    .filter((lesson) => lesson.status === "published")
    .sort((a, b) => a.order - b.order)
  cache.set(pathSlug, lessons)
  return lessons
}

type BatchResult = {
  monthIndex: number
  signups: number
  leads: number
  enrollments: number
  completed: number
  certificates: number
  workOrders: number
  pathOrders: number
}

type PaidOrderInput = {
  code: string
  buyer: Doc<"users">
  sellerId: Id<"users">
  workId?: Id<"works">
  workKind?: "work" | "service"
  pathId: string
  title: string
  baseAmount: number
  createdAt: number
  paidAt: number
  status: "paid" | "refunded" | "cancelled"
  gatewayFee: number
  note?: string
}

type GrowthContext = {
  key: string
  users: Doc<"users">[]
  paths: OpenPath[]
  cohorts: Doc<"cohorts">[]
  enrollments: Array<{
    cohortId?: Id<"cohorts">
    status: Doc<"enrollments">["status"]
    createdAt: number
  }>
  works: Doc<"works">[]
  paymentAmounts: number[]
  orders: Array<{ code: string; createdAt: number }>
  certificates: Array<{ serial: string; issuedAt: number }>
  nextOrderSerial: number
  nextCertificateSerial: number
}

/**
 * The seed action passes one cache key to every batch. When Convex runs the
 * batches in the same isolate, later batches reuse the first batch's reads and
 * append their own rows; when they land in another isolate the cache misses
 * and the batch re-reads the (already updated) database. Either way the plan
 * and monthly counts are unchanged.
 */
let growthContext: GrowthContext | undefined

async function loadGrowthContext(
  ctx: MutationCtx,
  key: string | undefined,
): Promise<GrowthContext> {
  if (key !== undefined && growthContext?.key === key) return growthContext

  const [users, paths, cohorts, enrollmentRows, workRows, payments, orders, certificates] =
    await Promise.all([
      ctx.db.query("users").collect(),
      openPaths(ctx),
      ctx.db.query("cohorts").collect(),
      ctx.db.query("enrollments").collect(),
      ctx.db.query("works").collect(),
      ctx.db.query("payments").collect(),
      ctx.db.query("orders").collect(),
      ctx.db.query("certificates").collect(),
    ])
  const context: GrowthContext = {
    key: key ?? "",
    users,
    paths,
    cohorts,
    enrollments: enrollmentRows.map((row) => ({
      cohortId: row.cohortId,
      status: row.status,
      createdAt: row.createdAt,
    })),
    works: workRows
      .filter(
        (work) =>
          work.status === "published" &&
          work.price > 0 &&
          work.pathId !== undefined &&
          work.makerId !== undefined,
      )
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)),
    paymentAmounts: payments.map((row) => row.uniqueAmount),
    orders: orders
      .map((order) => ({ code: order.code, createdAt: order.createdAt }))
      .sort((a, b) => a.createdAt - b.createdAt),
    certificates: certificates
      .map((row) => ({ serial: row.serial, issuedAt: row.issuedAt }))
      .sort((a, b) => a.issuedAt - b.issuedAt),
    nextOrderSerial:
      Math.max(
        0,
        ...orders.map((order) => Number(order.code.slice(-6)) || 0),
      ) + 1,
    nextCertificateSerial:
      Math.max(
        0,
        ...certificates.map((certificate) => Number(certificate.serial.slice(-4)) || 0),
      ) + 1,
  }
  if (key !== undefined) growthContext = context
  return context
}

/**
 * Intake batch for one month slice. Each row walks its whole journey inside
 * one mutation: account, lead or order, payment, enrollment, lessons, and the
 * credential chain when the cohort has finished.
 */
export const seedGrowthBatch = internalMutation({
  args: {
    monthIndex: v.number(),
    rowStart: v.number(),
    rowEnd: v.number(),
    now: v.number(),
    cacheKey: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<BatchResult> => {
    const now = args.now
    const result: BatchResult = {
      monthIndex: args.monthIndex,
      signups: 0,
      leads: 0,
      enrollments: 0,
      completed: 0,
      certificates: 0,
      workOrders: 0,
      pathOrders: 0,
    }
    const plan = buildGrowthPlan()
      .filter((row) => row.monthIndex === args.monthIndex)
      .slice(args.rowStart, args.rowEnd)
    if (plan.length === 0) return result

    const context = await loadGrowthContext(ctx, args.cacheKey)
    const { paths, users, works } = context
    if (paths.length === 0) return result
    const admin = users.find(
      (user) => user.roles.includes("admin") && user.status === "active",
    )
    if (!admin) throw new Error("Seed admin missing")

    const takenPhones = new Set(users.map((user) => user.phone))
    const cohortByCode = new Map(context.cohorts.map((cohort) => [cohort.code, cohort]))
    const cohortLoad = new Map<string, number>()
    for (const enrollment of context.enrollments) {
      if (!enrollment.cohortId) continue
      const key = enrollment.cohortId as string
      cohortLoad.set(key, (cohortLoad.get(key) ?? 0) + 1)
    }

    const usedAmounts = new Set(context.paymentAmounts)
    const usedCodes = new Set(context.orders.map((order) => order.code))

    const usedSerials = new Set(context.certificates.map((row) => row.serial))

    const lessonCache = new Map<string, Doc<"lessons">[]>()
    const userByAuthId = new Map(
      users.map((user) => [user.authUserId, user]),
    )
    const userById = new Map(users.map((user) => [user._id, user]))
    let evidenceId: Id<"_storage"> | undefined

    const insertUser = async (row: PlanRow): Promise<Doc<"users">> => {
      if (row.kind === "repeat" && row.sourceGlobalIndex !== undefined) {
        const source = userByAuthId.get(growthAuthId(row.sourceGlobalIndex))
        if (source) return source
      }
      const name = growthName(row.globalIndex)
      const email = growthEmail(row.globalIndex)
      const authUserId = growthAuthId(row.globalIndex)
      const existing = userByAuthId.get(authUserId)
      if (existing) return existing

      let phone = growthPhone(row.globalIndex)
      let salt = 1
      while (takenPhones.has(phone)) {
        phone = growthPhone(row.globalIndex + salt * 97)
        salt += 1
      }
      takenPhones.add(phone)

      const createdAt = signupTimestamp(
        row.monthIndex,
        row.rowIndex,
        GROWTH_MONTHLY_SIGNUPS[row.monthIndex] as number,
        now,
      )
      const { user } = await insertSeedUser(
        ctx,
        {
          key: `growth-${String(row.globalIndex).padStart(3, "0")}`,
          name,
          email,
          phone,
          province: "DI Yogyakarta",
          region: `${REGIONS[(row.globalIndex * 3 + row.monthIndex) % REGIONS.length]}, D.I. Yogyakarta`,
          initials: initialsFor(name),
          roles: ["student"],
          createdAt,
          updatedAt: now,
          lastActiveAt: createdAt + (5 + (row.globalIndex % 6)) * HOUR,
          authUserId,
          projection: "growth",
          index: row.globalIndex,
          whatsappVerifiedAt: createdAt + (2 + (row.globalIndex % 4)) * HOUR,
          roleActorId: "system",
          authLog: {
            ipHash: `seed-ip-growth-${row.globalIndex}`,
            createdAt: createdAt + (2 + (row.globalIndex % 4)) * HOUR,
          },
        },
        now,
      )
      userByAuthId.set(authUserId, user)
      userById.set(user._id, user)
      context.users.push(user)
      result.signups += 1
      return user
    }

    const ensureCohort = async (index: number): Promise<Doc<"cohorts">> => {
      const spec = COHORT_PLAN[index]
      if (!spec) throw new Error(`Seed growth: cohort slot ${index} missing`)
      const path = paths[spec.pathIndex % paths.length] as OpenPath
      const code = `GRW-26${String(spec.period + 1).padStart(2, "0")}-${pathSlugToken(
        path.slug,
      )}-${spec.ordinal + 1}`
      const cached = cohortByCode.get(code)
      if (cached) return cached

      const rng = rngFor(spec.period, spec.pathIndex)
      const startDate = periodStart(spec.period) + spec.pathIndex * DAY
      const endDate = startDate + COHORT_DAYS * DAY
      const status = cohortStatusFor(startDate, endDate, now)
      const title = `${path.title} — Angkatan ${MONTH_LABELS[spec.period * 3]} 2026${
        spec.ordinal > 0 ? ` (${spec.ordinal + 1})` : ""
      }`
      const cohortId = await ctx.db.insert("cohorts", {
        code,
        pathId: path.slug,
        teacherId: path.teacherId,
        title,
        startDate,
        endDate,
        capacity: Math.max(9, spec.size + 1 + Math.floor(rng() * 2)),
        timezone: "Asia/Jakarta",
        status,
        createdAt: Math.max(SEED_START, startDate - 21 * DAY),
        updatedAt: now,
      })
      for (let sessionIndex = 0; sessionIndex < 4; sessionIndex += 1) {
        const sessionDay =
          sessionIndex === 3
            ? endDate - 6 * DAY
            : startDate + (7 + sessionIndex * 28) * DAY
        // Classes run in the morning; the day comes from the cohort window.
        const startsAt = jakartaDayStart(sessionDay) + 9 * HOUR
        await ctx.db.insert("cohortSessions", {
          cohortId,
          title:
            sessionIndex === 3
              ? "Penilaian akhir dan umpan balik"
              : `Sesi ${sessionIndex + 1}: praktik terbimbing`,
          kind: sessionIndex === 3 ? "assessment" : "session",
          startsAt,
          endsAt: startsAt + 2 * HOUR,
          timezone: "Asia/Jakarta",
          roomId: `kalanidhi-${code.toLowerCase()}-${sessionIndex + 1}`,
          status:
            startsAt + 2 * HOUR < now
              ? "ended"
              : startsAt <= now
                ? "live"
                : "scheduled",
          createdAt: Math.max(SEED_START, startsAt - 14 * DAY),
        })
      }
      const cohort = (await ctx.db.get(cohortId)) as Doc<"cohorts">
      context.cohorts.push(cohort)
      cohortByCode.set(code, cohort)
      cohortLoad.set(cohortId as string, 0)
      return cohort
    }

    const insertPaidOrder = async (
      input: PaidOrderInput,
    ): Promise<{
      orderId: Id<"orders">
      paymentId: Id<"payments">
      amount: number
    }> => {
      const amount = uniqueAmount(
        input.baseAmount,
        usedAmounts,
        input.createdAt + input.baseAmount,
      )
      const order = await buildPaidOrder(ctx, {
        now,
        code: input.code,
        buyer: input.buyer,
        sellerId: input.sellerId,
        workId: input.workId,
        itemKind: input.workId ? (input.workKind ?? "work") : "path",
        pathId: input.pathId,
        title: input.title,
        baseAmount: input.baseAmount,
        uniqueAmount: amount,
        usedUniqueAmounts: usedAmounts,
        createdAt: input.createdAt,
        paidAt: input.paidAt,
        status: input.status,
        gatewayFee: input.gatewayFee,
        note: input.note,
        tokenSeed: `seed-order-token-${input.code}`,
        providerKey: `growth_${input.code}`,
        orderIdempotencyKey: `growth-idem-${input.code}`,
        paymentIdempotencyKey: `idem_${input.code}`,
        cancelledAt:
          input.status === "cancelled" ? input.paidAt : undefined,
        cancelReason:
          input.status === "cancelled"
            ? "Peserta mengundurkan diri; biaya tidak dikembalikan."
            : undefined,
        updatedAt: now,
      })
      context.paymentAmounts.push(order.uniqueAmount)
      context.orders.push({ code: input.code, createdAt: input.createdAt })
      return {
        orderId: order.orderId,
        paymentId: order.paymentId,
        amount: order.uniqueAmount,
      }
    }

    const workPurchase = async (
      user: Doc<"users">,
      purchaseAt: number,
      seed: number,
    ): Promise<void> => {
      const available = works.filter(
        (work) => (work.createdAt ?? SEED_START) <= purchaseAt,
      )
      if (available.length === 0) return
      const work = available[(seed * 3 + 1) % available.length]
      if (!work?.makerId) return
      if ((work.makerId as string) === (user._id as string)) return
      const maker = userById.get(work.makerId)
      if (!maker || maker.status !== "active") return
      const workCreatedAt = Math.max(
        purchaseAt,
        work.createdAt ?? SEED_START,
      )
      if (workCreatedAt > now - HOUR) return
      const workPaidAt = Math.min(now - HOUR, workCreatedAt + 7 * 60_000)
      const workCode = nextOrderCode(context, usedCodes)
      const gatewayFee = Math.round(work.price * 0.01)
      const { orderId, paymentId } = await insertPaidOrder({
        code: workCode,
        buyer: user,
        sellerId: maker._id,
        workId: work._id,
        workKind: work.kind === "service" ? "service" : "work",
        pathId: work.pathId as string,
        title: work.title,
        baseAmount: work.price,
        createdAt: workCreatedAt,
        paidAt: workPaidAt,
        status: "paid",
        gatewayFee,
        note: "Pesanan dikirim setelah kelas selesai.",
      })
      result.workOrders += 1

      const canPay = workPaidAt + 7 * DAY < now
      const cycle = (seed + workCreatedAt) % 3
      const payoutStatus: "pending" | "approved" | "paid" =
        cycle === 0 ? "pending" : cycle === 1 || !canPay ? "approved" : "paid"
      const payoutPaidAt =
        payoutStatus === "paid" ? workPaidAt + 5 * DAY : undefined
      await buildPayoutAllocation(ctx, {
        now,
        orderId,
        paymentId,
        teacherId: maker._id,
        baseAmount: work.price,
        gatewayFee,
        orderPaidAt: workPaidAt,
        status: payoutStatus,
        payoutPaidAt,
        dueAt: workPaidAt + 7 * DAY,
        createdAt: Math.min(now - HOUR, workCreatedAt + DAY),
        updatedAt: now,
        approvedBy:
          payoutStatus === "approved" || payoutStatus === "paid"
            ? admin._id
            : undefined,
        reference: `PAYOUT-${workCode}`,
        periodStart: workCreatedAt,
        periodEnd: workCreatedAt + 7 * DAY,
      })
    }

    const createSupportTicket = async (
      user: Doc<"users">,
      contextLabel: string,
      ticketAt: number,
      seed: number,
    ): Promise<void> => {
      const scenario =
        SUPPORT_SCENARIOS[seed % SUPPORT_SCENARIOS.length] ??
        SUPPORT_SCENARIOS[0]
      if (!scenario) return
      const resolved = seed % 3 !== 0
      const responseMinutes = 25 + ((seed * 7) % 70)
      const assignedMinutes = 5 + ((seed * 3) % 15)
      const resolveHours = 2 + (seed % 5)
      const ticketId = await ctx.db.insert("supportTickets", {
        code: `SUP-GRW-${String(seed + 1).padStart(3, "0")}`,
        requesterId: user._id,
        requesterName: user.name,
        requesterEmail: user.email,
        subject: scenario.subject,
        priority: scenario.priority,
        status: resolved ? "resolved" : "pending",
        assigneeId: admin._id,
        channel: seed % 4 === 0 ? "whatsapp" : "chat",
        createdAt: ticketAt,
        updatedAt: ticketAt + resolveHours * HOUR,
        firstResponseAt: ticketAt + responseMinutes * 60_000,
        lastResponseAt: ticketAt + resolveHours * HOUR,
        assignedAt: ticketAt + assignedMinutes * 60_000,
        assignedBy: admin._id as string,
        resolvedAt: resolved ? ticketAt + resolveHours * HOUR : undefined,
        resolvedBy: resolved ? (admin._id as string) : undefined,
        resolutionNote: resolved
          ? scenario.resolution.replace(
              "{name}",
              user.name.split(" ")[0] ?? user.name,
            )
          : undefined,
        linkedRecords: [
          { type: "account", id: user._id as string, label: user.email },
        ],
      })
      await ctx.db.insert("supportMessages", {
        ticketId,
        authorId: user._id,
        kind: "user",
        body: scenario.body,
        createdAt: ticketAt,
      })
      await ctx.db.insert("supportMessages", {
        ticketId,
        authorId: admin._id,
        kind: "user",
        body: scenario.reply,
        createdAt: ticketAt + responseMinutes * 60_000,
      })
      if (resolved) {
        await ctx.db.insert("supportMessages", {
          ticketId,
          authorId: user._id,
          kind: "user",
          body:
            seed % 2 === 0
              ? "Oke, sudah bisa. Makasih ya kak."
              : "Siap, saya coba lagi nanti sore. Terima kasih.",
          createdAt: ticketAt + resolveHours * HOUR,
        })
      }
      void contextLabel
    }

    for (const row of plan) {
      const user = await insertUser(row)
      const rng = rngFor(row.monthIndex, row.rowIndex)

      if (row.kind === "lead") {
        const leadAt = user.createdAt + (1 + (row.globalIndex % 5)) * HOUR
        const path = paths[row.globalIndex % paths.length] as OpenPath
        const leadId = await ctx.db.insert("leads", {
          intent: "student",
          name: user.name,
          email: user.email,
          whatsapp: user.phone,
          interest: path.title,
          message: LEAD_MESSAGES[row.globalIndex % LEAD_MESSAGES.length],
          source: row.globalIndex % 4 === 0 ? "instagram" : "landing",
          consent: true,
          status: row.globalIndex % 5 === 0 ? "contacted" : "new",
          createdAt: leadAt,
          updatedAt: leadAt + DAY,
        })
        await ctx.db.insert("leadAssignments", {
          leadId,
          ownerId: admin._id,
          assignedBy: admin._id as string,
          createdAt: leadAt,
        })
        await ctx.db.insert("leadNotes", {
          leadId,
          authorId: admin._id as string,
          kind: row.globalIndex % 3 === 0 ? "whatsapp" : "note",
          body: LEAD_NOTES[(row.leadIndex ?? 0) % LEAD_NOTES.length],
          followUpAt: leadAt + 2 * DAY,
          createdAt: leadAt + HOUR,
        })
        await ctx.db.patch(user._id, { lastActiveAt: leadAt })
        result.leads += 1
        continue
      }

      if (row.kind === "work-only") {
        const firstPurchaseAt = Math.min(
          now - HOUR,
          user.createdAt + (1 + (row.globalIndex % 3)) * DAY,
        )
        const purchases = row.workPurchases
        for (let purchase = 0; purchase < purchases; purchase += 1) {
          const at = Math.min(
            now - HOUR,
            firstPurchaseAt + purchase * (38 + (row.globalIndex % 17)) * DAY,
          )
          await workPurchase(user, at, row.globalIndex + purchase)
        }
        await ctx.db.patch(user._id, {
          lastActiveAt: Math.min(now - HOUR, firstPurchaseAt + 2 * HOUR),
        })
        continue
      }

      const cohortSpec = COHORT_PLAN[row.cohortIndex]
      if (!cohortSpec) continue
      const path = paths[cohortSpec.pathIndex % paths.length] as OpenPath
      const teacher =
        userById.get(path.teacherId) ??
        ((await ctx.db.get(path.teacherId)) as Doc<"users">)
      const cohort = await ensureCohort(row.cohortIndex)

      const orderCreatedAt = Math.min(
        now - 2 * HOUR,
        user.createdAt + (6 + Math.floor(rng() * 18)) * HOUR,
      )
      const paidAt = Math.min(
        now - HOUR,
        orderCreatedAt + (3 + Math.floor(rng() * 9)) * 60_000,
      )

      if (row.plannedStatus === "pending_payment") {
        const amount = uniqueAmount(
          path.price,
          usedAmounts,
          orderCreatedAt + path.price,
        )
        const code = nextOrderCode(context, usedCodes)
        const expiresAt = orderCreatedAt + 15 * 60_000
        await buildPaidOrder(ctx, {
          now,
          code,
          buyer: user,
          sellerId: path.teacherId,
          itemKind: "path",
          pathId: path.slug,
          title: path.title,
          baseAmount: path.price,
          uniqueAmount: amount,
          usedUniqueAmounts: usedAmounts,
          createdAt: orderCreatedAt,
          status: "awaiting_payment",
          gatewayFee: undefined,
          note: "Menunggu pembayaran QRIS.",
          tokenSeed: `seed-order-token-${code}`,
          providerKey: `growth_${code}`,
          orderIdempotencyKey: `growth-idem-${code}`,
          paymentIdempotencyKey: `idem_${code}`,
          updatedAt: now,
          expiredAt: expiresAt < now ? expiresAt : undefined,
        })
        context.paymentAmounts.push(amount)
        context.orders.push({ code, createdAt: orderCreatedAt })
        const pendingEnrolledAt = Math.max(
          orderCreatedAt,
          cohort.startDate + HOUR,
        )
        await ctx.db.insert("enrollments", {
          studentId: user._id,
          pathId: path.slug,
          cohortId: cohort._id,
          status: "pending_payment",
          enrolledAt: pendingEnrolledAt,
          deadlineAt: cohort.endDate + 14 * DAY,
          lastActivityAt: pendingEnrolledAt + 2 * HOUR,
          createdAt: pendingEnrolledAt,
          updatedAt: now,
        })
        context.enrollments.push({
          cohortId: cohort._id,
          status: "pending_payment",
          createdAt: pendingEnrolledAt,
        })
        await ctx.db.patch(user._id, {
          lastActiveAt: pendingEnrolledAt + 2 * HOUR,
        })
        await ctx.db.insert("notificationOutbox", {
          channel: "in_app",
          recipient: user.email,
          recipientId: user._id,
          template: "payment_reminder",
          payload: { path: path.title, code },
          status: "sent",
          attempts: 1,
          scheduledAt: orderCreatedAt + 2 * HOUR,
          sentAt: orderCreatedAt + 2 * HOUR,
          title: "Pembayaran belum selesai",
          body: `Pendaftaran ${path.title} masih menunggu pembayaran. Kode pesanan ${code}.`,
          entityType: "order",
          entityId: code,
          createdAt: orderCreatedAt + 2 * HOUR,
          updatedAt: orderCreatedAt + 2 * HOUR,
        })
        result.enrollments += 1
        result.pathOrders += 1
        continue
      }

      const code = nextOrderCode(context, usedCodes)
      const gatewayFee = Math.round(path.price * 0.01)
      const refunded =
        row.plannedStatus === "withdrawn" && row.globalIndex % 2 === 0
      const orderStatus: "paid" | "refunded" | "cancelled" =
        row.plannedStatus === "withdrawn"
          ? refunded
            ? "refunded"
            : "cancelled"
          : "paid"
      const { orderId, paymentId } = await insertPaidOrder({
        code,
        buyer: user,
        sellerId: path.teacherId,
        pathId: path.slug,
        title: path.title,
        baseAmount: path.price,
        createdAt: orderCreatedAt,
        paidAt,
        status: orderStatus,
        gatewayFee,
        note: "Pendaftaran jalur melalui halaman publik.",
      })
      result.pathOrders += 1

      const status: EnrollmentStatus =
        row.plannedStatus === "withdrawn"
          ? "withdrawn"
          : row.plannedStatus === "completed"
            ? "completed"
            : "active"

      // An early bird can pay before the angkatan opens; the enrollment is
      // recorded when the cohort actually starts.
      const enrolledAt = Math.min(
        now - HOUR,
        Math.max(paidAt, cohort.startDate + HOUR),
      )
      const submissionAt = Math.min(
        now - 4 * DAY,
        Math.max(enrolledAt + 10 * DAY, cohort.endDate - 4 * DAY),
      )
      const withdrawnAt =
        status === "withdrawn"
          ? Math.min(
              now - 2 * DAY,
              cohort.endDate - 2 * DAY,
              enrolledAt + (21 + Math.floor(rng() * 18)) * DAY,
            )
          : undefined
      const lastActivityAt =
        status === "withdrawn"
          ? (withdrawnAt as number)
          : status === "completed"
            ? submissionAt + 2 * DAY
            : Math.min(
                now - HOUR,
                Math.max(enrolledAt + HOUR, now - Math.floor(rng() * 6) * DAY),
              )

      const enrollmentId = await ctx.db.insert("enrollments", {
        studentId: user._id,
        pathId: path.slug,
        cohortId: cohort._id,
        status,
        enrolledAt,
        completedAt: status === "completed" ? cohort.endDate : undefined,
        withdrawnAt,
        withdrawReason:
          status === "withdrawn"
            ? refunded
              ? WITHDRAW_REASONS[row.globalIndex % WITHDRAW_REASONS.length]
              : NO_REFUND_REASON
            : undefined,
        deadlineAt: cohort.endDate + 14 * DAY,
        lastActivityAt,
        createdAt: enrolledAt,
        updatedAt: now,
      })
      context.enrollments.push({
        cohortId: cohort._id,
        status,
        createdAt: enrolledAt,
      })
      result.enrollments += 1

      // Every settled path order allocates to the teacher, not only craft.
      const payoutPaid = status === "completed" && paidAt + 30 * DAY < now
      const payoutStatus: "pending" | "approved" | "paid" =
        status === "completed"
          ? payoutPaid
            ? "paid"
            : "approved"
          : "pending"
      const payoutPaidAt = payoutPaid ? paidAt + 7 * DAY : undefined
      const allocation = await buildPayoutAllocation(ctx, {
        now,
        orderId,
        paymentId,
        teacherId: path.teacherId,
        baseAmount: path.price,
        gatewayFee,
        orderPaidAt: paidAt,
        status: payoutStatus,
        payoutPaidAt,
        dueAt: paidAt + 7 * DAY,
        createdAt: Math.min(now - HOUR, paidAt + HOUR),
        updatedAt: now,
        approvedBy:
          payoutStatus === "approved" || payoutStatus === "paid"
            ? admin._id
            : undefined,
        reference: `PAYOUT-${code}`,
        periodStart: orderCreatedAt,
        periodEnd: orderCreatedAt + 7 * DAY,
      })
      const payoutId = allocation.payoutId

      if (status === "withdrawn") {
        if (refunded) {
          const refundAmount =
            row.globalIndex % 3 === 0
              ? path.price
              : Math.round(path.price * 0.4)
          await buildRefundReversal(ctx, {
            now,
            orderId,
            paymentId,
            baseAmount: path.price,
            amount: refundAmount,
            requestedBy: user._id,
            reason: "Peserta mengundurkan diri sebelum akhir angkatan.",
            status: "paid",
            decidedBy: admin._id as string,
            decisionReason:
              "Pengunduran diri diterima; pengembalian disetujui.",
            evidence: "Percakapan WhatsApp dan formulir pengunduran diri.",
            reviewedAt: (withdrawnAt as number) + DAY,
            paidAt: (withdrawnAt as number) + 2 * DAY,
            createdAt: withdrawnAt as number,
            updatedAt: now,
            originalPayoutId: payoutId,
          })
          await ctx.db.patch(paymentId, {
            status: "refunded",
            updatedAt: now,
          })
          await ctx.db.insert("paymentEvents", {
            eventId: `evt_refunded_${code}`,
            paymentId,
            orderId,
            kind: "refunded",
            amount: refundAmount,
            providerReference: `QRIS-${code}`,
            payload: { provider: "gopay_qris", stage: "refunded" },
            createdAt: (withdrawnAt as number) + 2 * DAY,
          })
        } else {
          await ctx.db.patch(payoutId, {
            status: "reversed",
            reason: "Pesanan dibatalkan tanpa pengembalian dana.",
            updatedAt: now,
          })
        }
      }

      const finalSubmissionAt =
        status === "completed"
          ? Math.min(
              now - 3 * DAY,
              Math.max(enrolledAt + 5 * DAY, cohort.endDate - 4 * DAY),
            )
          : undefined

      const midSubmissionAt =
        status === "active" && row.globalIndex % 3 === 0
          ? Math.min(
              now - 2 * DAY,
              enrolledAt + (12 + Math.floor(rng() * 10)) * DAY,
            )
          : undefined

      // Lesson progress in lesson order, spread across the learning window.
      const lessons = await publishedLessons(ctx, path.slug, lessonCache)
      const recorded = lessons
      const rawWindowStart = Math.min(
        now - HOUR,
        Math.max(enrolledAt + HOUR, cohort.startDate),
      )
      const progressCap =
        status === "completed"
          ? Math.min(now - 2 * HOUR, cohort.endDate, finalSubmissionAt as number)
          : status === "withdrawn"
            ? Math.min(
                now - 2 * DAY,
                cohort.endDate,
                (withdrawnAt as number) - HOUR,
              )
            : Math.min(
                now - 2 * DAY,
                cohort.endDate,
                midSubmissionAt ?? now,
              )
      const windowStart = Math.max(
        enrolledAt,
        Math.min(rawWindowStart, progressCap - HOUR),
      )
      const windowEnd = Math.max(windowStart + HOUR, progressCap)
      const fraction =
        status === "completed"
          ? 0.8 + rng() * 0.15
          : status === "withdrawn"
            ? 0.1 + rng() * 0.2
            : 0.2 + rng() * 0.5
      const completedCount =
        recorded.length === 0
          ? 0
          : Math.max(
              1,
              Math.min(recorded.length, Math.round(recorded.length * fraction)),
            )
      const rowCount =
        completedCount +
        (status === "active" && completedCount < recorded.length ? 1 : 0)
      const gap =
        completedCount > 0
          ? (windowEnd - windowStart) / (completedCount + 1)
          : 0
      let cursor = windowStart
      let lastProgressAt = enrolledAt
      for (const [index, lesson] of recorded.slice(0, rowCount).entries()) {
        const target = windowStart + gap * (index + 1)
        const hourOfDay = 8 + ((row.globalIndex + index * 3) % 11)
        const dayStart = Math.floor(target / DAY) * DAY
        const shaped = dayStart + hourOfDay * HOUR + 15 * 60_000
        const completedAt =
          index < completedCount
            ? Math.min(windowEnd, Math.max(cursor + HOUR, shaped))
            : undefined
        if (completedAt !== undefined) {
          cursor = completedAt
          lastProgressAt = Math.max(lastProgressAt, completedAt)
        }
        await ctx.db.insert("lessonProgress", {
          userId: user._id,
          enrollmentId,
          lessonId: lesson._id,
          state:
            index < completedCount
              ? "completed"
              : index === completedCount && status !== "completed"
                ? "in_progress"
                : "not_started",
          attendance:
            index < completedCount
              ? (row.globalIndex + index) % 7 === 0
                ? "excused"
                : "present"
              : undefined,
          completedAt,
          updatedAt: completedAt ?? windowEnd,
        })
      }

      let certificateIssuedAt: number | undefined
      if (status === "completed") {
        if (evidenceId === undefined) {
          evidenceId = await evidenceStorageId(ctx)
        }
        const taskTitle =
          path.slug === pathSlug("aksaraJawa")
            ? "Ujian akhir: paragraf aksara Jawa"
            : path.slug === pathSlug("pranatacaraJawa")
              ? "Ujian akhir: susunan acara dan praktik"
              : "Ujian akhir: kain batik bambu"
        const submissionAtFinal = finalSubmissionAt as number
        const assessmentAt = submissionAtFinal + DAY + 3 * HOUR
        const score = 84 + ((row.globalIndex * 7) % 13)
        const rubric = rubricForPath(path.slug).map((criterion) => ({
          criterion: criterion.criterion,
          weight: criterion.weight,
          score,
          comment:
            "Proses terdokumentasi rapi; hasil akhir sesuai kriteria angkatan.",
        }))
        const resultRow = await buildSubmissionAssessment(ctx, {
          now,
          code: `TUG-GRW-${String(row.globalIndex).padStart(3, "0")}${
            row.kind === "repeat" ? "-R" : ""
          }`,
          studentId: user._id,
          enrollmentId,
          cohortId: cohort._id,
          pathId: path.slug,
          taskTitle,
          status: "approved",
          submittedAt: submissionAtFinal,
          dueAt: cohort.endDate,
          evidenceText:
            "Foto proses bertahap, catatan bahan, dan hasil akhir diunggah peserta.",
          revisionCount: 1,
          createdAt: submissionAtFinal,
          updatedAt: now,
          asset: {
            storageId: evidenceId as Id<"_storage">,
            kind: "image",
            filename: `tugas-grw-${String(row.globalIndex).padStart(3, "0")}.jpg`,
            mimeType: "image/jpeg",
            size: 48_000,
            createdAt: submissionAtFinal,
          },
          assessment: {
            assessorId: teacher._id,
            status: "completed",
            rubric,
            score,
            feedback:
              "Pekerjaan akhir diterima. Catatan proses lengkap dan dapat diulang.",
            assessedAt: assessmentAt,
            createdAt: assessmentAt,
            updatedAt: now,
            events: [
              {
                kind: "assign",
                actorId: teacher._id,
                reason: "Penugasan penilaian akhir",
                createdAt: submissionAtFinal + 6 * HOUR,
              },
              {
                kind: "grade",
                actorId: teacher._id,
                reason: "Penilaian akhir disetujui",
                previousState: "submitted",
                nextState: "approved",
                scoreBefore: 0,
                scoreAfter: score,
                createdAt: assessmentAt,
              },
            ],
          },
        })
        const assessmentId = resultRow.assessmentId as Id<"assessments">
        const issuedAt = Math.min(
          now - HOUR,
          Math.max(cohort.endDate + HOUR, assessmentAt + DAY + 4 * HOUR),
        )
        const serial = nextSerial(context, usedSerials)
        await buildCertificateChain(ctx, {
          now,
          assessmentId,
          enrollmentId,
          serial,
          publicCode: serial,
          issuedAt,
          actorId: teacher._id,
          auditReason: "Penilaian akhir disetujui",
          updatedAt: now,
        })
        context.certificates.push({ serial, issuedAt })
        certificateIssuedAt = issuedAt
        result.certificates += 1
        result.completed += 1
        await ctx.db.patch(enrollmentId, {
          lastActivityAt: certificateIssuedAt ?? assessmentAt,
          updatedAt: now,
        })
        await ctx.db.patch(user._id, {
          lastActiveAt: certificateIssuedAt ?? assessmentAt,
        })
      } else {
        await ctx.db.patch(user._id, {
          lastActiveAt: Math.max(lastActivityAt, lastProgressAt),
        })
        await ctx.db.patch(enrollmentId, {
          lastActivityAt: Math.max(lastActivityAt, lastProgressAt),
        })
      }

      // A mid-course submission for some active learners keeps the board alive.
      if (
        status === "active" &&
        midSubmissionAt !== undefined &&
        lessons.length > 0
      ) {
        if (evidenceId === undefined) {
          evidenceId = await evidenceStorageId(ctx)
        }
        const midAt = midSubmissionAt
        await buildSubmissionAssessment(ctx, {
          now,
          code: `TUG-GRW-${String(row.globalIndex).padStart(3, "0")}-MID`,
          studentId: user._id,
          enrollmentId,
          cohortId: cohort._id,
          pathId: path.slug,
          taskTitle: "Tugas tengah angkatan: latihan terbimbing",
          status: "submitted",
          submittedAt: midAt,
          dueAt: midAt + 3 * DAY,
          evidenceText: "Foto latihan tengah angkatan, menunggu koreksi pengajar.",
          revisionCount: 0,
          createdAt: midAt,
          updatedAt: now,
          asset: {
            storageId: evidenceId as Id<"_storage">,
            kind: "image",
            filename: `tugas-grw-${String(row.globalIndex).padStart(3, "0")}-mid.jpg`,
            mimeType: "image/jpeg",
            size: 44_000,
            createdAt: midAt,
          },
        })
      }

      if (row.workPurchases > 0) {
        const anchorAt =
          status === "completed" && certificateIssuedAt !== undefined
            ? certificateIssuedAt
            : enrolledAt
        for (let purchase = 0; purchase < row.workPurchases; purchase += 1) {
          const purchaseAt = Math.min(
            now - HOUR,
            anchorAt + (6 + purchase * 9 + (row.globalIndex % 5)) * DAY,
          )
          await workPurchase(user, purchaseAt, row.globalIndex + purchase)
        }
      }

      if (
        row.globalIndex % 5 === 3 ||
        (status === "active" && row.globalIndex % 13 === 4)
      ) {
        const ticketAt = Math.min(
          now - DAY,
          paidAt + (5 + (row.globalIndex % 7)) * DAY,
        )
        await createSupportTicket(
          user,
          path.title,
          ticketAt,
          row.globalIndex * 2 + (row.kind === "repeat" ? 1 : 0),
        )
      }
    }

    if (args.rowStart <= 0) {
      const first = plan[0]
      if (first) {
        await writeAudit(ctx, {
          actorId: admin._id,
          actorRole: "Pengelola",
          action: "seed.growthBatch",
          entityType: "leads",
          reason: `Pendaftaran baru gelombang ${MONTH_LABELS[args.monthIndex]} 2026.`,
          after: {
            month: MONTH_LABELS[args.monthIndex],
            signups: GROWTH_MONTHLY_SIGNUPS[args.monthIndex],
            leads: GROWTH_MONTHLY_LEADS[args.monthIndex],
          },
        })
      }
    }

    return result
  },
})

/** Drives the monthly batches; keeps every mutation under the time budget. */
export const seedGrowth = internalAction({
  args: { now: v.number() },
  handler: async (ctx, args): Promise<{
    monthly: Array<{
      month: string
      signups: number
      buyers: number
      pathBuyers: number
      workOnly: number
      leads: number
      enrolled: number
    }>
    signups: number
    leads: number
    enrollments: number
    completed: number
    certificates: number
    workOrders: number
    pathOrders: number
    messaging: { conversations: number; messages: number; calls: number }
  }> => {
    const now = args.now
    // A fresh cache key per action run keeps reruns from reading stale rows.
    const cacheKey = `${now}:${Math.random().toString(36).slice(2)}`
    let signups = 0
    let leads = 0
    let enrollments = 0
    let completed = 0
    let certificates = 0
    let workOrders = 0
    let pathOrders = 0
    const monthly: Array<{
      month: string
      signups: number
      buyers: number
      pathBuyers: number
      workOnly: number
      leads: number
      enrolled: number
    }> = []
    const plan = buildGrowthPlan()

    for (let monthIndex = 0; monthIndex < GROWTH_MONTHS; monthIndex += 1) {
      if (monthStart(monthIndex) > now) break
      const rows = plan.filter((row) => row.monthIndex === monthIndex)
      monthly.push({
        month: MONTH_LABELS[monthIndex] as string,
        signups: GROWTH_MONTHLY_SIGNUPS[monthIndex] as number,
        buyers: GROWTH_MONTHLY_BUYERS[monthIndex] as number,
        pathBuyers: GROWTH_MONTHLY_PATH[monthIndex] as number,
        workOnly: GROWTH_MONTHLY_WORK_ONLY[monthIndex] as number,
        leads: GROWTH_MONTHLY_LEADS[monthIndex] as number,
        enrolled: GROWTH_MONTHLY_PATH[monthIndex] as number,
      })
      for (let rowStart = 0; rowStart < rows.length; rowStart += 2) {
        const batch = await ctx.runMutation(
          internal.seed.domains.growth.seedGrowthBatch,
          {
            monthIndex,
            rowStart,
            rowEnd: Math.min(rows.length, rowStart + 2),
            now,
            cacheKey,
          },
        )
        signups += batch.signups
        leads += batch.leads
        enrollments += batch.enrollments
        completed += batch.completed
        certificates += batch.certificates
        workOrders += batch.workOrders
        pathOrders += batch.pathOrders
      }
    }

    // The activity layer reads the relationships the batches just created.
    const messaging = await ctx.runAction(
      internal.seed.domains.messaging.seedGrowthMessaging,
      { now },
    )

    return {
      monthly,
      signups,
      leads,
      enrollments,
      completed,
      certificates,
      workOrders,
      pathOrders,
      messaging,
    }
  },
})
