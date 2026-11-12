import {
  anyApi,
  componentsGeneric,
  type FunctionReference,
  type PaginationOptions,
  type PaginationResult,
} from "convex/server"
import type { GenericId } from "convex/values"

import type { createClient } from "@convex-dev/better-auth"
import type { WorkspaceRole } from "../../lib/access/capabilities"
import type { Viewer } from "../../lib/access/viewer"
import type {
  AdminOverview,
  ContentAdminState,
  ContentLockView,
  ContentPreviewPayload,
  ContentRevisionStatus,
  LeadDetail,
  LeadIntent,
  LeadOwner,
  LeadStatus,
  LeadSummary,
  LogDetail,
  LogKind,
  LogListResult,
  LogRow,
  MediaAssetView,
  MediaUsage,
  MetricResult,
  MetricsReport,
  PersonDetail,
  PersonSummary,
} from "../../lib/admin/types"
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
import type {
  ContactView,
  ConversationDetail,
  ConversationSummary,
  MessagePage,
  MessageView,
  ModerationFlagView,
  NotificationView,
  PresenceView,
  ReceiptView,
} from "../../lib/messaging/types"
import type {
  CallAcceptResult,
  CallDeclineResult,
  CallDetail,
  CallEndResult,
  CallOverview,
  CallRecordingConsentResult,
  CallStartResult,
  CallSummary,
} from "../../lib/calls/types"
import type {
  DisputeView,
  GatewayHealthView,
  GuestOrderView,
  LedgerEntryView,
  OrderView,
  PaymentEventView,
  PaymentIntentView,
  PayoutView,
  PublicWorkView,
  ReconciliationSummary,
  RefundView,
  SellerStatement,
  SettlementResult,
  WorkListingView,
} from "../../lib/commerce/types"
import type {
  FlowAutomationView,
  FlowDefinitionView,
  FlowOverview,
  FlowSlaView,
  StuckRecordView,
} from "../../lib/flows/types"
import type {
  BreakGlassView,
  CulturalSourceView,
  GovernanceSummary,
  ImpersonationView,
  PrivacyRequestView,
  TakedownView,
} from "../../lib/governance/types"
import type {
  AdminSettingsState,
  ProfileSettingsView,
} from "../../lib/settings/types"
import type {
  SupportCannedReplyView,
  SupportLink,
  SupportQueueSummary,
  SupportTicketDetail,
  SupportTicketSummary,
} from "../../lib/support/types"
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
    getAdminState: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      ContentAdminState
    >
    getRevision: FunctionReference<
      "query",
      "public",
      { version: number },
      {
        id: string
        version: number
        status: ContentRevisionStatus
        note: string
        authorId: string
        createdAt: number
        publishedAt: number | null
        value: SiteData
      } | null
    >
    saveDraft: FunctionReference<
      "mutation",
      "public",
      { value: SiteData; note: string; baseVersion?: number },
      { version: number; revisionId: Id<"contentRevisions"> }
    >
    publish: FunctionReference<
      "mutation",
      "public",
      {
        version: number
        note: string
        scheduledFor?: number
        confirmSensitive?: boolean
      },
      { status: "scheduled" | "published"; version: number }
    >
    rollback: FunctionReference<
      "mutation",
      "public",
      { version: number; note: string },
      { version: number }
    >
    createPreview: FunctionReference<
      "mutation",
      "public",
      { version: number },
      { token: string; expiresAt: number }
    >
    getPreview: FunctionReference<
      "query",
      "public",
      { token: string },
      ContentPreviewPayload | null
    >
    acquireLock: FunctionReference<
      "mutation",
      "public",
      Record<string, never>,
      { acquired: boolean; lock: ContentLockView }
    >
    releaseLock: FunctionReference<
      "mutation",
      "public",
      Record<string, never>,
      null
    >
    getLock: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      ContentLockView | null
    >
    validateDraft: FunctionReference<
      "query",
      "public",
      { version: number },
      {
        ok: boolean
        issues: { path: string; message: string }[]
        parsed: boolean
      }
    >
    runScheduledPublish: FunctionReference<
      "mutation",
      "internal",
      Record<string, never>,
      { published: number[]; failed: number[] }
    >
  }
  media: {
    generateUploadUrl: FunctionReference<
      "mutation",
      "public",
      Record<string, never>,
      string
    >
    saveAsset: FunctionReference<
      "mutation",
      "public",
      {
        kind: "image" | "audio" | "video" | "document"
        storageId?: string
        externalUrl?: string
        filename: string
        mimeType: string
        size: number
        width?: number
        height?: number
        durationMs?: number
        alt: string
        caption?: string
        credit?: string
        permission?: string
        focalX?: number
        focalY?: number
        variants?: {
          label: string
          url: string
          width: number
          height: number
        }[]
      },
      Id<"mediaAssets">
    >
    updateAsset: FunctionReference<
      "mutation",
      "public",
      {
        id: Id<"mediaAssets">
        alt?: string
        caption?: string
        credit?: string
        permission?: string
        focalX?: number
        focalY?: number
        status?: "active" | "archived"
        reason: string
      },
      null
    >
    replaceAsset: FunctionReference<
      "mutation",
      "public",
      {
        id: Id<"mediaAssets">
        storageId?: string
        externalUrl?: string
        filename: string
        mimeType: string
        size: number
        width?: number
        height?: number
        reason: string
      },
      null
    >
    removeAsset: FunctionReference<
      "mutation",
      "public",
      { id: Id<"mediaAssets">; reason: string },
      null
    >
    listAssets: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      MediaAssetView[]
    >
    getAsset: FunctionReference<
      "query",
      "public",
      { id: Id<"mediaAssets"> },
      MediaAssetView | null
    >
    getUsage: FunctionReference<
      "query",
      "public",
      { id: Id<"mediaAssets"> },
      MediaUsage
    >
  }
  leads: {
    create: FunctionReference<"mutation", "public", LeadArgs, Id<"leads">>
    list: FunctionReference<
      "query",
      "public",
      {
        view?:
          | "all"
          | "new"
          | "follow"
          | "institutions"
          | "done"
          | "spam"
        q?: string
        status?: LeadStatus
        intent?: LeadIntent
        ownerId?: Id<"users">
      },
      LeadSummary[]
    >
    get: FunctionReference<
      "query",
      "public",
      { id: Id<"leads"> },
      LeadDetail | null
    >
    owners: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      LeadOwner[]
    >
    assign: FunctionReference<
      "mutation",
      "public",
      { leadId: Id<"leads">; ownerId: Id<"users">; reason: string },
      null
    >
    addNote: FunctionReference<
      "mutation",
      "public",
      {
        leadId: Id<"leads">
        kind: "note" | "call" | "email" | "whatsapp"
        body: string
        followUpAt?: number
      },
      Id<"leadNotes">
    >
    setStatus: FunctionReference<
      "mutation",
      "public",
      { leadId: Id<"leads">; status: LeadStatus; reason: string },
      null
    >
    convert: FunctionReference<
      "mutation",
      "public",
      { leadId: Id<"leads">; reason: string },
      { registrationPath: string; status: "converted" }
    >
    bulkAssign: FunctionReference<
      "mutation",
      "public",
      { leadIds: Id<"leads">[]; ownerId: Id<"users">; reason: string },
      { updated: number }
    >
    bulkStatus: FunctionReference<
      "mutation",
      "public",
      { leadIds: Id<"leads">[]; status: LeadStatus; reason: string },
      { updated: number }
    >
    exportLeads: FunctionReference<
      "mutation",
      "public",
      {
        view?:
          | "all"
          | "new"
          | "follow"
          | "institutions"
          | "done"
          | "spam"
        q?: string
        status?: LeadStatus
        intent?: LeadIntent
        ownerId?: Id<"users">
        reason: string
      },
      { rows: LeadSummary[]; generatedAt: number }
    >
  }
  people: {
    list: FunctionReference<
      "query",
      "public",
      {
        tab?: "users" | "teachers" | "team"
        q?: string
        role?: "student" | "teacher" | "admin"
        status?: "active" | "suspended" | "invited" | "deleted"
        region?: string
      },
      PersonSummary[]
    >
    get: FunctionReference<
      "query",
      "public",
      { userId: Id<"users"> },
      PersonDetail | null
    >
    reactivate: FunctionReference<
      "mutation",
      "public",
      { userId: Id<"users">; reason: string },
      null
    >
    revokeSessions: FunctionReference<
      "mutation",
      "public",
      { userId: Id<"users">; reason: string },
      { revoked: number }
    >
    verifyTeacher: FunctionReference<
      "mutation",
      "public",
      {
        teacherId: Id<"teachers">
        decision: "verify" | "reject" | "suspend"
        reason: string
        pathIds?: string[]
      },
      { teacherId: Id<"teachers">; decision: "verify" | "reject" | "suspend" }
    >
    setTeacherPublication: FunctionReference<
      "mutation",
      "public",
      { teacherId: Id<"teachers">; published: boolean; reason: string },
      null
    >
  }
  stats: {
    metrics: FunctionReference<
      "query",
      "public",
      { from?: number; to?: number },
      MetricsReport
    >
    overview: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      AdminOverview
    >
    exportMetrics: FunctionReference<
      "mutation",
      "public",
      { from?: number; to?: number; reason: string },
      {
        rows: MetricResult[]
        generatedAt: number
        range: { from: number; to: number }
      }
    >
  }
  audit: {
    list: FunctionReference<
      "query",
      "public",
      {
        kind?: LogKind
        actorId?: string
        entityType?: string
        entityId?: string
        action?: string
        severity?: "info" | "warning" | "error" | "critical"
        requestId?: string
        from?: number
        to?: number
        q?: string
      },
      LogListResult
    >
    get: FunctionReference<
      "query",
      "public",
      { kind: LogKind; id: string },
      LogDetail | null
    >
    exportLogs: FunctionReference<
      "mutation",
      "public",
      {
        kind: LogKind
        reason: string
        actorId?: string
        entityType?: string
        entityId?: string
        action?: string
        severity?: "info" | "warning" | "error" | "critical"
        requestId?: string
        from?: number
        to?: number
        q?: string
      },
      { kind: LogKind; rows: LogRow[]; generatedAt: number }
    >
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
  commerce: {
    getPublicWork: FunctionReference<
      "query",
      "public",
      { slug: string },
      PublicWorkView | null
    >
    listPublicWorks: FunctionReference<
      "query",
      "public",
      { limit?: number },
      PublicWorkView[]
    >
    listWorks: FunctionReference<"query", "public", Record<string, never>, WorkListingView[]>
    getWorkDetail: FunctionReference<
      "query",
      "public",
      { workId: Id<"works"> },
      WorkListingView
    >
    createWork: FunctionReference<
      "mutation",
      "public",
      {
        title: string
        pathId: string
        certificateId?: Id<"certificates">
        price: number
        unit: string
        technique: string
        techniqueNote?: string
        description: string
        image?: string
        kind: "product" | "service"
        category: "batik" | "layanan"
        permission?: string
        provenance?: string
        materials?: string
      },
      {
        workId: Id<"works">
        workCardId: Id<"workCards">
        slug: string
        serial: string
      }
    >
    updateWork: FunctionReference<
      "mutation",
      "public",
      {
        workId: Id<"works">
        title?: string
        price?: number
        unit?: string
        technique?: string
        techniqueNote?: string
        description?: string
        image?: string
        permission?: string
        provenance?: string
        materials?: string
      },
      null
    >
    submitWork: FunctionReference<
      "mutation",
      "public",
      { workId: Id<"works"> },
      null
    >
    confirmWork: FunctionReference<
      "mutation",
      "public",
      { workId: Id<"works"> },
      null
    >
    beginWorkReview: FunctionReference<
      "mutation",
      "public",
      { workId: Id<"works"> },
      null
    >
    publishWork: FunctionReference<
      "mutation",
      "public",
      { workId: Id<"works">; reason: string },
      null
    >
    pauseWork: FunctionReference<
      "mutation",
      "public",
      { workId: Id<"works">; reason?: string },
      null
    >
    resumeWork: FunctionReference<
      "mutation",
      "public",
      { workId: Id<"works">; reason: string },
      null
    >
    markWorkSoldOut: FunctionReference<
      "mutation",
      "public",
      { workId: Id<"works"> },
      null
    >
    bulkPauseWorks: FunctionReference<
      "mutation",
      "public",
      { pathId?: string; makerId?: Id<"users">; reason: string },
      { affected: number }
    >
    createGuestOrder: FunctionReference<
      "mutation",
      "public",
      {
        workSlug: string
        buyerName: string
        buyerEmail: string
        buyerWhatsapp?: string
        note?: string
        idempotencyKey?: string
        consentTransactional: boolean
        consentVersion?: string
      },
      {
        orderId: Id<"orders">
        code: string
        token: string
        baseAmount: number
      }
    >
    getOrderByToken: FunctionReference<
      "query",
      "public",
      { token: string },
      GuestOrderView | null
    >
    claimOrder: FunctionReference<
      "mutation",
      "public",
      { token: string },
      { claimed: boolean; orderId: Id<"orders"> }
    >
    getOrder: FunctionReference<"query", "public", { orderId: Id<"orders"> }, OrderView>
    listOrders: FunctionReference<"query", "public", Record<string, never>, OrderView[]>
    startOrder: FunctionReference<
      "mutation",
      "public",
      { orderId: Id<"orders"> },
      null
    >
    deliverOrder: FunctionReference<
      "mutation",
      "public",
      { orderId: Id<"orders"> },
      null
    >
    completeOrder: FunctionReference<
      "mutation",
      "public",
      { orderId: Id<"orders"> },
      null
    >
    cancelOrder: FunctionReference<
      "mutation",
      "public",
      { orderId: Id<"orders">; reason: string },
      null
    >
    correctOrderStatus: FunctionReference<
      "mutation",
      "public",
      {
        orderId: Id<"orders">
        status:
          | "in_progress"
          | "delivered"
          | "completed"
          | "cancelled"
          | "disputed"
        reason: string
      },
      null
    >
    openOrderDispute: FunctionReference<
      "mutation",
      "public",
      { orderId: Id<"orders">; reason: string },
      { disputeId: Id<"disputes"> }
    >
    reviewOrderDispute: FunctionReference<
      "mutation",
      "public",
      { disputeId: Id<"disputes"> },
      null
    >
    resolveOrderDispute: FunctionReference<
      "mutation",
      "public",
      {
        disputeId: Id<"disputes">
        resolution: string
        orderStatus: "delivered" | "completed"
      },
      null
    >
    closeOrderDispute: FunctionReference<
      "mutation",
      "public",
      { disputeId: Id<"disputes"> },
      null
    >
    listOrderDisputes: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      DisputeView[]
    >
  }
  payments: {
    createIntent: FunctionReference<
      "mutation",
      "public",
      { orderId: Id<"orders">; token?: string },
      PaymentIntentView
    >
    attachCharge: FunctionReference<
      "mutation",
      "public",
      {
        orderId: Id<"orders">
        token?: string
        chargeId: string
        baseAmount: number
        uniqueAmount: number
        qrString?: string
        qrImageUrl?: string
        expiresAt: number
        providerReference?: string
      },
      PaymentIntentView
    >
    markManualFallback: FunctionReference<
      "mutation",
      "public",
      { orderId: Id<"orders">; token?: string; reason: string },
      PaymentIntentView
    >
    getIntentForOrder: FunctionReference<
      "query",
      "public",
      { orderId: Id<"orders"> },
      PaymentIntentView | null
    >
    getIntentByToken: FunctionReference<
      "query",
      "public",
      { token: string },
      PaymentIntentView | null
    >
    listIntents: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      PaymentIntentView[]
    >
    getReconciliation: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      ReconciliationSummary
    >
    listPaymentEvents: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      PaymentEventView[]
    >
    getGatewayHealth: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      GatewayHealthView
    >
    recordHealth: FunctionReference<
      "mutation",
      "public",
      {
        internalKey: string
        status: "healthy" | "degraded" | "down" | "unknown"
        message?: string
        latencyMs?: number
      },
      null
    >
    settleFromWebhook: FunctionReference<
      "mutation",
      "public",
      {
        internalKey: string
        eventId: string
        chargeId: string
        orderCode: string
        providerTransactionId: string
        amount: number
        paidAt: number
        gatewayFee?: number
      },
      SettlementResult
    >
    manualMatch: FunctionReference<
      "mutation",
      "public",
      {
        paymentId: Id<"payments">
        providerTransactionId: string
        amount: number
        paidAt?: number
        reason: string
      },
      SettlementResult
    >
    expireIntents: FunctionReference<
      "mutation",
      "public",
      Record<string, never>,
      { expired: number }
    >
  }
  payouts: {
    listPayouts: FunctionReference<"query", "public", Record<string, never>, PayoutView[]>
    getPayout: FunctionReference<
      "query",
      "public",
      { payoutId: Id<"payouts"> },
      PayoutView
    >
    listLedger: FunctionReference<
      "query",
      "public",
      { teacherId?: Id<"users">; from?: number; to?: number },
      LedgerEntryView[]
    >
    getSellerStatement: FunctionReference<
      "query",
      "public",
      { teacherId?: Id<"users">; from?: number; to?: number },
      SellerStatement
    >
    holdPayout: FunctionReference<
      "mutation",
      "public",
      { payoutId: Id<"payouts">; reason: string },
      null
    >
    approvePayout: FunctionReference<
      "mutation",
      "public",
      { payoutId: Id<"payouts"> },
      null
    >
    releasePayout: FunctionReference<
      "mutation",
      "public",
      { payoutId: Id<"payouts"> },
      { paidAmount: number; carryApplied: number }
    >
    reversePayout: FunctionReference<
      "mutation",
      "public",
      { payoutId: Id<"payouts">; reason: string },
      { reversalId: Id<"payouts"> }
    >
    requestPayoutAccount: FunctionReference<
      "mutation",
      "public",
      {
        provider: "bank" | "gopay" | "other"
        bankCode: string
        accountName: string
        accountNumberMasked: string
        accountRef: string
      },
      { accountId: Id<"payoutAccounts"> }
    >
    verifyPayoutAccount: FunctionReference<
      "mutation",
      "public",
      { accountId: Id<"payoutAccounts">; reason: string },
      null
    >
    requestRefund: FunctionReference<
      "mutation",
      "public",
      {
        orderId: Id<"orders">
        amount?: number
        reason: string
        evidence?: string
      },
      { refundId: Id<"refunds"> }
    >
    reviewRefund: FunctionReference<
      "mutation",
      "public",
      {
        refundId: Id<"refunds">
        decision: "reviewing" | "approved" | "rejected"
        reason: string
      },
      null
    >
    payRefund: FunctionReference<
      "mutation",
      "public",
      { refundId: Id<"refunds">; reason: string },
      { paid: number; negativeCarry: number }
    >
    listRefunds: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      RefundView[]
    >
    listDuePayouts: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      PayoutView[]
    >
  }
  flows: {
    listDefinitions: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      FlowDefinitionView[]
    >
    getDefinition: FunctionReference<
      "query",
      "public",
      { flowKey: string },
      FlowDefinitionView
    >
    slas: FunctionReference<
      "query",
      "public",
      { flowKey?: string },
      FlowSlaView[]
    >
    automationRules: FunctionReference<
      "query",
      "public",
      { flowKey?: string },
      FlowAutomationView[]
    >
    overview: FunctionReference<
      "query",
      "public",
      { flowKey: string },
      FlowOverview
    >
    stuckRecords: FunctionReference<
      "query",
      "public",
      { flowKey?: string },
      StuckRecordView[]
    >
    saveDefinition: FunctionReference<
      "mutation",
      "public",
      {
        flowKey: string
        description?: string
        active?: boolean
        transitions: {
          from: string
          to: string
          guard: string
          requiresRole?: "admin" | "teacher" | "student" | "system"
          slaHours?: number
        }[]
      },
      { flowKey: string; version: number }
    >
    saveSlaPolicy: FunctionReference<
      "mutation",
      "public",
      {
        flowKey: string
        key?: string
        name: string
        targetMinutes: number
        escalationMinutes?: number
        owner?: string
        active?: boolean
      },
      { key: string; flowKey: string }
    >
    saveAutomationRule: FunctionReference<
      "mutation",
      "public",
      {
        flowKey: string
        key: string
        kind: "assignment" | "reminder" | "escalation" | "notification"
        trigger:
          | "on_create"
          | "on_transition"
          | "sla_warning"
          | "sla_breach"
          | "no_activity"
        action:
          | "assign_owner"
          | "remind_owner"
          | "notify_owner"
          | "notify_admin"
          | "escalate_admin"
          | "create_support_ticket"
          | "pause_work"
        enabled: boolean
      },
      { key: string; flowKey: string }
    >
    manualOverride: FunctionReference<
      "mutation",
      "public",
      {
        flowKey: string
        recordId: string
        toState: string
        reason: string
        requestId?: string
      },
      {
        flowKey: string
        from: string
        to: string
        label: string
      }
    >
  }
  support: {
    list: FunctionReference<
      "query",
      "public",
      {
        view?: "inbox" | "mine" | "all"
        status?: "open" | "pending" | "resolved" | "closed"
        priority?: "low" | "normal" | "high" | "urgent"
        q?: string
      },
      SupportTicketSummary[]
    >
    get: FunctionReference<
      "query",
      "public",
      { ticketId: Id<"supportTickets"> },
      SupportTicketDetail | null
    >
    queueSummary: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      SupportQueueSummary
    >
    create: FunctionReference<
      "mutation",
      "public",
      {
        subject: string
        body?: string
        priority?: "low" | "normal" | "high" | "urgent"
        channel?: "chat" | "email" | "whatsapp"
        links?: SupportLink[]
        sourceConversationId?: Id<"conversations">
      },
      { ticketId: Id<"supportTickets">; code: string }
    >
    createFromConversation: FunctionReference<
      "mutation",
      "public",
      {
        conversationId: Id<"conversations">
        subject?: string
      },
      { ticketId: Id<"supportTickets">; code: string }
    >
    reply: FunctionReference<
      "mutation",
      "public",
      {
        ticketId: Id<"supportTickets">
        body: string
        internal?: boolean
      },
      {
        internal: boolean
        status: "open" | "pending" | "resolved" | "closed"
      }
    >
    assign: FunctionReference<
      "mutation",
      "public",
      {
        ticketId: Id<"supportTickets">
        assigneeId: Id<"users">
        reason: string
      },
      null
    >
    setPriority: FunctionReference<
      "mutation",
      "public",
      {
        ticketId: Id<"supportTickets">
        priority: "low" | "normal" | "high" | "urgent"
        reason: string
      },
      null
    >
    escalate: FunctionReference<
      "mutation",
      "public",
      {
        ticketId: Id<"supportTickets">
        to: "payment" | "content" | "trust_safety" | "technical"
        reason: string
      },
      null
    >
    link: FunctionReference<
      "mutation",
      "public",
      {
        ticketId: Id<"supportTickets">
        link: SupportLink
      },
      null
    >
    resolve: FunctionReference<
      "mutation",
      "public",
      {
        ticketId: Id<"supportTickets">
        resolution: string
        reason?: string
      },
      null
    >
    close: FunctionReference<
      "mutation",
      "public",
      { ticketId: Id<"supportTickets">; reason: string },
      null
    >
    reopen: FunctionReference<
      "mutation",
      "public",
      { ticketId: Id<"supportTickets">; reason: string },
      null
    >
    listCannedReplies: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      SupportCannedReplyView[]
    >
    saveCannedReply: FunctionReference<
      "mutation",
      "public",
      {
        key: string
        title: string
        body: string
        category:
          | "payment"
          | "content"
          | "trust_safety"
          | "technical"
          | "general"
        active?: boolean
      },
      { key: string }
    >
  }
  governance: {
    listCulturalSources: FunctionReference<
      "query",
      "public",
      {
        status?: "active" | "suspended" | "archived"
        withdrawal?: "active" | "withdrawal_requested" | "withdrawn"
        q?: string
      },
      CulturalSourceView[]
    >
    getCulturalSource: FunctionReference<
      "query",
      "public",
      { sourceId: Id<"culturalSources"> },
      CulturalSourceView | null
    >
    createCulturalSource: FunctionReference<
      "mutation",
      "public",
      {
        community: string
        sourceName: string
        pathId?: string
        workId?: Id<"works">
        permissionDocumentRef: string
        permissionDocumentUrl?: string
        permissionDate: number
        accessLevel: "public" | "community" | "restricted"
        attribution: string
        notes?: string
      },
      { sourceId: Id<"culturalSources"> }
    >
    updateCulturalSource: FunctionReference<
      "mutation",
      "public",
      {
        sourceId: Id<"culturalSources">
        community?: string
        sourceName?: string
        pathId?: string
        permissionDocumentRef?: string
        permissionDocumentUrl?: string
        permissionDate?: number
        accessLevel?: "public" | "community" | "restricted"
        attribution?: string
        notes?: string
        status?: "active" | "suspended" | "archived"
        reason: string
      },
      null
    >
    requestWithdrawal: FunctionReference<
      "mutation",
      "public",
      { sourceId: Id<"culturalSources">; reason: string },
      { withdrawalStatus: "withdrawal_requested" | "withdrawn" }
    >
    withdrawCulturalSource: FunctionReference<
      "mutation",
      "public",
      { sourceId: Id<"culturalSources">; reason: string },
      { effects: string[] }
    >
    restoreCulturalSource: FunctionReference<
      "mutation",
      "public",
      { sourceId: Id<"culturalSources">; reason: string },
      null
    >
    listTakedowns: FunctionReference<
      "query",
      "public",
      {
        status?:
          | "requested"
          | "reviewing"
          | "approved"
          | "rejected"
          | "completed"
          | "reversed"
        q?: string
      },
      TakedownView[]
    >
    createTakedown: FunctionReference<
      "mutation",
      "public",
      {
        targetType: "work" | "content" | "media" | "conversation" | "certificate"
        targetId: string
        targetLabel: string
        culturalSourceId?: Id<"culturalSources">
        requesterName: string
        requesterContact: string
        reason: string
        evidence?: string
      },
      { takedownId: Id<"takedownRequests"> }
    >
    reviewTakedown: FunctionReference<
      "mutation",
      "public",
      {
        takedownId: Id<"takedownRequests">
        decision: "reviewing" | "approved" | "rejected"
        reason: string
      },
      null
    >
    executeTakedown: FunctionReference<
      "mutation",
      "public",
      { takedownId: Id<"takedownRequests">; reason: string },
      { effects: string[] }
    >
    reverseTakedown: FunctionReference<
      "mutation",
      "public",
      { takedownId: Id<"takedownRequests">; reason: string },
      null
    >
    listPrivacyRequests: FunctionReference<
      "query",
      "public",
      {
        status?: "open" | "reviewing" | "completed" | "rejected"
        kind?: "access" | "correction" | "deletion" | "hold"
      },
      PrivacyRequestView[]
    >
    createPrivacyRequest: FunctionReference<
      "mutation",
      "public",
      {
        kind: "access" | "correction" | "deletion" | "hold"
        reason: string
        subjectUserId?: Id<"users">
        dataScope?: string
        correction?: {
          name?: string
          email?: string
          region?: string
        }
      },
      { requestId: Id<"privacyRequests"> }
    >
    reviewPrivacyRequest: FunctionReference<
      "mutation",
      "public",
      {
        requestId: Id<"privacyRequests">
        decision: "reviewing" | "completed" | "rejected"
        resolution: string
        retentionHoldUntil?: number
      },
      null
    >
    listImpersonations: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      ImpersonationView[]
    >
    getImpersonation: FunctionReference<
      "query",
      "public",
      { sessionId: Id<"impersonationSessions"> },
      ImpersonationView | null
    >
    startImpersonation: FunctionReference<
      "mutation",
      "public",
      { targetId: Id<"users">; reason: string; minutes?: number },
      { sessionId: Id<"impersonationSessions">; expiresAt: number; readOnly: true }
    >
    endImpersonation: FunctionReference<
      "mutation",
      "public",
      { sessionId: Id<"impersonationSessions">; reason?: string },
      null
    >
    grantBreakGlass: FunctionReference<
      "mutation",
      "public",
      {
        entityType:
          | "call_recording"
          | "identity_document"
          | "submission_asset"
          | "message_asset"
        entityId: string
        reason: string
        minutes?: number
      },
      { grantId: Id<"breakGlassGrants">; expiresAt: number }
    >
    revokeBreakGlass: FunctionReference<
      "mutation",
      "public",
      { grantId: Id<"breakGlassGrants">; reason: string },
      null
    >
    listBreakGlass: FunctionReference<
      "query",
      "public",
      { activeOnly?: boolean },
      BreakGlassView[]
    >
    logBreakGlassAccess: FunctionReference<
      "mutation",
      "public",
      {
        entityType:
          | "call_recording"
          | "identity_document"
          | "submission_asset"
          | "message_asset"
        entityId: string
      },
      | { allowed: true; grantId: Id<"breakGlassGrants">; expiresAt: number }
      | { allowed: false; grantId: null; expiresAt: null }
    >
    summary: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      GovernanceSummary
    >
  }
  settings: {
    profile: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      ProfileSettingsView
    >
    updateProfile: FunctionReference<
      "mutation",
      "public",
      { name?: string; region?: string },
      null
    >
    updatePreferences: FunctionReference<
      "mutation",
      "public",
      {
        whatsapp?: string
        bio?: string
        locale?: string
        timezone?: string
        dataSaver?: boolean
        notifications?: {
          tasks: boolean
          messages: boolean
          sessionReminders: boolean
          weeklyDigest: boolean
          promotions: boolean
        }
      },
      null
    >
    setConsent: FunctionReference<
      "mutation",
      "public",
      {
        kind: "privacy" | "recording" | "marketing" | "guardian"
        granted: boolean
        version?: string
        source?: string
      },
      { consentId: Id<"consents"> }
    >
    revokeSession: FunctionReference<
      "mutation",
      "public",
      { sessionId: Id<"sessions">; reason?: string },
      null
    >
    adminState: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      AdminSettingsState
    >
    updateSetting: FunctionReference<
      "mutation",
      "public",
      { key: string; value: unknown; reason: string },
      null
    >
    setFeatureFlag: FunctionReference<
      "mutation",
      "public",
      {
        key: string
        description?: string
        enabled: boolean
        rolloutPercent?: number
        reason: string
      },
      null
    >
    createApiKey: FunctionReference<
      "mutation",
      "public",
      {
        name: string
        scopes: string[]
        expiresAt?: number
        reason?: string
      },
      { keyId: Id<"apiKeys">; token: string; keyPrefix: string }
    >
    rotateApiKey: FunctionReference<
      "mutation",
      "public",
      { keyId: Id<"apiKeys">; reason: string },
      { keyId: Id<"apiKeys">; token: string; keyPrefix: string }
    >
    revokeApiKey: FunctionReference<
      "mutation",
      "public",
      { keyId: Id<"apiKeys">; reason: string },
      null
    >
    createWebhookEndpoint: FunctionReference<
      "mutation",
      "public",
      { name: string; url: string; events: string[] },
      { endpointId: Id<"webhookEndpoints">; secret: string }
    >
    setWebhookStatus: FunctionReference<
      "mutation",
      "public",
      {
        endpointId: Id<"webhookEndpoints">
        status: "active" | "paused" | "revoked"
        reason: string
      },
      null
    >
    saveNotificationTemplate: FunctionReference<
      "mutation",
      "public",
      {
        key: string
        channel: "email" | "whatsapp" | "push" | "in_app"
        subject?: string
        body: string
        locale?: string
      },
      { key: string }
    >
  }
  notifications: {
    list: FunctionReference<
      "query",
      "public",
      { limit?: number },
      NotificationView[]
    >
    unreadCount: FunctionReference<"query", "public", Record<string, never>, number>
    markRead: FunctionReference<
      "mutation",
      "public",
      { notificationId: Id<"notificationOutbox"> },
      null
    >
    markAllRead: FunctionReference<"mutation", "public", Record<string, never>, number>
  }
  messaging: {
    listConversations: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      ConversationSummary[]
    >
    listContacts: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      ContactView[]
    >
    getConversation: FunctionReference<
      "query",
      "public",
      { conversationId: Id<"conversations"> },
      ConversationDetail
    >
    startDirect: FunctionReference<
      "mutation",
      "public",
      { peerUserId: Id<"users"> },
      Id<"conversations">
    >
    startCohort: FunctionReference<
      "mutation",
      "public",
      { cohortId: Id<"cohorts"> },
      Id<"conversations">
    >
    startSupport: FunctionReference<
      "mutation",
      "public",
      { subject?: string },
      Id<"conversations">
    >
    joinSupport: FunctionReference<
      "mutation",
      "public",
      { conversationId: Id<"conversations">; reason?: string },
      { joined: boolean; reason?: string }
    >
    muteConversation: FunctionReference<
      "mutation",
      "public",
      {
        conversationId: Id<"conversations">
        hours?: number
        mutedUntil?: number
      },
      null
    >
    unmuteConversation: FunctionReference<
      "mutation",
      "public",
      { conversationId: Id<"conversations"> },
      null
    >
    markRead: FunctionReference<
      "mutation",
      "public",
      { conversationId: Id<"conversations"> },
      { lastReadAt: number }
    >
    setTyping: FunctionReference<
      "mutation",
      "public",
      { conversationId: Id<"conversations">; typing: boolean },
      null
    >
    setPresence: FunctionReference<
      "mutation",
      "public",
      { conversationId: Id<"conversations"> },
      null
    >
    ensureSystemConversation: FunctionReference<
      "mutation",
      "internal",
      { userId: Id<"users">; title: string; body: string },
      Id<"conversations">
    >
    listMessages: FunctionReference<
      "query",
      "public",
      {
        conversationId: Id<"conversations">
        before?: number
        limit?: number
      },
      MessagePage
    >
    listMessagePage: FunctionReference<
      "query",
      "public",
      {
        conversationId: Id<"conversations">
        paginationOpts: PaginationOptions
      },
      PaginationResult<MessageView>
    >
    searchMessages: FunctionReference<
      "query",
      "public",
      { conversationId: Id<"conversations">; term: string },
      MessageView[]
    >
    listReceipts: FunctionReference<
      "query",
      "public",
      { conversationId: Id<"conversations"> },
      ReceiptView[]
    >
    listPresence: FunctionReference<
      "query",
      "public",
      { conversationId: Id<"conversations"> },
      PresenceView[]
    >
    createUploadUrl: FunctionReference<
      "mutation",
      "public",
      { conversationId: Id<"conversations"> },
      {
        uploadUrl: string
        uploadId: Id<"messageUploadIntents">
        expiresAt: number
      }
    >
    sendMessage: FunctionReference<
      "mutation",
      "public",
      {
        conversationId: Id<"conversations">
        kind: "text" | "voice" | "image" | "file"
        body?: string
        replyToId?: Id<"messages">
        attachment?: {
          storageId: GenericId<"_storage">
          uploadId: Id<"messageUploadIntents">
          filename: string
          mimeType: string
          size: number
          durationMs?: number
          waveform?: number[]
          width?: number
          height?: number
          transcript?: string
        }
      },
      Id<"messages">
    >
    editMessage: FunctionReference<
      "mutation",
      "public",
      { messageId: Id<"messages">; body: string },
      null
    >
    removeMessage: FunctionReference<
      "mutation",
      "public",
      { messageId: Id<"messages">; reason?: string },
      null
    >
    reportMessage: FunctionReference<
      "mutation",
      "public",
      { messageId: Id<"messages">; reason: string },
      Id<"messageFlags">
    >
    blockUser: FunctionReference<
      "mutation",
      "public",
      { userId: Id<"users">; reason?: string },
      Id<"blocks">
    >
    unblockUser: FunctionReference<
      "mutation",
      "public",
      { userId: Id<"users"> },
      null
    >
    listFlags: FunctionReference<
      "query",
      "public",
      {
        status?: "open" | "reviewing" | "resolved" | "dismissed"
      },
      ModerationFlagView[]
    >
    grantBreakGlass: FunctionReference<
      "mutation",
      "public",
      {
        conversationId: Id<"conversations">
        reason: string
        minutes?: number
      },
      | { granted: true; grantId: Id<"messageAccessGrants">; expiresAt: number }
      | { granted: false; reason: string }
    >
    readContent: FunctionReference<
      "mutation",
      "public",
      {
        conversationId: Id<"conversations">
        before?: number
        limit?: number
      },
      MessagePage & { access: "granted" | "denied"; reason?: string }
    >
    resolveFlag: FunctionReference<
      "mutation",
      "public",
      {
        flagId: Id<"messageFlags">
        decision: "resolved" | "dismissed"
        resolution: string
        removeMessage?: boolean
      },
      null
    >
    moderateMessage: FunctionReference<
      "mutation",
      "public",
      {
        conversationId: Id<"conversations">
        action:
          | "warn"
          | "mute"
          | "suspend_messaging"
          | "close_conversation"
          | "remove_message"
        targetUserId?: Id<"users">
        messageId?: Id<"messages">
        reason: string
      },
      null
    >
  }
  calls: {
    startCall: FunctionReference<
      "mutation",
      "public",
      {
        conversationId?: Id<"conversations">
        cohortSessionId?: Id<"cohortSessions">
        kind: "audio" | "video"
      },
      CallStartResult
    >
    scheduleCall: FunctionReference<
      "mutation",
      "public",
      {
        conversationId?: Id<"conversations">
        cohortSessionId?: Id<"cohortSessions">
        kind: "audio" | "video"
        startsAt?: number
        endsAt?: number
      },
      CallStartResult
    >
    cancelCall: FunctionReference<
      "mutation",
      "public",
      { callId: Id<"callSessions">; reason?: string },
      { status: "cancelled" }
    >
    ring: FunctionReference<
      "mutation",
      "public",
      { callId: Id<"callSessions"> },
      { status: "ringing" }
    >
    accept: FunctionReference<
      "mutation",
      "public",
      { callId: Id<"callSessions"> },
      CallAcceptResult
    >
    decline: FunctionReference<
      "mutation",
      "public",
      { callId: Id<"callSessions">; reason?: string },
      CallDeclineResult
    >
    end: FunctionReference<
      "mutation",
      "public",
      { callId: Id<"callSessions">; reason?: string },
      CallEndResult
    >
    markMissed: FunctionReference<
      "mutation",
      "public",
      { callId: Id<"callSessions">; reason?: string },
      { status: "missed" }
    >
    recordParticipant: FunctionReference<
      "mutation",
      "public",
      {
        callId: Id<"callSessions">
        event: "join" | "leave" | "quality"
        quality?: string
      },
      null
    >
    setRecordingConsent: FunctionReference<
      "mutation",
      "public",
      { callId: Id<"callSessions">; consent: boolean },
      CallRecordingConsentResult
    >
    reportCall: FunctionReference<
      "mutation",
      "public",
      { callId: Id<"callSessions">; reason: string },
      null
    >
    getCall: FunctionReference<
      "query",
      "public",
      { callId: Id<"callSessions"> },
      CallDetail
    >
    listUpcoming: FunctionReference<
      "query",
      "public",
      { limit?: number },
      CallSummary[]
    >
    listHistory: FunctionReference<
      "query",
      "public",
      { limit?: number },
      CallSummary[]
    >
    callOverview: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      CallOverview
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
