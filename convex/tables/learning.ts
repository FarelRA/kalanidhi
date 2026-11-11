import { defineTable } from "convex/server"
import { v } from "convex/values"

const enrollmentStatus = v.union(
  v.literal("pending_payment"),
  v.literal("active"),
  v.literal("completed"),
  v.literal("withdrawn"),
)

const submissionStatus = v.union(
  v.literal("draft"),
  v.literal("submitted"),
  v.literal("under_review"),
  v.literal("revision_requested"),
  v.literal("approved"),
  v.literal("rejected"),
)

const assessmentStatus = v.union(
  v.literal("queued"),
  v.literal("in_review"),
  v.literal("completed"),
  v.literal("disputed"),
  v.literal("resolved"),
)

export const learningTables = {
  cohorts: defineTable({
    code: v.string(),
    pathId: v.string(),
    teacherId: v.id("users"),
    title: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    capacity: v.number(),
    timezone: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("enrolling"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_pathId", ["pathId"])
    .index("by_teacherId", ["teacherId"])
    .index("by_status", ["status"])
    .index("by_startDate", ["startDate"]),

  cohortSessions: defineTable({
    cohortId: v.id("cohorts"),
    title: v.string(),
    kind: v.union(
      v.literal("session"),
      v.literal("office_hours"),
      v.literal("call"),
      v.literal("assessment"),
    ),
    startsAt: v.number(),
    endsAt: v.number(),
    timezone: v.string(),
    roomId: v.optional(v.string()),
    status: v.union(
      v.literal("scheduled"),
      v.literal("live"),
      v.literal("ended"),
      v.literal("cancelled"),
    ),
    createdAt: v.number(),
  })
    .index("by_cohort_startsAt", ["cohortId", "startsAt"])
    .index("by_startsAt", ["startsAt"]),

  enrollments: defineTable({
    studentId: v.id("users"),
    pathId: v.string(),
    cohortId: v.optional(v.id("cohorts")),
    status: enrollmentStatus,
    enrolledAt: v.number(),
    completedAt: v.optional(v.number()),
    withdrawnAt: v.optional(v.number()),
    withdrawReason: v.optional(v.string()),
    certificateId: v.optional(v.id("certificates")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_studentId", ["studentId"])
    .index("by_cohortId", ["cohortId"])
    .index("by_pathId", ["pathId"])
    .index("by_status", ["status"])
    .index("by_student_cohort", ["studentId", "cohortId"]),

  lessonProgress: defineTable({
    userId: v.id("users"),
    enrollmentId: v.id("enrollments"),
    lessonId: v.id("lessons"),
    state: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("completed"),
    ),
    attendance: v.optional(
      v.union(v.literal("present"), v.literal("absent"), v.literal("excused")),
    ),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_user_lesson", ["userId", "lessonId"])
    .index("by_enrollment", ["enrollmentId"]),

  submissions: defineTable({
    code: v.string(),
    studentId: v.id("users"),
    enrollmentId: v.id("enrollments"),
    cohortId: v.id("cohorts"),
    pathId: v.string(),
    taskTitle: v.string(),
    status: submissionStatus,
    submittedAt: v.optional(v.number()),
    dueAt: v.number(),
    evidenceText: v.optional(v.string()),
    assetIds: v.array(v.id("submissionAssets")),
    revisionCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_studentId", ["studentId"])
    .index("by_cohortId", ["cohortId"])
    .index("by_pathId", ["pathId"])
    .index("by_status", ["status"])
    .index("by_submittedAt", ["submittedAt"]),

  submissionAssets: defineTable({
    submissionId: v.id("submissions"),
    storageId: v.id("_storage"),
    kind: v.union(
      v.literal("image"),
      v.literal("audio"),
      v.literal("video"),
      v.literal("file"),
    ),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    createdAt: v.number(),
  }).index("by_submissionId", ["submissionId"]),

  assessments: defineTable({
    submissionId: v.id("submissions"),
    assessorId: v.id("users"),
    status: assessmentStatus,
    rubric: v.array(
      v.object({
        criterion: v.string(),
        weight: v.number(),
        score: v.optional(v.number()),
        comment: v.optional(v.string()),
      }),
    ),
    score: v.optional(v.number()),
    feedback: v.optional(v.string()),
    assessedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_submissionId", ["submissionId"])
    .index("by_assessorId", ["assessorId"])
    .index("by_status", ["status"]),

  assessmentEvents: defineTable({
    assessmentId: v.id("assessments"),
    submissionId: v.id("submissions"),
    kind: v.union(
      v.literal("assign"),
      v.literal("grade"),
      v.literal("revision"),
      v.literal("override"),
      v.literal("dispute"),
      v.literal("resolve"),
    ),
    actorId: v.string(),
    reason: v.optional(v.string()),
    previousState: v.optional(v.string()),
    nextState: v.optional(v.string()),
    scoreBefore: v.optional(v.number()),
    scoreAfter: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_assessmentId", ["assessmentId"])
    .index("by_submissionId", ["submissionId"])
    .index("by_createdAt", ["createdAt"]),

  disputes: defineTable({
    subjectType: v.union(v.literal("assessment"), v.literal("order")),
    subjectId: v.string(),
    openedBy: v.id("users"),
    status: v.union(
      v.literal("open"),
      v.literal("reviewing"),
      v.literal("resolved"),
      v.literal("closed"),
    ),
    reason: v.string(),
    resolution: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_subject", ["subjectType", "subjectId"])
    .index("by_status", ["status"])
    .index("by_openedBy", ["openedBy"]),
}
