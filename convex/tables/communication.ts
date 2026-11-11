import { defineTable } from "convex/server"
import { v } from "convex/values"

import { jsonBagValidator } from "./common"

export const communicationTables = {
  conversations: defineTable({
    kind: v.union(
      v.literal("direct"),
      v.literal("cohort"),
      v.literal("support"),
      v.literal("system"),
    ),
    title: v.optional(v.string()),
    pathId: v.optional(v.string()),
    cohortId: v.optional(v.id("cohorts")),
    createdBy: v.optional(v.id("users")),
    status: v.union(
      v.literal("open"),
      v.literal("archived"),
      v.literal("flagged"),
    ),
    lastMessageAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_kind", ["kind"])
    .index("by_cohortId", ["cohortId"])
    .index("by_updatedAt", ["updatedAt"]),

  conversationMembers: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    role: v.union(
      v.literal("member"),
      v.literal("owner"),
      v.literal("support"),
    ),
    mutedUntil: v.optional(v.number()),
    lastReadAt: v.optional(v.number()),
    joinedAt: v.number(),
    leftAt: v.optional(v.number()),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_userId", ["userId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.optional(v.id("users")),
    kind: v.union(
      v.literal("text"),
      v.literal("voice"),
      v.literal("image"),
      v.literal("file"),
      v.literal("system"),
      v.literal("call"),
    ),
    body: v.optional(v.string()),
    assetId: v.optional(v.id("messageAssets")),
    durationMs: v.optional(v.number()),
    waveform: v.optional(v.array(v.number())),
    replyToId: v.optional(v.id("messages")),
    editedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_conversation_createdAt", ["conversationId", "createdAt"])
    .index("by_senderId", ["senderId"]),

  messageAssets: defineTable({
    messageId: v.optional(v.id("messages")),
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
    durationMs: v.optional(v.number()),
    transcript: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_messageId", ["messageId"]),

  messageReceipts: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    deliveredAt: v.optional(v.number()),
    readAt: v.optional(v.number()),
  })
    .index("by_messageId", ["messageId"])
    .index("by_userId", ["userId"]),

  messageFlags: defineTable({
    messageId: v.id("messages"),
    reportedBy: v.id("users"),
    reason: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("reviewing"),
      v.literal("resolved"),
      v.literal("dismissed"),
    ),
    reviewedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_messageId", ["messageId"])
    .index("by_status", ["status"]),

  blocks: defineTable({
    blockerId: v.id("users"),
    blockedId: v.id("users"),
    reason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_blockerId", ["blockerId"])
    .index("by_blockedId", ["blockedId"]),

  callSessions: defineTable({
    roomName: v.string(),
    kind: v.union(v.literal("voice"), v.literal("video"), v.literal("cohort")),
    initiatorId: v.id("users"),
    cohortId: v.optional(v.id("cohorts")),
    conversationId: v.optional(v.id("conversations")),
    status: v.union(
      v.literal("scheduled"),
      v.literal("ringing"),
      v.literal("active"),
      v.literal("ended"),
      v.literal("missed"),
      v.literal("declined"),
    ),
    scheduledAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    recordingConsent: v.union(
      v.literal("both"),
      v.literal("pending"),
      v.literal("declined"),
    ),
    createdAt: v.number(),
  })
    .index("by_roomName", ["roomName"])
    .index("by_initiatorId", ["initiatorId"])
    .index("by_status", ["status"])
    .index("by_scheduledAt", ["scheduledAt"]),

  callParticipants: defineTable({
    callId: v.id("callSessions"),
    userId: v.id("users"),
    role: v.union(
      v.literal("host"),
      v.literal("guest"),
      v.literal("support"),
    ),
    joinedAt: v.optional(v.number()),
    leftAt: v.optional(v.number()),
    quality: v.optional(v.string()),
  })
    .index("by_callId", ["callId"])
    .index("by_userId", ["userId"]),

  callEvents: defineTable({
    callId: v.id("callSessions"),
    kind: v.union(
      v.literal("ringing"),
      v.literal("accepted"),
      v.literal("ended"),
      v.literal("quality"),
      v.literal("recording"),
    ),
    actorId: v.optional(v.id("users")),
    /** JSON bag: provider quality metrics and transport diagnostics. */
    payload: jsonBagValidator,
    createdAt: v.number(),
  }).index("by_callId", ["callId"]),

  callRecordings: defineTable({
    callId: v.id("callSessions"),
    assetId: v.id("_storage"),
    consentedBy: v.array(v.id("users")),
    retentionUntil: v.number(),
    accessLog: v.array(
      v.object({
        actorId: v.string(),
        reason: v.string(),
        accessedAt: v.number(),
      }),
    ),
    createdAt: v.number(),
  })
    .index("by_callId", ["callId"])
    .index("by_retentionUntil", ["retentionUntil"]),
}
