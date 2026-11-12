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
import type { SiteData } from "../../lib/content/types"
import type { LeadArgs } from "../../lib/convex/types"
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
  }
  leads: {
    create: FunctionReference<"mutation", "public", LeadArgs, Id<"leads">>
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
