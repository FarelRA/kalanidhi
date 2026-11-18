import { describe, expect, it } from "vitest"

import { internal } from "../convex/_generated/api"
import {
  GROWTH_ENROLLED,
  GROWTH_LEADS,
  GROWTH_SIGNUPS,
  GROWTH_TOTAL_ENROLLED,
  GROWTH_TOTAL_SIGNUPS,
  growthEmail,
  growthPhone,
} from "../convex/seed/domains/growth"
import { SEED_START } from "../convex/seed/lib/clock"
import { createTestDb, type TestDb } from "./helpers/convex"

const DAY = 86_400_000
const NOW = Date.now()

/**
 * Minimal world for the growth seed: two open paths with real published
 * lessons, a teacher each, an admin, and two published works from makers who
 * are not the growth students. Everything else is left to the module under
 * test, so the assertions never depend on the other seed files.
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
    const makerOne = await insertUser({
      authUserId: "growth-maker-1",
      name: "Anisa Rahmawati",
      email: "anisa.rahmawati02@gmail.com",
      phone: "6281294736508",
      roles: ["teacher"],
    })
    const makerTwo = await insertUser({
      authUserId: "growth-maker-2",
      name: "Dimas Yoga Pratama",
      email: "dimas.yogapratama96@gmail.com",
      phone: "6285742096371",
      roles: ["teacher"],
    })

    const paths = [
      {
        order: 0,
        slug: "uji-batik",
        code: "Jalur 01",
        title: "Batik Uji",
        subtitle: "Mola dan nerusi",
        teacher: "Sri Sriningsih",
        teacherRole: "Pengajar batik",
        region: "Bantul, D.I. Yogyakarta",
        level: "Pemula",
        modules: 2,
        weeks: 14,
        tasks: 2,
        price: 750_000,
        tags: ["Uji"],
        outcome: "Kain latihan.",
        includes: ["Dua modul"],
        teacherId: teacherOne,
        status: "open" as const,
        createdAt: SEED_START,
      },
      {
        order: 1,
        slug: "uji-aksara",
        code: "Jalur 02",
        title: "Aksara Uji",
        subtitle: "Hanacaraka",
        teacher: "Suwardi Pratama",
        teacherRole: "Pengajar aksara",
        region: "Kota Yogyakarta, D.I. Yogyakarta",
        level: "Pemula",
        modules: 2,
        weeks: 14,
        tasks: 2,
        price: 500_000,
        tags: ["Uji"],
        outcome: "Paragraf pendek.",
        includes: ["Dua modul"],
        teacherId: teacherTwo,
        status: "open" as const,
        createdAt: SEED_START,
      },
    ]
    for (const path of paths) {
      await ctx.db.insert("paths", path)
      for (let moduleIndex = 0; moduleIndex < 2; moduleIndex += 1) {
        const moduleId = await ctx.db.insert("pathModules", {
          order: moduleIndex,
          pathId: path.slug,
          title: `Modul ${moduleIndex + 1}`,
          summary: "Modul uji",
          estimatedMinutes: 60,
          status: "published",
          createdAt: SEED_START,
        })
        for (let lessonIndex = 0; lessonIndex < 3; lessonIndex += 1) {
          await ctx.db.insert("lessons", {
            order: moduleIndex * 3 + lessonIndex,
            moduleId,
            pathId: path.slug,
            title: `Pelajaran ${moduleIndex * 3 + lessonIndex + 1}`,
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

    await ctx.db.insert("works", {
      order: 0,
      slug: "uji-kain",
      title: "Kain Uji",
      category: "batik",
      kind: "product",
      maker: "Anisa Rahmawati",
      makerRole: "Lulusan",
      teacher: "Sri Sriningsih",
      region: "Bantul",
      price: 900_000,
      unit: "Kain",
      technique: "Tulis",
      techniqueNote: "Canting",
      workCard: "KN-UJI-1",
      description: "Kain uji.",
      makerId: makerOne,
      pathId: "uji-batik",
      status: "published",
      createdAt: Date.UTC(2026, 0, 10),
    })
    await ctx.db.insert("works", {
      order: 1,
      slug: "uji-jasa",
      title: "Jasa Tulis Uji",
      category: "layanan",
      kind: "service",
      maker: "Dimas Yoga Pratama",
      makerRole: "Lulusan",
      teacher: "Suwardi Pratama",
      region: "Sleman",
      price: 400_000,
      unit: "Undangan",
      technique: "Tulis",
      techniqueNote: "Tangan",
      workCard: "KN-UJI-2",
      description: "Jasa uji.",
      makerId: makerTwo,
      pathId: "uji-aksara",
      status: "published",
      createdAt: Date.UTC(2026, 1, 1),
    })

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

    return { adminId, teacherOne, teacherTwo, makerOne, makerTwo }
  })
}

type GrowthWorld = Awaited<ReturnType<typeof seedGrowthWorld>>

function monthOf(timestamp: number): number {
  return new Date(timestamp).getUTCMonth()
}

async function runGrowth(t: TestDb) {
  const world = await seedGrowthWorld(t)
  await t.action(internal.seed.domains.growth.seedGrowth, { now: NOW })
  return world
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
    const cohorts = await ctx.db.query("cohorts").collect()
    const sessions = await ctx.db.query("cohortSessions").collect()
    const paths = await ctx.db.query("paths").collect()
    const orders = await ctx.db.query("orders").collect()
    const orderItems = await ctx.db.query("orderItems").collect()
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
    const progress = await ctx.db.query("lessonProgress").collect()
    const lessons = await ctx.db.query("lessons").collect()
    const supportTickets = await ctx.db.query("supportTickets").collect()
    return {
      users,
      growthUsers,
      growthIds: [...growthIds],
      enrollments,
      leads,
      leadAssignments,
      cohorts,
      sessions,
      paths,
      orders,
      orderItems,
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
      lessons,
      supportTickets,
    }
  })
}

describe("seed growth / realistic lifecycle", () => {
  it("signs up 6-8 people a month and enrolls 3-7 of them", async () => {
    const t = createTestDb()
    await runGrowth(t)
    const data = await loadGrowth(t)

    expect(data.growthUsers).toHaveLength(GROWTH_TOTAL_SIGNUPS)
    expect(data.enrollments).toHaveLength(GROWTH_TOTAL_ENROLLED)
    expect(GROWTH_TOTAL_ENROLLED).toBeGreaterThanOrEqual(50)
    expect(GROWTH_TOTAL_ENROLLED).toBeLessThanOrEqual(60)

    const signups = Array.from({ length: 11 }, () => 0)
    for (const user of data.growthUsers) {
      signups[monthOf(user.createdAt)] += 1
    }
    expect(signups).toEqual([...GROWTH_SIGNUPS])

    const enrolled = Array.from({ length: 11 }, () => 0)
    for (const row of data.enrollments) {
      enrolled[monthOf(row.enrolledAt)] += 1
    }
    expect(enrolled).toEqual([...GROWTH_ENROLLED])
    expect(enrolled.filter((count) => count >= 3 && count <= 7)).toHaveLength(
      11,
    )

    const growthEmails = new Set(data.growthUsers.map((user) => user.email))
    const growthLeads = data.leads.filter(
      (lead) => lead.email !== undefined && growthEmails.has(lead.email),
    )
    expect(growthLeads).toHaveLength(
      GROWTH_LEADS.reduce((total, count) => total + count, 0),
    )
    const leadsPerMonth = Array.from({ length: 11 }, () => 0)
    for (const lead of growthLeads) {
      leadsPerMonth[monthOf(lead.createdAt)] += 1
    }
    expect(leadsPerMonth).toEqual([...GROWTH_LEADS])

    const enrolledStudentIds = new Set(
      data.enrollments.map((row) => row.studentId as string),
    )
    for (const lead of growthLeads) {
      const user = data.growthUsers.find(
        (candidate) => candidate.email === lead.email,
      )
      expect(user, lead.email).toBeDefined()
      expect(enrolledStudentIds.has(user?._id as string)).toBe(false)
      expect(
        data.leadAssignments.some(
          (assignment) => assignment.leadId === lead._id,
        ),
      ).toBe(true)
    }
  })

  it("uses plausible Yogyakarta identities with real-looking addresses", async () => {
    const t = createTestDb()
    await runGrowth(t)
    const data = await loadGrowth(t)

    const emails = new Set<string>()
    const phones = new Set<string>()
    const authIds = new Set<string>()
    for (const user of data.growthUsers) {
      expect(user.email).toMatch(
        /^[a-z]+(\.[a-z]+)\d{2}@(gmail\.com|yahoo\.co\.id|outlook\.com)$/,
      )
      expect(user.email).not.toMatch(/growth|seed|demo|example|test|user\d/i)
      expect(user.phone).toMatch(/^62(812|813|821|822|851|857|877|881)\d{8}$/)
      expect(user.province).toBe("DI Yogyakarta")
      expect(user.region).toMatch(
        /^(Kota Yogyakarta|Bantul|Sleman|Kulon Progo|Gunungkidul), D\.I\. Yogyakarta$/,
      )
      expect(user.roles).toEqual(["student"])
      expect(user.status).toBe("active")
      expect(user.emailVerified).toBe(true)
      expect(user.whatsappVerified).toBe(true)
      expect(user.whatsappVerifiedAt as number).toBeGreaterThan(user.createdAt)
      expect(user.lastActiveAt as number).toBeGreaterThan(user.createdAt)
      expect(user.createdAt).toBeGreaterThanOrEqual(SEED_START)
      expect(user.createdAt).toBeLessThanOrEqual(NOW)
      expect(user.email).toBe(growthEmail(Number(user.authUserId.slice(-3))))
      expect(user.phone).toBe(growthPhone(Number(user.authUserId.slice(-3))))
      emails.add(user.email)
      phones.add(user.phone)
      authIds.add(user.authUserId)
    }
    expect(emails.size).toBe(data.growthUsers.length)
    expect(phones.size).toBe(data.growthUsers.length)
    expect(authIds.size).toBe(data.growthUsers.length)
  })

  it("completes every finished cohort with submission, assessment, and certificate", async () => {
    const t = createTestDb()
    await runGrowth(t)
    const data = await loadGrowth(t)

    const completed = data.enrollments.filter(
      (row) => row.status === "completed",
    )
    expect(completed.length).toBeGreaterThan(0)
    expect(data.certificates).toHaveLength(completed.length)

    const certificateById = new Map(
      data.certificates.map((row) => [row._id as string, row]),
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

      const assessment = data.assessments.find(
        (row) => row.submissionId === submission?._id,
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

      const certificate = data.certificates.find(
        (row) => row.assessmentId === assessment?._id,
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
      expect(
        certificateById.get(certificate?._id as string)?.publicCode,
      ).toMatch(/^kn-grw\d{3}$/)
    }

    const serials = data.certificates.map((row) => row.serial)
    expect(new Set(serials).size).toBe(serials.length)
    const codes = data.certificates.map((row) => row.publicCode)
    expect(new Set(codes).size).toBe(codes.length)
    const sorted = [...data.certificates].sort((a, b) =>
      a.serial.localeCompare(b.serial),
    )
    for (let index = 1; index < sorted.length; index += 1) {
      expect(sorted[index]?.issuedAt).toBeGreaterThanOrEqual(
        sorted[index - 1]?.issuedAt as number,
      )
    }
  })

  it("ties every order and payment to the right enrollment state", async () => {
    const t = createTestDb()
    await runGrowth(t)
    const data = await loadGrowth(t)

    const pathOrders = data.orders.filter(
      (order) =>
        order.workId === undefined &&
        order.buyerUserId !== undefined &&
        new Set(data.growthIds).has(order.buyerUserId as string),
    )
    expect(pathOrders.length).toBe(GROWTH_TOTAL_ENROLLED)
    const paymentByOrder = new Map(
      data.payments.map((payment) => [payment.orderId as string, payment]),
    )
    const enrollmentByStudent = new Map(
      data.enrollments.map((row) => [row.studentId as string, row]),
    )

    for (const order of pathOrders) {
      const payment = paymentByOrder.get(order._id as string)
      expect(payment, `${order.code} payment`).toBeDefined()
      expect(payment?.uniqueAmount).toBeGreaterThan(order.baseAmount)
      expect(payment?.uniqueAmount).toBeLessThanOrEqual(order.baseAmount + 999)
      if (payment?.paidAt !== undefined) {
        expect(payment.paidAt).toBeGreaterThanOrEqual(payment.createdAt)
      }
      expect(payment?.createdAt).toBe(order.createdAt)
      expect(
        data.orderItems.filter((item) => item.orderId === order._id),
      ).toHaveLength(1)
      expect(
        data.paymentEvents.filter((event) => event.orderId === order._id)
          .length,
      ).toBeGreaterThan(0)

      const enrollment = enrollmentByStudent.get(
        order.buyerUserId as string,
      )
      if (order.status === "paid") {
        expect(payment?.status).toBe("paid")
        expect(["active", "completed"]).toContain(enrollment?.status)
        expect(order.paidAt as number).toBeGreaterThanOrEqual(order.createdAt)
      }
      if (order.status === "awaiting_payment") {
        expect(enrollment?.status).toBe("pending_payment")
        expect(["pending", "expired"]).toContain(payment?.status)
        expect(payment?.paidAt).toBeUndefined()
        expect(
          data.progress.filter(
            (row) => row.enrollmentId === enrollment?._id,
          ),
        ).toHaveLength(0)
      }
    }

    const paidOrderStudents = new Set(
      pathOrders
        .filter((order) => order.status === "paid")
        .map((order) => order.buyerUserId as string),
    )
    for (const enrollment of data.enrollments) {
      if (enrollment.status === "pending_payment") continue
      expect(
        paidOrderStudents.has(enrollment.studentId as string) ||
          pathOrders.some(
            (order) =>
              order.buyerUserId === enrollment.studentId &&
              (order.status === "refunded" || order.status === "cancelled"),
          ),
        `${enrollment._id} paid order`,
      ).toBe(true)
    }

    const uniqueAmounts = data.payments.map((payment) => payment.uniqueAmount)
    expect(new Set(uniqueAmounts).size).toBe(uniqueAmounts.length)
    const codes = data.orders.map((order) => order.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it("documents every withdrawal with a refund or an explicit no-refund reason", async () => {
    const t = createTestDb()
    await runGrowth(t)
    const data = await loadGrowth(t)

    const withdrawn = data.enrollments.filter(
      (row) => row.status === "withdrawn",
    )
    expect(withdrawn.length).toBeGreaterThan(0)

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
      expect(enrollment.withdrawnAt as number).toBeLessThanOrEqual(NOW)

      const refund = data.refunds.find((row) => row.orderId === order?._id)
      if (refund) {
        expect(refund.status).toBe("paid")
        expect(refund.amount).toBeGreaterThan(0)
        expect(refund.amount).toBeLessThanOrEqual(order?.baseAmount as number)
        expect(refund.paidAt as number).toBeGreaterThan(
          order?.paidAt as number,
        )
        expect(order?.status).toBe("refunded")
        const payment = data.payments.find(
          (row) => row.orderId === order?._id,
        )
        expect(payment?.status).toBe("refunded")
        const reversals = data.ledger.filter(
          (row) => row.refundId === refund._id,
        )
        expect(reversals.length).toBeGreaterThanOrEqual(3)
        expect(reversals.every((row) => row.direction === "debit")).toBe(true)
      } else {
        expect(enrollment.withdrawReason ?? "").toMatch(
          /tanpa pengembalian|tidak dikembalikan/i,
        )
        expect(order?.status).toBe("cancelled")
      }
    }
  })

  it("spreads lesson progress in lesson order after enrollment", async () => {
    const t = createTestDb()
    await runGrowth(t)
    const data = await loadGrowth(t)

    const lessonById = new Map(
      data.lessons.map((lesson) => [lesson._id as string, lesson]),
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
          previous = row.completedAt
        }
      }
      const completedRows = ordered.filter(
        (row) => row.state === "completed",
      )
      expect(completedRows.length).toBeGreaterThan(0)
      if (completedRows.length >= 2) {
        const days = new Set(
          completedRows.map((row) =>
            Math.floor((row.completedAt as number) / DAY),
          ),
        )
        expect(days.size).toBeGreaterThan(1)
      }
      if (enrollment.status === "completed") {
        expect(completedRows).toHaveLength(ordered.length)
      }
    }
  })

  it("fills cohorts with 5-9 students and 3-4 sessions", async () => {
    const t = createTestDb()
    await runGrowth(t)
    const data = await loadGrowth(t)

    const growthEnrollmentIds = new Set(
      data.enrollments.map((row) => row._id as string),
    )
    for (const cohort of data.cohorts) {
      const sessions = data.sessions.filter(
        (session) => session.cohortId === cohort._id,
      )
      expect(sessions.length).toBeGreaterThanOrEqual(3)
      expect(sessions.length).toBeLessThanOrEqual(4)
      for (const session of sessions) {
        expect(session.startsAt).toBeGreaterThanOrEqual(cohort.startDate)
        expect(session.endsAt).toBeLessThanOrEqual(
          cohort.endDate + DAY,
        )
      }

      const members = data.enrollments.filter(
        (row) => row.cohortId === cohort._id,
      )
      const growthMembers = members.filter((row) =>
        growthEnrollmentIds.has(row._id as string),
      )
      if (growthMembers.length === 0) continue
      expect(cohort.capacity).toBeGreaterThanOrEqual(8)
      expect(cohort.capacity).toBeLessThanOrEqual(12)
      for (const enrollment of growthMembers) {
        expect(enrollment.pathId).toBe(cohort.pathId)
        expect(enrollment.enrolledAt).toBeGreaterThanOrEqual(
          cohort.startDate,
        )
      }
      if (cohort.endDate < NOW) {
        expect(
          members.length,
          `cohort ${cohort.code} finished with ${members.length} students`,
        ).toBeGreaterThanOrEqual(5)
        expect(members.length).toBeLessThanOrEqual(9)
      } else {
        expect(members.length).toBeGreaterThanOrEqual(1)
      }
    }

    // No one- or two-person cohorts among the finished ones.
    const finished = data.cohorts.filter(
      (cohort) =>
        cohort.code.startsWith("GRW-") && cohort.endDate < NOW,
    )
    expect(finished.length).toBeGreaterThan(0)
    for (const cohort of finished) {
      const members = data.enrollments.filter(
        (row) => row.cohortId === cohort._id,
      )
      expect(members.length, cohort.code).toBeGreaterThanOrEqual(5)
    }
  })

  it("sells craft to a quarter of learners with balanced payouts", async () => {
    const t = createTestDb()
    await runGrowth(t)
    const data = await loadGrowth(t)

    const activeOrCompleted = new Set(
      data.enrollments
        .filter((row) => row.status === "active" || row.status === "completed")
        .map((row) => row.studentId as string),
    )
    const workOrders = data.orders.filter(
      (order) =>
        order.workId !== undefined &&
        order.buyerUserId !== undefined &&
        new Set(data.growthIds).has(order.buyerUserId as string),
    )
    expect(workOrders.length).toBeGreaterThan(0)
    const buyers = new Set(workOrders.map((order) => order.buyerUserId))
    expect(buyers.size).toBeLessThanOrEqual(workOrders.length)
    expect(buyers.size / activeOrCompleted.size).toBeGreaterThanOrEqual(0.2)
    expect(buyers.size / activeOrCompleted.size).toBeLessThanOrEqual(0.3)

    const paymentByOrder = new Map(
      data.payments.map((payment) => [payment.orderId as string, payment]),
    )
    const payoutByOrder = new Map(
      data.payouts.map((payout) => [payout.orderId as string, payout]),
    )
    const certificateByStudent = new Map(
      data.certificates.map((row) => [row.studentId as string, row]),
    )

    for (const order of workOrders) {
      expect(order.sellerId).not.toBe(order.buyerUserId)
      expect(order.status).toBe("paid")
      expect(paymentByOrder.get(order._id as string)?.status).toBe("paid")

      const certificate = certificateByStudent.get(
        order.buyerUserId as string,
      )
      if (certificate) {
        expect(order.createdAt).toBeGreaterThanOrEqual(certificate.issuedAt)
      }

      const payout = payoutByOrder.get(order._id as string)
      expect(payout, `${order.code} payout`).toBeDefined()
      expect(payout?.teacherId).toBe(order.sellerId)
      expect(payout?.gross).toBe(order.baseAmount)
      expect(
        (payout?.teacherShare as number) +
          (payout?.platformShare as number) +
          (payout?.communityShare as number),
      ).toBe(order.baseAmount)
      expect(payout?.teacherShare).toBe(Math.floor(order.baseAmount * 0.7))
      expect(payout?.dueAt as number).toBeGreaterThan(
        paymentByOrder.get(order._id as string)?.paidAt as number,
      )
      if (payout?.status === "paid") {
        expect(payout.paidAt).toBeDefined()
        expect(payout.paidAmount).toBe(payout.teacherShare)
        expect(payout.paidAt as number).toBeGreaterThanOrEqual(
          paymentByOrder.get(order._id as string)?.paidAt as number,
        )
      }

      const entries = data.ledger.filter(
        (entry) => entry.orderId === order._id,
      )
      const credits = entries
        .filter((entry) => entry.direction === "credit")
        .reduce((total, entry) => total + entry.amount, 0)
      const debits = entries
        .filter((entry) => entry.direction === "debit")
        .reduce((total, entry) => total + entry.amount, 0)
      expect(credits).toBe(order.baseAmount)
      const gatewayFee =
        paymentByOrder.get(order._id as string)?.gatewayFee ?? 0
      expect(debits).toBe(
        gatewayFee + (payout?.status === "paid" ? payout.teacherShare : 0),
      )
      expect(entries.some((entry) => entry.account === "platform")).toBe(true)
      expect(entries.some((entry) => entry.account === "community")).toBe(true)
    }

    for (const payout of data.payouts) {
      if (payout.status !== "paid") continue
      expect(payout.paidAt).toBeDefined()
      expect(payout.paidAmount).toBe(payout.teacherShare)
    }
  })

  it("keeps identities, codes, and dates free of regressions", async () => {
    const t = createTestDb()
    const world: GrowthWorld = await runGrowth(t)
    const data = await loadGrowth(t)

    const userById = new Map(data.users.map((user) => [user._id, user]))
    const submissionIds = new Set(
      data.submissions.map((row) => row._id as string),
    )
    const assessmentIds = new Set(
      data.assessments.map((row) => row._id as string),
    )
    for (const assessment of data.assessments) {
      expect(submissionIds.has(assessment.submissionId as string)).toBe(true)
      expect(userById.has(assessment.assessorId)).toBe(true)
    }
    for (const certificate of data.certificates) {
      expect(assessmentIds.has(certificate.assessmentId as string)).toBe(true)
      expect(userById.has(certificate.teacherId)).toBe(true)
      expect(
        data.paths.some((path) => path.slug === certificate.pathId),
      ).toBe(true)
    }
    for (const submission of data.submissions) {
      expect(
        data.enrollments.some((row) => row._id === submission.enrollmentId),
      ).toBe(true)
      expect(
        data.cohorts.some((row) => row._id === submission.cohortId),
      ).toBe(true)
    }
    for (const order of data.orders) {
      if (order.buyerUserId) {
        expect(userById.has(order.buyerUserId)).toBe(true)
      }
      expect(userById.has(order.sellerId)).toBe(true)
      expect(
        data.orderItems.some((item) => item.orderId === order._id),
      ).toBe(true)
      if (order.paidAt !== undefined) {
        expect(order.paidAt).toBeLessThanOrEqual(NOW)
        expect(order.paidAt).toBeGreaterThanOrEqual(order.createdAt)
      }
    }
    for (const payout of data.payouts) {
      expect(userById.has(payout.teacherId)).toBe(true)
      expect(payout.orderId).toBeDefined()
      expect(payout.paymentId).toBeDefined()
    }
    for (const user of data.growthUsers) {
      expect(
        data.leadAssignments.length,
      ).toBeGreaterThan(0)
      expect(user.roles).toEqual(["student"])
    }
    expect(world.teacherOne).toBeDefined()

    const sorted = [...data.orders].sort((a, b) =>
      a.code.localeCompare(b.code),
    )
    for (let index = 1; index < sorted.length; index += 1) {
      expect(sorted[index]?.createdAt).toBeGreaterThanOrEqual(
        sorted[index - 1]?.createdAt as number,
      )
    }

    const ticket = data.supportTickets.find((row) =>
      row.code.startsWith("SUP-GRW-"),
    )
    expect(ticket?.requesterId).toBeDefined()
    expect(ticket?.assigneeId).toBeDefined()
  })
})
