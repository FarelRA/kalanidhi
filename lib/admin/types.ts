/**
 * Serialisable read models for the Phase 1 admin surfaces.
 *
 * These types cross the Convex/React boundary. They deliberately contain no
 * raw database documents, no auth identifiers, and no provider secrets.
 */

import type { WorkspaceRole } from "../access/capabilities"
import type { ContentDocument } from "../content/types"
import type { LeadIntent, LeadStatus } from "../leads/options"
import type { LogKind } from "./log"
import type { LogSeverity } from "./log"

export type ContentRevisionStatus =
  | "draft"
  | "in_review"
  | "scheduled"
  | "published"
  | "archived"

export type ContentRevisionSummary = {
  id: string
  version: number
  status: ContentRevisionStatus
  authorId: string
  authorName: string
  note: string
  basedOnVersion: number | null
  createdAt: number
  publishedAt: number | null
  scheduledFor: number | null
}

export type ContentLockView = {
  holderId: string
  holderName: string
  acquiredAt: number
  expiresAt: number
  mine: boolean
}

export type ContentAdminState = {
  publishedAt: number | null
  publishedVersion: number | null
  draft: ContentRevisionSummary | null
  draftValue: ContentDocument | null
  revisions: ContentRevisionSummary[]
  lock: ContentLockView | null
}

export type ContentPreviewPayload = {
  key: string
  version: number
  value: ContentDocument
  expiresAt: number
}

export type MediaAssetView = {
  id: string
  kind: "image" | "audio" | "video" | "document"
  filename: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
  durationMs: number | null
  alt: string
  caption: string | null
  credit: string | null
  permission: string | null
  focalX: number | null
  focalY: number | null
  status: "active" | "archived"
  url: string | null
  uploadedBy: string
  replacedBy: string | null
  createdAt: number
  variants: {
    label: string
    url: string
    width: number
    height: number
  }[]
}

export type MediaUsage = {
  inUse: boolean
  references: { label: string; source: "published" | "draft" | "entity" }[]
}

export type { LeadIntent, LeadStatus } from "../leads/options"

export type LeadOwner = {
  id: string
  name: string
  email: string
}

export type LeadSummary = {
  id: string
  intent: LeadIntent
  name: string | null
  email: string | null
  whatsapp: string | null
  institution: string | null
  institutionType: string | null
  participants: number | null
  interest: string | null
  message: string | null
  source: string | null
  status: LeadStatus
  consent: boolean
  owner: LeadOwner | null
  notesCount: number
  followUpAt: number | null
  convertedAt: number | null
  createdAt: number
  ageDays: number
}

export type LeadNoteView = {
  id: string
  authorId: string
  authorName: string
  kind: "note" | "call" | "email" | "whatsapp"
  body: string
  followUpAt: number | null
  createdAt: number
}

export type LeadAssignmentView = {
  id: string
  ownerId: string
  ownerName: string
  assignedBy: string
  createdAt: number
}

export type LeadDetail = {
  lead: LeadSummary
  notes: LeadNoteView[]
  assignments: LeadAssignmentView[]
}

export type PersonSummary = {
  id: string
  name: string
  email: string
  initials: string
  region: string
  roles: WorkspaceRole[]
  roleLabel: string
  status: "active" | "suspended" | "invited" | "deleted"
  teacherStatus: "review" | "active" | "suspended" | null
  teacherPublished: boolean
  teacherVerified: boolean
  specialty: string | null
  sellerStatus: "pending" | "active" | "suspended" | null
  createdAt: number
  lastActiveAt: number | null
  certificates: number
  sessions: number
}

export type PersonTeacherProfile = {
  id: string
  slug: string
  name: string
  specialty: string
  region: string
  experience: string
  community: string
  focus: string
  quote: string
  pathIds: string[]
  status: "review" | "active" | "suspended"
  published: boolean
  verified: boolean
  verificationStatus: string | null
  verifiedAt: number | null
}

export type PersonSellerProfile = {
  id: string
  displayName: string
  status: "pending" | "active" | "suspended"
  onboardingChecklist: {
    payoutAccount: boolean
    consent: boolean
    firstWorkCard: boolean
    taxDetails: boolean
  }
}

export type PersonSessionView = {
  id: string
  deviceName: string
  createdAt: number
  lastSeenAt: number
  expiresAt: number
  revokedAt: number | null
  revokedReason: string | null
}

export type PersonAuthLogView = {
  id: string
  kind:
    | "sign_in"
    | "sign_out"
    | "failed_sign_in"
    | "session_revoked"
    | "mfa"
    | "impersonation"
    | "invite_accepted"
  requestId: string | null
  createdAt: number
}

export type PersonRoleAssignmentView = {
  id: string
  role: WorkspaceRole
  action: "grant" | "revoke"
  actorId: string
  reason: string
  createdAt: number
}

export type PersonRecordView = {
  id: string
  title: string
  status: string
}

export type PersonDetail = {
  user: {
    id: string
    name: string
    email: string
    initials: string
    region: string
    status: "active" | "suspended" | "invited" | "deleted"
    roles: WorkspaceRole[]
    roleLabel: string
    capabilities: string[]
    entitlements: {
      learn: boolean
      teach: boolean
      assess: boolean
      sell: boolean
      sellActive: boolean
      buy: boolean
      operate: boolean
    }
    createdAt: number
    lastActiveAt: number | null
    suspendedReason: string | null
    suspendedAt: number | null
  }
  teacher: PersonTeacherProfile | null
  seller: PersonSellerProfile | null
  enrollments: PersonRecordView[]
  certificates: PersonRecordView[]
  works: PersonRecordView[]
  orders: PersonRecordView[]
  sessions: PersonSessionView[]
  authLogs: PersonAuthLogView[]
  roleAssignments: PersonRoleAssignmentView[]
}

export type { LogKind } from "./log"

export type LogRow = {
  id: string
  kind: LogKind
  label: string
  actor: string | null
  action: string
  entity: string
  entityId: string | null
  severity: LogSeverity
  requestId: string | null
  detail: string
  createdAt: number
}

export type LogCorrelation = {
  requestId: string | null
  entityType: string | null
  entityId: string | null
  events: LogRow[]
}

export type LogDetail = LogRow & {
  correlation: LogCorrelation
  available: boolean
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

export type LogListResult = {
  kind: LogKind
  available: boolean
  note: string | null
  rows: LogRow[]
}

export type MetricUnit =
  | "ratio"
  | "hours"
  | "rupiah"
  | "count"
  | "days"
  | "minutes"

export type MetricResult = {
  key: string
  label: string
  definition: string
  formula: string
  owner: string
  unit: MetricUnit
  value: number | null
  previous: number | null
  numerator: number | null
  denominator: number | null
  emptyReason: string | null
}

export type FunnelStep = {
  key: string
  label: string
  value: number | null
  definition: string
}

export type MetricsReport = {
  generatedAt: number
  range: { from: number; to: number }
  definitions: MetricResult[]
  funnel: FunnelStep[]
}

export type MetricHistoryPoint = {
  date: string
  value: number
}

export type MetricHistorySeries = {
  key: string
  label: string
  definition: string
  formula: string
  owner: string
  version: number
  points: MetricHistoryPoint[]
}

export type MetricHistoryReport = {
  generatedAt: number
  range: { from: number; to: number }
  definitions: MetricHistorySeries[]
}

export type OverviewQueueItem = {
  key: string
  label: string
  count: number
  href: string
  note: string
  tone: "open" | "progress" | "done" | "wait" | "danger" | "muted"
}

export type AdminOverview = {
  generatedAt: number
  queues: OverviewQueueItem[]
  activity: LogRow[]
  content: {
    publishedAt: number | null
    draftVersion: number | null
    freshnessDays: number | null
  }
  integrations: {
    integration: string
    status: "healthy" | "degraded" | "down" | "unknown"
    message: string | null
    checkedAt: number
  }[]
  modules: {
    key: "learning" | "commerce" | "messaging" | "calls"
    label: string
    available: boolean
    note: string
  }[]
}
