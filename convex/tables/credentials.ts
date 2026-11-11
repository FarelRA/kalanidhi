import { defineTable } from "convex/server"
import { v } from "convex/values"

export const credentialTables = {
  certificates: defineTable({
    serial: v.string(),
    publicCode: v.string(),
    studentId: v.id("users"),
    pathId: v.string(),
    teacherId: v.id("users"),
    assessmentId: v.id("assessments"),
    status: v.union(
      v.literal("issued"),
      v.literal("revoked"),
      v.literal("replaced"),
    ),
    issuedAt: v.number(),
    revokedAt: v.optional(v.number()),
    revokeReason: v.optional(v.string()),
    replacedBy: v.optional(v.id("certificates")),
    snapshot: v.object({
      studentName: v.string(),
      pathTitle: v.string(),
      teacherName: v.string(),
      assessmentScore: v.number(),
      issuedAt: v.number(),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_serial", ["serial"])
    .index("by_publicCode", ["publicCode"])
    .index("by_studentId", ["studentId"])
    .index("by_pathId", ["pathId"])
    .index("by_teacherId", ["teacherId"])
    .index("by_status", ["status"]),

  certificateEvents: defineTable({
    certificateId: v.id("certificates"),
    kind: v.union(
      v.literal("issue"),
      v.literal("revoke"),
      v.literal("replace"),
    ),
    actorId: v.string(),
    reason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_certificateId", ["certificateId"])
    .index("by_createdAt", ["createdAt"]),

  workCards: defineTable({
    workId: v.id("works"),
    certificateId: v.optional(v.id("certificates")),
    makerId: v.id("users"),
    serial: v.string(),
    title: v.string(),
    technique: v.string(),
    materials: v.string(),
    provenance: v.string(),
    permission: v.string(),
    accessLevel: v.union(
      v.literal("public"),
      v.literal("community"),
      v.literal("restricted"),
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("teacher_confirmed"),
      v.literal("admin_review"),
      v.literal("published"),
      v.literal("paused"),
      v.literal("sold_out"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workId", ["workId"])
    .index("by_makerId", ["makerId"])
    .index("by_certificateId", ["certificateId"])
    .index("by_status", ["status"]),
}
