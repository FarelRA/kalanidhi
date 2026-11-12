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
    linkedType: v.optional(v.string()),
    linkedId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_status", ["status"])
    .index("by_assigneeId", ["assigneeId"])
    .index("by_requesterId", ["requesterId"])
    .index("by_createdAt", ["createdAt"]),

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
  })
    .index("by_status", ["status"])
    .index("by_requesterId", ["requesterId"])
    .index("by_createdAt", ["createdAt"]),

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

  contentLocks: defineTable({
    contentKey: v.string(),
    holderId: v.id("users"),
    acquiredAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_contentKey", ["contentKey"])
    .index("by_expiresAt", ["expiresAt"]),
}
