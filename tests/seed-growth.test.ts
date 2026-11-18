import { describe, expect, it } from "vitest"

import { splitAmount } from "../lib/commerce/money"
import { internal } from "../convex/_generated/api"
import {
  GROWTH_MONTHLY_BUYERS,
  GROWTH_MONTHLY_LEADS,
  GROWTH_MONTHLY_SIGNUPS,
  GROWTH_TOTAL_BUYERS,
  GROWTH_TOTAL_LEADS,
  GROWTH_TOTAL_PATH_BUYERS,
  GROWTH_TOTAL_SIGNUPS,
  GROWTH_TOTAL_WORK_ONLY,
  growthEmail,
  growthPhone,
} from "../convex/seed/domains/growth"
import { SEED_START } from "../convex/seed/lib/clock"
import {
  authCandidates,
  isPlaceholderAuthId,
  linkPlan,
  normalizeSeedEmail,
} from "../convex/seed/lib/auth"
import { createTestDb, type TestDb } from "./helpers/convex"

const DAY = 86_400_000
const NOW = Date.UTC(2026, 10, 18, 10, 0, 0)

/**
 * A small world for the growth seed: three open paths with published
 * lessons, a teacher each, three makers who are not growth buyers, and four
 * published works with early dates so the first work-only buyer can purchase
 * in March. Everything else comes from the module under test.
 */
async function seedGrowthWorld(t: TestDb) {
  return await t.run(async (ctx) => {
    const insertUser = async (input: {
      authUserId: string
      name: string
      email: string
      phone: string
      roles: ("student" | "teacher" | "admin")[]
      region?: string
    }) =>
      await ctx.db.insert("users", {
        authUserId: input.authUserId,
        name: input.name,
        email: input.email,
        emailVerified: true,
        phone: input.phone,
        province: "DI Yogyakarta",
        whatsappVerified: true,
        initials: input.name
          .split(" ")
          .map((part) => part.charAt(0))
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        region: input.region ?? "Kota Yogyakarta, D.I. Yogyakarta",
        roles: input.roles,
        status: "active",
        createdAt: SEED_START,
        updatedAt: SEED_START,
      })

    const adminId = await insertUser({
      authUserId: "growth-admin",
      name: "Farel Reski Aditiya",
      email: "farel@kalanidhi.site",
      phone: "6285157813352",
      roles: ["admin"],
    })
    const teacherOne = await insertUser({
      authUserId: "growth-teacher-1",
      name: "Sri Sriningsih",
      email: "sri.sriningsih81@gmail.com",
      phone: "6285729461037",
      roles: ["teacher"],
      region: "Bantul, D.I. Yogyakarta",
    })
    const teacherTwo = await insertUser({
      authUserId: "growth-teacher-2",
      name: "Suwardi Pratama",
      email: "suwardi.pratama62@gmail.com",
      phone: "6281395408271",
      roles: ["teacher"],
    })
    const teacherThree = await insertUser({
      authUserId: "growth-teacher-3",
      name: "Widagdo Saputra",
      email: "widagdo.saputra19@gmail.com",
      phone: "6281294736508",
      roles: ["teacher"],
    })
    const makerOne = await insertUser({
      authUserId: "growth-maker-1",
      name: "Anisa Rahmawati",
      email: "anisa.rahmawati02@gmail.com",
      phone: "6285742096371",
      roles: ["teacher"],
    })
    const makerTwo = await insertUser({
      authUserId: "growth-maker-2",
      name: "Dimas Yoga Pratama",
      email: "dimas.yogapratama96@gmail.com",
      phone: "6281234567890",
      roles: ["teacher"],
    })
    const makerThree = await insertUser({
      authUserId: "growth-maker-3",
      name: "Galuh Puspita",
      email: "galuh.puspita11@gmail.com",
      phone: "6289876543210",
      roles: ["teacher"],
    })

    const paths = [
      {
        order: 0,
        slug: "batik-bambu",
        code: "Jalur 01",
        title: "Batik Bambu",
        subtitle: "Mola dan nerusi",
        teacher: "Sri Sriningsih",
        teacherRole: "Pengajar batik",
        region: "Bantul, D.I. Yogyakarta",
        level: "Pemula",
        modules: 2,
        weeks: 14,
        tasks: 2,
        price: 1_250_000,
        tags: ["Batik"],
        outcome: "Kain latihan.",
        includes: ["Dua modul"],
        teacherId: teacherOne,
        status: "open" as const,
        createdAt: SEED_START,
      },
      {
        order: 1,
        slug: "pranatacara-jawa",
        code: "Jalur 02",
        title: "Seni Pembawa Acara Tradisi Jawa",
        subtitle: "Tata wicara",
        teacher: "Widagdo Saputra",
        teacherRole: "Pembawa acara",
        region: "Kota Yogyakarta, D.I. Yogyakarta",
        level: "Pemula",
        modules: 2,
        weeks: 14,
        tasks: 2,
        price: 980_000,
        tags: ["Pranatacara"],
        outcome: "Rundown acara.",
        includes: ["Dua modul"],
        teacherId: teacherThree,
        status: "open" as const,
        createdAt: SEED_START,
      },
      {
        order: 2,
        slug: "aksara-jawa",
        code: "Jalur 03",
        title: "Aksara Jawa",
        subtitle: "Hanacaraka",
        teacher: "Suwardi Pratama",
        teacherRole: "Pengajar aksara",
        region: "Kota Yogyakarta, D.I. Yogyakarta",
        level: "Pemula",
        modules: 2,
        weeks: 14,
        tasks: 2,
        price: 650_000,
        tags: ["Aksara"],
        outcome: "Paragraf pendek.",
        includes: ["Dua modul"],
        teacherId: teacherTwo,
        status: "open" as const,
        createdAt: SEED_START,
      },
    ]
    const lessonCounts: Record<string, number> = {
      "batik-bambu": 30,
      "pranatacara-jawa": 15,
      "aksara-jawa": 25,
    }
    for (const path of paths) {
      await ctx.db.insert("paths", path)
      const lessonCount = lessonCounts[path.slug] ?? 12
      const moduleCount = 2
      const perModule = Math.ceil(lessonCount / moduleCount)
      for (let moduleIndex = 0; moduleIndex < moduleCount; moduleIndex += 1) {
        const moduleId = await ctx.db.insert("pathModules", {
          order: moduleIndex,
          pathId: path.slug,
          title: `Modul ${moduleIndex + 1}`,
          summary: "Modul uji",
          estimatedMinutes: 60,
          status: "published",
          createdAt: SEED_START,
        })
        const start = moduleIndex * perModule
        const end = Math.min(lessonCount, start + perModule)
        for (let lessonIndex = start; lessonIndex < end; lessonIndex += 1) {
          await ctx.db.insert("lessons", {
            order: lessonIndex,
            moduleId,
            pathId: path.slug,
            title: `Pelajaran ${lessonIndex + 1}`,
            kind: "text",
            body: "Materi uji.",
            mediaAssetIds: [],
            estimatedMinutes: 15,
            accessLevel: "enrolled",
            status: "published",
            createdAt: SEED_START,
          })
        }
      }
    }

    const works = [
      {
        order: 0,
        slug: "nampan-batik-bambu",
        title: "Nampan Batik Bambu",
        category: "batik" as const,
        kind: "product" as const,
        maker: "Anisa Rahmawati",
        makerRole: "Lulusan",
        teacher: "Sri Sriningsih",
        region: "Bantul",
        price: 385_000,
        unit: "Nampan",
        technique: "Tulis",
        techniqueNote: "Canting",
        workCard: "KN-UJI-1",
        description: "Nampan uji.",
        makerId: makerOne,
        pathId: "batik-bambu",
        status: "published" as const,
        createdAt: SEED_START,
      },
      {
        order: 1,
        slug: "box-tisu-batik-bambu",
        title: "Box Tisu Batik Bambu",
        category: "batik" as const,
        kind: "product" as const,
        maker: "Dimas Yoga Pratama",
        makerRole: "Lulusan",
        teacher: "Sri Sriningsih",
        region: "Bantul",
        price: 275_000,
        unit: "Kotak tisu",
        technique: "Tulis",
        techniqueNote: "Canting",
        workCard: "KN-UJI-2",
        description: "Kotak tisu uji.",
        makerId: makerTwo,
        pathId: "batik-bambu",
        status: "published" as const,
        createdAt: SEED_START + 18 * DAY,
      },
      {
        order: 2,
        slug: "hiasan-dinding-batik-bambu",
        title: "Hiasan Dinding Batik Bambu",
        category: "batik" as const,
        kind: "product" as const,
        maker: "Galuh Puspita",
        makerRole: "Lulusan",
        teacher: "Sri Sriningsih",
        region: "Bantul",
        price: 650_000,
        unit: "Panel",
        technique: "Tulis",
        techniqueNote: "Canting",
        workCard: "KN-UJI-3",
        description: "Panel uji.",
        makerId: makerThree,
        pathId: "batik-bambu",
        status: "published" as const,
        createdAt: SEED_START + 40 * DAY,
      },
      {
        order: 3,
        slug: "jasa-tulis-aksara",
        title: "Jasa Tulis Aksara",
        category: "layanan" as const,
        kind: "service" as const,
        maker: "Galuh Puspita",
        makerRole: "Lulusan",
        teacher: "Suwardi Pratama",
        region: "Kota Yogyakarta",
        price: 400_000,
        unit: "Undangan",
        technique: "Tulis",
        techniqueNote: "Tangan",
        workCard: "KN-UJI-4",
        description: "Jasa uji.",
        makerId: makerThree,
        pathId: "aksara-jawa",
        status: "published" as const,
        createdAt: SEED_START + 60 * DAY,
      },
    ]
    for (const work of works) {
      await ctx.db.insert("works", work)
    }

    const storageId = await ctx.storage.store(
      new Blob(["growth evidence"], { type: "image/jpeg" }),
    )
    await ctx.db.insert("mediaAssets", {
      kind: "image",
      storageId,
      filename: "growth-evidence.jpg",
      mimeType: "image/jpeg",
      size: 10,
      alt: "Bukti tugas",
      status: "active",
      uploadedBy: "system",
      createdAt: SEED_START,
    })

    return { adminId, teacherOne, teacherTwo, teacherThree, makerOne }
  })
}

type GrowthWorld = Awaited<ReturnType<typeof seedGrowthWorld>>

function monthOf(timestamp: number): number {
  return new Date(timestamp).getUTCMonth()
}

async function loadGrowth(t: TestDb) {
  return await t.run(async (ctx) => {
    const users = await ctx.db.query("users").collect()
    const growthUsers = users.filter((user) =>
      user.authUserId.startsWith("seed-growth-"),
    )
    const growthIds = new Set(growthUsers.map((user) => user._id as string))
    const enrollments = (
      await ctx.db.query("enrollments").collect()
    ).filter((row) => growthIds.has(row.studentId as string))
    const leads = await ctx.db.query("leads").collect()
    const leadAssignments = await ctx.db.query("leadAssignments").collect()
    const leadNotes = await ctx.db.query("leadNotes").collect()
    const cohorts = await ctx.db.query("cohorts").collect()
    const sessions = await ctx.db.query("cohortSessions").collect()
    const paths = await ctx.db.query("paths").collect()
    const lessons = await ctx.db.query("lessons").collect()
    const orders = (
      await ctx.db.query("orders").collect()
    ).filter(
      (order) =>
        order.buyerUserId !== undefined &&
        growthIds.has(order.buyerUserId as string),
    )
    const payments = await ctx.db.query("payments").collect()
    const paymentEvents = await ctx.db.query("paymentEvents").collect()
    const payouts = await ctx.db.query("payouts").collect()
    const ledger = await ctx.db.query("ledgerEntries").collect()
    const refunds = await ctx.db.query("refunds").collect()
    const submissions = await ctx.db.query("submissions").collect()
    const submissionAssets = await ctx.db.query("submissionAssets").collect()
    const assessments = await ctx.db.query("assessments").collect()
    const assessmentEvents = await ctx.db.query("assessmentEvents").collect()
    const certificates = await ctx.db.query("certificates").collect()
    const certificateEvents = await ctx.db.query("certificateEvents").collect()
    const progress = (
      await ctx.db.query("lessonProgress").collect()
    ).filter((row) => growthIds.has(row.userId as string))
    const supportTickets = await ctx.db.query("supportTickets").collect()
    const supportMessages = await ctx.db.query("supportMessages").collect()
    const conversations = await ctx.db.query("conversations").collect()
    const members = await ctx.db.query("conversationMembers").collect()
    const messages = await ctx.db.query("messages").collect()
    const calls = await ctx.db.query("callSessions").collect()
    const participants = await ctx.db.query("callParticipants").collect()
    return {
      users,
      growthUsers,
      growthIds: [...growthIds],
      enrollments,
      leads,
      leadAssignments,
      leadNotes,
      cohorts,
      sessions,
      paths,
      lessons,
      orders,
      payments,
      paymentEvents,
      payouts,
      ledger,
      refunds,
      submissions,
      submissionAssets,
      assessments,
      assessmentEvents,
      certificates,
      certificateEvents,
      progress,
      supportTickets,
      supportMessages,
      conversations,
      members,
      messages,
      calls,
      participants,
    }
  })
}

async function runGrowth(t: TestDb) {
  const world = await seedGrowthWorld(t)
  const result = await t.action(internal.seed.domains.growth.seedGrowth, {
    now: NOW,
  })
  const data = await loadGrowth(t)
  return { world, result, data }
}

type GrowthData = Awaited<ReturnType<typeof loadGrowth>>

describe("seed growth / operating year", () => {
  it("follows the monthly buyer curve and keeps the funnel above it", async () => {
    const t = createTestDb()
    const { result, data } = await runGrowth(t)

    expect(result.monthly.map((row) => row.buyers)).toEqual([
      ...GROWTH_MONTHLY_BUYERS,
    ])
    expect(result.monthly[0]?.buyers).toBe(2)
    expect(result.monthly[1]?.buyers).toBe(3)
    for (const row of result.monthly.slice(2)) {
      expect(row.buyers).toBeGreaterThanOrEqual(5)
    }
    for (let index = 1; index < result.monthly.length; index += 1) {
      expect(result.monthly[index]?.buyers).toBeGreaterThanOrEqual(
        result.monthly[index - 1]?.buyers as number,
      )
    }
    expect(GROWTH_TOTAL_BUYERS).toBeGreaterThanOrEqual(90)
    expect(GROWTH_TOTAL_BUYERS).toBeLessThanOrEqual(115)
    expect(GROWTH_TOTAL_SIGNUPS).toBeGreaterThanOrEqual(110)
    expect(GROWTH_TOTAL_SIGNUPS).toBeLessThanOrEqual(130)
    expect(GROWTH_TOTAL_PATH_BUYERS + GROWTH_TOTAL_WORK_ONLY).toBe(
      GROWTH_TOTAL_BUYERS,
    )
    expect(GROWTH_TOTAL_LEADS).toBeGreaterThanOrEqual(15)
    expect(GROWTH_TOTAL_LEADS).toBeLessThanOrEqual(25)

    const firstOrder = new Map<string, number>()
    for (const order of data.orders) {
      const at = order.paidAt ?? order.createdAt
      const buyer = order.buyerUserId as string
      const previous = firstOrder.get(buyer)
      if (previous === undefined || at < previous) firstOrder.set(buyer, at)
    }
    const buyersByMonth = Array.from({ length: 11 }, () => 0)
    for (const at of firstOrder.values()) buyersByMonth[monthOf(at)] += 1
    expect(buyersByMonth).toEqual([...GROWTH_MONTHLY_BUYERS])

    const signupsByMonth = Array.from({ length: 11 }, () => 0)
    for (const user of data.growthUsers) {
      signupsByMonth[monthOf(user.createdAt)] += 1
    }
    expect(signupsByMonth).toEqual([...GROWTH_MONTHLY_SIGNUPS])

    const leadsByMonth = Array.from({ length: 11 }, () => 0)
    for (const lead of data.leads) {
      if (lead.email === undefined) continue
      if (
        !data.growthUsers.some((user) => user.email === lead.email)
      ) {
        continue
      }
      leadsByMonth[monthOf(lead.createdAt)] += 1
    }
    expect(leadsByMonth).toEqual([...GROWTH_MONTHLY_LEADS])

    // Every month has a path buyer; work-only buyers appear from March.
    for (let month = 0; month < 11; month += 1) {
      expect(
        data.orders.some(
          (order) =>
            order.workId === undefined &&
            monthOf(order.createdAt) === month,
        ),
        `path buyer in month ${month}`,
      ).toBe(true)
    }
    for (let month = 2; month < 11; month += 1) {
      expect(
        data.orders.some(
          (order) =>
            order.workId !== undefined && monthOf(order.createdAt) === month,
        ),
        `work buyer in month ${month}`,
      ).toBe(true)
    }
  })

  it("separates work-only customers from enrolled learners", async () => {
    const t = createTestDb()
    const { data } = await runGrowth(t)

    const enrollmentByStudent = new Map<string, number>()
    for (const enrollment of data.enrollments) {
      const student = enrollment.studentId as string
      enrollmentByStudent.set(student, (enrollmentByStudent.get(student) ?? 0) + 1)
    }
    const ordersByBuyer = new Map<string, typeof data.orders>()
    for (const order of data.orders) {
      const buyer = order.buyerUserId as string
      const rows = ordersByBuyer.get(buyer) ?? []
      rows.push(order)
      ordersByBuyer.set(buyer, rows)
    }
    const buyers = [...ordersByBuyer.keys()]
    expect(buyers.length).toBe(GROWTH_TOTAL_BUYERS)

    const workOnly = buyers.filter((buyer) => !enrollmentByStudent.has(buyer))
    expect(workOnly.length).toBe(GROWTH_TOTAL_WORK_ONLY)
    expect(workOnly.length).toBeGreaterThanOrEqual(20)
    expect(workOnly.length).toBeLessThanOrEqual(30)
    for (const buyer of workOnly) {
      const orders = ordersByBuyer.get(buyer) ?? []
      expect(orders.length).toBeGreaterThanOrEqual(1)
      expect(orders.length).toBeLessThanOrEqual(3)
      expect(orders.every((order) => order.workId !== undefined)).toBe(true)
    }

    for (const [student, count] of enrollmentByStudent) {
      const orders = ordersByBuyer.get(student) ?? []
      expect(
        orders.some((order) => order.workId === undefined),
        `enrolled buyer ${student} path order`,
      ).toBe(true)
      expect(count).toBeGreaterThanOrEqual(1)
    }

    const enrolled = new Set(enrollmentByStudent.keys())
    for (const buyer of buyers) {
      if (enrolled.has(buyer)) continue
      expect(enrollmentByStudent.has(buyer)).toBe(false)
    }
  })

  it("pays path teachers and work makers with balanced ledgers", async () => {
    const t = createTestDb()
    const { data } = await runGrowth(t)

    const pathOrders = data.orders.filter(
      (order) => order.workId === undefined,
    )
    const workOrders = data.orders.filter(
      (order) => order.workId !== undefined,
    )
    expect(pathOrders.length).toBeGreaterThanOrEqual(90)
    expect(pathOrders.length).toBeLessThanOrEqual(110)
    expect(workOrders.length).toBeGreaterThanOrEqual(50)
    expect(workOrders.length).toBeLessThanOrEqual(70)

    const paymentByOrder = new Map(
      data.payments.map((payment) => [payment.orderId as string, payment]),
    )
    const payoutByOrder = new Map(
      data.payouts
        .filter((payout) => payout.kind === "sale")
        .map((payout) => [payout.orderId as string, payout]),
    )
    const pathTeachers = new Set<string>()
    const workMakers = new Set<string>()

    for (const order of [...pathOrders, ...workOrders]) {
      expect(order.sellerId).not.toBe(order.buyerUserId)
      const payment = paymentByOrder.get(order._id as string)
      expect(payment, `${order.code} payment`).toBeDefined()
      expect(payment?.uniqueAmount).toBeGreaterThan(order.baseAmount)
      expect(payment?.uniqueAmount).toBeLessThanOrEqual(order.baseAmount + 999)

      const payout = payoutByOrder.get(order._id as string)
      if (order.status === "awaiting_payment") {
        expect(payout).toBeUndefined()
        expect(
          data.ledger.filter((entry) => entry.orderId === order._id),
        ).toHaveLength(0)
        continue
      }
      expect(payout, `${order.code} payout`).toBeDefined()
      expect(payout?.teacherId).toBe(order.sellerId)
      expect(payout?.gross).toBe(order.baseAmount)
      const split = splitAmount(order.baseAmount)
      expect(payout?.teacherShare).toBe(split.teacherShare)
      expect(payout?.platformShare).toBe(split.platformShare)
      expect(payout?.communityShare).toBe(split.communityShare)
      expect(
        (payout?.teacherShare as number) +
          (payout?.platformShare as number) +
          (payout?.communityShare as number),
      ).toBe(order.baseAmount)

      const entries = data.ledger.filter(
        (entry) => entry.orderId === order._id,
      )
      const credits = entries
        .filter((entry) => entry.direction === "credit")
        .reduce((total, entry) => total + entry.amount, 0)
      expect(credits).toBe(order.baseAmount)
      expect(
        entries.some(
          (entry) =>
            entry.account === "gateway_fee" && entry.direction === "debit",
        ),
      ).toBe(true)
      expect(entries.some((entry) => entry.account === "platform")).toBe(true)
      expect(entries.some((entry) => entry.account === "community")).toBe(true)
      if (payout?.status === "paid") {
        expect(payout.paidAmount).toBe(payout.teacherShare)
        expect(
          entries.some(
            (entry) =>
              entry.account === "teacher" &&
              entry.entryType === "payout" &&
              entry.direction === "debit",
          ),
        ).toBe(true)
      }

      if (order.workId === undefined) {
        pathTeachers.add(order.sellerId as string)
      } else {
        workMakers.add(order.sellerId as string)
      }
    }

    expect(pathTeachers.size).toBeGreaterThanOrEqual(3)
    expect(workMakers.size).toBeGreaterThanOrEqual(2)
    // Path earnings are real, not only craft.
    expect(
      data.payouts.filter((payout) => payout.kind === "sale").length,
    ).toBeGreaterThan(pathOrders.length)
  })

  it("finishes learners through submission, assessment, and certificate", async () => {
    const t = createTestDb()
    const { data } = await runGrowth(t)

    const completed = data.enrollments.filter(
      (row) => row.status === "completed",
    )
    expect(completed.length).toBeGreaterThanOrEqual(55)
    expect(completed.length).toBeLessThanOrEqual(70)
    expect(data.certificates).toHaveLength(completed.length)
    expect(
      new Set(completed.map((row) => row.studentId as string)).size,
    ).toBeGreaterThanOrEqual(55)

    const assessmentBySubmission = new Map(
      data.assessments.map((row) => [row.submissionId as string, row]),
    )
    const certificateByAssessment = new Map(
      data.certificates.map((row) => [row.assessmentId as string, row]),
    )
    for (const enrollment of completed) {
      const submission = data.submissions.find(
        (row) => row.enrollmentId === enrollment._id,
      )
      expect(submission, `${enrollment._id} submission`).toBeDefined()
      expect(submission?.status).toBe("approved")
      expect(submission?.submittedAt as number).toBeGreaterThanOrEqual(
        enrollment.enrolledAt,
      )
      expect(
        data.submissionAssets.filter(
          (asset) => asset.submissionId === submission?._id,
        ).length,
      ).toBeGreaterThan(0)

      const assessment = assessmentBySubmission.get(
        submission?._id as string,
      )
      expect(assessment, `${enrollment._id} assessment`).toBeDefined()
      expect(assessment?.status).toBe("completed")
      expect(assessment?.score).toBeGreaterThan(0)
      expect(assessment?.createdAt as number).toBeGreaterThanOrEqual(
        submission?.submittedAt as number,
      )
      expect(
        data.assessmentEvents.some(
          (event) => event.assessmentId === assessment?._id,
        ),
      ).toBe(true)

      const certificate = certificateByAssessment.get(
        assessment?._id as string,
      )
      expect(certificate, `${enrollment._id} certificate`).toBeDefined()
      expect(certificate?.status).toBe("issued")
      expect(enrollment.certificateId).toBe(certificate?._id)
      expect(certificate?.issuedAt as number).toBeGreaterThanOrEqual(
        assessment?.createdAt as number,
      )
      expect(certificate?.issuedAt as number).toBeGreaterThanOrEqual(
        enrollment.completedAt as number,
      )
      expect(certificate?.snapshot.issuedAt).toBe(certificate?.issuedAt)
      expect(
        data.certificateEvents.some(
          (event) => event.certificateId === certificate?._id,
        ),
      ).toBe(true)
    }

    const serials = data.certificates.map((row) => row.serial)
    expect(new Set(serials).size).toBe(serials.length)
    const codes = data.certificates.map((row) => row.publicCode)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it("documents withdrawals and keeps pending payments progress-free", async () => {
    const t = createTestDb()
    const { data } = await runGrowth(t)

    const withdrawn = data.enrollments.filter(
      (row) => row.status === "withdrawn",
    )
    expect(withdrawn.length).toBeGreaterThanOrEqual(10)
    expect(withdrawn.length).toBeLessThanOrEqual(15)

    for (const enrollment of withdrawn) {
      const order = data.orders.find(
        (row) =>
          row.buyerUserId === enrollment.studentId &&
          row.pathId === enrollment.pathId,
      )
      expect(order, `${enrollment._id} order`).toBeDefined()
      expect(order?.paidAt).toBeDefined()
      expect(enrollment.withdrawnAt as number).toBeGreaterThan(
        enrollment.enrolledAt,
      )
      const refund = data.refunds.find((row) => row.orderId === order?._id)
      if (refund) {
        expect(refund.status).toBe("paid")
        expect(refund.amount).toBeGreaterThan(0)
        expect(refund.amount).toBeLessThanOrEqual(order?.baseAmount as number)
        expect(order?.status).toBe("refunded")
        const reversals = data.ledger.filter(
          (row) => row.refundId === refund._id,
        )
        expect(reversals.length).toBeGreaterThanOrEqual(3)
        expect(reversals.every((row) => row.direction === "debit")).toBe(true)
        expect(
          reversals.reduce((total, row) => total + row.amount, 0),
        ).toBe(refund.amount)
      } else {
        expect(enrollment.withdrawReason ?? "").toMatch(
          /tidak dikembalikan|tanpa pengembalian/i,
        )
        expect(order?.status).toBe("cancelled")
      }
    }

    const pending = data.enrollments.filter(
      (row) => row.status === "pending_payment",
    )
    expect(pending.length).toBeGreaterThanOrEqual(5)
    expect(pending.length).toBeLessThanOrEqual(8)
    for (const enrollment of pending) {
      const order = data.orders.find(
        (row) =>
          row.buyerUserId === enrollment.studentId &&
          row.pathId === enrollment.pathId,
      )
      expect(order?.status).toBe("awaiting_payment")
      const payment = data.payments.find(
        (row) => row.orderId === order?._id,
      )
      expect(["pending", "expired"]).toContain(payment?.status)
      expect(payment?.paidAt).toBeUndefined()
      expect(
        data.progress.filter(
          (row) => row.enrollmentId === enrollment._id,
        ),
      ).toHaveLength(0)
    }
  })

  it("records ordered lesson progress inside the cohort window", async () => {
    const t = createTestDb()
    const { data } = await runGrowth(t)

    expect(data.progress.length).toBeGreaterThanOrEqual(1000)
    expect(data.progress.length).toBeLessThanOrEqual(1600)

    const lessonById = new Map(
      data.lessons.map((lesson) => [lesson._id as string, lesson]),
    )
    const lessonsByPath = new Map<string, number>()
    for (const lesson of data.lessons) {
      if (lesson.status !== "published") continue
      lessonsByPath.set(
        lesson.pathId,
        (lessonsByPath.get(lesson.pathId) ?? 0) + 1,
      )
    }
    const cohortById = new Map(
      data.cohorts.map((cohort) => [cohort._id as string, cohort]),
    )
    const progressByEnrollment = new Map<string, typeof data.progress>()
    for (const row of data.progress) {
      const key = row.enrollmentId as string
      const rows = progressByEnrollment.get(key) ?? []
      rows.push(row)
      progressByEnrollment.set(key, rows)
    }

    for (const enrollment of data.enrollments) {
      const rows = progressByEnrollment.get(enrollment._id as string) ?? []
      if (enrollment.status === "pending_payment") {
        expect(rows).toHaveLength(0)
        continue
      }
      expect(rows.length).toBeGreaterThan(0)
      const cohort = cohortById.get(enrollment.cohortId as string)
      expect(cohort).toBeDefined()
      const ordered = [...rows].sort(
        (a, b) =>
          (lessonById.get(a.lessonId as string)?.order ?? 0) -
          (lessonById.get(b.lessonId as string)?.order ?? 0),
      )
      let previous = enrollment.enrolledAt
      for (const row of ordered) {
        expect(lessonById.get(row.lessonId as string)?.pathId).toBe(
          enrollment.pathId,
        )
        if (row.completedAt !== undefined) {
          expect(row.completedAt).toBeGreaterThan(previous)
          expect(row.completedAt).toBeGreaterThanOrEqual(
            enrollment.enrolledAt,
          )
          expect(row.completedAt).toBeLessThanOrEqual(
            cohort?.endDate as number,
          )
          expect(row.completedAt).toBeLessThanOrEqual(NOW)
          if (enrollment.status === "withdrawn") {
            expect(row.completedAt).toBeLessThanOrEqual(
              enrollment.withdrawnAt as number,
            )
          }
          previous = row.completedAt
        }
      }

      const totalLessons = lessonsByPath.get(enrollment.pathId) ?? 0
      const completedRows = ordered.filter(
        (row) => row.state === "completed",
      ).length
      const ratio = totalLessons === 0 ? 0 : completedRows / totalLessons
      if (enrollment.status === "completed") {
        expect(ratio).toBeGreaterThanOrEqual(0.78)
        expect(ratio).toBeLessThanOrEqual(1)
      } else if (enrollment.status === "withdrawn") {
        expect(ratio).toBeGreaterThanOrEqual(0.08)
        expect(ratio).toBeLessThanOrEqual(0.38)
      } else {
        expect(ratio).toBeGreaterThanOrEqual(0.18)
        expect(ratio).toBeLessThanOrEqual(0.82)
      }
    }
  })

  it("fills 10-14 cohorts with 5-9 learners and 3-4 sessions", async () => {
    const t = createTestDb()
    const { data } = await runGrowth(t)

    const growthCohorts = data.cohorts.filter((cohort) =>
      cohort.code.startsWith("GRW-"),
    )
    expect(growthCohorts.length).toBeGreaterThanOrEqual(10)
    expect(growthCohorts.length).toBeLessThanOrEqual(14)

    for (const cohort of growthCohorts) {
      const members = data.enrollments.filter(
        (row) => row.cohortId === cohort._id,
      )
      expect(members.length, `${cohort.code} fill`).toBeGreaterThanOrEqual(5)
      expect(members.length, `${cohort.code} fill`).toBeLessThanOrEqual(9)
      expect(members.length).toBeLessThanOrEqual(cohort.capacity)
      for (const enrollment of members) {
        expect(enrollment.pathId).toBe(cohort.pathId)
        expect(enrollment.enrolledAt).toBeGreaterThanOrEqual(
          cohort.startDate,
        )
      }
      const sessions = data.sessions.filter(
        (session) => session.cohortId === cohort._id,
      )
      expect(sessions.length).toBeGreaterThanOrEqual(3)
      expect(sessions.length).toBeLessThanOrEqual(4)
      for (const session of sessions) {
        expect(session.startsAt).toBeGreaterThanOrEqual(cohort.startDate)
        expect(session.endsAt).toBeLessThanOrEqual(cohort.endDate)
        const hour = Number(
          new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            hour12: false,
          }).format(new Date(session.startsAt)),
        )
        expect(hour, `${cohort.code} session hour`).toBeGreaterThanOrEqual(7)
        expect(hour, `${cohort.code} session hour`).toBeLessThanOrEqual(18)
      }
    }
  })

  it("writes real conversations with member senders and real relationships", async () => {
    const t = createTestDb()
    const { data } = await runGrowth(t)

    expect(data.conversations.length).toBeGreaterThanOrEqual(35)
    expect(data.conversations.length).toBeLessThanOrEqual(50)
    expect(data.messages.length).toBeGreaterThanOrEqual(200)
    expect(data.messages.length).toBeLessThanOrEqual(350)
    expect(data.supportTickets.length).toBeGreaterThanOrEqual(12)
    expect(data.supportTickets.length).toBeLessThanOrEqual(25)
    expect(data.calls.length).toBeGreaterThanOrEqual(8)
    expect(data.calls.length).toBeLessThanOrEqual(12)

    const memberKeys = new Set(
      data.members.map(
        (member) => `${member.conversationId}:${member.userId}`,
      ),
    )
    const messagesByConversation = new Map<string, typeof data.messages>()
    for (const message of data.messages) {
      const key = message.conversationId as string
      const rows = messagesByConversation.get(key) ?? []
      rows.push(message)
      messagesByConversation.set(key, rows)
      if (message.senderId) {
        expect(
          memberKeys.has(`${message.conversationId}:${message.senderId}`),
          `sender ${message.senderId} is a member`,
        ).toBe(true)
      }
    }
    for (const conversation of data.conversations) {
      const rows = messagesByConversation.get(conversation._id as string) ?? []
      expect(rows.length, `thread ${conversation._id} messages`).toBeGreaterThanOrEqual(2)
      const senders = new Set(
        rows.map((row) => row.senderId).filter(Boolean),
      )
      expect(senders.size).toBeGreaterThan(0)
    }

    const cohortIds = new Set(data.cohorts.map((row) => row._id as string))
    for (const conversation of data.conversations.filter(
      (row) => row.kind === "cohort",
    )) {
      expect(cohortIds.has(conversation.cohortId as string)).toBe(true)
      const members = data.members.filter(
        (row) => row.conversationId === conversation._id,
      )
      expect(members.length).toBeGreaterThanOrEqual(2)
      const cohort = data.cohorts.find(
        (row) => row._id === conversation.cohortId,
      )
      expect(members.some((row) => row.userId === cohort?.teacherId)).toBe(true)
    }

    const orderByCode = new Map(
      data.orders.map((order) => [order.code, order]),
    )
    for (const conversation of data.conversations.filter(
      (row) =>
        row.kind === "direct" &&
        (row.title ?? "").startsWith("Pesanan "),
    )) {
      const code = (conversation.title ?? "").split(" • ").at(-1)
      const order = orderByCode.get(code ?? "")
      expect(order, `order thread ${conversation.title}`).toBeDefined()
      const members = data.members.filter(
        (row) => row.conversationId === conversation._id,
      )
      expect(
        members.some((row) => row.userId === order?.buyerUserId),
      ).toBe(true)
      expect(members.some((row) => row.userId === order?.sellerId)).toBe(true)
    }

    const ticketCodes = new Set(
      data.supportTickets.map((ticket) => ticket.code),
    )
    expect(ticketCodes.size).toBe(data.supportTickets.length)
    for (const conversation of data.conversations.filter(
      (row) => row.kind === "support",
    )) {
      const code = (conversation.title ?? "").split(" • ").at(-1)
      expect(ticketCodes.has(code ?? "")).toBe(true)
    }
  })

  it("writes distinct support resolutions and varied priorities", async () => {
    const t = createTestDb()
    const { data } = await runGrowth(t)

    const resolved = data.supportTickets.filter(
      (ticket) => ticket.status === "resolved" || ticket.status === "closed",
    )
    expect(resolved.length).toBeGreaterThan(0)
    const notes = resolved.map((ticket) => ticket.resolutionNote)
    expect(notes.every((note) => (note ?? "").length > 10)).toBe(true)
    expect(new Set(notes).size).toBe(notes.length)

    const pending = data.supportTickets.filter(
      (ticket) => ticket.status === "open" || ticket.status === "pending",
    )
    for (const ticket of pending) {
      expect(ticket.resolutionNote).toBeUndefined()
    }

    const priorities = new Set(
      data.supportTickets.map((ticket) => ticket.priority),
    )
    expect(priorities.has("high")).toBe(true)
    expect(priorities.has("low")).toBe(true)
    expect(priorities.has("normal")).toBe(true)

    const noteBodies = data.leadNotes.map((note) => note.body)
    expect(new Set(noteBodies).size).toBe(noteBodies.length)
  })

  it("uses plausible identities and unique keys", async () => {
    const t = createTestDb()
    const { data } = await runGrowth(t)

    const emails = new Set<string>()
    const phones = new Set<string>()
    const authIds = new Set<string>()
    for (const user of data.growthUsers) {
      expect(user.email).toMatch(
        /^[a-z]+(\.[a-z]+)\d{3,4}@(gmail\.com|yahoo\.co\.id|outlook\.com)$/,
      )
      expect(user.email).not.toMatch(/growth|seed|demo|example|test|user\d/i)
      expect(user.phone).toMatch(/^62(812|813|821|822|851|857|877|881|895|856)\d{8}$/)
      expect(user.province).toBe("DI Yogyakarta")
      expect(user.region).toMatch(
        /^(Kota Yogyakarta|Bantul|Sleman|Kulon Progo|Gunungkidul), D\.I\. Yogyakarta$/,
      )
      expect(user.roles).toEqual(["student"])
      expect(user.status).toBe("active")
      expect(user.emailVerified).toBe(true)
      expect(user.whatsappVerified).toBe(true)
      expect(user.whatsappVerifiedAt as number).toBeGreaterThan(user.createdAt)
      expect(user.createdAt).toBeGreaterThanOrEqual(SEED_START)
      expect(user.createdAt).toBeLessThanOrEqual(NOW)
      const index = Number(user.authUserId.slice(-3))
      expect(user.email).toBe(growthEmail(index))
      expect(user.phone).toBe(growthPhone(index))
      emails.add(user.email)
      phones.add(user.phone)
      authIds.add(user.authUserId)
    }
    expect(emails.size).toBe(data.growthUsers.length)
    expect(phones.size).toBe(data.growthUsers.length)
    expect(authIds.size).toBe(data.growthUsers.length)

    const orderCodes = data.orders.map((order) => order.code)
    expect(new Set(orderCodes).size).toBe(orderCodes.length)
    for (const code of orderCodes) {
      expect(code).toMatch(/^KN-\d{4}-\d{6}$/)
    }
    const amounts = data.payments.map((payment) => payment.uniqueAmount)
    expect(new Set(amounts).size).toBe(amounts.length)

    const certificateCodes = data.certificates.map(
      (certificate) => certificate.publicCode,
    )
    expect(new Set(certificateCodes).size).toBe(certificateCodes.length)
    for (const certificate of data.certificates) {
      expect(certificate.serial).toMatch(/^KN-\d{4}-\d{4}$/)
      expect(certificate.publicCode).toBe(certificate.serial)
    }

    const leadEmails = new Set(
      data.leads
        .map((lead) => lead.email)
        .filter((email): email is string => email !== undefined),
    )
    for (const lead of data.leads) {
      expect(
        data.leadAssignments.some(
          (assignment) => assignment.leadId === lead._id,
        ),
      ).toBe(true)
      expect(
        data.leadNotes.some((note) => note.leadId === lead._id),
      ).toBe(true)
    }
    expect(leadEmails.size).toBeGreaterThan(0)
  })

  it("keeps every learner row connected to the rest of the graph", async () => {
    const t = createTestDb()
    const world: GrowthWorld = await seedGrowthWorld(t)
    await t.action(internal.seed.domains.growth.seedGrowth, { now: NOW })
    const data: GrowthData = await loadGrowth(t)

    const userIds = new Set(data.users.map((user) => user._id as string))
    const enrollmentIds = new Set(
      data.enrollments.map((row) => row._id as string),
    )
    const submissionIds = new Set(
      data.submissions.map((row) => row._id as string),
    )
    const assessmentIds = new Set(
      data.assessments.map((row) => row._id as string),
    )
    for (const assessment of data.assessments) {
      expect(submissionIds.has(assessment.submissionId as string)).toBe(true)
      expect(userIds.has(assessment.assessorId as string)).toBe(true)
    }
    for (const certificate of data.certificates) {
      expect(assessmentIds.has(certificate.assessmentId as string)).toBe(true)
      expect(userIds.has(certificate.teacherId as string)).toBe(true)
      expect(
        data.paths.some((path) => path.slug === certificate.pathId),
      ).toBe(true)
    }
    for (const submission of data.submissions) {
      expect(enrollmentIds.has(submission.enrollmentId as string)).toBe(true)
      expect(
        data.cohorts.some((row) => row._id === submission.cohortId),
      ).toBe(true)
    }
    for (const order of data.orders) {
      expect(userIds.has(order.sellerId as string)).toBe(true)
      expect(userIds.has(order.buyerUserId as string)).toBe(true)
      expect(
        data.payments.some((payment) => payment.orderId === order._id),
      ).toBe(true)
      if (order.paidAt !== undefined) {
        expect(order.paidAt).toBeGreaterThanOrEqual(order.createdAt)
        expect(order.paidAt).toBeLessThanOrEqual(NOW)
      }
    }
    for (const payout of data.payouts) {
      expect(userIds.has(payout.teacherId as string)).toBe(true)
      expect(payout.orderId).toBeDefined()
      expect(payout.paymentId).toBeDefined()
    }
    expect(world.teacherOne).toBeDefined()
  })
})

describe("seed auth helpers", () => {
  it("identifies placeholder subjects and skips the preserved admin", () => {
    expect(isPlaceholderAuthId("seed-growth-001")).toBe(true)
    expect(isPlaceholderAuthId("seed-sari")).toBe(true)
    expect(isPlaceholderAuthId("jh7abc123")).toBe(false)

    const users = [
      {
        _id: "u1",
        name: "Ayu Prasetyo",
        email: "Ayu@Gmail.com",
        authUserId: "seed-growth-001",
        roles: ["student"],
        status: "active",
      },
      {
        _id: "u2",
        name: "Sri Sriningsih",
        email: "sri@kalanidhi.site",
        authUserId: "real-admin",
        roles: ["admin"],
        status: "active",
      },
      {
        _id: "u3",
        name: "Budi Santoso",
        email: "budi@gmail.com",
        authUserId: "seed-growth-002",
        roles: ["student"],
        status: "active",
      },
      {
        _id: "u4",
        name: "Ayu Prasetyo",
        email: "ayu@gmail.com",
        authUserId: "seed-growth-003",
        roles: ["student"],
        status: "active",
      },
      {
        _id: "u5",
        name: "Pengelola KalaNidhi",
        email: "pengelola@kalanidhi.site",
        authUserId: "seed-admin",
        roles: ["admin"],
        status: "active",
      },
    ]
    const candidates = authCandidates(users, [
      { email: "ayu@gmail.com", authUserId: "mapped-1" },
    ])
    expect(candidates).toEqual([
      {
        userId: "u1",
        name: "Ayu Prasetyo",
        email: "ayu@gmail.com",
        authUserId: "mapped-1",
      },
      {
        userId: "u3",
        name: "Budi Santoso",
        email: "budi@gmail.com",
        authUserId: undefined,
      },
      {
        userId: "u5",
        name: "Pengelola KalaNidhi",
        email: "pengelola@kalanidhi.site",
        authUserId: undefined,
      },
    ])
    expect(normalizeSeedEmail(" Ayu@Gmail.com ")).toBe("ayu@gmail.com")
  })

  it("plans the duplicate cleanup around the real subject", () => {
    const plan = linkPlan({
      originalUserId: "original",
      authUserId: "auth-123",
      users: [
        { _id: "original", authUserId: "seed-growth-001", email: "a@b.c" },
        { _id: "duplicate", authUserId: "auth-123", email: "a@b.c" },
        { _id: "other", authUserId: "auth-999", email: "x@y.z" },
      ],
    })
    expect(plan.duplicateUserIds).toEqual(["duplicate"])
    expect(plan.originalUserId).toBe("original")
  })

  it("deletes the trigger duplicate and keeps the original learner row", async () => {
    const t = createTestDb()
    const ids = await t.run(async (ctx) => {
      const base = {
        name: "Ayu Prasetyo",
        email: "ayu.prasetyo101@gmail.com",
        emailVerified: true,
        phone: "6281234567890",
        province: "DI Yogyakarta",
        whatsappVerified: true,
        initials: "AP",
        region: "Bantul, D.I. Yogyakarta",
        roles: ["student"] as ("student" | "admin")[],
        status: "active" as const,
        createdAt: SEED_START,
        updatedAt: SEED_START,
      }
      const original = await ctx.db.insert("users", {
        ...base,
        authUserId: "seed-growth-001",
      })
      const duplicate = await ctx.db.insert("users", {
        ...base,
        authUserId: "auth-real-1",
      })
      await ctx.db.insert("roleAssignments", {
        userId: duplicate,
        role: "student",
        action: "grant",
        actorId: "system",
        reason: "Student registration",
        createdAt: SEED_START,
      })
      await ctx.db.insert("consents", {
        userId: duplicate,
        kind: "privacy",
        granted: true,
        version: "2026-11",
        source: "signup",
        createdAt: SEED_START,
      })
      await ctx.db.insert("sessions", {
        userId: duplicate,
        authSessionId: "auth-session-1",
        deviceName: "Android",
        userAgent: "test",
        createdAt: SEED_START,
        lastSeenAt: SEED_START,
        expiresAt: SEED_START + DAY,
      })
      await ctx.db.insert("authLogs", {
        userId: duplicate,
        kind: "sign_in",
        createdAt: SEED_START,
      })
      return { original, duplicate }
    })

    const result = await t.mutation(
      internal.seed.domains.auth.linkSeedAuthAccounts,
      {
        links: [
          {
            userId: ids.original,
            email: "ayu.prasetyo101@gmail.com",
            authUserId: "auth-real-1",
          },
        ],
        now: NOW,
      },
    )
    expect(result).toEqual({ linked: 1, duplicates: 1 })

    const after = await t.run(async (ctx) => {
      const original = await ctx.db.get(ids.original)
      const duplicate = await ctx.db.get(ids.duplicate)
      const roles = await ctx.db
        .query("roleAssignments")
        .withIndex("by_userId", (q) => q.eq("userId", ids.duplicate))
        .collect()
      const consents = await ctx.db
        .query("consents")
        .withIndex("by_userId", (q) => q.eq("userId", ids.duplicate))
        .collect()
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_userId", (q) => q.eq("userId", ids.duplicate))
        .collect()
      const mappings = await ctx.db.query("seedAuthAccounts").collect()
      return { original, duplicate, roles, consents, sessions, mappings }
    })
    expect(after.duplicate).toBeNull()
    expect(after.original?.authUserId).toBe("auth-real-1")
    expect(after.roles).toHaveLength(0)
    expect(after.consents).toHaveLength(0)
    expect(after.sessions).toHaveLength(0)
    expect(after.mappings).toHaveLength(1)
    expect(after.mappings[0]?.email).toBe("ayu.prasetyo101@gmail.com")
    expect(after.mappings[0]?.authUserId).toBe("auth-real-1")
  })
})
