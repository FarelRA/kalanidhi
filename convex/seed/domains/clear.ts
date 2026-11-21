import type { TableNamesInDataModel } from "convex/server"
import { v } from "convex/values"

import type { DataModel, Doc } from "../../_generated/dataModel"
import { internalMutation } from "../../_generated/server"
import { SEED_ASSET_OWNER } from "../content/identities"
import { isPlaceholderAuthId, normalizeSeedEmail } from "../lib/auth"

const RETIRED_SEED_EMAILS = [
  "widagdo.saputra75@gmail.com",
  "rani.wikaningsih97@gmail.com",
] as const

const CLEAR_TABLES: TableNamesInDataModel<DataModel>[] = [
  "siteContent",
  "contentRevisions",
  "contentPreviews",
  "contentLocks",
  "catalogFields",
  "paths",
  "pathModules",
  "lessons",
  "teachers",
  "works",
  "testimonials",
  "faqs",
  "seoOverrides",
  "whatsappVerifications",
  "roleAssignments",
  "invites",
  "consents",
  "payoutAccounts",
  "sellerProfiles",
  "cohorts",
  "cohortSessions",
  "enrollments",
  "lessonProgress",
  "submissions",
  "submissionAssets",
  "assessments",
  "assessmentEvents",
  "disputes",
  "certificates",
  "certificateEvents",
  "workCards",
  "orders",
  "orderItems",
  "payments",
  "paymentEvents",
  "payouts",
  "refunds",
  "ledgerEntries",
  "conversations",
  "conversationMembers",
  "messages",
  "messageAssets",
  "messageReceipts",
  "messageFlags",
  "blocks",
  "messageEdits",
  "messageAccessGrants",
  "messageUploadIntents",
  "messagingRestrictions",
  "callSessions",
  "callParticipants",
  "callEvents",
  "callRecordings",
  "leads",
  "leadNotes",
  "leadAssignments",
  "supportTickets",
  "supportMessages",
  "supportCannedReplies",
  "auditLogs",
  "authLogs",
  "webhookDeliveries",
  "notificationOutbox",
  "featureFlags",
  "settings",
  "integrationHealth",
  "dailyMetrics",
  "metricDefinitions",
  "flowDefinitions",
  "flowTransitions",
  "slaPolicies",
  "automationRules",
  "notificationTemplates",
  "apiKeys",
  "webhookEndpoints",
  "privacyRequests",
  "impersonationSessions",
  "culturalSources",
  "takedownRequests",
  "breakGlassGrants",
]

export const clearBatch = internalMutation({
  args: {
    /**
     * Operator-only escape hatch for a deliberate full reset. The seed passes
     * `allowRealUsers` through so a destructive replay also removes real
     * signups instead of leaving them without orders and certificates.
     */
    includeRealUsers: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    for (const email of RETIRED_SEED_EMAILS) {
      const mapping = await ctx.db
        .query("seedAuthAccounts")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique()
      if (mapping) await ctx.db.delete(mapping._id)
    }
    let budget = 500

    for (const table of CLEAR_TABLES) {
      while (budget > 0) {
        const documents = await ctx.db.query(table).take(100)
        if (documents.length === 0) break
        for (const document of documents) {
          await ctx.db.delete(table, document._id)
          budget -= 1
          if (budget <= 0) return { done: false }
        }
      }
    }

    // `seedAuthAccounts` survives clears, so it identifies accounts the seed
    // owns even after Better Auth replaced their placeholder subject. Real
    // signups are outside this scope and are kept. When the mapping is empty
    // (legacy fixtures or a first run) fall back to the historical behaviour.
    const mappings = await ctx.db.query("seedAuthAccounts").collect()
    const seedEmails = new Set(
      mappings.map((row) => normalizeSeedEmail(row.email)),
    )
    const hasSeedScope = seedEmails.size > 0
    const isSeedUser = (user: Doc<"users">): boolean =>
      isPlaceholderAuthId(user.authUserId) ||
      seedEmails.has(normalizeSeedEmail(user.email))

    // Each pass must empty the table (or contain only preserved rows) before
    // the next one starts. A single `take(100)` used to leave the rest behind
    // once the growth seed pushed the user table past 100 rows.
    while (budget > 0) {
      const users = await ctx.db.query("users").take(100)
      if (users.length === 0) break
      let deleted = 0
      for (const user of users) {
        if (user.roles.includes("admin")) continue
        // A deleted account is a tombstone kept only for audit continuity.
        // It holds no data and would otherwise fail identity uniqueness.
        if (user.status === "deleted") {
          await ctx.db.delete(user._id)
          budget -= 1
          deleted += 1
          continue
        }
        if (hasSeedScope && !isSeedUser(user) && !args.includeRealUsers) continue
        await ctx.db.delete(user._id)
        budget -= 1
        deleted += 1
        if (budget <= 0) return { done: false }
      }
      if (deleted === 0) break
    }

    while (budget > 0) {
      const sessions = await ctx.db.query("sessions").take(100)
      if (sessions.length === 0) break
      let deleted = 0
      for (const session of sessions) {
        const user = await ctx.db.get(session.userId)
        const seedSession = session.authSessionId.startsWith("seed-session-")
        if (
          user &&
          !seedSession &&
          !args.includeRealUsers &&
          (user.roles.includes("admin") ||
            !hasSeedScope ||
            !isSeedUser(user))
        ) {
          continue
        }
        await ctx.db.delete(session._id)
        budget -= 1
        deleted += 1
        if (budget <= 0) return { done: false }
      }
      if (deleted === 0) break
    }

    // The uploader tags seed images `system`, while this guard expects
    // `KalaNidhi`. Keep the guard as-is: changing it to delete `system`
    // assets would erase the seed images that content rows still reference.
    while (budget > 0) {
      const assets = await ctx.db
        .query("mediaAssets")
        .withIndex("by_uploadedBy", (q) =>
          q.eq("uploadedBy", SEED_ASSET_OWNER),
        )
        .take(100)
      if (assets.length === 0) break
      for (const asset of assets) {
        await ctx.db.delete(asset._id)
        budget -= 1
        if (budget <= 0) return { done: false }
      }
    }

    return { done: true }
  },
})
