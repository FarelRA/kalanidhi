import type { TableNamesInDataModel } from "convex/server"

import type { DataModel } from "../../_generated/dataModel"
import { internalMutation } from "../../_generated/server"
import { SEED_ASSET_OWNER } from "../content/identities"

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
  args: {},
  handler: async (ctx) => {
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

    // Each pass must empty the table (or contain only preserved rows) before
    // the next one starts. A single `take(100)` used to leave the rest behind
    // once the growth seed pushed the user table past 100 rows.
    while (budget > 0) {
      const users = await ctx.db.query("users").take(100)
      if (users.length === 0) break
      let deleted = 0
      for (const user of users) {
        if (user.roles.includes("admin")) continue
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
        if (user && user.roles.includes("admin")) continue
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
