/** Serialisable governance view types shared by Convex and the governance board. */

export type AccessLevel = "public" | "community" | "restricted"

export type CulturalSourceView = {
  id: string
  community: string
  sourceName: string
  pathId: string | null
  workId: string | null
  permissionDocumentRef: string
  permissionDocumentUrl: string | null
  permissionDate: number
  permissionStatus: "pending" | "granted" | "withdrawn"
  accessLevel: AccessLevel
  attribution: string
  notes: string | null
  withdrawalStatus: "active" | "withdrawal_requested" | "withdrawn"
  withdrawalReason: string | null
  withdrawalRequestedAt: number | null
  withdrawnAt: number | null
  status: "active" | "suspended" | "archived"
  createdBy: string | null
  createdByName: string | null
  createdAt: number
  updatedAt: number
}

export type TakedownStatus =
  | "requested"
  | "reviewing"
  | "approved"
  | "rejected"
  | "completed"
  | "reversed"

export type TakedownView = {
  id: string
  code: string
  targetType: "work" | "content" | "media" | "conversation" | "certificate"
  targetId: string
  targetLabel: string
  culturalSourceId: string | null
  requesterName: string
  requesterContact: string
  reason: string
  evidence: string | null
  status: TakedownStatus
  decisionReason: string | null
  decidedBy: string | null
  decidedAt: number | null
  completedAt: number | null
  reversedAt: number | null
  effects: string[]
  createdAt: number
  updatedAt: number
}

export type PrivacyRequestView = {
  id: string
  requesterId: string | null
  requesterEmail: string
  subjectUserId: string | null
  subjectName: string | null
  kind: "access" | "correction" | "deletion" | "hold"
  status: "open" | "reviewing" | "completed" | "rejected"
  reason: string | null
  resolution: string | null
  dataScope: string | null
  evidence: string | null
  retentionHoldUntil: number | null
  deletionAppliedAt: number | null
  handledBy: string | null
  reviewedAt: number | null
  completedBy: string | null
  completedByName: string | null
  createdAt: number
  updatedAt: number
  completedAt: number | null
}

export type ImpersonationView = {
  id: string
  actorId: string
  actorName: string | null
  targetId: string
  targetName: string | null
  reason: string
  readOnly: boolean
  startedAt: number
  expiresAt: number
  endedAt: number | null
  active: boolean
}

export type BreakGlassView = {
  id: string
  source: "message" | "record"
  actorId: string
  actorName: string | null
  entityType: string
  entityId: string
  reason: string
  createdAt: number
  expiresAt: number
  revokedAt: number | null
  revokedBy: string | null
  revokedByName: string | null
  active: boolean
}

export type GovernanceSummary = {
  sources: number
  withdrawalPending: number
  takedownsOpen: number
  privacyOpen: number
  activeImpersonations: number
  activeBreakGlass: number
}
