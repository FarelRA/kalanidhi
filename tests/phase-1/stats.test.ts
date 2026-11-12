import { describe, expect, it } from "vitest"

import { api } from "../../convex/_generated/api"
import { createTestDb } from "../helpers/convex"
import { NOW, seedAdmin, seedLead, seedStudent } from "./fixtures"

async function adminDb() {
  const t = createTestDb()
  await seedAdmin(t, "auth-admin")
  return t
}

describe("stats / empty states", () => {
  it("[P1-STAT-21] no typed numbers: an empty database shows empty states, not demo values", async () => {
    const t = await adminDb()
    const identity = t.withIdentity({ subject: "auth-admin" })

    const overview = await identity.query(api.stats.overview, {})
    expect(overview.queues.every((queue) => queue.count === 0)).toBe(true)
    expect(overview.activity).toEqual([])
    expect(overview.content.publishedAt).toBeNull()
    expect(overview.modules.some((module) => module.available)).toBe(false)

    const report = await identity.query(api.stats.metrics, {
      from: NOW - 86_400_000,
      to: NOW + 86_400_000,
    })
    const byKey = new Map(report.definitions.map((item) => [item.key, item]))
    expect(byKey.get("lead_conversion")?.value).toBeNull()
    expect(byKey.get("gmv")?.value).toBeNull()
    expect(byKey.get("net_revenue")?.value).toBeNull()
    expect(byKey.get("payout_due")?.value).toBeNull()
    expect(byKey.get("gateway_success")?.value).toBeNull()
    expect(byKey.get("content_freshness")?.value).toBeNull()
    expect(byKey.get("lead_conversion")?.emptyReason).toBeTruthy()
    expect(report.funnel.find((step) => step.key === "visitor")?.value).toBeNull()
    expect(report.funnel.find((step) => step.key === "lead")?.value).toBe(0)
  })

  it("rejects stats for non-admin accounts", async () => {
    const t = createTestDb()
    await seedStudent(t, "auth-student")
    await expect(
      t.withIdentity({ subject: "auth-student" }).query(api.stats.metrics, {}),
    ).rejects.toThrow()
  })
})

describe("stats / derived metrics", () => {
  it("[P1-STAT-01..19] metrics and the funnel come from real records", async () => {
    const t = await adminDb()
    const teacherId = await seedStudent(t, "auth-teacher", "Bambang Hardjono")
    const studentId = await seedStudent(t, "auth-student", "Anisa Rahmawati")

    await seedLead(t, { status: "converted", email: "converted@example.test" })
    await seedLead(t, { status: "qualified", email: "qualified@example.test" })

    const { cohortId, enrollmentId, submissionId, certificateId, orderId } =
      await t.run(async (ctx) => {
        const cohortId = await ctx.db.insert("cohorts", {
          code: "KOH-1",
          pathId: "batik-tulis-soga",
          teacherId,
          title: "Kohort Batik",
          startDate: NOW - 86_400_000,
          endDate: NOW + 86_400_000,
          capacity: 12,
          timezone: "Asia/Jakarta",
          status: "active",
          createdAt: NOW,
          updatedAt: NOW,
        })
        const enrollmentId = await ctx.db.insert("enrollments", {
          studentId,
          pathId: "batik-tulis-soga",
          cohortId,
          status: "active",
          enrolledAt: NOW,
          createdAt: NOW,
          updatedAt: NOW,
        })
        const submissionId = await ctx.db.insert("submissions", {
          code: "TUG-1",
          studentId,
          enrollmentId,
          cohortId,
          pathId: "batik-tulis-soga",
          taskTitle: "Kain",
          status: "approved",
          submittedAt: NOW - 3_600_000,
          dueAt: NOW,
          assetIds: [],
          revisionCount: 0,
          createdAt: NOW - 3_600_000,
          updatedAt: NOW,
        })
        const assessmentId = await ctx.db.insert("assessments", {
          submissionId,
          assessorId: teacherId,
          status: "completed",
          rubric: [{ criterion: "Teknik", weight: 1, score: 90 }],
          score: 90,
          feedback: "Baik",
          assessedAt: NOW,
          createdAt: NOW,
          updatedAt: NOW,
        })
        const certificateId = await ctx.db.insert("certificates", {
          serial: "KN-2026-0001",
          publicCode: "PUB-0001",
          studentId,
          pathId: "batik-tulis-soga",
          teacherId,
          assessmentId,
          status: "issued",
          issuedAt: NOW,
          snapshot: {
            studentName: "Anisa Rahmawati",
            pathTitle: "Batik Tulis Soga",
            teacherName: "Bambang Hardjono",
            assessmentScore: 90,
            issuedAt: NOW,
          },
          createdAt: NOW,
          updatedAt: NOW,
        })
        const orderId = await ctx.db.insert("orders", {
          code: "KN-2026-0001",
          buyerUserId: studentId,
          buyerName: "Anisa Rahmawati",
          buyerEmail: "anisa@example.test",
          sellerId: teacherId,
          baseAmount: 1_450_000,
          uniqueAmount: 1_450_037,
          status: "paid",
          channel: "web",
          createdAt: NOW,
          updatedAt: NOW,
          paidAt: NOW,
        })
        await ctx.db.insert("payments", {
          orderId,
          provider: "gopay_qris",
          providerChargeId: "ch_1",
          providerTransactionId: "trx_1",
          baseAmount: 1_450_000,
          uniqueAmount: 1_450_037,
          status: "paid",
          expiresAt: NOW + 900_000,
          paidAt: NOW,
          createdAt: NOW,
          updatedAt: NOW,
        })
        await ctx.db.insert("payouts", {
          teacherId,
          periodStart: NOW - 86_400_000,
          periodEnd: NOW,
          gross: 1_450_000,
          teacherShare: 1_015_000,
          platformShare: 217_500,
          communityShare: 217_500,
          status: "approved",
          createdAt: NOW,
          updatedAt: NOW,
        })
        return { cohortId, enrollmentId, submissionId, certificateId, orderId }
      })
    void cohortId
    void enrollmentId
    void submissionId
    void certificateId
    void orderId

    const report = await t
      .withIdentity({ subject: "auth-admin" })
      .query(api.stats.metrics, {
        from: NOW - 86_400_000,
        to: NOW + 86_400_000,
      })
    const byKey = new Map(report.definitions.map((item) => [item.key, item]))

    expect(byKey.get("lead_conversion")?.value).toBe(0.5)
    expect(byKey.get("gmv")?.value).toBe(1_450_000)
    expect(byKey.get("payout_due")?.value).toBe(1_450_000)
    expect(byKey.get("gateway_success")?.value).toBe(1)
    expect(byKey.get("teacher_load")?.value).toBe(1)
    expect(byKey.get("cohort_fill")?.value).toBeCloseTo(1 / 12)

    const funnel = new Map(report.funnel.map((step) => [step.key, step.value]))
    expect(funnel.get("lead")).toBe(2)
    expect(funnel.get("enrollment")).toBe(1)
    expect(funnel.get("submission")).toBe(1)
    expect(funnel.get("assessment")).toBe(1)
    expect(funnel.get("certificate")).toBe(1)
    expect(funnel.get("first_sale")).toBe(1)
    expect(funnel.get("repeat")).toBe(0)
  })

  it("[P1-STAT-22] CSV export uses the same definition set and writes an audit row", async () => {
    const t = await adminDb()
    const result = await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.stats.exportMetrics, {
        from: NOW - 86_400_000,
        to: NOW + 86_400_000,
        reason: "Rapat bulanan",
      })
    expect(result.rows.length).toBeGreaterThan(10)
    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) => q.eq("action", "stats.export"))
        .collect(),
    )
    expect(audit).toHaveLength(1)
  })
})
