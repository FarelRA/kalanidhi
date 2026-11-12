import { describe, expect, it } from "vitest"

import { api } from "../../convex/_generated/api"
import {
  DAY,
  NOW,
  createPhase2Db,
  seedPhase2,
  seedUser,
} from "./fixtures"

describe("learning / paths, cohorts, enrollment", () => {
  it("[P2-LRN-04] enrollment starts pending_payment and activates only after an admin transition", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)

    const created = await t
      .withIdentity({ subject: "auth-student" })
      .mutation(api.learning.createEnrollment, {
        pathId: h.pathOtherId,
        cohortId: h.cohortOtherId,
      })

    const pending = await t.run(async (ctx) =>
      ctx.db.get(created.enrollmentId),
    )
    expect(pending?.status).toBe("pending_payment")

    const before = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.learning.listEnrollments, {})
    expect(
      before.find((item) => item.id === created.enrollmentId)?.status,
    ).toBe("pending_payment")

    await t.withIdentity({ subject: "auth-admin" }).mutation(
      api.learning.activateEnrollment,
      { enrollmentId: created.enrollmentId, reason: "Pembayaran terverifikasi" },
    )

    const after = await t.run(async (ctx) => ctx.db.get(created.enrollmentId))
    expect(after?.status).toBe("active")
  })

  it("[P2-LRN-05] duplicate enrollment in the same cohort is rejected", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)

    await expect(
      t.withIdentity({ subject: "auth-student" }).mutation(
        api.learning.createEnrollment,
        {
          pathId: h.pathId,
          cohortId: h.cohortId,
        },
      ),
    ).rejects.toThrow()
  })

  it("[P2-LRN-03] cohort capacity is enforced atomically", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    await t.run(async (ctx) => {
      await ctx.db.patch(h.cohortId, { capacity: 1 })
    })

    await expect(
      t.withIdentity({ subject: "auth-student-other" }).mutation(
        api.learning.createEnrollment,
        {
          pathId: h.pathId,
          cohortId: h.cohortId,
        },
      ),
    ).rejects.toThrow()
  })

  it("[P2-LRN-06] a student cannot enroll in an unpublished path", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    await t.run(async (ctx) => {
      const path = await ctx.db
        .query("paths")
        .withIndex("by_slug", (q) => q.eq("slug", h.pathOtherId))
        .unique()
      if (path) await ctx.db.patch(path._id, { status: "planned" })
    })

    await expect(
      t.withIdentity({ subject: "auth-student" }).mutation(
        api.learning.createEnrollment,
        { pathId: h.pathOtherId },
      ),
    ).rejects.toThrow()
  })

  it("[P2-LRN-08] withdrawal requires a reason and preserves history", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    const draft = await t
      .withIdentity({ subject: "auth-student" })
      .mutation(api.assessments.createDraft, {
        enrollmentId: h.enrollmentId,
        taskTitle: "Tugas yang tetap tersimpan",
        evidenceText: "Catatan",
      })

    await expect(
      t.withIdentity({ subject: "auth-student" }).mutation(
        api.learning.withdrawEnrollment,
        { enrollmentId: h.enrollmentId, reason: "" },
      ),
    ).rejects.toThrow()

    await t.withIdentity({ subject: "auth-student" }).mutation(
      api.learning.withdrawEnrollment,
      { enrollmentId: h.enrollmentId, reason: "Alasan keluarga" },
    )

    const enrollment = await t.run(async (ctx) =>
      ctx.db.get(h.enrollmentId),
    )
    expect(enrollment?.status).toBe("withdrawn")
    expect(enrollment?.withdrawReason).toBe("Alasan keluarga")
    const stillThere = await t.run(async (ctx) =>
      ctx.db.get(draft.submissionId),
    )
    expect(stillThere?._id).toBe(draft.submissionId)
  })

  it("[P2-LRN-09] completion follows the lesson rule, not a UI count", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)

    await expect(
      t.withIdentity({ subject: "auth-teacher" }).mutation(
        api.learning.completeEnrollment,
        { enrollmentId: h.enrollmentId },
      ),
    ).rejects.toThrow()

    for (const lessonId of [h.lessonOneId, h.lessonTwoId]) {
      await t.withIdentity({ subject: "auth-student" }).mutation(
        api.learning.recordProgress,
        { enrollmentId: h.enrollmentId, lessonId, state: "completed" },
      )
    }

    await t.withIdentity({ subject: "auth-teacher" }).mutation(
      api.learning.completeEnrollment,
      { enrollmentId: h.enrollmentId },
    )
    const enrollment = await t.run(async (ctx) =>
      ctx.db.get(h.enrollmentId),
    )
    expect(enrollment?.status).toBe("completed")
  })

  it("[P2-LRN-10] lesson progress is idempotent per student and lesson", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)

    for (let index = 0; index < 2; index += 1) {
      await t.withIdentity({ subject: "auth-student" }).mutation(
        api.learning.recordProgress,
        {
          enrollmentId: h.enrollmentId,
          lessonId: h.lessonOneId,
          state: "completed",
        },
      )
    }

    const progress = await t.run(async (ctx) =>
      ctx.db
        .query("lessonProgress")
        .withIndex("by_enrollment", (q) =>
          q.eq("enrollmentId", h.enrollmentId),
        )
        .collect(),
    )
    expect(progress).toHaveLength(1)
    expect(progress[0]?.state).toBe("completed")
  })

  it("[P2-LRN-11] students see only own enrollments while teachers see their cohort", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)

    const student = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.learning.listEnrollments, {})
    expect(student.map((item) => item.id)).toEqual([h.enrollmentId])

    const teacher = await t
      .withIdentity({ subject: "auth-teacher" })
      .query(api.learning.listEnrollments, {})
    expect(teacher.map((item) => item.id)).toContain(h.enrollmentId)
    expect(teacher.map((item) => item.id)).not.toContain(h.enrollmentOtherId)

    const otherTeacherView = await t
      .withIdentity({ subject: "auth-teacher-other" })
      .query(api.learning.listEnrollments, { cohortId: h.cohortId })
    expect(otherTeacherView).toEqual([])
  })

  it("[P2-LRN-11b] a student cannot read another student's enrollment detail or the cohort roster", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)

    const own = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.learning.enrollmentDetail, {
        enrollmentId: h.enrollmentOtherId,
      })
    expect(own).toBeNull()

    const roster = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.learning.cohortDetail, { cohortId: h.cohortId })
    expect(roster).toBeNull()
  })

  it("[P2-LRN-12] a teacher cannot see another teacher's cohort", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)

    const detail = await t
      .withIdentity({ subject: "auth-teacher-other" })
      .query(api.learning.cohortDetail, { cohortId: h.cohortId })
    expect(detail).toBeNull()

    const cohorts = await t
      .withIdentity({ subject: "auth-teacher" })
      .query(api.learning.listCohorts, {})
    expect(cohorts.map((item) => item.id)).toEqual([h.cohortId])

    const adminCohorts = await t
      .withIdentity({ subject: "auth-admin" })
      .query(api.learning.listCohorts, {})
    expect(adminCohorts.map((item) => item.id).sort()).toEqual(
      [h.cohortId, h.cohortOtherId].sort(),
    )
  })

  it("[P2-LRN-13] at-risk is derived from the last activity timestamp", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    await t.run(async (ctx) => {
      await ctx.db.patch(h.enrollmentId, {
        lastActivityAt: NOW - 20 * DAY,
      })
    })

    const cohorts = await t
      .withIdentity({ subject: "auth-teacher" })
      .query(api.learning.listCohorts, {})
    expect(cohorts[0]?.atRisk).toBe(1)
  })

  it("[P2-LRN-07] admin can move an enrollment and extend a deadline with a reason", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)

    const created = await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.learning.createCohort, {
        code: "BTG-99",
        pathId: h.pathId,
        teacherId: h.teacherId,
        title: "Kohort baru",
        startDate: NOW + DAY,
        endDate: NOW + 30 * DAY,
        capacity: 4,
      })

    await t.withIdentity({ subject: "auth-admin" }).mutation(
      api.learning.updateCohortStatus,
      {
        cohortId: created.cohortId,
        status: "enrolling",
        reason: "Membuka kohort tujuan",
      },
    )

    await t.withIdentity({ subject: "auth-admin" }).mutation(
      api.learning.moveEnrollment,
      {
        enrollmentId: h.enrollmentId,
        cohortId: created.cohortId,
        reason: "Pindah jadwal",
      },
    )
    const moved = await t.run(async (ctx) => ctx.db.get(h.enrollmentId))
    expect(moved?.cohortId).toBe(created.cohortId)

    const deadline = Date.now() + 10 * DAY
    await t.withIdentity({ subject: "auth-admin" }).mutation(
      api.learning.extendDeadline,
      {
        enrollmentId: h.enrollmentId,
        deadlineAt: deadline,
        reason: "Perpanjangan izin",
      },
    )
    const extended = await t.run(async (ctx) => ctx.db.get(h.enrollmentId))
    expect(extended?.deadlineAt).toBe(deadline)
  })

  it("[P2-LRN-14] schedule and attendance are scoped to the cohort", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)

    const studentSessions = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.learning.listSessions, {})
    expect(studentSessions.map((item) => item.id)).toEqual([h.sessionId])

    const teacherSessions = await t
      .withIdentity({ subject: "auth-teacher" })
      .query(api.learning.listSessions, {})
    expect(teacherSessions.map((item) => item.id)).toEqual([h.sessionId])

    const adminSessions = await t
      .withIdentity({ subject: "auth-admin" })
      .query(api.learning.listSessions, {})
    expect(adminSessions.map((item) => item.id).sort()).toEqual(
      [h.sessionId, h.sessionOtherId].sort(),
    )

    await t.withIdentity({ subject: "auth-teacher" }).mutation(
      api.learning.recordAttendance,
      {
        enrollmentId: h.enrollmentId,
        lessonId: h.lessonOneId,
        attendance: "present",
      },
    )
    const attendance = await t.run(async (ctx) =>
      ctx.db
        .query("lessonProgress")
        .withIndex("by_enrollment", (q) =>
          q.eq("enrollmentId", h.enrollmentId),
        )
        .unique(),
    )
    expect(attendance?.attendance).toBe("present")

    await expect(
      t.withIdentity({ subject: "auth-teacher-other" }).mutation(
        api.learning.recordAttendance,
        {
          enrollmentId: h.enrollmentId,
          lessonId: h.lessonOneId,
          attendance: "present",
        },
      ),
    ).rejects.toThrow()

    await expect(
      t.withIdentity({ subject: "auth-student" }).mutation(
        api.learning.recordAttendance,
        {
          enrollmentId: h.enrollmentId,
          lessonId: h.lessonOneId,
          attendance: "present",
        },
      ),
    ).rejects.toThrow()
  })

  it("[P2-LRN-15] a teacher can only create cohorts for assigned paths", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)

    await expect(
      t.withIdentity({ subject: "auth-teacher" }).mutation(
        api.learning.createCohort,
        {
          code: "PRC-99",
          pathId: h.pathOtherId,
          title: "Di luar cakupan",
          startDate: NOW + DAY,
          endDate: NOW + 10 * DAY,
          capacity: 4,
        },
      ),
    ).rejects.toThrow()
  })

  it("[P2-LRN-16] unauthenticated workspace queries fail closed", async () => {
    const t = createPhase2Db()
    await seedPhase2(t)
    await expect(t.query(api.learning.listCohorts, {})).rejects.toThrow()
  })

  it("[P2-LRN-17] an admin can enroll a student on their behalf", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    const fresh = await seedUser(t, "auth-fresh-student")

    const created = await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.learning.createEnrollment, {
        pathId: h.pathId,
        cohortId: h.cohortId,
        studentId: fresh,
      })
    const enrollment = await t.run(async (ctx) =>
      ctx.db.get(created.enrollmentId),
    )
    expect(enrollment?.studentId).toBe(fresh)
    expect(enrollment?.status).toBe("pending_payment")
  })
})
