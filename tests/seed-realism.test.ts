import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { internal } from "../convex/_generated/api"
import {
  pathsSeed,
  siteSeed,
  teachersSeed,
  worksSeed,
} from "../convex/seedData"
import { SEED_START } from "../convex/seedIdentities"
import { createTestDb } from "./helpers/convex"

const NOW = Date.now()
const DAY = 86_400_000

function seedFilenames(): string[] {
  return Array.from(
    new Set([
      siteSeed.hero.plate.imageFile,
      siteSeed.metadata.image.imageFile,
      ...pathsSeed.map((path) => path.imageFile),
      ...teachersSeed.map((teacher) => teacher.imageFile),
      ...worksSeed.map((work) => work.imageFile),
    ]),
  )
}

async function seedWorkspace(t: ReturnType<typeof createTestDb>) {
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
  await t.action(internal.seedRunner.run, {})
}

function timestampRange(values: Array<number | undefined>) {
  const filled = values.filter((value): value is number => value !== undefined)
  return {
    min: Math.min(...filled),
    max: Math.max(...filled),
    count: filled.length,
  }
}

describe("seed realism", () => {
  it("keeps one canonical teacher and work definition", () => {
    const root = path.resolve(__dirname, "..")
    const source = readFileSync(
      path.join(root, "convex/seedWorkspace.ts"),
      "utf8",
    )
    expect(source).toContain("teachersSeed as SEED_TEACHERS")
    expect(source).toContain("worksSeed as WORKS")
    expect(source).not.toContain("const SEED_TEACHERS = [")
    expect(source).not.toContain("const WORKS = [")
  })

  it("uses plausible Gmail, WhatsApp, and DIY identities", async () => {
    const t = createTestDb()
    await seedWorkspace(t)

    const users = await t.run(async (ctx) => {
      return await ctx.db.query("users").collect()
    })

    const emails = new Set<string>()
    const phones = new Set<string>()
    for (const user of users) {
      if (user.roles.includes("admin")) {
        // The operator account is provisioned by Better Auth, not the seed.
        expect(user.province).toBe("DI Yogyakarta")
        continue
      }

      expect(user.email).toMatch(/^[a-z0-9]+(\.[a-z0-9]+)*\d{2}@gmail\.com$/)
      expect(user.phone).toMatch(/^628\d{8,11}$/)
      expect(user.province).toBe("DI Yogyakarta")
      expect(user.region.toLowerCase()).toContain("yogyakarta")
      expect(user.whatsappVerified).toBe(true)
      expect(user.createdAt).toBeGreaterThanOrEqual(SEED_START)
      expect(user.createdAt).toBeLessThanOrEqual(NOW)

      emails.add(user.email)
      phones.add(user.phone)
    }

    expect(emails.size).toBe(users.length - 1)
    expect(phones.size).toBe(users.length - 1)
  })

  it("masks payout accounts like real bank records", async () => {
    const t = createTestDb()
    await seedWorkspace(t)

    const accounts = await t.run(async (ctx) => {
      return await ctx.db.query("payoutAccounts").collect()
    })

    expect(accounts.length).toBeGreaterThan(0)
    const suffixes = new Set<string>()
    for (const account of accounts) {
      expect(account.accountNumberMasked).toMatch(/^\*{4}\d{4}$/)
      expect(account.accountName.trim().length).toBeGreaterThan(3)
      expect(["BCA", "BRI", "BNI", "Mandiri"]).toContain(account.bankCode)
      suffixes.add(account.accountNumberMasked)
    }
    expect(suffixes.size).toBe(accounts.length)
  })

  it("keeps order codes in chronological order", async () => {
    const t = createTestDb()
    await seedWorkspace(t)

    const orders = await t.run(async (ctx) => {
      return await ctx.db.query("orders").collect()
    })
    const sorted = [...orders].sort((a, b) => a.code.localeCompare(b.code))
    for (let index = 1; index < sorted.length; index += 1) {
      expect(
        sorted[index].createdAt,
        `${sorted[index].code} should be newer than ${sorted[index - 1].code}`,
      ).toBeGreaterThanOrEqual(sorted[index - 1].createdAt)
    }
  })

  it("keeps every causal chain in order", async () => {
    const t = createTestDb()
    await seedWorkspace(t)

    const chains = await t.run(async (ctx) => {
      const users = await ctx.db.query("users").collect()
      const userById = new Map(users.map((user) => [user._id, user]))
      const enrollments = await ctx.db.query("enrollments").collect()
      const submissions = await ctx.db.query("submissions").collect()
      const assessments = await ctx.db.query("assessments").collect()
      const certificates = await ctx.db.query("certificates").collect()
      const works = await ctx.db.query("works").collect()
      const orders = await ctx.db.query("orders").collect()
      const payments = await ctx.db.query("payments").collect()
      const payouts = await ctx.db.query("payouts").collect()

      const byId = <T extends { _id: string }>(rows: T[]) =>
        new Map(rows.map((row) => [row._id as string, row]))
      const assessmentBySubmission = new Map(
        assessments.map((row) => [row.submissionId as string, row]),
      )
      const certificateById = byId(certificates)
      const workById = byId(works)
      const paymentByOrder = new Map(
        payments.map((row) => [row.orderId as string, row]),
      )
      const payoutByOrder = new Map(
        payouts.map((row) => [row.orderId as string, row]),
      )

      return {
        enrollmentBeforeStudent: enrollments
          .map((row) => ({
            student: userById.get(row.studentId)?.createdAt,
            enrolledAt: row.enrolledAt,
          }))
          .filter((row) => row.student !== undefined),
        enrollmentBeforeSubmission: submissions
          .map((row) => {
            const enrollment = enrollments.find(
              (item) =>
                item.studentId === row.studentId &&
                item.cohortId === row.cohortId,
            )
            return {
              enrolledAt: enrollment?.enrolledAt,
              submittedAt: row.submittedAt,
            }
          })
          .filter((row) => row.enrolledAt !== undefined && row.submittedAt),
        submissionBeforeAssessment: submissions
          .map((row) => ({
            submittedAt: row.submittedAt,
            assessedAt: assessmentBySubmission.get(row._id)?.createdAt,
          }))
          .filter((row) => row.submittedAt && row.assessedAt),
        assessmentBeforeCertificate: certificates
          .map((row) => ({
            assessedAt: assessmentBySubmission.get(row.assessmentId)?.createdAt,
            issuedAt: row.issuedAt,
          }))
          .filter((row) => row.assessedAt !== undefined),
        certificateBeforeWork: works
          .map((row) => ({
            issuedAt: row.certificateId
              ? certificateById.get(row.certificateId)?.issuedAt
              : undefined,
            workCreatedAt: row.createdAt,
          }))
          .filter((row) => row.issuedAt !== undefined),
        workBeforeOrder: orders
          .map((row) => ({
            workCreatedAt: row.workId
              ? workById.get(row.workId)?.createdAt
              : undefined,
            orderCreatedAt: row.createdAt,
          }))
          .filter((row) => row.workCreatedAt !== undefined),
        orderBeforePayment: orders
          .map((row) => ({
            orderPaidAt: row.paidAt,
            paymentPaidAt: paymentByOrder.get(row._id)?.paidAt,
          }))
          .filter((row) => row.orderPaidAt && row.paymentPaidAt),
        paymentBeforePayout: payments
          .map((row) => ({
            paymentPaidAt: row.paidAt,
            payoutPaidAt: payoutByOrder.get(row.orderId)?.paidAt,
          }))
          .filter((row) => row.paymentPaidAt && row.payoutPaidAt),
      }
    })

    for (const row of chains.enrollmentBeforeStudent) {
      expect(row.enrolledAt, "enrollment after account").toBeGreaterThanOrEqual(
        row.student as number,
      )
    }
    for (const row of chains.enrollmentBeforeSubmission) {
      expect(
        row.submittedAt as number,
        "submission after enrollment",
      ).toBeGreaterThanOrEqual(row.enrolledAt as number)
    }
    for (const row of chains.submissionBeforeAssessment) {
      expect(
        row.assessedAt as number,
        "assessment after submission",
      ).toBeGreaterThanOrEqual(row.submittedAt as number)
    }
    for (const row of chains.assessmentBeforeCertificate) {
      expect(
        row.issuedAt,
        "certificate after assessment",
      ).toBeGreaterThanOrEqual(row.assessedAt as number)
    }
    for (const row of chains.certificateBeforeWork) {
      expect(
        row.workCreatedAt,
        "work after certificate",
      ).toBeGreaterThanOrEqual(row.issuedAt as number)
    }
    for (const row of chains.workBeforeOrder) {
      expect(
        row.orderCreatedAt,
        "order after work",
      ).toBeGreaterThanOrEqual(row.workCreatedAt as number)
    }
    for (const row of chains.orderBeforePayment) {
      expect(
        row.paymentPaidAt as number,
        "payment after order",
      ).toBeGreaterThanOrEqual(row.orderPaidAt as number)
    }
    for (const row of chains.paymentBeforePayout) {
      expect(
        row.payoutPaidAt as number,
        "payout after payment",
      ).toBeGreaterThanOrEqual(row.paymentPaidAt as number)
    }
  })

  it("derives daily metrics from seeded events", async () => {
    const t = createTestDb()
    await seedWorkspace(t)

    const data = await t.run(async (ctx) => {
      const metrics = await ctx.db.query("dailyMetrics").collect()
      const orders = await ctx.db.query("orders").collect()
      const definitions = await ctx.db.query("metricDefinitions").collect()
      return { metrics, orders, definitions }
    })

    const dates = new Set(data.metrics.map((row) => row.date))
    expect(dates.size).toBeGreaterThan(300)

    const gmvTotal = data.metrics
      .filter((row) => row.metricKey === "gmv")
      .reduce((total, row) => total + row.value, 0)
    const orderTotal = data.orders
      .filter((order) => order.paidAt !== undefined)
      .reduce((total, order) => total + order.baseAmount, 0)
    expect(gmvTotal).toBeCloseTo(orderTotal, 0)

    const gmvSeries = data.metrics.filter((row) => row.metricKey === "gmv")
    expect(gmvSeries.some((row) => row.value > 0)).toBe(true)
    expect(gmvSeries.some((row) => row.value === 0)).toBe(true)

    const sla = data.metrics.filter(
      (row) => row.metricKey === "assessment_sla_p50" && row.value > 0,
    )
    expect(sla.length).toBeGreaterThan(0)

    for (const row of data.metrics) {
      if (
        row.metricKey === "gmv" ||
        row.metricKey === "net_revenue" ||
        row.metricKey === "payout_due" ||
        row.metricKey === "assessment_sla_p50" ||
        row.metricKey === "assessment_sla_p90" ||
        row.metricKey === "support_first_response_p50" ||
        row.metricKey === "support_first_response_p90" ||
        row.metricKey === "content_freshness"
      ) {
        continue
      }
      expect(row.value, row.metricKey).toBeGreaterThanOrEqual(0)
      expect(row.value, row.metricKey).toBeLessThanOrEqual(1)
    }

    const keys = new Set(data.metrics.map((row) => row.metricKey))
    for (const definition of data.definitions) {
      expect(keys.has(definition.key), definition.key).toBe(true)
    }
  })

  it("spreads domain activity from January 2026 to the present", async () => {
    const t = createTestDb()
    await seedWorkspace(t)

    const ranges = await t.run(async (ctx) => {
      const collect = async (table: string) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await ctx.db.query(table as any).collect()
      const tables = [
        "submissions",
        "assessments",
        "certificates",
        "orders",
        "payments",
        "payouts",
        "messages",
        "leads",
        "supportTickets",
        "culturalSources",
        "auditLogs",
        "cohorts",
        "pathModules",
        "lessons",
        "works",
      ]
      const result: Record<string, ReturnType<typeof timestampRange>> = {}
      for (const table of tables) {
        const docs = (await collect(table)) as Array<{ createdAt?: number }>
        result[table] = timestampRange(docs.map((doc) => doc.createdAt))
      }
      return result
    })

    for (const [table, range] of Object.entries(ranges)) {
      expect(range.count, `${table} should not be empty`).toBeGreaterThan(0)
      expect(range.min, `${table} starts before opening`).toBeGreaterThanOrEqual(
        SEED_START - DAY,
      )
      expect(range.max, `${table} is dated in the future`).toBeLessThanOrEqual(
        NOW + 2 * DAY,
      )
    }

    const startOfMarch = Date.UTC(2026, 2, 1)
    const startOfApril = Date.UTC(2026, 3, 1)
    const sixtyDaysAgo = NOW - 60 * DAY
    const ninetyDaysAgo = NOW - 90 * DAY
    const sevenDaysAgo = NOW - 7 * DAY

    expect(ranges.submissions.min).toBeLessThan(startOfMarch)
    expect(ranges.submissions.max).toBeGreaterThan(sixtyDaysAgo)
    expect(ranges.orders.min).toBeLessThan(startOfApril)
    expect(ranges.orders.max).toBeGreaterThan(sixtyDaysAgo)
    expect(ranges.messages.min).toBeLessThan(startOfMarch)
    expect(ranges.messages.max).toBeGreaterThan(sevenDaysAgo)
    expect(ranges.leads.min).toBeLessThan(startOfMarch)
    expect(ranges.leads.max).toBeGreaterThan(sevenDaysAgo)
    expect(ranges.auditLogs.min).toBeLessThanOrEqual(SEED_START + DAY)
    expect(ranges.auditLogs.max).toBeGreaterThan(ninetyDaysAgo)
    expect(ranges.certificates.max).toBeGreaterThan(ninetyDaysAgo)
  })
})
