import { defineTable } from "convex/server"
import { v } from "convex/values"

import { jsonBagValidator, severityValidator } from "./common"

export const operationsTables = {
  leads: defineTable({
    intent: v.union(
      v.literal("student"),
      v.literal("institution"),
      v.literal("consultation"),
      v.literal("notify"),
    ),
    name: v.optional(v.string()),
    email: v.string(),
    whatsapp: v.optional(v.string()),
    institution: v.optional(v.string()),
    institutionType: v.optional(v.string()),
    participants: v.optional(v.number()),
    interest: v.optional(v.string()),
    message: v.optional(v.string()),
    source: v.optional(v.string()),
    consent: v.boolean(),
    status: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("qualified"),
      v.literal("converted"),
      v.literal("lost"),
      v.literal("closed"),
      v.literal("spam"),
    ),
    createdAt: v.number(),
    /** Phase 1 CRM projection fields; optional for existing rows. */
    updatedAt: v.optional(v.number()),
    convertedAt: v.optional(v.number()),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_email", ["email"])
    .index("by_intent", ["intent"])
    .index("by_status", ["status"]),

  leadNotes: defineTable({
    leadId: v.id("leads"),
    authorId: v.string(),
    kind: v.union(
      v.literal("note"),
      v.literal("call"),
      v.literal("email"),
      v.literal("whatsapp"),
    ),
    body: v.string(),
    followUpAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_leadId", ["leadId"]),

  leadAssignments: defineTable({
    leadId: v.id("leads"),
    ownerId: v.id("users"),
    assignedBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_leadId", ["leadId"])
    .index("by_ownerId", ["ownerId"]),

  supportTickets: defineTable({
    code: v.string(),
    requesterId: v.optional(v.id("users")),
    requesterEmail: v.optional(v.string()),
    subject: v.string(),
    priority: v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
      v.literal("urgent"),
    ),
    status: v.union(
      v.literal("open"),
      v.literal("pending"),
      v.literal("resolved"),
      v.literal("closed"),
    ),
    assigneeId: v.optional(v.id("users")),
    channel: v.union(
      v.literal("chat"),
      v.literal("email"),
      v.literal("whatsapp"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    resolvedAt: v.optional(v.number()),
    // Phase 6 additive fields: SLA, assignment, escalation, and audited links.
    requesterName: v.optional(v.string()),
    firstResponseAt: v.optional(v.number()),
    lastResponseAt: v.optional(v.number()),
    assignedAt: v.optional(v.number()),
    assignedBy: v.optional(v.string()),
    escalatedTo: v.optional(
      v.union(
        v.literal("payment"),
        v.literal("content"),
        v.literal("trust_safety"),
        v.literal("technical"),
      ),
    ),
    escalationReason: v.optional(v.string()),
    linkedRecords: v.optional(
      v.array(
        v.object({
          type: v.union(
            v.literal("account"),
            v.literal("order"),
            v.literal("payment"),
            v.literal("enrollment"),
            v.literal("certificate"),
            v.literal("work"),
            v.literal("conversation"),
          ),
          id: v.string(),
          label: v.optional(v.string()),
        }),
      ),
    ),
    resolvedBy: v.optional(v.string()),
    resolutionNote: v.optional(v.string()),
    closedAt: v.optional(v.number()),
    reopenedAt: v.optional(v.number()),
    sourceConversationId: v.optional(v.id("conversations")),
  })
    .index("by_code", ["code"])
    .index("by_status", ["status"])
    .index("by_assigneeId", ["assigneeId"])
    .index("by_requesterId", ["requesterId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_priority", ["priority"]),

  supportMessages: defineTable({
    ticketId: v.id("supportTickets"),
    authorId: v.optional(v.id("users")),
    kind: v.union(
      v.literal("user"),
      v.literal("internal"),
      v.literal("system"),
    ),
    body: v.string(),
    createdAt: v.number(),
  }).index("by_ticketId", ["ticketId"]),

  supportCannedReplies: defineTable({
    key: v.string(),
    title: v.string(),
    body: v.string(),
    category: v.union(
      v.literal("payment"),
      v.literal("content"),
      v.literal("trust_safety"),
      v.literal("technical"),
      v.literal("general"),
    ),
    active: v.boolean(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_active", ["active"]),

  /** Append-only. No admin can delete an audit event. */
  auditLogs: defineTable({
    actorId: v.optional(v.string()),
    actorRole: v.optional(v.string()),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    reason: v.optional(v.string()),
    /** JSON bag: before/after snapshots for audited writes. */
    before: v.optional(jsonBagValidator),
    after: v.optional(jsonBagValidator),
    requestId: v.optional(v.string()),
    severity: severityValidator,
    createdAt: v.number(),
  })
    .index("by_actorId", ["actorId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_action", ["action"])
    .index("by_createdAt", ["createdAt"]),

  authLogs: defineTable({
    userId: v.optional(v.id("users")),
    authUserId: v.optional(v.string()),
    kind: v.union(
      v.literal("sign_in"),
      v.literal("sign_out"),
      v.literal("failed_sign_in"),
      v.literal("session_revoked"),
      v.literal("mfa"),
      v.literal("impersonation"),
      v.literal("invite_accepted"),
    ),
    ipHash: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    requestId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_kind", ["kind"])
    .index("by_createdAt", ["createdAt"]),

  webhookDeliveries: defineTable({
    endpointId: v.optional(v.id("webhookEndpoints")),
    eventId: v.string(),
    event: v.string(),
    url: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("delivered"),
      v.literal("failed"),
      v.literal("dead"),
    ),
    attempts: v.number(),
    lastAttemptAt: v.optional(v.number()),
    nextAttemptAt: v.optional(v.number()),
    responseStatus: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_eventId", ["eventId"])
    .index("by_status", ["status"])
    .index("by_endpointId", ["endpointId"]),

  notificationOutbox: defineTable({
    channel: v.union(
      v.literal("email"),
      v.literal("whatsapp"),
      v.literal("push"),
      v.literal("in_app"),
    ),
    recipient: v.string(),
    template: v.string(),
    /** JSON bag: template variables. Rendered values are validated by the template. */
    payload: jsonBagValidator,
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("dead"),
    ),
    attempts: v.number(),
    scheduledAt: v.number(),
    sentAt: v.optional(v.number()),
    error: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    /** In-app projection: the recipient account and its read state. */
    recipientId: v.optional(v.id("users")),
    readAt: v.optional(v.number()),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status_scheduledAt", ["status", "scheduledAt"])
    .index("by_idempotencyKey", ["idempotencyKey"])
    .index("by_recipientId", ["recipientId"])
    .index("by_recipient_status", ["recipientId", "status"]),

  featureFlags: defineTable({
    key: v.string(),
    description: v.string(),
    enabled: v.boolean(),
    rolloutPercent: v.number(),
    updatedBy: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  settings: defineTable({
    key: v.string(),
    /** JSON bag: platform configuration validated by its domain module. */
    value: jsonBagValidator,
    updatedBy: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  integrationHealth: defineTable({
    integration: v.union(
      v.literal("payment_gateway"),
      v.literal("email"),
      v.literal("whatsapp"),
      v.literal("livekit"),
      v.literal("storage"),
    ),
    status: v.union(
      v.literal("healthy"),
      v.literal("degraded"),
      v.literal("down"),
      v.literal("unknown"),
    ),
    message: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
    checkedAt: v.number(),
  }).index("by_integration_checkedAt", ["integration", "checkedAt"]),

  dailyMetrics: defineTable({
    date: v.string(),
    metricKey: v.string(),
    dimension: v.optional(v.string()),
    value: v.number(),
    computedAt: v.number(),
  })
    .index("by_date_metric", ["date", "metricKey"])
    .index("by_metric_date", ["metricKey", "date"]),

  metricDefinitions: defineTable({
    key: v.string(),
    label: v.string(),
    definition: v.string(),
    formula: v.string(),
    owner: v.string(),
    version: v.number(),
    active: v.boolean(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  flowDefinitions: defineTable({
    key: v.string(),
    name: v.string(),
    owner: v.string(),
    description: v.string(),
    version: v.number(),
    active: v.boolean(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  flowTransitions: defineTable({
    flowKey: v.string(),
    fromState: v.string(),
    toState: v.string(),
    guard: v.string(),
    slaHours: v.optional(v.number()),
    requiresRole: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_flowKey", ["flowKey"])
    .index("by_flow_from", ["flowKey", "fromState"]),

  slaPolicies: defineTable({
    key: v.string(),
    flowKey: v.string(),
    name: v.string(),
    targetMinutes: v.number(),
    escalationMinutes: v.optional(v.number()),
    owner: v.string(),
    active: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_flowKey", ["flowKey"]),

  automationRules: defineTable({
    key: v.string(),
    flowKey: v.string(),
    kind: v.union(
      v.literal("assignment"),
      v.literal("reminder"),
      v.literal("escalation"),
      v.literal("notification"),
    ),
    trigger: v.string(),
    action: v.string(),
    enabled: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_flowKey", ["flowKey"]),

  notificationTemplates: defineTable({
    key: v.string(),
    channel: v.union(
      v.literal("email"),
      v.literal("whatsapp"),
      v.literal("push"),
      v.literal("in_app"),
    ),
    subject: v.optional(v.string()),
    body: v.string(),
    locale: v.string(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  apiKeys: defineTable({
    name: v.string(),
    keyHash: v.string(),
    scopes: v.array(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("revoked"),
      v.literal("expired"),
    ),
    createdBy: v.string(),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    // Phase 6 additive metadata: display prefix only, never the secret.
    keyPrefix: v.optional(v.string()),
    rotatedFrom: v.optional(v.id("apiKeys")),
    rotatedTo: v.optional(v.id("apiKeys")),
  })
    .index("by_keyHash", ["keyHash"])
    .index("by_status", ["status"]),

  webhookEndpoints: defineTable({
    name: v.string(),
    url: v.string(),
    secretHash: v.string(),
    events: v.array(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("revoked"),
    ),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"]),

  privacyRequests: defineTable({
    requesterId: v.optional(v.id("users")),
    requesterEmail: v.string(),
    kind: v.union(
      v.literal("access"),
      v.literal("correction"),
      v.literal("deletion"),
      v.literal("hold"),
    ),
    status: v.union(
      v.literal("open"),
      v.literal("reviewing"),
      v.literal("completed"),
      v.literal("rejected"),
    ),
    reason: v.optional(v.string()),
    handledBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
    // Phase 6 additive lifecycle fields.
    subjectUserId: v.optional(v.id("users")),
    resolution: v.optional(v.string()),
    retentionHoldUntil: v.optional(v.number()),
    deletionAppliedAt: v.optional(v.number()),
    dataScope: v.optional(v.string()),
    evidence: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    completedBy: v.optional(v.string()),
    correction: v.optional(
      v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        region: v.optional(v.string()),
      }),
    ),
  })
    .index("by_status", ["status"])
    .index("by_requesterId", ["requesterId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_subjectUserId", ["subjectUserId"]),

  impersonationSessions: defineTable({
    actorId: v.id("users"),
    targetId: v.id("users"),
    reason: v.string(),
    readOnly: v.boolean(),
    startedAt: v.number(),
    expiresAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_actorId", ["actorId"])
    .index("by_targetId", ["targetId"]),

  /**
   * Phase 6 governance: cultural permission records tied to a community,
   * a permission document, an access level, and a withdrawal state.
   */
  culturalSources: defineTable({
    community: v.string(),
    sourceName: v.string(),
    pathId: v.optional(v.string()),
    workId: v.optional(v.id("works")),
    permissionDocumentRef: v.string(),
    permissionDocumentUrl: v.optional(v.string()),
    permissionDate: v.number(),
    permissionStatus: v.union(
      v.literal("pending"),
      v.literal("granted"),
      v.literal("withdrawn"),
    ),
    accessLevel: v.union(
      v.literal("public"),
      v.literal("community"),
      v.literal("restricted"),
    ),
    attribution: v.string(),
    notes: v.optional(v.string()),
    withdrawalStatus: v.union(
      v.literal("active"),
      v.literal("withdrawal_requested"),
      v.literal("withdrawn"),
    ),
    withdrawalRequestedAt: v.optional(v.number()),
    withdrawnAt: v.optional(v.number()),
    withdrawalReason: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("archived"),
    ),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_community", ["community"])
    .index("by_pathId", ["pathId"])
    .index("by_workId", ["workId"])
    .index("by_withdrawalStatus", ["withdrawalStatus"]),

  takedownRequests: defineTable({
    code: v.string(),
    targetType: v.union(
      v.literal("work"),
      v.literal("content"),
      v.literal("media"),
      v.literal("conversation"),
      v.literal("certificate"),
    ),
    targetId: v.string(),
    targetLabel: v.string(),
    culturalSourceId: v.optional(v.id("culturalSources")),
    requesterName: v.string(),
    requesterContact: v.string(),
    reason: v.string(),
    evidence: v.optional(v.string()),
    status: v.union(
      v.literal("requested"),
      v.literal("reviewing"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("completed"),
      v.literal("reversed"),
    ),
    decisionReason: v.optional(v.string()),
    decidedBy: v.optional(v.string()),
    decidedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    reversedAt: v.optional(v.number()),
    effects: v.optional(jsonBagValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_status", ["status"])
    .index("by_target", ["targetType", "targetId"])
    .index("by_createdAt", ["createdAt"]),

  /** Phase 6 break-glass registry for recordings, identity documents, and assets. */
  breakGlassGrants: defineTable({
    actorId: v.id("users"),
    entityType: v.union(
      v.literal("call_recording"),
      v.literal("identity_document"),
      v.literal("submission_asset"),
      v.literal("message_asset"),
    ),
    entityId: v.string(),
    reason: v.string(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
    revokedBy: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_actorId", ["actorId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_expiresAt", ["expiresAt"]),

  contentLocks: defineTable({
    contentKey: v.string(),
    holderId: v.id("users"),
    acquiredAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_contentKey", ["contentKey"])
    .index("by_expiresAt", ["expiresAt"]),
}
