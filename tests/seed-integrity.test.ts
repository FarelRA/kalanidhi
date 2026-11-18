import { beforeAll, describe, expect, it } from "vitest"

import { internal } from "../convex/_generated/api"
import type { Id } from "../convex/_generated/dataModel"
import {
  pathsSeed,
  siteSeed,
  teachersSeed,
  worksSeed,
} from "../convex/seed/content/data"
import {
  loadSeedSnapshot,
  type SeedSnapshot,
} from "../convex/seed/integrity"
import { CURRICULUM_IMAGE_FILES } from "../convex/seed/domains/curriculum"
import { MESSAGING_IMAGE_FILES } from "../convex/seed/domains/messaging"
import { createTestDb, type TestDb } from "./helpers/convex"

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
        createdAt: Date.now(),
      })
    }
  })
}

describe("seed integrity", () => {
  let t: TestDb
  let snapshot: SeedSnapshot

  beforeAll(async () => {
    t = createTestDb()
    await registerImages(t)
    await t.action(internal.seed.run.run, {})
    snapshot = await t.run(async (ctx) => await loadSeedSnapshot(ctx))
  }, 120_000)

  it("returns no violations from the full seed", async () => {
    const violations = await t.query(internal.seed.integrity.verify, {})
    expect(violations).toEqual([])
  })

  it("has certificate parity in both directions", () => {
    const completed = snapshot.enrollments.filter(
      (enrollment) => enrollment.status === "completed",
    )
    expect(completed.length).toBeGreaterThan(0)
    for (const enrollment of completed) {
      expect(enrollment.certificateId, enrollment._id).toBeDefined()
      const certificate = snapshot.certificates.find(
        (row) => row._id === enrollment.certificateId,
      )
      expect(certificate, enrollment._id).toBeDefined()
      expect(certificate?.studentId).toBe(enrollment.studentId)
      expect(certificate?.pathId).toBe(enrollment.pathId)
      expect(certificate?.issuedAt).toBeGreaterThanOrEqual(
        enrollment.completedAt as number,
      )
    }
    for (const certificate of snapshot.certificates) {
      const enrollment = snapshot.enrollments.find(
        (row) =>
          row.studentId === certificate.studentId &&
          row.pathId === certificate.pathId &&
          row.status === "completed",
      )
      expect(enrollment, certificate.serial).toBeDefined()
      expect(enrollment?.certificateId).toBe(certificate._id)
    }
  })

  it("keeps lesson progress inside submission and completion bounds", () => {
    const enrollmentById = new Map(
      snapshot.enrollments.map((row) => [row._id as string, row]),
    )
    const cohortById = new Map(
      snapshot.cohorts.map((row) => [row._id as string, row]),
    )
    const earliestSubmission = new Map<string, number>()
    for (const submission of snapshot.submissions) {
      if (submission.submittedAt === undefined) continue
      const key = submission.enrollmentId as string
      earliestSubmission.set(
        key,
        Math.min(
          earliestSubmission.get(key) ?? submission.submittedAt,
          submission.submittedAt,
        ),
      )
    }
    for (const progress of snapshot.lessonProgress) {
      if (progress.completedAt === undefined) continue
      const enrollment = enrollmentById.get(progress.enrollmentId as string)
      const cohort = enrollment?.cohortId
        ? cohortById.get(enrollment.cohortId as string)
        : undefined
      expect(enrollment, progress._id).toBeDefined()
      expect(cohort, progress._id).toBeDefined()
      expect(progress.completedAt).toBeGreaterThanOrEqual(
        enrollment?.enrolledAt as number,
      )
      expect(progress.completedAt).toBeLessThanOrEqual(
        cohort?.endDate as number,
      )
      const earliest = earliestSubmission.get(enrollment?._id as string)
      if (earliest !== undefined) {
        expect(progress.completedAt).toBeLessThanOrEqual(earliest)
      }
      if (enrollment?.completedAt !== undefined) {
        expect(progress.completedAt).toBeLessThanOrEqual(
          enrollment.completedAt,
        )
      }
    }
  })

  it("keeps money invariants for every base and growth order", () => {
    const items = new Map(
      snapshot.orderItems.map((row) => [row.orderId as string, row]),
    )
    const payments = new Map(
      snapshot.payments.map((row) => [row.orderId as string, row]),
    )
    const amounts = new Set<number>()
    for (const order of snapshot.orders) {
      const item = items.get(order._id as string)
      const payment = payments.get(order._id as string)
      expect(item, order.code).toBeDefined()
      expect(payment, order.code).toBeDefined()
      expect(item?.totalAmount).toBe(order.baseAmount)
      expect(payment?.baseAmount).toBe(order.baseAmount)
      expect(payment?.uniqueAmount).toBe(order.uniqueAmount)
      expect(
        (order.uniqueAmount as number) - order.baseAmount,
      ).toBeGreaterThanOrEqual(1)
      expect(
        (order.uniqueAmount as number) - order.baseAmount,
      ).toBeLessThanOrEqual(999)
      expect(amounts.has(payment?.uniqueAmount as number)).toBe(false)
      amounts.add(payment?.uniqueAmount as number)
      expect(order.tokenHash).toMatch(/^[0-9a-f]{64}$/)
    }

    const ledgerByOrder = new Map<string, typeof snapshot.ledgerEntries>()
    for (const entry of snapshot.ledgerEntries) {
      if (!entry.orderId) continue
      const rows = ledgerByOrder.get(entry.orderId) ?? []
      rows.push(entry)
      ledgerByOrder.set(entry.orderId, rows)
    }
    for (const payout of snapshot.payouts) {
      expect(payout.teacherShare + payout.platformShare + payout.communityShare)
        .toBe(payout.gross)
      expect(payout.dueAt).toBeDefined()
      if (payout.status === "paid") {
        expect(payout.paidAt).toBeDefined()
        expect(payout.paidAmount).toBe(payout.teacherShare)
        expect(payout.dueAt as number).toBeGreaterThanOrEqual(
          payout.paidAt as number,
        )
      }
      if (!payout.orderId) continue
      const entries = ledgerByOrder.get(payout.orderId as string) ?? []
      if (payout.kind === "sale") {
        const credits = entries
          .filter(
            (entry) =>
              entry.entryType === "sale" && entry.direction === "credit",
          )
          .reduce((total, entry) => total + entry.amount, 0)
        expect(credits).toBe(payout.gross)
        expect(
          entries.some(
            (entry) =>
              entry.account === "gateway_fee" && entry.entryType === "sale",
          ),
        ).toBe(true)
      }
    }
  })

  it("keeps payout and refund chronology balanced", () => {
    const orders = new Map(
      snapshot.orders.map((row) => [row._id as string, row]),
    )
    for (const payout of snapshot.payouts) {
      expect(payout.dueAt).toBeDefined()
      if (payout.status === "paid") {
        expect(payout.dueAt as number).toBeGreaterThanOrEqual(
          payout.paidAt as number,
        )
      }
    }
    for (const refund of snapshot.refunds) {
      const order = orders.get(refund.orderId as string)
      expect(order, refund._id).toBeDefined()
      expect(refund.amount).toBeLessThanOrEqual(order?.baseAmount as number)
      expect(refund.createdAt).toBeLessThanOrEqual(
        refund.paidAt as number,
      )
      const reversal = snapshot.ledgerEntries
        .filter((entry) => entry.refundId === refund._id)
        .reduce((total, entry) => total + entry.amount, 0)
      expect(reversal).toBe(refund.amount)
    }
  })

  it("has no orphan rows in the tables the old tests missed", () => {
    const submissionIds = new Set(
      snapshot.submissions.map((row) => row._id as string),
    )
    const assessmentIds = new Set(
      snapshot.assessments.map((row) => row._id as string),
    )
    const certificateIds = new Set(
      snapshot.certificates.map((row) => row._id as string),
    )
    const leadIds = new Set(snapshot.leads.map((row) => row._id as string))
    for (const row of snapshot.submissionAssets) {
      expect(submissionIds.has(row.submissionId as string)).toBe(true)
    }
    for (const row of snapshot.assessmentEvents) {
      expect(assessmentIds.has(row.assessmentId as string)).toBe(true)
      expect(submissionIds.has(row.submissionId as string)).toBe(true)
    }
    for (const row of snapshot.certificateEvents) {
      expect(certificateIds.has(row.certificateId as string)).toBe(true)
    }
    for (const row of snapshot.leadNotes) {
      expect(leadIds.has(row.leadId as string)).toBe(true)
    }
    for (const row of snapshot.ledgerEntries) {
      if (row.refundId) {
        expect(
          snapshot.refunds.some((refund) => refund._id === row.refundId),
        ).toBe(true)
      }
      if (row.payoutId) {
        expect(
          snapshot.payouts.some((payout) => payout._id === row.payoutId),
        ).toBe(true)
      }
    }
  })

  it("has no global duplicates", () => {
    const unique = (values: Array<string | number>) =>
      new Set(values).size === values.length
    expect(unique(snapshot.users.map((row) => row.email))).toBe(true)
    expect(unique(snapshot.users.map((row) => row.phone))).toBe(true)
    expect(unique(snapshot.users.map((row) => row.authUserId))).toBe(true)
    expect(unique(snapshot.orders.map((row) => row.code))).toBe(true)
    expect(unique(snapshot.payments.map((row) => row.uniqueAmount))).toBe(true)
    expect(unique(snapshot.certificates.map((row) => row.serial))).toBe(true)
    expect(unique(snapshot.certificates.map((row) => row.publicCode))).toBe(true)
    expect(unique(snapshot.cohorts.map((row) => row.code))).toBe(true)
    expect(unique(snapshot.paths.map((row) => row.slug))).toBe(true)
    expect(unique(snapshot.works.map((row) => row.slug))).toBe(true)
    expect(unique(snapshot.workCards.map((row) => row.serial))).toBe(true)
    expect(
      unique(
        snapshot.dailyMetrics.map((row) => `${row.metricKey}:${row.date}`),
      ),
    ).toBe(true)
  })
})

describe("seed clearBatch", () => {
  it("removes more than 100 non-admin users across repeated batches", async () => {
    const t = createTestDb()
    const ids = await t.run(async (ctx) => {
      const adminId = await ctx.db.insert("users", {
        authUserId: "admin",
        name: "Admin",
        email: "admin@kalanidhi.site",
        emailVerified: true,
        phone: "6280000000001",
        province: "DI Yogyakarta",
        whatsappVerified: true,
        initials: "AD",
        region: "Kota Yogyakarta, DI Yogyakarta",
        roles: ["admin"],
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      const studentIds: Id<"users">[] = []
      for (let index = 0; index < 150; index += 1) {
        studentIds.push(
          await ctx.db.insert("users", {
            authUserId: `student-${index}`,
            name: `Student ${index}`,
            email: `student.${index}12@gmail.com`,
            emailVerified: true,
            phone: `62812${String(index).padStart(7, "0")}`,
            province: "DI Yogyakarta",
            whatsappVerified: true,
            initials: "ST",
            region: "Kota Yogyakarta, DI Yogyakarta",
            roles: ["student"],
            status: "active",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        )
      }
      for (let index = 0; index < 120; index += 1) {
        await ctx.db.insert("sessions", {
          userId: studentIds[index % studentIds.length],
          authSessionId: `session-${index}`,
          deviceName: "Browser",
          userAgent: "Test",
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
          expiresAt: Date.now() + 86_400_000,
        })
      }
      return { adminId, studentIds }
    })

    await t.mutation(internal.seed.domains.clear.clearBatch, {})
    const second = await t.mutation(internal.seed.domains.clear.clearBatch, {})
    expect(second.done).toBe(true)

    const remaining = await t.run(async (ctx) => {
      const users = await ctx.db.query("users").collect()
      const sessions = await ctx.db.query("sessions").collect()
      return {
        admin: users.filter((user) => user.roles.includes("admin")),
        nonAdmin: users.filter((user) => !user.roles.includes("admin")),
        sessions,
      }
    })
    expect(remaining.admin.map((user) => user._id)).toEqual([ids.adminId])
    expect(remaining.nonAdmin).toHaveLength(0)
    expect(remaining.sessions).toHaveLength(0)
  })
})
