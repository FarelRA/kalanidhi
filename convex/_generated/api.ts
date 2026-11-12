import { anyApi, componentsGeneric, type FunctionReference } from "convex/server"

import type { createClient } from "@convex-dev/better-auth"
import type { WorkspaceRole } from "../../lib/access/capabilities"
import type { Viewer } from "../../lib/access/viewer"
import type { SiteData } from "../../lib/content/types"
import type { LeadArgs } from "../../lib/convex/types"
import type {
  CertificateOverview,
  CertificatePublicView,
  CohortOverview,
  DisputeOverview,
  EnrollmentDetail,
  EnrollmentOverview,
  GradeDecision,
  GradeResult,
  PathOverview,
  RubricInput,
  SessionOverview,
  SubmissionDetail,
  SubmissionOverview,
} from "../../lib/workspace/phase2-types"
import type { Id } from "./dataModel"


export type SeedResult = {
  seeded: true
  fields: number
  paths: number
  teachers: number
  works: number
  testimonials: number
  faqs: number
}

export type PublicApiType = {
  content: {
    getSite: FunctionReference<"query", "public", Record<string, never>, SiteData | null>
  }
  leads: {
    create: FunctionReference<"mutation", "public", LeadArgs, Id<"leads">>
  }
  access: {
    getViewer: FunctionReference<"query", "public", Record<string, never>, Viewer | null>
  }
  users: {
    current: FunctionReference<"query", "public", Record<string, never>, Viewer | null>
    invite: FunctionReference<
      "mutation",
      "public",
      {
        email: string
        name?: string
        roles: WorkspaceRole[]
        reason: string
        ttlDays?: number
      },
      { inviteId: Id<"invites">; token: string; expiresAt: number }
    >
    acceptInvite: FunctionReference<
      "mutation",
      "public",
      { token?: string },
      Viewer
    >
    setRoles: FunctionReference<
      "mutation",
      "public",
      { userId: Id<"users">; roles: WorkspaceRole[]; reason: string },
      null
    >
    suspend: FunctionReference<
      "mutation",
      "public",
      { userId: Id<"users">; reason: string },
      { revokedSessions: number }
    >
    bootstrapAdmin: FunctionReference<
      "mutation",
      "internal",
      { authUserId: string; email: string; name: string; region?: string },
      Id<"users">
    >
  }
  learning: {
    listPaths: FunctionReference<"query", "public", Record<string, never>, PathOverview[]>
    listCohorts: FunctionReference<"query", "public", Record<string, never>, CohortOverview[]>
    cohortDetail: FunctionReference<
      "query",
      "public",
      { cohortId: Id<"cohorts"> },
      { cohort: CohortOverview; roster: EnrollmentOverview[] } | null
    >
    listEnrollments: FunctionReference<
      "query",
      "public",
      { cohortId?: Id<"cohorts"> },
      EnrollmentOverview[]
    >
    enrollmentDetail: FunctionReference<
      "query",
      "public",
      { enrollmentId: Id<"enrollments"> },
      EnrollmentDetail | null
    >
    listSessions: FunctionReference<"query", "public", Record<string, never>, SessionOverview[]>
    createCohort: FunctionReference<
      "mutation",
      "public",
      {
        code: string
        pathId: string
        teacherId?: Id<"users">
        title: string
        startDate: number
        endDate: number
        capacity: number
        timezone?: string
      },
      { cohortId: Id<"cohorts"> }
    >
    updateCohortStatus: FunctionReference<
      "mutation",
      "public",
      {
        cohortId: Id<"cohorts">
        status: "draft" | "enrolling" | "active" | "completed" | "cancelled"
        reason: string
      },
      null
    >
    createEnrollment: FunctionReference<
      "mutation",
      "public",
      { pathId: string; cohortId?: Id<"cohorts">; studentId?: Id<"users"> },
      { enrollmentId: Id<"enrollments"> }
    >
    activateEnrollment: FunctionReference<
      "mutation",
      "public",
      { enrollmentId: Id<"enrollments">; reason?: string },
      { status: "active" }
    >
    withdrawEnrollment: FunctionReference<
      "mutation",
      "public",
      { enrollmentId: Id<"enrollments">; reason: string },
      { status: "withdrawn" }
    >
    completeEnrollment: FunctionReference<
      "mutation",
      "public",
      { enrollmentId: Id<"enrollments">; reason?: string },
      { status: "completed" }
    >
    moveEnrollment: FunctionReference<
      "mutation",
      "public",
      { enrollmentId: Id<"enrollments">; cohortId: Id<"cohorts">; reason: string },
      null
    >
    extendDeadline: FunctionReference<
      "mutation",
      "public",
      { enrollmentId: Id<"enrollments">; deadlineAt: number; reason: string },
      null
    >
    recordProgress: FunctionReference<
      "mutation",
      "public",
      {
        enrollmentId: Id<"enrollments">
        lessonId: Id<"lessons">
        state: "not_started" | "in_progress" | "completed"
      },
      { state: string }
    >
    recordAttendance: FunctionReference<
      "mutation",
      "public",
      {
        enrollmentId: Id<"enrollments">
        lessonId: Id<"lessons">
        attendance: "present" | "absent" | "excused"
      },
      { attendance: string }
    >
    createSession: FunctionReference<
      "mutation",
      "public",
      {
        cohortId: Id<"cohorts">
        title: string
        kind: "session" | "office_hours" | "call" | "assessment"
        startsAt: number
        endsAt: number
        roomId?: string
      },
      { sessionId: Id<"cohortSessions"> }
    >
    updateSessionStatus: FunctionReference<
      "mutation",
      "public",
      {
        sessionId: Id<"cohortSessions">
        status: "scheduled" | "live" | "ended" | "cancelled"
        reason?: string
      },
      null
    >
    nextCohortCode: FunctionReference<
      "query",
      "public",
      { pathId: string },
      { code: string }
    >
  }
  assessments: {
    listMine: FunctionReference<"query", "public", Record<string, never>, SubmissionOverview[]>
    listQueue: FunctionReference<"query", "public", Record<string, never>, SubmissionOverview[]>
    listEscalations: FunctionReference<"query", "public", Record<string, never>, SubmissionOverview[]>
    getSubmission: FunctionReference<
      "query",
      "public",
      { submissionId: Id<"submissions"> },
      SubmissionDetail | null
    >
    createDraft: FunctionReference<
      "mutation",
      "public",
      {
        enrollmentId: Id<"enrollments">
        taskTitle: string
        evidenceText?: string
        dueAt?: number
      },
      { submissionId: Id<"submissions"> }
    >
    saveDraft: FunctionReference<
      "mutation",
      "public",
      { submissionId: Id<"submissions">; evidenceText?: string },
      null
    >
    addAsset: FunctionReference<
      "mutation",
      "public",
      {
        submissionId: Id<"submissions">
        storageId: string
        kind: "image" | "audio" | "video" | "file"
        filename: string
        mimeType: string
        size: number
      },
      { assetId: Id<"submissionAssets"> }
    >
    removeAsset: FunctionReference<
      "mutation",
      "public",
      { submissionId: Id<"submissions">; assetId: Id<"submissionAssets"> },
      null
    >
    submit: FunctionReference<
      "mutation",
      "public",
      { submissionId: Id<"submissions"> },
      { status: "submitted" }
    >
    grade: FunctionReference<
      "mutation",
      "public",
      {
        submissionId: Id<"submissions">
        decision: GradeDecision
        rubric: RubricInput[]
        feedback?: string
      },
      GradeResult
    >
    override: FunctionReference<
      "mutation",
      "public",
      {
        assessmentId: Id<"assessments">
        rubric: RubricInput[]
        feedback?: string
        reason: string
        secondReviewerId?: Id<"users">
      },
      { score: number }
    >
    openDispute: FunctionReference<
      "mutation",
      "public",
      { assessmentId: Id<"assessments">; reason: string },
      { disputeId: Id<"disputes"> }
    >
    updateDispute: FunctionReference<
      "mutation",
      "public",
      {
        disputeId: Id<"disputes">
        status: "reviewing" | "resolved" | "closed"
        resolution?: string
        reason?: string
      },
      null
    >
    escalateSubmission: FunctionReference<
      "mutation",
      "public",
      { submissionId: Id<"submissions">; reason: string },
      null
    >
    listDisputes: FunctionReference<"query", "public", Record<string, never>, DisputeOverview[]>
  }
  certificates: {
    listMine: FunctionReference<"query", "public", Record<string, never>, CertificateOverview[]>
    listCohort: FunctionReference<"query", "public", Record<string, never>, CertificateOverview[]>
    listRegistry: FunctionReference<"query", "public", Record<string, never>, CertificateOverview[]>
    verifyPublic: FunctionReference<
      "query",
      "public",
      { code: string },
      CertificatePublicView | null
    >
    revoke: FunctionReference<
      "mutation",
      "public",
      { certificateId: Id<"certificates">; reason: string },
      { status: "revoked" }
    >
    reissue: FunctionReference<
      "mutation",
      "public",
      { certificateId: Id<"certificates">; reason: string },
      { certificateId: Id<"certificates">; publicCode: string; serial: string }
    >
  }
  seed: {
    run: FunctionReference<"mutation", "internal", Record<string, never>, SeedResult>
    runIfEmpty: FunctionReference<
      "mutation",
      "internal",
      Record<string, never>,
      SeedResult | { seeded: false }
    >
  }
}

export const api: PublicApiType = anyApi as unknown as PublicApiType
export const internal = api

/**
 * Component references are normally generated by `convex codegen`. The
 * checked-in registry keeps the repository buildable without a deployment;
 * `npx convex codegen` replaces this with the exact generated shape.
 */
export const components = componentsGeneric() as unknown as {
  betterAuth: Parameters<typeof createClient>[0]
}
