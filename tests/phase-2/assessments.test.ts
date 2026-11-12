import { describe, expect, it } from "vitest"

import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import { DAY, NOW, createPhase2Db, seedPhase2, submitAndGrade } from "./fixtures"

describe("assessments / submissions", () => {
  it("[P2-SUB-03] submit requires evidence and records the submitted timestamp", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    const draft = await t
      .withIdentity({ subject: "auth-student" })
      .mutation(api.assessments.createDraft, {
        enrollmentId: h.enrollmentId,
        taskTitle: "Tugas tanpa bukti",
      })

    await expect(
      t.withIdentity({ subject: "auth-student" }).mutation(
        api.assessments.submit,
        { submissionId: draft.submissionId },
      ),
    ).rejects.toThrow()

    await t.withIdentity({ subject: "auth-student" }).mutation(
      api.assessments.saveDraft,
      {
        submissionId: draft.submissionId,
        evidenceText: "Catatan proses lengkap.",
      },
    )
    await t.withIdentity({ subject: "auth-student" }).mutation(
      api.assessments.submit,
      { submissionId: draft.submissionId },
    )

    const submission = await t.run(async (ctx) =>
      ctx.db.get(draft.submissionId),
    )
    expect(submission?.status).toBe("submitted")
    expect(submission?.submittedAt).toBeGreaterThan(0)
  })

  it("[P2-SUB-01] asset kinds and the configured limits are enforced", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    const draft = await t
      .withIdentity({ subject: "auth-student" })
      .mutation(api.assessments.createDraft, {
        enrollmentId: h.enrollmentId,
        taskTitle: "Tugas bukti",
      })

    await t.withIdentity({ subject: "auth-student" }).mutation(
      api.assessments.addAsset,
      {
        submissionId: draft.submissionId,
        storageId: "00000000000000000000000000000000_storage" as Id<"_storage">,
        kind: "image",
        filename: "proses.jpg",
        mimeType: "image/jpeg",
        size: 200,
      },
    )
    await t.withIdentity({ subject: "auth-student" }).mutation(
      api.assessments.addAsset,
      {
        submissionId: draft.submissionId,
        storageId: "00000000000000000000000000000001_storage" as Id<"_storage">,
        kind: "audio",
        filename: "catatan.webm",
        mimeType: "audio/webm",
        size: 300,
      },
    )

    await expect(
      t.withIdentity({ subject: "auth-student" }).mutation(
        api.assessments.addAsset,
        {
          submissionId: draft.submissionId,
          storageId: "00000000000000000000000000000002_storage" as Id<"_storage">,
          kind: "image",
          filename: "ketiga.jpg",
          mimeType: "image/jpeg",
          size: 200,
        },
      ),
    ).rejects.toThrow()

    await expect(
      t.withIdentity({ subject: "auth-student" }).mutation(
        api.assessments.addAsset,
        {
          submissionId: draft.submissionId,
          storageId: "00000000000000000000000000000003_storage" as Id<"_storage">,
          kind: "file",
          filename: "skrip.exe",
          mimeType: "application/x-msdownload",
          size: 200,
        },
      ),
    ).rejects.toThrow()

    await expect(
      t.withIdentity({ subject: "auth-student" }).mutation(
        api.assessments.addAsset,
        {
          submissionId: draft.submissionId,
          storageId: "00000000000000000000000000000004_storage" as Id<"_storage">,
          kind: "video",
          filename: "besar.mp4",
          mimeType: "video/mp4",
          size: 4096,
        },
      ),
    ).rejects.toThrow()
  })

  it("[P2-SUB-06] a student cannot touch another student's submission", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    const draft = await t
      .withIdentity({ subject: "auth-student" })
      .mutation(api.assessments.createDraft, {
        enrollmentId: h.enrollmentId,
        taskTitle: "Tugas Anisa",
        evidenceText: "Catatan",
      })

    await expect(
      t.withIdentity({ subject: "auth-student-other" }).mutation(
        api.assessments.saveDraft,
        {
          submissionId: draft.submissionId,
          evidenceText: "Mengubah tugas orang",
        },
      ),
    ).rejects.toThrow()

    const otherView = await t
      .withIdentity({ subject: "auth-student-other" })
      .query(api.assessments.getSubmission, {
        submissionId: draft.submissionId,
      })
    expect(otherView).toBeNull()
  })

  it("[P2-SUB-07] after approval a student cannot submit again without reopen", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    const { submissionId } = await submitAndGrade(t, h, {
      studentAuth: "auth-student",
      studentId: h.studentId,
      enrollmentId: h.enrollmentId,
      teacherAuth: "auth-teacher",
    })

    await expect(
      t.withIdentity({ subject: "auth-student" }).mutation(
        api.assessments.submit,
        { submissionId },
      ),
    ).rejects.toThrow()
  })

  it("[P2-SUB-05] revision requires a note and reopens the submission", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    const draft = await t
      .withIdentity({ subject: "auth-student" })
      .mutation(api.assessments.createDraft, {
        enrollmentId: h.enrollmentId,
        taskTitle: "Tugas revisi",
        evidenceText: "Catatan awal",
      })
    await t.withIdentity({ subject: "auth-student" }).mutation(
      api.assessments.submit,
      { submissionId: draft.submissionId },
    )
    const rubric = [
      { criterion: "Ketepatan proses", weight: 40, score: 70 },
      { criterion: "Kualitas garis canting", weight: 30, score: 70 },
      { criterion: "Catatan proses", weight: 30, score: 70 },
    ]

    await expect(
      t.withIdentity({ subject: "auth-teacher" }).mutation(
        api.assessments.grade,
        {
          submissionId: draft.submissionId,
          decision: "revision",
          rubric,
        },
      ),
    ).rejects.toThrow()

    await t.withIdentity({ subject: "auth-teacher" }).mutation(
      api.assessments.grade,
      {
        submissionId: draft.submissionId,
        decision: "revision",
        rubric,
        feedback: "Ulangi garis tepi dengan tiga tarikan.",
      },
    )
    const after = await t.run(async (ctx) =>
      ctx.db.get(draft.submissionId),
    )
    expect(after?.status).toBe("revision_requested")

    await t.withIdentity({ subject: "auth-student" }).mutation(
      api.assessments.submit,
      { submissionId: draft.submissionId },
    )
    const resubmitted = await t.run(async (ctx) =>
      ctx.db.get(draft.submissionId),
    )
    expect(resubmitted?.status).toBe("submitted")
    expect(resubmitted?.revisionCount).toBe(1)
  })

  it("[P2-ASM-02] rubric weights must sum to 100", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    const draft = await t
      .withIdentity({ subject: "auth-student" })
      .mutation(api.assessments.createDraft, {
        enrollmentId: h.enrollmentId,
        taskTitle: "Tugas rubrik",
        evidenceText: "Catatan",
      })
    await t.withIdentity({ subject: "auth-student" }).mutation(
      api.assessments.submit,
      { submissionId: draft.submissionId },
    )

    await expect(
      t.withIdentity({ subject: "auth-teacher" }).mutation(
        api.assessments.grade,
        {
          submissionId: draft.submissionId,
          decision: "approve",
          rubric: [
            { criterion: "A", weight: 60, score: 90 },
            { criterion: "B", weight: 30, score: 90 },
          ],
        },
      ),
    ).rejects.toThrow()
  })

  it("[P2-ASM-03] scores outside the rubric range are rejected", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    const draft = await t
      .withIdentity({ subject: "auth-student" })
      .mutation(api.assessments.createDraft, {
        enrollmentId: h.enrollmentId,
        taskTitle: "Tugas skor",
        evidenceText: "Catatan",
      })
    await t.withIdentity({ subject: "auth-student" }).mutation(
      api.assessments.submit,
      { submissionId: draft.submissionId },
    )

    await expect(
      t.withIdentity({ subject: "auth-teacher" }).mutation(
        api.assessments.grade,
        {
          submissionId: draft.submissionId,
          decision: "approve",
          rubric: [
            { criterion: "A", weight: 40, score: 120 },
            { criterion: "B", weight: 30, score: 90 },
            { criterion: "C", weight: 30, score: 90 },
          ],
        },
      ),
    ).rejects.toThrow()
  })

  it("[P2-ASM-05] approve, reject, and revision follow the submission state machine", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    const { submissionId, result } = await submitAndGrade(t, h, {
      studentAuth: "auth-student",
      studentId: h.studentId,
      enrollmentId: h.enrollmentId,
      teacherAuth: "auth-teacher",
      decision: "approve",
      score: 88,
    })
    expect(result.status).toBe("approved")
    expect(result.score).toBe(88)
    expect(result.certificateId).toBeTruthy()

    const detail = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.assessments.getSubmission, { submissionId })
    expect(detail?.status).toBe("approved")
    expect(detail?.assessmentStatus).toBe("completed")
  })

  it("[P2-ASM-06] a teacher cannot grade their own enrollment", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    await t.run(async (ctx) => {
      const teacher = await ctx.db.get(h.teacherId)
      if (teacher) {
        await ctx.db.patch(teacher._id, {
          roles: ["teacher", "student"],
        })
      }
      await ctx.db.insert("enrollments", {
        studentId: h.teacherId,
        pathId: h.pathId,
        cohortId: h.cohortId,
        status: "active",
        enrolledAt: NOW,
        lastActivityAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      })
    })
    const enrollment = await t.run(async (ctx) =>
      ctx.db
        .query("enrollments")
        .withIndex("by_studentId", (q) => q.eq("studentId", h.teacherId))
        .unique(),
    )
    if (!enrollment) throw new Error("enrollment missing")

    const draft = await t
      .withIdentity({ subject: "auth-teacher" })
      .mutation(api.assessments.createDraft, {
        enrollmentId: enrollment._id,
        taskTitle: "Tugas pengajar",
        evidenceText: "Catatan",
      })
    await t.withIdentity({ subject: "auth-teacher" }).mutation(
      api.assessments.submit,
      { submissionId: draft.submissionId },
    )

    await expect(
      t.withIdentity({ subject: "auth-teacher" }).mutation(
        api.assessments.grade,
        {
          submissionId: draft.submissionId,
          decision: "approve",
          rubric: [
            { criterion: "A", weight: 50, score: 90 },
            { criterion: "B", weight: 50, score: 90 },
          ],
        },
      ),
    ).rejects.toThrow()
  })

  it("[P2-ASM-06b] a teacher cannot grade a submission in another cohort", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    const { submissionId } = await submitAndGrade(t, h, {
      studentAuth: "auth-student-other",
      studentId: h.studentOtherId,
      enrollmentId: h.enrollmentOtherId,
      teacherAuth: "auth-teacher-other",
      decision: "revision",
    })

    await expect(
      t.withIdentity({ subject: "auth-teacher" }).mutation(
        api.assessments.grade,
        {
          submissionId,
          decision: "approve",
          rubric: [
            { criterion: "A", weight: 50, score: 90 },
            { criterion: "B", weight: 50, score: 90 },
          ],
        },
      ),
    ).rejects.toThrow()

    const mine = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.assessments.listMine, {})
    expect(mine.some((item) => item.id === submissionId)).toBe(false)

    const adminQueue = await t
      .withIdentity({ subject: "auth-admin" })
      .query(api.assessments.listQueue, {})
    expect(adminQueue.some((item) => item.id === submissionId)).toBe(true)
  })

  it("[P2-ASM-07] an admin can read and escalate but cannot grade or submit", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    const { submissionId } = await submitAndGrade(t, h, {
      studentAuth: "auth-student",
      studentId: h.studentId,
      enrollmentId: h.enrollmentId,
      teacherAuth: "auth-teacher",
      decision: "revision",
    })

    const queue = await t
      .withIdentity({ subject: "auth-admin" })
      .query(api.assessments.listEscalations, {})
    expect(queue.some((item) => item.id === submissionId)).toBe(true)

    await t.withIdentity({ subject: "auth-admin" }).mutation(
      api.assessments.escalateSubmission,
      { submissionId, reason: "Melewati SLA penilaian" },
    )

    await expect(
      t.withIdentity({ subject: "auth-admin" }).mutation(
        api.assessments.grade,
        {
          submissionId,
          decision: "approve",
          rubric: [
            { criterion: "A", weight: 50, score: 90 },
            { criterion: "B", weight: 50, score: 90 },
          ],
        },
      ),
    ).rejects.toThrow()

    await expect(
      t.withIdentity({ subject: "auth-admin" }).mutation(
        api.assessments.createDraft,
        {
          enrollmentId: h.enrollmentId,
          taskTitle: "Admin tidak mengirim",
        },
      ),
    ).rejects.toThrow()
  })

  it("[P2-ASM-08] a score override requires a reason and a second reviewer for a large change", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    const { result } = await submitAndGrade(t, h, {
      studentAuth: "auth-student",
      studentId: h.studentId,
      enrollmentId: h.enrollmentId,
      teacherAuth: "auth-teacher",
      decision: "approve",
      score: 88,
    })
    if (!result.assessmentId) throw new Error("assessment missing")

    await expect(
      t.withIdentity({ subject: "auth-teacher" }).mutation(
        api.assessments.override,
        {
          assessmentId: result.assessmentId,
          rubric: [
            { criterion: "A", weight: 50, score: 90 },
            { criterion: "B", weight: 50, score: 90 },
          ],
          reason: "pendek",
        },
      ),
    ).rejects.toThrow()

    await expect(
      t.withIdentity({ subject: "auth-teacher" }).mutation(
        api.assessments.override,
        {
          assessmentId: result.assessmentId,
          rubric: [
            { criterion: "A", weight: 50, score: 20 },
            { criterion: "B", weight: 50, score: 20 },
          ],
          reason: "Koreksi menyeluruh setelah bukti tambahan",
        },
      ),
    ).rejects.toThrow()

    await t.withIdentity({ subject: "auth-teacher" }).mutation(
      api.assessments.override,
      {
        assessmentId: result.assessmentId,
        rubric: [
          { criterion: "A", weight: 50, score: 20 },
          { criterion: "B", weight: 50, score: 20 },
        ],
        reason: "Koreksi menyeluruh setelah bukti tambahan",
        secondReviewerId: h.teacherOtherId,
      },
    )
    const assessment = await t.run(async (ctx) =>
      ctx.db.get(result.assessmentId),
    )
    expect(assessment?.score).toBe(20)
    expect(assessment?.overrideReason).toContain("Koreksi")
  })

  it("[P2-ASM-09] assessment history records revisions and overrides", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    const { submissionId, result } = await submitAndGrade(t, h, {
      studentAuth: "auth-student",
      studentId: h.studentId,
      enrollmentId: h.enrollmentId,
      teacherAuth: "auth-teacher",
      decision: "approve",
      score: 88,
    })
    await t.withIdentity({ subject: "auth-teacher" }).mutation(
      api.assessments.override,
      {
        assessmentId: result.assessmentId,
        rubric: [
          { criterion: "A", weight: 50, score: 80 },
          { criterion: "B", weight: 50, score: 80 },
        ],
        reason: "Koreksi catatan proses",
      },
    )
    const detail = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.assessments.getSubmission, { submissionId })
    expect(detail?.history.length).toBeGreaterThanOrEqual(2)
    expect(detail?.history.some((item) => item.kind === "override")).toBe(true)
  })

  it("[P2-ASM-11] dispute follows open → reviewing → resolved → closed and needs a reason", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    const { result } = await submitAndGrade(t, h, {
      studentAuth: "auth-student",
      studentId: h.studentId,
      enrollmentId: h.enrollmentId,
      teacherAuth: "auth-teacher",
      decision: "approve",
    })
    if (!result.assessmentId) throw new Error("assessment missing")

    const dispute = await t
      .withIdentity({ subject: "auth-student" })
      .mutation(api.assessments.openDispute, {
        assessmentId: result.assessmentId,
        reason: "Saya ingin peninjauan bukti pewarnaan.",
      })

    await expect(
      t.withIdentity({ subject: "auth-admin" }).mutation(
        api.assessments.updateDispute,
        { disputeId: dispute.disputeId, status: "resolved" },
      ),
    ).rejects.toThrow()

    await t.withIdentity({ subject: "auth-admin" }).mutation(
      api.assessments.updateDispute,
      { disputeId: dispute.disputeId, status: "reviewing" },
    )
    await t.withIdentity({ subject: "auth-admin" }).mutation(
      api.assessments.updateDispute,
      {
        disputeId: dispute.disputeId,
        status: "resolved",
        resolution: "Bukti tambahan diterima; nilai dipertahankan.",
      },
    )
    await t.withIdentity({ subject: "auth-admin" }).mutation(
      api.assessments.updateDispute,
      { disputeId: dispute.disputeId, status: "closed" },
    )

    const disputes = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.assessments.listDisputes, {})
    expect(disputes[0]?.status).toBe("closed")

    const reopened = await t
      .withIdentity({ subject: "auth-student" })
      .mutation(api.assessments.openDispute, {
        assessmentId: result.assessmentId,
        reason: "Sengketa baru setelah keputusan pertama ditutup.",
      })
    expect(reopened.disputeId).toBeTruthy()
  })

  it("[P2-ASM-10] grading queue age and SLA derive from records", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    const { submissionId } = await submitAndGrade(t, h, {
      studentAuth: "auth-student",
      studentId: h.studentId,
      enrollmentId: h.enrollmentId,
      teacherAuth: "auth-teacher",
      decision: "revision",
    })
    await t.run(async (ctx) => {
      await ctx.db.patch(submissionId, {
        status: "submitted",
        submittedAt: NOW - 4 * DAY,
        dueAt: NOW - 2 * DAY,
      })
    })
    const queue = await t
      .withIdentity({ subject: "auth-teacher" })
      .query(api.assessments.listQueue, {})
    const row = queue.find((item) => item.id === submissionId)
    expect(row?.ageHours).toBeGreaterThan(72)
    expect(row?.slaHours).toBe(72)
  })
})
