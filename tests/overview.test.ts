import { beforeAll, describe, expect, it } from "vitest"

import { api, internal } from "../convex/_generated/api"
import type { Id } from "../convex/_generated/dataModel"
import {
  pathsSeed,
  siteSeed,
  teachersSeed,
  worksSeed,
} from "../convex/seed/content/data"
import { CURRICULUM_IMAGE_FILES } from "../convex/seed/domains/curriculum"
import { MESSAGING_IMAGE_FILES } from "../convex/seed/domains/messaging"
import { createTestDb, seedAccount, type TestDb } from "./helpers/convex"

const NOW = Date.UTC(2026, 10, 18, 10, 0, 0)
const DAY_MS = 86_400_000

function seedFilenames(): string[] {
  return Array.from(
    new Set([
      siteSeed.hero.plate.imageFile,
      siteSeed.metadata.image.imageFile,
      ...pathsSeed.map((path) => path.imageFile),
      ...teachersSeed.map((teacher) => teacher.imageFile),
      ...worksSeed.map((work) => work.imageFile),
      ...CURRICULUM_IMAGE_FILES,
      ...MESSAGING_IMAGE_FILES,
    ]),
  )
}

async function registerImages(t: TestDb) {
  await t.run(async (ctx) => {
    for (const filename of seedFilenames()) {
      const storageId = await ctx.storage.store(
        new Blob([`image:${filename}`], { type: "image/jpeg" }),
      )
      await ctx.db.insert("mediaAssets", {
        kind: "image",
        storageId,
        filename,
        mimeType: "image/jpeg",
        size: 10,
        alt: filename,
        status: "active",
        uploadedBy: "system",
        createdAt: NOW,
      })
    }
  })
}

type SeededViewers = {
  student: { authUserId: string; cohortIds: string[] }
  teacher: { authUserId: string; userId: Id<"users"> }
  buyer: { authUserId: string; orders: number }
  admin: { authUserId: string }
}

async function findViewers(t: TestDb): Promise<SeededViewers> {
  return await t.run(async (ctx) => {
    const [users, enrollments, cohorts, orders, certificates, teachers] =
      await Promise.all([
        ctx.db.query("users").collect(),
        ctx.db.query("enrollments").collect(),
        ctx.db.query("cohorts").collect(),
        ctx.db.query("orders").collect(),
        ctx.db.query("certificates").collect(),
        ctx.db.query("teachers").collect(),
      ])

    const userById = new Map(users.map((user) => [user._id, user]))

    const activeByStudent = new Map<string, typeof enrollments>()
    for (const enrollment of enrollments) {
      if (enrollment.status !== "active" && enrollment.status !== "completed") {
        continue
      }
      const list = activeByStudent.get(enrollment.studentId) ?? []
      list.push(enrollment)
      activeByStudent.set(enrollment.studentId, list)
    }

    const studentEntry = Array.from(activeByStudent.entries())
      .filter(([studentId, rows]) => {
        const user = userById.get(studentId as Id<"users">)
        return (
          user &&
          user.roles.includes("student") &&
          !user.roles.includes("admin") &&
          rows.some((row) => row.status === "active")
        )
      })
      .sort((a, b) => b[1].length - a[1].length)[0]

    if (!studentEntry) throw new Error("No seeded student with enrollments")
    const [studentId, studentEnrollments] = studentEntry
    const student = userById.get(studentId as Id<"users">)
    if (!student) throw new Error("Student account missing")

    const cohortCount = new Map<string, number>()
    for (const cohort of cohorts) {
      const count = enrollments.filter(
        (enrollment) =>
          enrollment.cohortId === cohort._id &&
          ["active", "completed"].includes(enrollment.status),
      ).length
      cohortCount.set(cohort.teacherId, (cohortCount.get(cohort.teacherId) ?? 0) + count)
    }
    const teacherEntry = Array.from(cohortCount.entries()).sort(
      (a, b) => b[1] - a[1],
    )[0]
    if (!teacherEntry) throw new Error("No seeded teacher with cohorts")
    const teacherId = teacherEntry[0] as Id<"users">
    const teacher = userById.get(teacherId)
    if (!teacher) throw new Error("Teacher account missing")

    const enrolledStudents = new Set(enrollments.map((row) => row.studentId))
    const certified = new Set(
      certificates
        .filter((row) => row.status === "issued")
        .map((row) => row.studentId),
    )
    const teacherUsers = new Set(teachers.map((row) => row.userId))
    const buyerCount = new Map<string, number>()
    for (const order of orders) {
      if (!order.buyerUserId) continue
      buyerCount.set(
        order.buyerUserId,
        (buyerCount.get(order.buyerUserId) ?? 0) + 1,
      )
    }
    const buyerEntry = Array.from(buyerCount.entries())
      .filter(([buyerId]) => {
        const user = userById.get(buyerId as Id<"users">)
        return (
          user &&
          user.roles.includes("student") &&
          !enrolledStudents.has(buyerId as Id<"users">) &&
          !teacherUsers.has(buyerId as Id<"users">) &&
          !certified.has(buyerId as Id<"users">)
        )
      })
      .sort((a, b) => b[1] - a[1])[0]
    if (!buyerEntry) throw new Error("No seeded work-only buyer")
    const buyer = userById.get(buyerEntry[0] as Id<"users">)
    if (!buyer) throw new Error("Buyer account missing")

    const admin = users.find((user) => user.roles.includes("admin"))
    if (!admin) throw new Error("No seeded admin")

    return {
      student: {
        authUserId: student.authUserId,
        cohortIds: studentEnrollments
          .map((row) => row.cohortId)
          .filter((value): value is Id<"cohorts"> => Boolean(value)),
      },
      teacher: { authUserId: teacher.authUserId, userId: teacherId },
      buyer: { authUserId: buyer.authUserId, orders: buyerEntry[1] },
      admin: { authUserId: admin.authUserId },
    }
  })
}

describe("viewer overview", () => {
  const t = createTestDb()
  let viewers: SeededViewers

  beforeAll(async () => {
    await registerImages(t)
    await t.action(internal.seed.run.run, { now: NOW })
    viewers = await findViewers(t)
  }, 180_000)

  it("summarises a seeded student from their own enrollments and orders", async () => {
    const identity = t.withIdentity({ subject: viewers.student.authUserId })
    const overview = await identity.query(api.overview.viewerOverview, {})

    expect(overview.role).toBe("student")
    expect(overview.roleLabel).toContain("Peserta")
    expect(overview.student).not.toBeNull()
    const student = overview.student
    if (!student) throw new Error("Missing student section")

    expect(student.enrollments.length).toBeGreaterThan(0)
    for (const enrollment of student.enrollments) {
      expect(enrollment.progress).toBeGreaterThanOrEqual(0)
      expect(enrollment.progress).toBeLessThanOrEqual(100)
      expect(enrollment.completedLessons).toBeLessThanOrEqual(
        enrollment.totalLessons,
      )
    }
    expect(
      student.enrollments.some((enrollment) => enrollment.status === "active"),
    ).toBe(true)
    expect(student.recentOrders.length).toBeGreaterThan(0)
    expect(student.recentOrders.length).toBeLessThanOrEqual(3)

    for (const session of overview.upcomingSessions) {
      expect(viewers.student.cohortIds).toContain(session.cohortId)
    }
  })

  it("summarises a seeded teacher with cohort load and payout earnings", async () => {
    const identity = t.withIdentity({ subject: viewers.teacher.authUserId })
    const overview = await identity.query(api.overview.viewerOverview, {})

    expect(overview.role).toBe("teacher")
    expect(overview.teacher).not.toBeNull()
    const teacher = overview.teacher
    if (!teacher) throw new Error("Missing teacher section")

    expect(teacher.cohorts.length).toBeGreaterThan(0)
    expect(
      teacher.cohorts.reduce((total, cohort) => total + cohort.studentCount, 0),
    ).toBeGreaterThan(0)

    const payouts = await t.run(async (ctx) =>
      ctx.db
        .query("payouts")
        .withIndex("by_teacherId", (q) =>
          q.eq("teacherId", viewers.teacher.userId),
        )
        .collect(),
    )
    let paid = 0
    let due = 0
    for (const payout of payouts) {
      if (payout.status === "paid") {
        paid += payout.paidAmount ?? payout.teacherShare
      } else if (["pending", "held", "approved"].includes(payout.status)) {
        due += payout.teacherShare
      }
    }
    expect(teacher.earnings).toEqual({ paid, due })
  })

  it("summarises a work-only buyer with orders and no enrollments", async () => {
    const identity = t.withIdentity({ subject: viewers.buyer.authUserId })
    const overview = await identity.query(api.overview.viewerOverview, {})

    expect(overview.role).toBe("student")
    expect(overview.student).not.toBeNull()
    const student = overview.student
    if (!student) throw new Error("Missing buyer section")

    expect(student.enrollments).toEqual([])
    expect(student.recentOrders.length).toBeGreaterThan(0)
    expect(student.recentOrders.length).toBeLessThanOrEqual(3)
    expect(viewers.buyer.orders).toBeGreaterThan(0)
  })

  it("keeps the operator overview for an admin", async () => {
    const identity = t.withIdentity({ subject: viewers.admin.authUserId })
    const overview = await identity.query(api.overview.viewerOverview, {})
    expect(overview.role).toBe("operator")
    expect(overview.student).toBeNull()
    expect(overview.teacher).toBeNull()
    expect(overview.seller).toBeNull()

    const adminOverview = await identity.query(api.stats.overview, {})
    expect(Array.isArray(adminOverview.queues)).toBe(true)
    expect(adminOverview.queues.length).toBeGreaterThan(0)
  })

  it("returns a coherent zero state for a viewer with no rows", async () => {
    const empty = createTestDb()
    await seedAccount(empty, {
      authUserId: "auth-empty-viewer",
      name: "Peserta Baru",
      roles: ["student"],
    })
    const overview = await empty
      .withIdentity({ subject: "auth-empty-viewer" })
      .query(api.overview.viewerOverview, {})

    expect(overview.role).toBe("student")
    expect(overview.unreadMessages).toBe(0)
    expect(overview.openTickets).toBe(0)
    expect(overview.upcomingSessions).toEqual([])
    expect(overview.student).not.toBeNull()
    expect(overview.student?.enrollments).toEqual([])
    expect(overview.student?.recentOrders).toEqual([])
    expect(overview.student?.issuedCertificates).toBe(0)
    expect(overview.generatedAt).toBeGreaterThan(NOW - 365 * DAY_MS)
  })
})
