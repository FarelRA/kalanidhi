import { anyApi, componentsGeneric, type FunctionReference } from "convex/server"

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
