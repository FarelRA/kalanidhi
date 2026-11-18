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
import { DAY, HOUR, SEED_START } from "../lib/clock"
import { insertSeedUser } from "../lib/identity"
import { openPaths, type OpenPath } from "../lib/lookup"
import { evidenceStorageId } from "../lib/media"
import { pathSlug } from "../lib/codes"

/**
 * Growth intake for the workspace.
 *
 * The base seed describes a studio that opened in January 2026 with a handful
 * of people. This module fills the same calendar with a plausible stream of
 * signups: every person is created, verified, and then either leaves a lead or
 * walks the full learning journey — order, payment, enrollment, lessons,
 * submission, assessment, certificate, and occasionally a craft purchase.
 *
 * Everything is driven by a seeded PRNG and the calendar, so reseeding
 * reproduces the same people and the same monthly numbers. Work is split into
 * small batches because Convex caps a mutation at one second.
 */

export const GROWTH_MONTHS = 11

/** Signups per month, January through November 2026. */
export const GROWTH_SIGNUPS = [6, 7, 6, 6, 7, 6, 7, 6, 6, 6, 6] as const

/** Of those signups, how many only leave a lead and never enroll. */
export const GROWTH_LEADS = [1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1] as const

export const GROWTH_ENROLLED = GROWTH_SIGNUPS.map(
  (signups, month) => signups - (GROWTH_LEADS[month] as number),
)

export const GROWTH_TOTAL_SIGNUPS = GROWTH_SIGNUPS.reduce(
  (total, count) => total + count,
  0,
)
export const GROWTH_TOTAL_ENROLLED = GROWTH_ENROLLED.reduce(
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
] as const

const EMAIL_DOMAINS = [
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
] as const

const REGIONS = [
  "Kota Yogyakarta",
  "Bantul",
  "Sleman",
  "Kulon Progo",
  "Gunungkidul",
] as const

const WITHDRAW_REASONS = [
  "Jadwal kerja berubah; peserta menunda ke angkatan berikutnya.",
  "Keperluan keluarga di luar kota selama satu bulan.",
  "Tempo kelas terasa terlalu cepat dan peserta memilih angkatan berikutnya.",
] as const

const NO_REFUND_REASON =
  "Peserta mengundurkan diri setelah sesi kedua; biaya angkatan tidak dikembalikan sesuai kebijakan."

const LEAD_MESSAGES = [
  "Saya ingin ikut angkatan berikutnya, tolong kabari jadwalnya.",
  "Apakah kelas bisa diikuti sambil bekerja? Saya hanya libur akhir pekan.",
  "Saya tertarik untuk sanggar kami, ingin tahu syarat paket bahan.",
] as const

type EnrollmentStatus =
  | "completed"
  | "active"
  | "withdrawn"
  | "pending_payment"
  | "lead"

type PlanRow = {
  monthIndex: number
  rowIndex: number
  globalIndex: number
  isLead: boolean
  period: number
  indexInPeriod: number
  plannedStatus: EnrollmentStatus
  completedIndex: number
  activeIndex: number
  workPurchases: number
}

const WITHDRAWN_BY_PERIOD: Record<number, number[]> = {
  0: [4],
  1: [2, 11],
  2: [6, 13],
  3: [0],
}

const PENDING_BY_PERIOD: Record<number, number[]> = {
  3: [1, 2, 3],
}

function monthStart(monthIndex: number): number {
  return monthIndex === 0 ? SEED_START : Date.UTC(2026, monthIndex, 1, 8, 0, 0)
}

function monthEnd(monthIndex: number): number {
  return Date.UTC(2026, monthIndex + 1, 1, 8, 0, 0)
}

/** Cohort periods start every three months; a window runs 110 days. */
function periodStart(period: number): number {
  return period === 0 ? SEED_START + 3 * DAY : Date.UTC(2026, period * 3, 5, 9)
}

const COHORT_DAYS = 110

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

function globalIndexFor(monthIndex: number, rowIndex: number): number {
  let total = 0
  for (let month = 0; month < monthIndex; month += 1) {
    total += GROWTH_SIGNUPS[month] as number
  }
  return total + rowIndex + 1
}

/** Builds the whole lifecycle plan; the batch only slices it by month. */
function buildPlan(): PlanRow[] {
  const rows: PlanRow[] = []
  const periodCounters = new Map<number, number>()
  let completedIndex = 0
  let activeIndex = 0

  for (let monthIndex = 0; monthIndex < GROWTH_MONTHS; monthIndex += 1) {
    const signups = GROWTH_SIGNUPS[monthIndex] as number
    const enrolled = GROWTH_ENROLLED[monthIndex] as number
    const period = Math.floor(monthIndex / 3)

    for (let rowIndex = 0; rowIndex < signups; rowIndex += 1) {
      const globalIndex = globalIndexFor(monthIndex, rowIndex)
      const isLead = rowIndex >= enrolled
      if (isLead) {
        rows.push({
          monthIndex,
          rowIndex,
          globalIndex,
          isLead: true,
          period,
          indexInPeriod: -1,
          plannedStatus: "lead",
          completedIndex: -1,
          activeIndex: -1,
          workPurchases: 0,
        })
        continue
      }

      const indexInPeriod = periodCounters.get(period) ?? 0
      periodCounters.set(period, indexInPeriod + 1)

      const pending = PENDING_BY_PERIOD[period] ?? []
      const withdrawn = WITHDRAWN_BY_PERIOD[period] ?? []
      let plannedStatus: EnrollmentStatus
      if (pending.includes(indexInPeriod)) plannedStatus = "pending_payment"
      else if (withdrawn.includes(indexInPeriod)) plannedStatus = "withdrawn"
      else if (period < 3) plannedStatus = "completed"
      else plannedStatus = "active"

      let rowCompleted = -1
      let rowActive = -1
      let workPurchases = 0
      if (plannedStatus === "completed") {
        rowCompleted = completedIndex
        completedIndex += 1
        if (rowCompleted % 4 === 0) {
          workPurchases = rowCompleted === 0 ? 2 : 1
        }
      }
      if (plannedStatus === "active") {
        rowActive = activeIndex
        activeIndex += 1
        if (rowActive === 1 || rowActive === 4) workPurchases = 1
      }

      rows.push({
        monthIndex,
        rowIndex,
        globalIndex,
        isLead: false,
        period,
        indexInPeriod,
        plannedStatus,
        completedIndex: rowCompleted,
        activeIndex: rowActive,
        workPurchases,
      })
    }
  }
  return rows
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
  const suffix = 10 + ((globalIndex * 7) % 89)
  const domain = EMAIL_DOMAINS[globalIndex % EMAIL_DOMAINS.length]
  return `${first}.${last}${suffix}@${domain}`
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

function signupTimestamp(
  monthIndex: number,
  rowIndex: number,
  now: number,
): number {
  const start = monthStart(monthIndex)
  const end = Math.min(monthEnd(monthIndex), now - 4 * DAY)
  const span = Math.max(DAY, end - start)
  const step = span / (GROWTH_SIGNUPS[monthIndex] as number)
  const rng = rngFor(monthIndex, rowIndex)
  const base = start + step * (rowIndex + 0.2) + rng() * step * 0.3
  return Math.min(now - 4 * DAY, Math.max(start, Math.round(base)))
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

/** Root code, without the growth suffix: `KN-2026-000108`. */
function rootOrderCode(code: string): string {
  const match = /^(KN-\d{4}-\d{6})/.exec(code)
  return match ? match[1] : code
}

function rootSerial(code: string): string {
  const match = /^(KN-\d{4}-\d{4})/.exec(code)
  return match ? match[1] : code
}

function anchoredCode(
  anchor: string,
  timestamp: number,
  used: Set<string>,
  prefixLength: number,
): string {
  const minutes = Math.max(
    1,
    Math.floor((timestamp - SEED_START) / 60_000),
  )
  let candidate = minutes
  let code = `${anchor}G${String(candidate).padStart(7, "0")}`
  while (used.has(code)) {
    candidate += 1
    code = `${anchor}G${String(candidate).padStart(7, "0")}`
  }
  void prefixLength
  used.add(code)
  return code
}

function nextOrderCode(
  timeline: Array<{ code: string; createdAt: number }>,
  used: Set<string>,
  createdAt: number,
): string {
  let anchor = "KN-2026-000000"
  let best = Number.NEGATIVE_INFINITY
  for (const row of timeline) {
    if (row.createdAt <= createdAt && row.createdAt >= best) {
      best = row.createdAt
      anchor = rootOrderCode(row.code)
    }
  }
  const code = anchoredCode(anchor, createdAt, used, 6)
  timeline.push({ code, createdAt })
  return code
}

function nextSerial(
  timeline: Array<{ code: string; createdAt: number }>,
  used: Set<string>,
  issuedAt: number,
): string {
  let anchor = "KN-2026-0000"
  let best = Number.NEGATIVE_INFINITY
  for (const row of timeline) {
    if (row.createdAt <= issuedAt && row.createdAt >= best) {
      best = row.createdAt
      anchor = rootSerial(row.code)
    }
  }
  return anchoredCode(anchor, issuedAt, used, 4)
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
    }
    const signupCount = GROWTH_SIGNUPS[args.monthIndex]
    if (signupCount === undefined) return result

    const plan = buildPlan().filter(
      (row) =>
        row.monthIndex === args.monthIndex &&
        row.rowIndex >= args.rowStart &&
        row.rowIndex < args.rowEnd,
    )
    if (plan.length === 0) return result

    const context = await loadGrowthContext(ctx, args.cacheKey)
    const { paths, users, cohorts, works } = context
    if (paths.length === 0) return result
    const admin = users.find(
      (user) => user.roles.includes("admin") && user.status === "active",
    )
    if (!admin) throw new Error("Seed admin missing")

    const takenEmails = new Set(users.map((user) => user.email))
    const takenAuthIds = new Set(users.map((user) => user.authUserId))
    const takenPhones = new Set(users.map((user) => user.phone))

    const cohortCodes = new Set(cohorts.map((cohort) => cohort.code))
    const cohortLoad = new Map<string, number>()
    for (const enrollment of context.enrollments) {
      if (!enrollment.cohortId) continue
      const key = enrollment.cohortId as string
      cohortLoad.set(key, (cohortLoad.get(key) ?? 0) + 1)
    }

    const usedAmounts = new Set(context.paymentAmounts)
    const usedCodes = new Set(context.orders.map((order) => order.code))
    const orderTimeline = [...context.orders]

    const usedSerials = new Set(context.certificates.map((row) => row.serial))
    const certificateTimeline = context.certificates.map((row) => ({
      code: row.serial,
      createdAt: row.issuedAt,
    }))

    const lessonCache = new Map<string, Doc<"lessons">[]>()
    const userByEmail = new Map(users.map((user) => [user.email, user]))
    const userById = new Map(users.map((user) => [user._id, user]))
    let evidenceId: Id<"_storage"> | undefined

    const insertUser = async (row: PlanRow): Promise<Doc<"users">> => {
      const name = growthName(row.globalIndex)
      const email = growthEmail(row.globalIndex)
      const authUserId = growthAuthId(row.globalIndex)
      const existing = userByEmail.get(email)
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
          whatsappVerifiedAt:
            createdAt + (2 + (row.globalIndex % 4)) * HOUR,
          roleActorId: "system",
          authLog: {
            ipHash: `seed-ip-growth-${row.globalIndex}`,
            createdAt: createdAt + (2 + (row.globalIndex % 4)) * HOUR,
          },
        },
        now,
      )
      takenEmails.add(email)
      takenAuthIds.add(authUserId)
      userByEmail.set(email, user)
      userById.set(user._id, user)
      context.users.push(user)
      result.signups += 1
      return user
    }

    const createCohort = async (
      path: OpenPath,
      pathIndex: number,
      period: number,
    ): Promise<Doc<"cohorts">> => {
      const rng = rngFor(period, pathIndex)
      const startDate = periodStart(period) + (pathIndex % 3) * DAY
      const endDate = startDate + COHORT_DAYS * DAY
      const status = cohortStatusFor(startDate, endDate, now)
      const baseCode = `GRW-${String(2026).slice(2)}${String(
        period * 3 + 1,
      ).padStart(2, "0")}-${pathSlugToken(path.slug)}`
      let code = baseCode
      let suffix = 2
      while (cohortCodes.has(code)) {
        code = `${baseCode}-${suffix}`
        suffix += 1
      }
      cohortCodes.add(code)
      const cohortId = await ctx.db.insert("cohorts", {
        code,
        pathId: path.slug,
        teacherId: path.teacherId as Id<"users">,
        title: `${path.title} — Angkatan ${MONTH_LABELS[period * 3]} 2026`,
        startDate,
        endDate,
        capacity: 8 + (Math.floor(rng() * 5) % 5),
        timezone: "Asia/Jakarta",
        status,
        createdAt: Math.max(SEED_START, startDate - 21 * DAY),
        updatedAt: now,
      })
      for (let index = 0; index < 4; index += 1) {
        const startsAt =
          index === 3 ? endDate - 6 * DAY : startDate + (7 + index * 28) * DAY
        await ctx.db.insert("cohortSessions", {
          cohortId,
          title:
            index === 3
              ? "Penilaian akhir dan umpan balik"
              : `Sesi ${index + 1}: praktik terbimbing`,
          kind: index === 3 ? "assessment" : "session",
          startsAt,
          endsAt: startsAt + 2 * HOUR,
          timezone: "Asia/Jakarta",
          roomId: `kalanidhi-${code.toLowerCase()}-${index + 1}`,
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
      cohorts.push(cohort)
      cohortLoad.set(cohortId as string, 0)
      return cohort
    }

    const resolveCohort = async (
      path: OpenPath,
      pathIndex: number,
      period: number,
    ): Promise<Doc<"cohorts">> => {
      const targetStart = periodStart(period)
      const candidates = cohorts
        .filter(
          (cohort) =>
            cohort.pathId === path.slug &&
            cohort.status !== "cancelled" &&
            cohort.status !== "draft" &&
            Math.abs(cohort.startDate - targetStart) <= 14 * DAY &&
            cohort.endDate >= targetStart + 85 * DAY,
        )
        .sort((a, b) => a.startDate - b.startDate)
      for (const cohort of candidates) {
        const load = cohortLoad.get(cohort._id as string) ?? 0
        if (load < cohort.capacity) {
          cohortLoad.set(cohort._id as string, load + 1)
          return cohort
        }
      }
      return await createCohort(path, pathIndex, period)
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
      const result = await buildPaidOrder(ctx, {
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
      context.paymentAmounts.push(result.uniqueAmount)
      context.orders.push({ code: input.code, createdAt: input.createdAt })
      return {
        orderId: result.orderId,
        paymentId: result.paymentId,
        amount: result.uniqueAmount,
      }
    }

    for (const row of plan) {
      const user = await insertUser(row)
      const createdAt = user.createdAt
      const rng = rngFor(row.monthIndex, row.rowIndex)

      if (row.isLead) {
        const leadAt = createdAt + (1 + (row.globalIndex % 5)) * HOUR
        const path = paths[row.globalIndex % paths.length] as OpenPath
        const leadId = await ctx.db.insert("leads", {
          intent: "student",
          name: user.name,
          email: user.email,
          whatsapp: user.phone,
          interest: path.title,
          message: LEAD_MESSAGES[row.globalIndex % LEAD_MESSAGES.length],
          source: "landing",
          consent: true,
          status: "new",
          createdAt: leadAt,
          updatedAt: leadAt,
        })
        await ctx.db.insert("leadAssignments", {
          leadId,
          ownerId: admin._id,
          assignedBy: admin._id,
          createdAt: leadAt,
        })
        await ctx.db.insert("leadNotes", {
          leadId,
          authorId: admin._id,
          kind: "whatsapp",
          body: "Pesan masuk dari halaman jalur; menunggu balasan peserta.",
          followUpAt: leadAt + DAY,
          createdAt: leadAt + HOUR,
        })
        await ctx.db.patch(user._id, { lastActiveAt: leadAt })
        result.leads += 1
        continue
      }

      const pathIndex = row.indexInPeriod % paths.length
      const path = paths[pathIndex] as OpenPath
      const teacher =
        userById.get(path.teacherId as Id<"users">) ??
        ((await ctx.db.get(path.teacherId as Id<"users">)) as Doc<"users">)
      const cohort = await resolveCohort(path, pathIndex, row.period)

      const orderCreatedAt = Math.min(
        now - 2 * HOUR,
        createdAt + (8 + Math.floor(rng() * 32)) * HOUR,
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
        const code = nextOrderCode(orderTimeline, usedCodes, orderCreatedAt)
        const expiresAt = orderCreatedAt + 15 * 60_000
        await buildPaidOrder(ctx, {
          now,
          code,
          buyer: user,
          sellerId: path.teacherId as Id<"users">,
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
        result.enrollments += 1
        continue
      }

      const code = nextOrderCode(orderTimeline, usedCodes, orderCreatedAt)
      const gatewayFee = Math.round(path.price * 0.01)
      const withdrawnRank = (WITHDRAWN_BY_PERIOD[row.period] ?? []).indexOf(
        row.indexInPeriod,
      )
      const refunded =
        row.plannedStatus === "withdrawn" && withdrawnRank % 2 === 0
      const orderStatus: "paid" | "refunded" | "cancelled" =
        row.plannedStatus === "withdrawn"
          ? refunded
            ? "refunded"
            : "cancelled"
          : "paid"
      const { orderId, paymentId } = await insertPaidOrder({
        code,
        buyer: user,
        sellerId: path.teacherId as Id<"users">,
        pathId: path.slug,
        title: path.title,
        baseAmount: path.price,
        createdAt: orderCreatedAt,
        paidAt,
        status: orderStatus,
        gatewayFee,
        note: "Pendaftaran jalur melalui halaman publik.",
      })

      const cohortEnded = cohort.endDate < now - DAY
      const status: EnrollmentStatus =
        row.plannedStatus === "withdrawn"
          ? "withdrawn"
          : row.plannedStatus === "completed" && cohortEnded
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
        Math.max(
          enrolledAt + 10 * DAY,
          cohort.endDate - 4 * DAY,
        ),
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

      // Payout allocation for the path order (every settled order allocates).
      const payoutPaid =
        status === "completed" && paidAt + 30 * DAY < now
      const payoutStatus: "pending" | "approved" | "paid" =
        payoutPaid ? "paid" : status === "completed" ? "approved" : "pending"
      const payoutPaidAt = payoutPaid ? paidAt + 7 * DAY : undefined
      const allocation = await buildPayoutAllocation(ctx, {
        now,
        orderId,
        paymentId,
        teacherId: path.teacherId as Id<"users">,
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
            row.globalIndex % 2 === 0
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
            decidedBy: admin._id,
            decisionReason: "Pengunduran diri diterima; pengembalian disetujui.",
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

      // Lesson progress in lesson order, spread across the learning window.
      const lessons = await publishedLessons(ctx, path.slug, lessonCache)
      const rawWindowStart = Math.min(
        now - HOUR,
        Math.max(enrolledAt + HOUR, cohort.startDate),
      )
      const progressCap =
        status === "completed"
          ? Math.min(
              now - 2 * HOUR,
              cohort.endDate,
              finalSubmissionAt as number,
            )
          : Math.min(
              now - 2 * DAY,
              cohort.endDate,
              enrolledAt + 12 * DAY,
            )
      const windowStart = Math.max(
        enrolledAt,
        Math.min(rawWindowStart, progressCap - HOUR),
      )
      const windowEnd = Math.max(windowStart + HOUR, progressCap)
      const fraction =
        status === "completed"
          ? 1
          : status === "withdrawn"
            ? 0.2 + rng() * 0.3
            : 0.35 + rng() * 0.4
      const completedCount =
        lessons.length === 0
          ? 0
          : status === "completed"
            ? lessons.length
            : Math.max(
                1,
                Math.min(lessons.length, Math.round(lessons.length * fraction)),
              )
      const gap =
        completedCount > 0
          ? (windowEnd - windowStart) / (completedCount + 1)
          : 0
      let cursor = windowStart
      let lastProgressAt = enrolledAt
      for (const [index, lesson] of lessons.entries()) {
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
              : index === completedCount
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
          code: `TUG-GRW-${String(row.globalIndex).padStart(3, "0")}`,
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
        const serial = nextSerial(certificateTimeline, usedSerials, issuedAt)
        await buildCertificateChain(ctx, {
          now,
          assessmentId,
          enrollmentId,
          serial,
          publicCode: `kn-grw${String(row.globalIndex).padStart(3, "0")}`,
          issuedAt,
          actorId: teacher._id,
          auditReason: "Penilaian akhir disetujui",
          updatedAt: now,
        })
        certificateTimeline.push({ code: serial, createdAt: issuedAt })
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
        row.activeIndex >= 0 &&
        row.activeIndex % 3 === 1 &&
        lessons.length > 0
      ) {
        if (evidenceId === undefined) {
          evidenceId = await evidenceStorageId(ctx)
        }
        const midAt = Math.min(
          now - 2 * DAY,
          enrolledAt + (12 + Math.floor(rng() * 10)) * DAY,
        )
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

      // Craft purchases: a quarter of completed learners, plus a few active.
      if (row.workPurchases > 0 && works.length > 0) {
        const anchorAt =
          status === "completed" && certificateIssuedAt !== undefined
            ? certificateIssuedAt
            : enrolledAt
        for (let purchase = 0; purchase < row.workPurchases; purchase += 1) {
          const work =
            works[(row.globalIndex * 3 + purchase) % works.length]
          if (!work?.makerId) continue
          if ((work.makerId as string) === (user._id as string)) continue
          const maker = userById.get(work.makerId)
          if (!maker || maker.status !== "active") continue
          const workCreatedAt = Math.max(
            anchorAt + (4 + purchase * 6) * DAY,
            (work.createdAt ?? SEED_START) + 2 * DAY,
          )
          if (workCreatedAt > now - HOUR) continue
          const workPaidAt = Math.min(
            now - HOUR,
            workCreatedAt + (4 + purchase * 3) * 60_000,
          )
          const workCode = nextOrderCode(
            orderTimeline,
            usedCodes,
            workCreatedAt,
          )
          const workGatewayFee = Math.round(work.price * 0.01)
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
            gatewayFee: workGatewayFee,
            note: "Pesanan dikirim setelah kelas selesai.",
          })
          result.workOrders += 1

          const canPay = workPaidAt + 7 * DAY < now
          const cycle = (row.globalIndex + purchase) % 3
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
            gatewayFee: workGatewayFee,
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
      }

      // A couple of learners ask a question through support.
      if (
        (status === "completed" && row.completedIndex === 5) ||
        (status === "completed" && row.completedIndex === 17) ||
        (status === "active" && row.activeIndex === 2)
      ) {
        const ticketAt = Math.min(
          now - DAY,
          paidAt + (5 + (row.globalIndex % 7)) * DAY,
        )
        const ticketId = await ctx.db.insert("supportTickets", {
          code: `SUP-GRW-${String(row.globalIndex).padStart(3, "0")}`,
          requesterId: user._id,
          requesterName: user.name,
          requesterEmail: user.email,
          subject:
            row.globalIndex % 2 === 0
              ? "Jadwal sesi berikutnya"
              : "Paket bahan belum sampai",
          priority: "normal",
          status: "resolved",
          assigneeId: admin._id,
          channel: "chat",
          createdAt: ticketAt,
          updatedAt: ticketAt + 2 * HOUR,
          firstResponseAt: ticketAt + HOUR,
          assignedAt: ticketAt + HOUR,
          assignedBy: admin._id,
          resolvedAt: ticketAt + 2 * HOUR,
          resolvedBy: admin._id,
          resolutionNote: "Sudah dijawab dan dikonfirmasi peserta.",
        })
        await ctx.db.insert("supportMessages", {
          ticketId,
          authorId: user._id,
          kind: "user",
          body:
            row.globalIndex % 2 === 0
              ? "Selamat pagi, sesi berikutnya tanggal berapa ya?"
              : "Paket bahan saya belum sampai, mohon dicek.",
          createdAt: ticketAt,
        })
        await ctx.db.insert("supportMessages", {
          ticketId,
          authorId: admin._id,
          kind: "internal",
          body: "Sudah dihubungi lewat WhatsApp dan dikonfirmasi peserta.",
          createdAt: ticketAt + HOUR,
        })
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
            signups: signupCount,
            leads: GROWTH_LEADS[args.monthIndex],
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
  handler: async (ctx, args) => {
    const now = args.now
    // A fresh cache key per action run keeps reruns from reading stale rows.
    const cacheKey = `${now}:${Math.random().toString(36).slice(2)}`
    let signups = 0
    let leads = 0
    let enrollments = 0
    let completed = 0
    let certificates = 0
    let workOrders = 0
    const monthly: Array<{ month: string; signups: number; enrolled: number }> = []

    for (let monthIndex = 0; monthIndex < GROWTH_MONTHS; monthIndex += 1) {
      if (monthStart(monthIndex) > now) break
      const count = GROWTH_SIGNUPS[monthIndex] as number
      monthly.push({
        month: MONTH_LABELS[monthIndex],
        signups: count,
        enrolled: GROWTH_ENROLLED[monthIndex] as number,
      })
      for (let rowStart = 0; rowStart < count; rowStart += 2) {
        const rowEnd = Math.min(count, rowStart + 2)
        const batch = await ctx.runMutation(
          internal.seed.domains.growth.seedGrowthBatch,
          { monthIndex, rowStart, rowEnd, now, cacheKey },
        )
        signups += batch.signups
        leads += batch.leads
        enrollments += batch.enrollments
        completed += batch.completed
        certificates += batch.certificates
        workOrders += batch.workOrders
      }
    }

    return {
      monthly,
      signups,
      leads,
      enrollments,
      completed,
      certificates,
      workOrders,
    }
  },
})
