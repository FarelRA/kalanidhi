import { defineTable } from "convex/server"
import { v } from "convex/values"

import { accountStatusValidator, roleValidator } from "./common"

export const identityTables = {
  users: defineTable({
    authUserId: v.string(),
    name: v.string(),
    email: v.string(),
    emailVerified: v.boolean(),
    /** Primary identity. E.164 without the leading plus, e.g. 6287784454555. */
    phone: v.string(),
    /** Indonesian province selected at signup. */
    province: v.string(),
    whatsappVerified: v.boolean(),
    whatsappVerifiedAt: v.optional(v.number()),
    image: v.optional(v.string()),
    initials: v.string(),
    region: v.string(),
    roles: v.array(roleValidator),
    status: accountStatusValidator,
    suspendedReason: v.optional(v.string()),
    suspendedAt: v.optional(v.number()),
    lastActiveAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_email", ["email"])
    .index("by_phone", ["phone"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"])
    .searchIndex("search_name", { searchField: "name" }),

  /**
   * One-time WhatsApp verification challenges. The raw token is shown once in
   * the wa.me link; only its hash is stored.
   */
  whatsappVerifications: defineTable({
    userId: v.id("users"),
    phone: v.string(),
    tokenHash: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("expired"),
    ),
    expiresAt: v.number(),
    createdAt: v.number(),
    verifiedAt: v.optional(v.number()),
    messageId: v.optional(v.string()),
  })
    .index("by_tokenHash", ["tokenHash"])
    .index("by_userId", ["userId"])
    .index("by_phone", ["phone"])
    .index("by_status", ["status"]),

  /** Append-only: grants and revocations are events, never rewritten. */
  roleAssignments: defineTable({
    userId: v.id("users"),
    role: roleValidator,
    action: v.union(v.literal("grant"), v.literal("revoke")),
    actorId: v.string(),
    reason: v.string(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_role", ["role"])
    .index("by_createdAt", ["createdAt"]),

  invites: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    roles: v.array(roleValidator),
    tokenHash: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired"),
      v.literal("revoked"),
    ),
    invitedBy: v.string(),
    acceptedBy: v.optional(v.id("users")),
    reason: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_tokenHash", ["tokenHash"])
    .index("by_status", ["status"]),

  /** Application-side projection of Better Auth sessions for device revocation. */
  sessions: defineTable({
    userId: v.id("users"),
    authSessionId: v.string(),
    deviceName: v.string(),
    userAgent: v.string(),
    ipHash: v.optional(v.string()),
    createdAt: v.number(),
    lastSeenAt: v.number(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
    revokedBy: v.optional(v.string()),
    revokedReason: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_authSessionId", ["authSessionId"])
    .index("by_revokedAt", ["revokedAt"]),

  consents: defineTable({
    userId: v.id("users"),
    kind: v.union(
      v.literal("privacy"),
      v.literal("recording"),
      v.literal("marketing"),
      v.literal("guardian"),
    ),
    granted: v.boolean(),
    version: v.string(),
    source: v.string(),
    evidenceAssetId: v.optional(v.string()),
    grantedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_kind", ["kind"]),

  payoutAccounts: defineTable({
    userId: v.id("users"),
    provider: v.union(
      v.literal("bank"),
      v.literal("gopay"),
      v.literal("other"),
    ),
    bankCode: v.string(),
    accountName: v.string(),
    accountNumberMasked: v.string(),
    /** Reference to the encrypted vault record; never the raw account number. */
    accountRef: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("rejected"),
      v.literal("suspended"),
    ),
    verifiedBy: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),

  sellerProfiles: defineTable({
    userId: v.id("users"),
    displayName: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("suspended"),
    ),
    onboardingChecklist: v.object({
      payoutAccount: v.boolean(),
      consent: v.boolean(),
      firstWorkCard: v.boolean(),
      taxDetails: v.boolean(),
    }),
    activatedAt: v.optional(v.number()),
    suspendedReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),
}
