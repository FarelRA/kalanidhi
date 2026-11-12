import { paginationOptsValidator } from "convex/server"
import { ConvexError, v, type GenericId } from "convex/values"

import type { Viewer } from "../lib/access/viewer"
import {
  attachmentProblem,
  baseMimeType,
  DEFAULT_GRANT_MINUTES,
  DEFAULT_RATE_LIMIT_PER_MINUTE,
  DEFAULT_RETENTION_DAYS,
  DEFAULT_UPLOAD_LIMIT_PER_MINUTE,
  MAX_GRANT_MINUTES,
  MAX_TEXT_LENGTH,
  normalizeReason,
  reasonProblem,
  retentionCutoff,
  looksLikeSpam,
  hasExternalLink,
} from "../lib/messaging/policy"
import type {
  BreakGlassGrantView,
  ContactView,
  ConversationDetail,
  ConversationMemberView,
  ConversationSummary,
  MessageAssetView,
  MessageEditView,
  MessagePage,
  MessageView,
  ModerationFlagView,
  PresenceView,
  ReceiptView,
} from "../lib/messaging/types"
import { requireCapability, viewerForUser } from "./access"
import type { Doc, Id } from "./_generated/dataModel"
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"
import { createInAppNotification } from "./notifications"

const DAY_MS = 86_400_000
const MINUTE_MS = 60_000

type DbCtx = Pick<QueryCtx | MutationCtx, "db" | "storage">

function now(): number {
  return Date.now()
}

function fail(code: string, message: string): never {
  throw new ConvexError({ code, message })
}

async function currentAccount(
  ctx: QueryCtx | MutationCtx,
): Promise<{ user: Doc<"users">; viewer: Viewer } | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  const user = await ctx.db
    .query("users")
    .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
    .unique()
  if (!user) return null
  return { user, viewer: await viewerForUser(ctx, user) }
}

async function requireViewer(
  ctx: QueryCtx | MutationCtx,
  capability: "messages.read.own" | "messages.moderate" | "support.request",
): Promise<{ user: Doc<"users">; viewer: Viewer }> {
  const account = await currentAccount(ctx)
  if (!account) fail("UNAUTHENTICATED", "Masuk diperlukan.")
  requireCapability(account.viewer, capability)
  return account
}

async function writeAudit(
  ctx: MutationCtx,
  input: {
    actorId: string
    actorRole: string
    action: string
    entityType: string
    entityId?: string
    reason?: string
    before?: Record<string, unknown>
    after?: Record<string, unknown>
    severity?: "info" | "warning" | "error" | "critical"
  },
): Promise<void> {
  await ctx.db.insert("auditLogs", {
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    reason: input.reason,
    before: input.before,
    after: input.after,
    severity: input.severity ?? "info",
    createdAt: now(),
  })
}

function isModerator(viewer: Viewer): boolean {
  return viewer.capabilities.includes("messages.moderate")
}

async function conversationOrFail(
  ctx: DbCtx,
  conversationId: Id<"conversations">,
): Promise<Doc<"conversations">> {
  const conversation = await ctx.db.get(conversationId)
  if (!conversation) fail("NOT_FOUND", "Percakapan tidak ditemukan.")
  return conversation
}

async function memberRow(
  ctx: DbCtx,
  conversationId: Id<"conversations">,
  userId: Id<"users">,
): Promise<Doc<"conversationMembers"> | null> {
  const row = await ctx.db
    .query("conversationMembers")
    .withIndex("by_conversation_user", (q) =>
      q.eq("conversationId", conversationId).eq("userId", userId),
    )
    .unique()
  if (!row || row.leftAt) return null
  return row
}

async function requireMember(
  ctx: DbCtx,
  conversationId: Id<"conversations">,
  userId: Id<"users">,
) {
  const conversation = await conversationOrFail(ctx, conversationId)
  const member = await memberRow(ctx, conversationId, userId)
  if (!member) fail("NOT_FOUND", "Percakapan tidak ditemukan.")
  return { conversation, member }
}

async function activeGrant(
  ctx: DbCtx,
  conversationId: Id<"conversations">,
  actorId: Id<"users">,
): Promise<Doc<"messageAccessGrants"> | null> {
  const rows = await ctx.db
    .query("messageAccessGrants")
    .withIndex("by_conversation_actor", (q) =>
      q.eq("conversationId", conversationId).eq("actorId", actorId),
    )
    .collect()
  const timestamp = now()
  return (
    rows
      .filter((row) => !row.revokedAt && row.expiresAt > timestamp)
      .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
  )
}

async function activeFlagCount(
  ctx: DbCtx,
  conversationId: Id<"conversations">,
): Promise<number> {
  const flags = await ctx.db.query("messageFlags").collect()
  let count = 0
  for (const flag of flags) {
    if (!["open", "reviewing"].includes(flag.status)) continue
    const message = await ctx.db.get(flag.messageId)
    if (message?.conversationId === conversationId) count += 1
  }
  return count
}

async function retentionDays(ctx: DbCtx): Promise<number> {
  const setting = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "messaging.retentionDays"))
    .unique()
  const value = setting?.value
  return typeof value === "number" && value > 0 ? value : DEFAULT_RETENTION_DAYS
}

async function numericSetting(
  ctx: DbCtx,
  key: string,
  fallback: number,
): Promise<number> {
  const setting = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique()
  const value = setting?.value
  return typeof value === "number" && value > 0 ? value : fallback
}

async function conversationMessages(
  ctx: DbCtx,
  conversationId: Id<"conversations">,
  options: { before?: number; limit?: number } = {},
) {
  const days = await retentionDays(ctx)
  const cutoff = retentionCutoff(now(), days)
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 50)
  const index = ctx.db
    .query("messages")
    .withIndex("by_conversation_createdAt", (q) => {
      const base = q.eq("conversationId", conversationId)
      return options.before === undefined
        ? base
        : base.lt("createdAt", options.before)
    })
    .order("desc")
  const rows = await index.take(limit + 1)
  const visible = rows.filter((row) => row.createdAt >= cutoff)
  const hasMore = visible.length > limit
  return {
    rows: visible.slice(0, limit).reverse(),
    hasMore,
  }
}

async function messagePage(
  ctx: DbCtx,
  conversationId: Id<"conversations">,
  options: { before?: number; limit?: number } = {},
): Promise<MessagePage> {
  const { rows, hasMore } = await conversationMessages(ctx, conversationId, options)
  return {
    messages: await Promise.all(
      rows.map((row) => toMessageView(ctx, row)),
    ),
    hasMore,
  }
}

async function toMessageView(
  ctx: DbCtx,
  message: Doc<"messages">,
): Promise<MessageView> {
  const deleted = Boolean(message.deletedAt)
  const sender = message.senderId
    ? await ctx.db.get(message.senderId)
    : null
  let replyTo: MessageView["replyTo"] = null
  if (message.replyToId) {
    const parent = await ctx.db.get(message.replyToId)
    if (parent) {
      const parentSender = parent.senderId
        ? await ctx.db.get(parent.senderId)
        : null
      replyTo = {
        id: parent._id,
        body: parent.deletedAt ? "Pesan dihapus" : (parent.body ?? ""),
        senderName: parentSender
          ? parentSender.name
          : parent.senderId
            ? "Akun tidak ditemukan"
            : "Sistem",
      }
    }
  }

  const editRows = await ctx.db
    .query("messageEdits")
    .withIndex("by_messageId", (q) => q.eq("messageId", message._id))
    .collect()
  const edits: MessageEditView[] = []
  for (const row of editRows.sort((a, b) => a.createdAt - b.createdAt)) {
    const editor = await ctx.db.get(row.editorId)
    edits.push({
      id: row._id,
      previousBody: row.previousBody,
      nextBody: row.nextBody,
      editorId: row.editorId,
      editorName: editor?.name ?? "Akun tidak ditemukan",
      createdAt: row.createdAt,
    })
  }

  let asset: MessageAssetView | null = null
  if (!deleted) {
    const assetRow = await ctx.db
      .query("messageAssets")
      .withIndex("by_messageId", (q) => q.eq("messageId", message._id))
      .unique()
    if (assetRow) {
      const assetSender = assetRow.senderId
        ? await ctx.db.get(assetRow.senderId)
        : null
      asset = {
        id: assetRow._id,
        kind: assetRow.kind,
        filename: assetRow.filename,
        mimeType: assetRow.mimeType,
        size: assetRow.size,
        durationMs: assetRow.durationMs ?? null,
        width: assetRow.width ?? null,
        height: assetRow.height ?? null,
        transcript: assetRow.transcript ?? null,
        url: await ctx.storage.getUrl(assetRow.storageId),
        waveform: message.waveform ?? [],
        senderId: assetRow.senderId ?? null,
        senderName: assetRow.senderId
          ? (assetSender?.name ?? "Akun tidak ditemukan")
          : null,
        createdAt: assetRow.createdAt,
      }
    }
  }

  return {
    id: message._id,
    conversationId: message.conversationId,
    kind: message.kind,
    senderId: message.senderId ?? null,
    senderName: sender
      ? sender.name
      : message.senderId
        ? "Akun tidak ditemukan"
        : "Sistem",
    body: deleted ? null : (message.body ?? null),
    containsExternalLink: message.containsExternalLink ?? false,
    replyTo,
    edits,
    editedAt: message.editedAt ?? null,
    deletedAt: message.deletedAt ?? null,
    removedBy: message.removedBy ? "Moderator" : null,
    removalReason: message.removalReason ?? null,
    createdAt: message.createdAt,
    asset,
  }
}

function previewFor(message: Doc<"messages"> | undefined): string | null {
  if (!message) return null
  if (message.deletedAt) return "Pesan dihapus"
  switch (message.kind) {
    case "voice":
      return "Catatan suara"
    case "image":
      return "Gambar"
    case "file":
      return "Berkas"
    case "call":
      return "Panggilan"
    case "system":
      return message.body ?? "Peristiwa sistem"
    default:
      return message.body ? message.body.slice(0, 80) : null
  }
}

async function conversationSummary(
  ctx: DbCtx,
  viewer: Viewer,
  conversation: Doc<"conversations">,
): Promise<ConversationSummary> {
  const member = await memberRow(ctx, conversation._id, viewer.userId as Id<"users">)
  const memberRows = await ctx.db
    .query("conversationMembers")
    .withIndex("by_conversationId", (q) =>
      q.eq("conversationId", conversation._id),
    )
    .collect()
  const activeMembers = memberRows.filter((row) => !row.leftAt)

  const members: ConversationMemberView[] = []
  for (const row of activeMembers) {
    const user = await ctx.db.get(row.userId)
    members.push({
      userId: row.userId,
      name: user?.name ?? "Akun tidak ditemukan",
      initials: user?.initials ?? "?",
      role: row.role,
    })
  }

  let title = conversation.title ?? "Percakapan"
  if (conversation.kind === "direct") {
    title = member
      ? members
          .filter((item) => item.userId !== viewer.userId)
          .map((item) => item.name)
          .join(", ") || "Percakapan langsung"
      : "Percakapan langsung"
  } else if (conversation.kind === "support") {
    title = conversation.title ?? "Dukungan"
  } else if (conversation.kind === "system") {
    title = conversation.title ?? "Sistem"
  }

  const days = await retentionDays(ctx)
  const cutoff = retentionCutoff(now(), days)
  const allMessages = await ctx.db
    .query("messages")
    .withIndex("by_conversation_createdAt", (q) =>
      q.eq("conversationId", conversation._id),
    )
    .collect()
  const liveMessages = allMessages.filter((row) => row.createdAt >= cutoff)
  const lastMessage = liveMessages
    .filter((row) => !row.deletedAt)
    .sort((a, b) => b.createdAt - a.createdAt)[0]

  let unreadCount = 0
  if (member) {
    const since = member.lastReadAt ?? member.joinedAt
    unreadCount = liveMessages.filter(
      (row) =>
        row.createdAt > since &&
        row.senderId !== viewer.userId &&
        row.kind !== "system" &&
        !row.deletedAt,
    ).length
  }

  let blockedPair = false
  if (conversation.kind === "direct" && members.length >= 2) {
    blockedPair = await isBlocked(
      ctx,
      members[0]!.userId as Id<"users">,
      members[1]!.userId as Id<"users">,
    )
  }

  return {
    id: conversation._id,
    kind: conversation.kind,
    title,
    pathId: conversation.pathId ?? null,
    cohortId: conversation.cohortId ?? null,
    status: conversation.status,
    isMember: Boolean(member),
    canReadContent: Boolean(member),
    contentLocked: !member && isModerator(viewer),
    mutedUntil: member?.mutedUntil ?? null,
    lastReadAt: member?.lastReadAt ?? null,
    unreadCount,
    messageCount: liveMessages.filter((row) => !row.deletedAt).length,
    openFlagCount: await activeFlagCount(ctx, conversation._id),
    blockedPair,
    lastMessageAt: conversation.lastMessageAt ?? null,
    lastMessagePreview: member ? previewFor(lastMessage) : null,
    members,
  }
}

async function conversationDetail(
  ctx: DbCtx,
  viewer: Viewer,
  conversation: Doc<"conversations">,
): Promise<ConversationDetail> {
  const summary = await conversationSummary(ctx, viewer, conversation)
  let grant: BreakGlassGrantView | null = null
  if (!summary.isMember && isModerator(viewer)) {
    const active = await activeGrant(
      ctx,
      conversation._id,
      viewer.userId as Id<"users">,
    )
    if (active) {
      grant = {
        id: active._id,
        reason: active.reason,
        expiresAt: active.expiresAt,
      }
    }
  }
  return {
    ...summary,
    supportRequestedBy: conversation.supportRequestedBy ?? null,
    supportConsentAt: conversation.supportConsentAt ?? null,
    activeGrant: grant,
  }
}

async function directRelation(
  ctx: DbCtx,
  teacherId: Id<"users">,
  studentId: Id<"users">,
): Promise<{ shared: boolean; pathId: string | null }> {
  const teacherProfiles = await ctx.db
    .query("teachers")
    .withIndex("by_userId", (q) => q.eq("userId", teacherId))
    .collect()
  const teacher = teacherProfiles.find((row) => row.status === "active")
  if (!teacher) return { shared: false, pathId: null }

  const cohorts = await ctx.db
    .query("cohorts")
    .withIndex("by_teacherId", (q) => q.eq("teacherId", teacherId))
    .collect()
  for (const cohort of cohorts) {
    if (!["enrolling", "active", "completed"].includes(cohort.status)) continue
    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_student_cohort", (q) =>
        q.eq("studentId", studentId).eq("cohortId", cohort._id),
      )
      .unique()
    if (enrollment && ["active", "completed"].includes(enrollment.status)) {
      return { shared: true, pathId: cohort.pathId }
    }
  }

  const enrollments = await ctx.db
    .query("enrollments")
    .withIndex("by_studentId", (q) => q.eq("studentId", studentId))
    .collect()
  const enrollment = enrollments.find(
    (row) =>
      ["active", "completed"].includes(row.status) &&
      (teacher.pathIds ?? []).includes(row.pathId),
  )
  return { shared: Boolean(enrollment), pathId: enrollment?.pathId ?? null }
}

async function isBlocked(
  ctx: DbCtx,
  a: Id<"users">,
  b: Id<"users">,
): Promise<boolean> {
  const forward = await ctx.db
    .query("blocks")
    .withIndex("by_blocker_blocked", (q) =>
      q.eq("blockerId", a).eq("blockedId", b),
    )
    .unique()
  if (forward) return true
  const backward = await ctx.db
    .query("blocks")
    .withIndex("by_blocker_blocked", (q) =>
      q.eq("blockerId", b).eq("blockedId", a),
    )
    .unique()
  return Boolean(backward)
}

async function messagingSuspended(
  ctx: DbCtx,
  userId: Id<"users">,
): Promise<boolean> {
  const rows = await ctx.db
    .query("messagingRestrictions")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect()
  const timestamp = now()
  return rows.some(
    (row) =>
      !row.liftedAt && (row.until === undefined || row.until > timestamp),
  )
}

async function assertCanSend(
  ctx: MutationCtx,
  viewer: Viewer,
  conversation: Doc<"conversations">,
  member: Doc<"conversationMembers">,
): Promise<void> {
  if (conversation.status === "archived") {
    fail("CONVERSATION_CLOSED", "Percakapan ini sudah ditutup.")
  }
  if (await messagingSuspended(ctx, viewer.userId as Id<"users">)) {
    fail("MESSAGING_SUSPENDED", "Pengiriman pesan dibatasi oleh pengelola.")
  }
  if (conversation.kind === "direct") {
    const peer = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", conversation._id),
      )
      .collect()
    const peerRow = peer.find((row) => row.userId !== viewer.userId)
    if (peerRow && (await isBlocked(ctx, viewer.userId as Id<"users">, peerRow.userId))) {
      fail("BLOCKED", "Percakapan ini diblokir.")
    }
  }
  void member
}

async function enforceSendLimits(
  ctx: MutationCtx,
  viewer: Viewer,
  conversationId: Id<"conversations">,
  candidateBody: string | undefined,
): Promise<void> {
  const timestamp = now()
  const userId = viewer.userId as Id<"users">
  const limit = await numericSetting(
    ctx,
    "messaging.rateLimitPerMinute",
    DEFAULT_RATE_LIMIT_PER_MINUTE,
  )
  const recent = await ctx.db
    .query("messages")
    .withIndex("by_sender_createdAt", (q) =>
      q.eq("senderId", userId).gte("createdAt", timestamp - MINUTE_MS),
    )
    .collect()
  if (recent.length >= limit) {
    fail("RATE_LIMITED", "Terlalu banyak pesan. Coba lagi sebentar lagi.")
  }

  const spamWindow = await ctx.db
    .query("messages")
    .withIndex("by_sender_createdAt", (q) =>
      q.eq("senderId", userId).gte("createdAt", timestamp - 10 * MINUTE_MS),
    )
    .collect()
  const bodies = spamWindow
    .filter((row) => row.kind === "text" && row.body && !row.deletedAt)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((row) => row.body as string)
    .slice(-10)
  if (candidateBody) bodies.push(candidateBody)
  if (looksLikeSpam(bodies)) {
    fail("SPAM_SUSPECTED", "Pesan berulang ditahan oleh pemeriksaan spam.")
  }
  void conversationId
}

async function notifyMembers(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
  senderId: Id<"users">,
  messageId: Id<"messages">,
  preview: string | null,
): Promise<void> {
  const members = await ctx.db
    .query("conversationMembers")
    .withIndex("by_conversationId", (q) =>
      q.eq("conversationId", conversation._id),
    )
    .collect()
  const timestamp = now()
  const sender = await ctx.db.get(senderId)
  for (const member of members) {
    if (member.leftAt || member.userId === senderId) continue
    if (member.mutedUntil && member.mutedUntil > timestamp) continue
    const isSupport = conversation.kind === "support"
    await createInAppNotification(ctx, {
      recipientId: member.userId,
      template: isSupport ? "support.reply" : "message.new",
      title: isSupport
        ? "Balasan dukungan baru"
        : `Pesan baru dari ${sender?.name ?? "Akun tidak ditemukan"}`,
      body: preview ?? "Pesan baru",
      entityType: "conversations",
      entityId: conversation._id,
      payload: {
        conversationId: conversation._id,
        messageId,
        preview,
      },
      idempotencyKey: `message:${messageId}:${member.userId}`,
    })
  }
}

async function notifyAdmins(
  ctx: MutationCtx,
  input: { template: string; title: string; body: string; payload: Record<string, unknown> },
): Promise<void> {
  const users = await ctx.db.query("users").collect()
  for (const user of users) {
    if (!user.roles.includes("admin") || user.status !== "active") continue
    await createInAppNotification(ctx, {
      recipientId: user._id,
      template: input.template,
      title: input.title,
      body: input.body,
      payload: input.payload,
    })
  }
}

const conversations = {
  list: query({
    args: {},
    handler: async (ctx): Promise<ConversationSummary[]> => {
      const { user, viewer } = await requireViewer(ctx, "messages.read.own")
      let conversations: Doc<"conversations">[]
      if (isModerator(viewer)) {
        conversations = await ctx.db
          .query("conversations")
          .withIndex("by_updatedAt")
          .order("desc")
          .take(100)
      } else {
        const memberships = await ctx.db
          .query("conversationMembers")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect()
        conversations = []
        for (const membership of memberships) {
          if (membership.leftAt) continue
          const conversation = await ctx.db.get(membership.conversationId)
          if (conversation) conversations.push(conversation)
        }
      }

      const summaries = await Promise.all(
        conversations.map((conversation) =>
          conversationSummary(ctx, viewer, conversation),
        ),
      )
      return summaries.sort((a, b) => {
        const aTime = a.lastMessageAt ?? 0
        const bTime = b.lastMessageAt ?? 0
        return bTime - aTime
      })
    },
  }),

  contacts: query({
    args: {},
    handler: async (ctx): Promise<ContactView[]> => {
      const { user, viewer } = await requireViewer(ctx, "messages.read.own")
      if (isModerator(viewer)) return []
      const contacts = new Map<string, ContactView>()

      if (user.roles.includes("teacher")) {
        const cohorts = await ctx.db
          .query("cohorts")
          .withIndex("by_teacherId", (q) => q.eq("teacherId", user._id))
          .collect()
        for (const cohort of cohorts) {
          if (!["enrolling", "active", "completed"].includes(cohort.status)) {
            continue
          }
          const enrollments = await ctx.db
            .query("enrollments")
            .withIndex("by_cohortId", (q) => q.eq("cohortId", cohort._id))
            .collect()
          for (const enrollment of enrollments) {
            if (!["active", "completed"].includes(enrollment.status)) continue
            if (enrollment.studentId === user._id) continue
            const account = await ctx.db.get(enrollment.studentId)
            if (!account || account.status !== "active") continue
            contacts.set(account._id, {
              userId: account._id,
              name: account.name,
              initials: account.initials,
              roleLabel: "Peserta",
              pathId: cohort.pathId,
            })
          }
        }

        const teacherProfiles = await ctx.db
          .query("teachers")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect()
        const profile = teacherProfiles.find((row) => row.status === "active")
        for (const pathId of profile?.pathIds ?? []) {
          const enrollments = await ctx.db
            .query("enrollments")
            .withIndex("by_pathId", (q) => q.eq("pathId", pathId))
            .collect()
          for (const enrollment of enrollments) {
            if (!["active", "completed"].includes(enrollment.status)) continue
            if (enrollment.studentId === user._id) continue
            const account = await ctx.db.get(enrollment.studentId)
            if (!account || account.status !== "active") continue
            contacts.set(account._id, {
              userId: account._id,
              name: account.name,
              initials: account.initials,
              roleLabel: "Peserta",
              pathId,
            })
          }
        }
      }

      if (user.roles.includes("student")) {
        const enrollments = await ctx.db
          .query("enrollments")
          .withIndex("by_studentId", (q) => q.eq("studentId", user._id))
          .collect()
        for (const enrollment of enrollments) {
          if (!["active", "completed"].includes(enrollment.status)) continue
          if (enrollment.cohortId) {
            const cohort = await ctx.db.get(enrollment.cohortId)
            if (!cohort) continue
            const teacher = await ctx.db.get(cohort.teacherId)
            if (!teacher || teacher.status !== "active") continue
            contacts.set(teacher._id, {
              userId: teacher._id,
              name: teacher.name,
              initials: teacher.initials,
              roleLabel: "Pengajar",
              pathId: cohort.pathId,
            })
            continue
          }
          const teacherProfiles = await ctx.db.query("teachers").collect()
          for (const profile of teacherProfiles) {
            if (profile.status !== "active") continue
            if (!(profile.pathIds ?? []).includes(enrollment.pathId)) continue
            if (!profile.userId) continue
            const teacher = await ctx.db.get(profile.userId)
            if (!teacher || teacher.status !== "active") continue
            contacts.set(teacher._id, {
              userId: teacher._id,
              name: teacher.name,
              initials: teacher.initials,
              roleLabel: "Pengajar",
              pathId: enrollment.pathId,
            })
          }
        }
      }

      return Array.from(contacts.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      )
    },
  }),

  get: query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args): Promise<ConversationDetail> => {
      const { user, viewer } = await requireViewer(ctx, "messages.read.own")
      const conversation = await conversationOrFail(ctx, args.conversationId)
      const member = await memberRow(ctx, conversation._id, user._id)
      if (!member && !isModerator(viewer)) {
        fail("NOT_FOUND", "Percakapan tidak ditemukan.")
      }
      return await conversationDetail(ctx, viewer, conversation)
    },
  }),

  startDirect: mutation({
    args: { peerUserId: v.id("users") },
    handler: async (ctx, args): Promise<Id<"conversations">> => {
      const { user, viewer } = await requireViewer(ctx, "messages.read.own")
      if (isModerator(viewer)) {
        fail("FORBIDDEN", "Admin memakai alur dukungan, bukan pesan langsung.")
      }
      if (args.peerUserId === user._id) {
        fail("SELF_DEALING", "Percakapan langsung memerlukan orang lain.")
      }
      const peer = await ctx.db.get(args.peerUserId)
      if (!peer || peer.status !== "active") {
        fail("NOT_FOUND", "Akun tidak ditemukan.")
      }

      const viewerIsTeacher = user.roles.includes("teacher")
      const peerIsTeacher = peer.roles.includes("teacher")
      let teacherId: Id<"users"> | null = null
      let studentId: Id<"users"> | null = null
      if (viewerIsTeacher && peer.roles.includes("student")) {
        teacherId = user._id
        studentId = peer._id
      } else if (peerIsTeacher && user.roles.includes("student")) {
        teacherId = peer._id
        studentId = user._id
      } else {
        fail(
          "FORBIDDEN",
          "Pesan langsung hanya antara pengajar dan peserta yang berbagi kohort.",
        )
      }

      const relation = await directRelation(ctx, teacherId, studentId)
      if (!relation.shared) {
        fail(
          "FORBIDDEN",
          "Pesan langsung hanya antara pengajar dan peserta yang berbagi kohort.",
        )
      }
      if (await isBlocked(ctx, user._id, peer._id)) {
        fail("BLOCKED", "Percakapan ini diblokir.")
      }

      const pairKey = [user._id, peer._id].sort().join("|")
      const existing = await ctx.db
        .query("conversations")
        .withIndex("by_pairKey", (q) => q.eq("pairKey", pairKey))
        .unique()
      if (existing) return existing._id

      const timestamp = now()
      const conversationId = await ctx.db.insert("conversations", {
        kind: "direct",
        pathId: relation.pathId ?? undefined,
        status: "open",
        pairKey,
        createdBy: user._id,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      await ctx.db.insert("conversationMembers", {
        conversationId,
        userId: user._id,
        role: "owner",
        joinedAt: timestamp,
      })
      await ctx.db.insert("conversationMembers", {
        conversationId,
        userId: peer._id,
        role: "member",
        joinedAt: timestamp,
      })
      return conversationId
    },
  }),

  startCohort: mutation({
    args: { cohortId: v.id("cohorts") },
    handler: async (ctx, args): Promise<Id<"conversations">> => {
      const { user, viewer } = await requireViewer(ctx, "messages.read.own")
      requireCapability(viewer, "teach")
      const cohort = await ctx.db.get(args.cohortId)
      if (!cohort) fail("NOT_FOUND", "Kohort tidak ditemukan.")
      if (cohort.teacherId !== user._id) {
        fail("FORBIDDEN", "Kohort ini bukan milik pengajar tersebut.")
      }

      const existing = await ctx.db
        .query("conversations")
        .withIndex("by_cohortId", (q) => q.eq("cohortId", cohort._id))
        .unique()
      if (existing) return existing._id

      const timestamp = now()
      const conversationId = await ctx.db.insert("conversations", {
        kind: "cohort",
        title: cohort.title,
        pathId: cohort.pathId,
        cohortId: cohort._id,
        status: "open",
        createdBy: user._id,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      await ctx.db.insert("conversationMembers", {
        conversationId,
        userId: user._id,
        role: "owner",
        joinedAt: timestamp,
      })

      const enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_cohortId", (q) => q.eq("cohortId", cohort._id))
        .collect()
      const students = enrollments.filter((row) =>
        ["active", "completed"].includes(row.status),
      )
      for (const enrollment of students) {
        await ctx.db.insert("conversationMembers", {
          conversationId,
          userId: enrollment.studentId,
          role: "member",
          joinedAt: timestamp,
        })
        await createInAppNotification(ctx, {
          recipientId: enrollment.studentId,
          template: "cohort.chat",
          title: "Percakapan kohort dibuka",
          body: `${cohort.title} kini punya ruang percakapan.`,
          entityType: "conversations",
          entityId: conversationId,
          payload: { conversationId },
        })
      }
      await ctx.db.insert("messages", {
        conversationId,
        kind: "system",
        body: "Ruang percakapan kohort dibuka.",
        createdAt: timestamp,
      })
      await ctx.db.patch(conversationId, {
        lastMessageAt: timestamp,
        updatedAt: timestamp,
      })
      return conversationId
    },
  }),

  startSupport: mutation({
    args: { subject: v.optional(v.string()) },
    handler: async (ctx, args): Promise<Id<"conversations">> => {
      const { user } = await requireViewer(ctx, "support.request")
      const existing = await ctx.db
        .query("conversations")
        .withIndex("by_supportRequestedBy", (q) =>
          q.eq("supportRequestedBy", user._id),
        )
        .collect()
      const open = existing.find((row) => row.status !== "archived")
      if (open) return open._id

      const timestamp = now()
      const subject = args.subject?.trim().slice(0, 120)
      const conversationId = await ctx.db.insert("conversations", {
        kind: "support",
        title: subject || "Permintaan dukungan",
        status: "open",
        supportRequestedBy: user._id,
        supportConsentAt: timestamp,
        createdBy: user._id,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      await ctx.db.insert("conversationMembers", {
        conversationId,
        userId: user._id,
        role: "owner",
        joinedAt: timestamp,
      })
      await ctx.db.insert("messages", {
        conversationId,
        kind: "system",
        body: "Permintaan dukungan dibuat. Tim dukungan dapat bergabung.",
        createdAt: timestamp,
      })
      await ctx.db.patch(conversationId, {
        lastMessageAt: timestamp,
        updatedAt: timestamp,
      })
      await notifyAdmins(ctx, {
        template: "support.requested",
        title: "Permintaan dukungan baru",
        body: `${user.name}: ${subject || "Permintaan dukungan"}`,
        payload: { conversationId },
      })
      return conversationId
    },
  }),

  joinSupport: mutation({
    args: { conversationId: v.id("conversations"), reason: v.optional(v.string()) },
    handler: async (ctx, args) => {
      const { user, viewer } = await requireViewer(ctx, "messages.moderate")
      const conversation = await conversationOrFail(ctx, args.conversationId)
      if (conversation.kind !== "support") {
        fail("FORBIDDEN", "Hanya percakapan dukungan yang dapat diikuti admin.")
      }
      if (!conversation.supportRequestedBy && !conversation.supportConsentAt) {
        await writeAudit(ctx, {
          actorId: user._id,
          actorRole: viewer.roleLabel,
          action: "messaging.support.denied",
          entityType: "conversations",
          entityId: conversation._id,
          reason: normalizeReason(args.reason) || "Tanpa persetujuan pengguna",
          severity: "warning",
        })
        return {
          joined: false,
          reason: "Dukungan memerlukan permintaan atau persetujuan pengguna.",
        }
      }
      const existing = await memberRow(ctx, conversation._id, user._id)
      if (existing) return { joined: true }
      const timestamp = now()
      await ctx.db.insert("conversationMembers", {
        conversationId: conversation._id,
        userId: user._id,
        role: "support",
        joinedAt: timestamp,
      })
      await ctx.db.insert("messages", {
        conversationId: conversation._id,
        senderId: user._id,
        kind: "system",
        body: "Tim dukungan bergabung dengan persetujuan pengguna.",
        createdAt: timestamp,
      })
      await ctx.db.patch(conversation._id, {
        lastMessageAt: timestamp,
        updatedAt: timestamp,
      })
      await writeAudit(ctx, {
        actorId: user._id,
        actorRole: viewer.roleLabel,
        action: "messaging.support.join",
        entityType: "conversations",
        entityId: conversation._id,
        reason: normalizeReason(args.reason) || "Permintaan dukungan pengguna",
      })
      return { joined: true }
    },
  }),

  mute: mutation({
    args: {
      conversationId: v.id("conversations"),
      hours: v.optional(v.number()),
      mutedUntil: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
      const { user } = await requireViewer(ctx, "messages.read.own")
      await requireMember(ctx, args.conversationId, user._id)
      const timestamp = now()
      const hours = Math.min(Math.max(args.hours ?? 8, 1), 720)
      const target =
        args.mutedUntil ?? timestamp + hours * 60 * MINUTE_MS
      if (target <= timestamp || target > timestamp + 30 * DAY_MS) {
        fail("INVALID_ARGUMENT", "Waktu bisukan tidak sah.")
      }
      const member = await memberRow(ctx, args.conversationId, user._id)
      if (!member) fail("NOT_FOUND", "Percakapan tidak ditemukan.")
      await ctx.db.patch(member._id, { mutedUntil: target })
      return null
    },
  }),

  unmute: mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
      const { user } = await requireViewer(ctx, "messages.read.own")
      const { member } = await requireMember(
        ctx,
        args.conversationId,
        user._id,
      )
      await ctx.db.patch(member._id, { mutedUntil: undefined })
      return null
    },
  }),

  markRead: mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
      const { user } = await requireViewer(ctx, "messages.read.own")
      const { member } = await requireMember(
        ctx,
        args.conversationId,
        user._id,
      )
      const timestamp = now()
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation_createdAt", (q) =>
          q.eq("conversationId", args.conversationId),
        )
        .collect()
      const latestCreatedAt = messages.reduce(
        (latest, message) => Math.max(latest, message.createdAt),
        0,
      )
      const lastReadAt = Math.max(
        member.lastReadAt ?? 0,
        member.joinedAt,
        latestCreatedAt,
      )
      await ctx.db.patch(member._id, {
        lastReadAt,
        lastSeenAt: timestamp,
      })
      for (const message of messages) {
        if (message.senderId === user._id) continue
        if (message.deletedAt) continue
        if (member.lastReadAt && message.createdAt <= member.lastReadAt) continue
        const existing = await ctx.db
          .query("messageReceipts")
          .withIndex("by_message_user", (q) =>
            q.eq("messageId", message._id).eq("userId", user._id),
          )
          .unique()
        if (existing) {
          await ctx.db.patch(existing._id, {
            readAt: existing.readAt ?? timestamp,
            deliveredAt: existing.deliveredAt ?? timestamp,
          })
        } else {
          await ctx.db.insert("messageReceipts", {
            messageId: message._id,
            userId: user._id,
            deliveredAt: timestamp,
            readAt: timestamp,
          })
        }
      }
      return { lastReadAt }
    },
  }),

  setTyping: mutation({
    args: { conversationId: v.id("conversations"), typing: v.boolean() },
    handler: async (ctx, args) => {
      const { user } = await requireViewer(ctx, "messages.read.own")
      const { member } = await requireMember(
        ctx,
        args.conversationId,
        user._id,
      )
      const timestamp = now()
      await ctx.db.patch(member._id, {
        typingUntil: args.typing ? timestamp + 6_000 : undefined,
        lastSeenAt: timestamp,
      })
      await ctx.db.patch(user._id, {
        lastActiveAt: timestamp,
        updatedAt: timestamp,
      })
      return null
    },
  }),

  setPresence: mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
      const { user } = await requireViewer(ctx, "messages.read.own")
      const { member } = await requireMember(
        ctx,
        args.conversationId,
        user._id,
      )
      const timestamp = now()
      await ctx.db.patch(member._id, { lastSeenAt: timestamp })
      await ctx.db.patch(user._id, {
        lastActiveAt: timestamp,
        updatedAt: timestamp,
      })
      return null
    },
  }),

  ensureSystem: internalMutation({
    args: {
      userId: v.id("users"),
      title: v.string(),
      body: v.string(),
    },
    handler: async (ctx, args): Promise<Id<"conversations">> => {
      if (!args.title.trim() || !args.body.trim()) {
        fail("INVALID_ARGUMENT", "Judul dan isi peristiwa sistem diperlukan.")
      }
      const timestamp = now()
      const conversationId = await ctx.db.insert("conversations", {
        kind: "system",
        title: args.title.trim(),
        status: "open",
        createdAt: timestamp,
        updatedAt: timestamp,
        lastMessageAt: timestamp,
      })
      await ctx.db.insert("conversationMembers", {
        conversationId,
        userId: args.userId,
        role: "owner",
        joinedAt: timestamp,
      })
      await ctx.db.insert("messages", {
        conversationId,
        kind: "system",
        body: args.body.trim(),
        createdAt: timestamp,
      })
      return conversationId
    },
  }),
}

const messages = {
  list: query({
    args: {
      conversationId: v.id("conversations"),
      before: v.optional(v.number()),
      limit: v.optional(v.number()),
    },
    handler: async (ctx, args): Promise<MessagePage> => {
      const { user, viewer } = await requireViewer(ctx, "messages.read.own")
      const conversation = await conversationOrFail(ctx, args.conversationId)
      const member = await memberRow(ctx, conversation._id, user._id)
      if (!member) {
        if (isModerator(viewer)) {
          fail(
            "FORBIDDEN",
            "Konten percakapan memerlukan break-glass dengan alasan.",
          )
        }
        fail("NOT_FOUND", "Percakapan tidak ditemukan.")
      }
      return await messagePage(ctx, conversation._id, {
        before: args.before,
        limit: args.limit,
      })
    },
  }),

  listPage: query({
    args: {
      conversationId: v.id("conversations"),
      paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
      const { user, viewer } = await requireViewer(ctx, "messages.read.own")
      const conversation = await conversationOrFail(ctx, args.conversationId)
      const member = await memberRow(ctx, conversation._id, user._id)
      if (!member) {
        if (isModerator(viewer)) {
          fail(
            "FORBIDDEN",
            "Konten percakapan memerlukan break-glass dengan alasan.",
          )
        }
        fail("NOT_FOUND", "Percakapan tidak ditemukan.")
      }
      const days = await retentionDays(ctx)
      const cutoff = retentionCutoff(now(), days)
      const result = await ctx.db
        .query("messages")
        .withIndex("by_conversation_createdAt", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .order("desc")
        .paginate(args.paginationOpts)
      return {
        ...result,
        page: await Promise.all(
          result.page
            .filter((row) => row.createdAt >= cutoff)
            .map((row) => toMessageView(ctx, row)),
        ),
      }
    },
  }),

  search: query({
    args: {
      conversationId: v.id("conversations"),
      term: v.string(),
    },
    handler: async (ctx, args): Promise<MessageView[]> => {
      const { user } = await requireViewer(ctx, "messages.read.own")
      const { conversation } = await requireMember(
        ctx,
        args.conversationId,
        user._id,
      )
      const term = args.term.trim().toLowerCase()
      if (term.length < 2) {
        fail("INVALID_ARGUMENT", "Kata pencarian minimal dua karakter.")
      }
      if (term.length > 100) {
        fail("INVALID_ARGUMENT", "Kata pencarian maksimal 100 karakter.")
      }
      const days = await retentionDays(ctx)
      const cutoff = retentionCutoff(now(), days)
      const rows = await ctx.db
        .query("messages")
        .withIndex("by_conversation_createdAt", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .order("desc")
        .take(500)
      const matches: Doc<"messages">[] = []
      for (const row of rows) {
        if (row.createdAt < cutoff || row.deletedAt) continue
        if (row.body?.toLowerCase().includes(term)) {
          matches.push(row)
          continue
        }
        const asset = await ctx.db
          .query("messageAssets")
          .withIndex("by_messageId", (q) => q.eq("messageId", row._id))
          .unique()
        if (asset?.transcript?.toLowerCase().includes(term)) {
          matches.push(row)
        }
      }
      return await Promise.all(
        matches.slice(0, 30).map((row) => toMessageView(ctx, row)),
      )
    },
  }),

  receipts: query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args): Promise<ReceiptView[]> => {
      const { user } = await requireViewer(ctx, "messages.read.own")
      await requireMember(ctx, args.conversationId, user._id)
      const members = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversationId", (q) =>
          q.eq("conversationId", args.conversationId),
        )
        .collect()
      const views: ReceiptView[] = []
      for (const member of members) {
        if (member.leftAt) continue
        const account = await ctx.db.get(member.userId)
        const receipts = await ctx.db
          .query("messageReceipts")
          .withIndex("by_userId", (q) => q.eq("userId", member.userId))
          .collect()
        let readCount = 0
        for (const receipt of receipts) {
          if (!receipt.readAt) continue
          const message = await ctx.db.get(receipt.messageId)
          if (message?.conversationId === args.conversationId) readCount += 1
        }
        views.push({
          userId: member.userId,
          name: account?.name ?? "Akun tidak ditemukan",
          initials: account?.initials ?? "?",
          lastReadAt: member.lastReadAt ?? null,
          readCount,
        })
      }
      return views
    },
  }),

  presence: query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args): Promise<PresenceView[]> => {
      const { user } = await requireViewer(ctx, "messages.read.own")
      await requireMember(ctx, args.conversationId, user._id)
      const members = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversationId", (q) =>
          q.eq("conversationId", args.conversationId),
        )
        .collect()
      const views: PresenceView[] = []
      for (const member of members) {
        if (member.leftAt) continue
        const account = await ctx.db.get(member.userId)
        views.push({
          userId: member.userId,
          name: account?.name ?? "Akun tidak ditemukan",
          initials: account?.initials ?? "?",
          lastSeenAt: member.lastSeenAt ?? account?.lastActiveAt ?? null,
          typingUntil: member.typingUntil ?? null,
        })
      }
      return views
    },
  }),

  createUploadUrl: mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
      const { user } = await requireViewer(ctx, "messages.read.own")
      const { conversation } = await requireMember(
        ctx,
        args.conversationId,
        user._id,
      )
      if (conversation.status === "archived") {
        fail("CONVERSATION_CLOSED", "Percakapan ini sudah ditutup.")
      }
      if (await messagingSuspended(ctx, user._id)) {
        fail("MESSAGING_SUSPENDED", "Pengiriman pesan dibatasi oleh pengelola.")
      }
      const timestamp = now()
      const limit = await numericSetting(
        ctx,
        "messaging.uploadLimitPerMinute",
        DEFAULT_UPLOAD_LIMIT_PER_MINUTE,
      )
      const intents = await ctx.db
        .query("messageUploadIntents")
        .withIndex("by_senderId", (q) => q.eq("senderId", user._id))
        .collect()
      const recent = intents.filter(
        (intent) => intent.createdAt > timestamp - MINUTE_MS,
      )
      if (recent.length >= limit) {
        fail("RATE_LIMITED", "Terlalu banyak unggahan. Coba lagi sebentar lagi.")
      }
      const expiresAt = timestamp + 10 * MINUTE_MS
      const uploadId = await ctx.db.insert("messageUploadIntents", {
        conversationId: conversation._id,
        senderId: user._id,
        expiresAt,
        createdAt: timestamp,
      })
      const uploadUrl = await ctx.storage.generateUploadUrl()
      return { uploadUrl, uploadId, expiresAt }
    },
  }),

  send: mutation({
    args: {
      conversationId: v.id("conversations"),
      kind: v.union(
        v.literal("text"),
        v.literal("voice"),
        v.literal("image"),
        v.literal("file"),
      ),
      body: v.optional(v.string()),
      replyToId: v.optional(v.id("messages")),
      attachment: v.optional(
        v.object({
          storageId: v.id("_storage"),
          uploadId: v.id("messageUploadIntents"),
          filename: v.string(),
          mimeType: v.string(),
          size: v.number(),
          durationMs: v.optional(v.number()),
          waveform: v.optional(v.array(v.number())),
          width: v.optional(v.number()),
          height: v.optional(v.number()),
          transcript: v.optional(v.string()),
        }),
      ),
    },
    handler: async (ctx, args): Promise<Id<"messages">> => {
      const { user, viewer } = await requireViewer(ctx, "messages.read.own")
      const { conversation, member } = await requireMember(
        ctx,
        args.conversationId,
        user._id,
      )
      await assertCanSend(ctx, viewer, conversation, member)

      const body = args.body?.trim() ?? ""
      if (body.length > MAX_TEXT_LENGTH) {
        fail("INVALID_ARGUMENT", "Pesan terlalu panjang.")
      }
      await enforceSendLimits(
        ctx,
        viewer,
        conversation._id,
        args.kind === "text" ? body : undefined,
      )

      let replyToId: Id<"messages"> | undefined
      if (args.replyToId) {
        const parent = await ctx.db.get(args.replyToId)
        if (!parent || parent.conversationId !== conversation._id) {
          fail("INVALID_ARGUMENT", "Balasan harus berada di percakapan yang sama.")
        }
        replyToId = parent._id
      }

      const timestamp = Math.max(
        now(),
        (conversation.lastMessageAt ?? 0) + 1,
      )
      let assetInput:
        | {
            storageId: GenericId<"_storage">
            filename: string
            mimeType: string
            size: number
            kind: "image" | "audio" | "file"
            durationMs?: number
            width?: number
            height?: number
            transcript?: string
          }
        | undefined

      if (args.kind === "text") {
        if (!body) fail("INVALID_ARGUMENT", "Isi pesan diperlukan.")
        if (args.attachment) {
          fail("INVALID_ARGUMENT", "Pesan teks tidak menerima lampiran.")
        }
      } else {
        if (!args.attachment) {
          fail("INVALID_ARGUMENT", "Lampiran diperlukan untuk pesan ini.")
        }
        const attachment = args.attachment
        const intent = await ctx.db.get(attachment.uploadId)
        if (
          !intent ||
          intent.senderId !== user._id ||
          intent.conversationId !== conversation._id ||
          intent.consumedAt !== undefined ||
          intent.expiresAt <= timestamp
        ) {
          fail(
            "INVALID_ARGUMENT",
            "Unggahan tidak sah, sudah dipakai, atau kedaluwarsa.",
          )
        }
        const metadata = await ctx.db.system.get(
          "_storage",
          attachment.storageId,
        )
        if (!metadata) {
          fail("INVALID_ARGUMENT", "Berkas unggahan tidak ditemukan.")
        }
        const mimeType =
          baseMimeType(metadata.contentType ?? "") ||
          baseMimeType(attachment.mimeType)
        const input = {
          filename: attachment.filename,
          mimeType,
          size: metadata.size,
          durationMs: attachment.durationMs,
          waveform: attachment.waveform,
          transcript: attachment.transcript,
          width: attachment.width,
          height: attachment.height,
        }
        const problem =
          args.kind === "voice"
            ? attachmentProblem("voice", input)
            : args.kind === "image"
              ? attachmentProblem("image", input)
              : attachmentProblem("file", input)
        if (problem) fail("INVALID_ARGUMENT", problem)

        await ctx.db.patch(intent._id, { consumedAt: timestamp })
        assetInput = {
          storageId: attachment.storageId,
          filename: attachment.filename,
          mimeType,
          size: metadata.size,
          kind:
            args.kind === "voice"
              ? "audio"
              : args.kind === "image"
                ? "image"
                : "file",
          durationMs: attachment.durationMs,
          width: attachment.width,
          height: attachment.height,
          transcript: attachment.transcript,
        }
      }

      const messageId = await ctx.db.insert("messages", {
        conversationId: conversation._id,
        senderId: user._id,
        kind: args.kind,
        body: body || undefined,
        replyToId,
        durationMs: assetInput?.durationMs,
        waveform: args.attachment?.waveform,
        containsExternalLink: body ? hasExternalLink(body) : false,
        createdAt: timestamp,
      })

      if (assetInput) {
        const assetId = await ctx.db.insert("messageAssets", {
          messageId,
          storageId: assetInput.storageId,
          senderId: user._id,
          kind: assetInput.kind,
          filename: assetInput.filename,
          mimeType: assetInput.mimeType,
          size: assetInput.size,
          durationMs: assetInput.durationMs,
          width: assetInput.width,
          height: assetInput.height,
          transcript: assetInput.transcript,
          createdAt: timestamp,
        })
        await ctx.db.patch(messageId, { assetId })
      }

      await ctx.db.patch(conversation._id, {
        lastMessageAt: timestamp,
        updatedAt: timestamp,
      })
      await notifyMembers(
        ctx,
        conversation,
        user._id,
        messageId,
        notificationPreview(args.kind, body),
      )
      return messageId
    },
  }),

  edit: mutation({
    args: { messageId: v.id("messages"), body: v.string() },
    handler: async (ctx, args) => {
      const { user, viewer } = await requireViewer(ctx, "messages.read.own")
      const message = await ctx.db.get(args.messageId)
      if (!message) fail("NOT_FOUND", "Pesan tidak ditemukan.")
      const { conversation } = await requireMember(
        ctx,
        message.conversationId,
        user._id,
      )
      if (message.senderId !== user._id) {
        fail("FORBIDDEN", "Hanya pengirim yang dapat menyunting pesannya.")
      }
      if (message.deletedAt) {
        fail("INVALID_ARGUMENT", "Pesan yang dihapus tidak dapat disunting.")
      }
      if (message.kind !== "text") {
        fail("INVALID_ARGUMENT", "Hanya pesan teks yang dapat disunting.")
      }
      const body = args.body.trim()
      if (!body) fail("INVALID_ARGUMENT", "Isi pesan diperlukan.")
      if (body.length > MAX_TEXT_LENGTH) {
        fail("INVALID_ARGUMENT", "Pesan terlalu panjang.")
      }
      if (body === message.body) return null
      const timestamp = now()
      await ctx.db.insert("messageEdits", {
        messageId: message._id,
        editorId: user._id,
        previousBody: message.body ?? "",
        nextBody: body,
        createdAt: timestamp,
      })
      await ctx.db.patch(message._id, {
        body,
        editedAt: timestamp,
        containsExternalLink: hasExternalLink(body),
      })
      await ctx.db.patch(conversation._id, { updatedAt: timestamp })
      await writeAudit(ctx, {
        actorId: user._id,
        actorRole: viewer.roleLabel,
        action: "messaging.message.edit",
        entityType: "messages",
        entityId: message._id,
        reason: "Penyuntingan oleh pengirim",
        before: { body: message.body },
        after: { body },
      })
      return null
    },
  }),

  remove: mutation({
    args: { messageId: v.id("messages"), reason: v.optional(v.string()) },
    handler: async (ctx, args) => {
      const { user, viewer } = await requireViewer(ctx, "messages.read.own")
      const message = await ctx.db.get(args.messageId)
      if (!message) fail("NOT_FOUND", "Pesan tidak ditemukan.")
      const conversation = await conversationOrFail(
        ctx,
        message.conversationId,
      )
      const member = await memberRow(ctx, conversation._id, user._id)
      if (!member) fail("NOT_FOUND", "Percakapan tidak ditemukan.")
      const timestamp = now()

      if (message.senderId === user._id) {
        await ctx.db.patch(message._id, {
          deletedAt: message.deletedAt ?? timestamp,
          deletedBy: user._id,
        })
        await writeAudit(ctx, {
          actorId: user._id,
          actorRole: viewer.roleLabel,
          action: "messaging.message.delete",
          entityType: "messages",
          entityId: message._id,
          reason: "Dihapus oleh pengirim",
          after: { conversationId: conversation._id },
        })
        return null
      }
      if (!isModerator(viewer)) {
        fail("FORBIDDEN", "Hanya pengirim yang dapat menghapus pesannya.")
      }
      const problem = reasonProblem(args.reason)
      if (problem) fail("REASON_REQUIRED", problem)
      await ctx.db.patch(message._id, {
        deletedAt: message.deletedAt ?? timestamp,
        deletedBy: user._id,
        removedBy: user._id,
        removalReason: normalizeReason(args.reason),
      })
      await writeAudit(ctx, {
        actorId: user._id,
        actorRole: viewer.roleLabel,
        action: "messaging.moderation.remove",
        entityType: "messages",
        entityId: message._id,
        reason: normalizeReason(args.reason),
        after: { conversationId: conversation._id },
        severity: "warning",
      })
      return null
    },
  }),

  report: mutation({
    args: { messageId: v.id("messages"), reason: v.string() },
    handler: async (ctx, args): Promise<Id<"messageFlags">> => {
      const { user } = await requireViewer(ctx, "messages.read.own")
      const message = await ctx.db.get(args.messageId)
      if (!message) fail("NOT_FOUND", "Pesan tidak ditemukan.")
      await requireMember(ctx, message.conversationId, user._id)
      if (message.senderId === user._id) {
        fail("SELF_DEALING", "Pesan sendiri tidak dapat dilaporkan.")
      }
      const reason = args.reason.trim()
      if (reason.length < 5) {
        fail("REASON_REQUIRED", "Alasan laporan minimal lima karakter.")
      }
      const existing = await ctx.db
        .query("messageFlags")
        .withIndex("by_reportedBy", (q) => q.eq("reportedBy", user._id))
        .collect()
      const duplicate = existing.find(
        (flag) => flag.messageId === message._id && flag.status === "open",
      )
      if (duplicate) return duplicate._id

      const timestamp = now()
      const flagId = await ctx.db.insert("messageFlags", {
        messageId: message._id,
        reportedBy: user._id,
        reason,
        status: "open",
        createdAt: timestamp,
      })
      const conversation = await ctx.db.get(message.conversationId)
      if (conversation) {
        await ctx.db.patch(conversation._id, {
          status: "flagged",
          updatedAt: timestamp,
        })
      }
      await notifyAdmins(ctx, {
        template: "moderation.report",
        title: "Laporan pesan baru",
        body: reason,
        payload: {
          conversationId: message.conversationId,
          messageId: message._id,
        },
      })
      return flagId
    },
  }),
}

function notificationPreview(
  kind: "text" | "voice" | "image" | "file",
  body: string,
): string {
  if (kind === "voice") return "Catatan suara"
  if (kind === "image") return "Gambar"
  if (kind === "file") return "Berkas"
  return body.slice(0, 120)
}

const blocks = {
  create: mutation({
    args: { userId: v.id("users"), reason: v.optional(v.string()) },
    handler: async (ctx, args): Promise<Id<"blocks">> => {
      const { user, viewer } = await requireViewer(ctx, "messages.read.own")
      if (args.userId === user._id) {
        fail("SELF_DEALING", "Akun sendiri tidak dapat diblokir.")
      }
      const target = await ctx.db.get(args.userId)
      if (!target) fail("NOT_FOUND", "Akun tidak ditemukan.")
      const existing = await ctx.db
        .query("blocks")
        .withIndex("by_blocker_blocked", (q) =>
          q.eq("blockerId", user._id).eq("blockedId", args.userId),
        )
        .unique()
      if (existing) return existing._id
      const timestamp = now()
      const blockId = await ctx.db.insert("blocks", {
        blockerId: user._id,
        blockedId: args.userId,
        reason: args.reason,
        createdAt: timestamp,
      })
      await writeAudit(ctx, {
        actorId: user._id,
        actorRole: viewer.roleLabel,
        action: "messaging.block",
        entityType: "users",
        entityId: args.userId,
        reason: normalizeReason(args.reason),
      })
      return blockId
    },
  }),

  remove: mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
      const { user, viewer } = await requireViewer(ctx, "messages.read.own")
      const rows = await ctx.db
        .query("blocks")
        .withIndex("by_blockerId", (q) => q.eq("blockerId", user._id))
        .collect()
      for (const row of rows) {
        if (row.blockedId !== args.userId) continue
        await ctx.db.delete(row._id)
      }
      await writeAudit(ctx, {
        actorId: user._id,
        actorRole: viewer.roleLabel,
        action: "messaging.unblock",
        entityType: "users",
        entityId: args.userId,
      })
      return null
    },
  }),
}

const moderation = {
  listFlags: query({
    args: {
      status: v.optional(
        v.union(
          v.literal("open"),
          v.literal("reviewing"),
          v.literal("resolved"),
          v.literal("dismissed"),
        ),
      ),
    },
    handler: async (ctx, args): Promise<ModerationFlagView[]> => {
      await requireViewer(ctx, "messages.moderate")
      const flags = args.status
        ? await ctx.db
            .query("messageFlags")
            .withIndex("by_status", (q) => q.eq("status", args.status!))
            .collect()
        : (await ctx.db.query("messageFlags").collect()).filter((flag) =>
            ["open", "reviewing"].includes(flag.status),
          )
      const views: ModerationFlagView[] = []
      for (const flag of flags) {
        const message = await ctx.db.get(flag.messageId)
        if (!message) continue
        const reporter = await ctx.db.get(flag.reportedBy)
        views.push({
          id: flag._id,
          messageId: flag.messageId,
          conversationId: message.conversationId,
          reporterId: flag.reportedBy,
          reporterName: reporter?.name ?? "Akun tidak ditemukan",
          reason: flag.reason,
          status: flag.status,
          createdAt: flag.createdAt,
          resolvedAt: flag.resolvedAt ?? null,
          resolution: flag.resolution ?? null,
        })
      }
      return views.sort((a, b) => b.createdAt - a.createdAt)
    },
  }),

  grantBreakGlass: mutation({
    args: {
      conversationId: v.id("conversations"),
      reason: v.string(),
      minutes: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
      const { user, viewer } = await requireViewer(ctx, "messages.moderate")
      const conversation = await conversationOrFail(ctx, args.conversationId)
      const problem = reasonProblem(args.reason)
      if (problem) {
        await writeAudit(ctx, {
          actorId: user._id,
          actorRole: viewer.roleLabel,
          action: "messaging.breakGlass.denied",
          entityType: "conversations",
          entityId: conversation._id,
          reason: "Alasan tidak memenuhi syarat",
          severity: "warning",
        })
        return { granted: false, reason: problem }
      }
      const flagged = await activeFlagCount(ctx, conversation._id)
      if (conversation.kind !== "support" && flagged === 0) {
        await writeAudit(ctx, {
          actorId: user._id,
          actorRole: viewer.roleLabel,
          action: "messaging.breakGlass.denied",
          entityType: "conversations",
          entityId: conversation._id,
          reason: normalizeReason(args.reason),
          severity: "warning",
        })
        return {
          granted: false,
          reason:
            "Konten hanya dapat dibuka untuk percakapan dukungan atau kasus terlapor.",
        }
      }
      const timestamp = now()
      const minutes = Math.min(
        Math.max(args.minutes ?? DEFAULT_GRANT_MINUTES, 1),
        MAX_GRANT_MINUTES,
      )
      const expiresAt = timestamp + minutes * MINUTE_MS
      const grantId = await ctx.db.insert("messageAccessGrants", {
        conversationId: conversation._id,
        actorId: user._id,
        reason: normalizeReason(args.reason),
        expiresAt,
        createdAt: timestamp,
      })
      await writeAudit(ctx, {
        actorId: user._id,
        actorRole: viewer.roleLabel,
        action: "messaging.breakGlass.grant",
        entityType: "conversations",
        entityId: conversation._id,
        reason: normalizeReason(args.reason),
        after: { grantId, expiresAt, minutes },
        severity: "warning",
      })
      return { granted: true, grantId, expiresAt }
    },
  }),

  readContent: mutation({
    args: {
      conversationId: v.id("conversations"),
      before: v.optional(v.number()),
      limit: v.optional(v.number()),
    },
    handler: async (
      ctx,
      args,
    ): Promise<
      MessagePage & { access: "granted" | "denied"; reason?: string }
    > => {
      const { user, viewer } = await requireViewer(ctx, "messages.moderate")
      const conversation = await conversationOrFail(ctx, args.conversationId)
      const member = await memberRow(ctx, conversation._id, user._id)
      if (member) {
        return {
          access: "granted",
          ...(await messagePage(ctx, conversation._id, {
            before: args.before,
            limit: args.limit,
          })),
        }
      }
      const grant = await activeGrant(ctx, conversation._id, user._id)
      if (!grant) {
        await writeAudit(ctx, {
          actorId: user._id,
          actorRole: viewer.roleLabel,
          action: "messaging.breakGlass.denied",
          entityType: "conversations",
          entityId: conversation._id,
          reason: "Tanpa grant aktif",
          severity: "warning",
        })
        return {
          access: "denied",
          messages: [],
          hasMore: false,
          reason: "Konten percakapan memerlukan break-glass dengan alasan.",
        }
      }
      const page = await messagePage(ctx, conversation._id, {
        before: args.before,
        limit: args.limit,
      })
      await writeAudit(ctx, {
        actorId: user._id,
        actorRole: viewer.roleLabel,
        action: "messaging.breakGlass.access",
        entityType: "conversations",
        entityId: conversation._id,
        reason: grant.reason,
        after: { grantId: grant._id, messages: page.messages.length },
        severity: "warning",
      })
      return { access: "granted", ...page }
    },
  }),

  resolveFlag: mutation({
    args: {
      flagId: v.id("messageFlags"),
      decision: v.union(v.literal("resolved"), v.literal("dismissed")),
      resolution: v.string(),
      removeMessage: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
      const { user, viewer } = await requireViewer(ctx, "messages.moderate")
      const flag = await ctx.db.get(args.flagId)
      if (!flag) fail("NOT_FOUND", "Laporan tidak ditemukan.")
      if (!["open", "reviewing"].includes(flag.status)) {
        fail("INVALID_TRANSITION", "Laporan ini sudah ditutup.")
      }
      const problem = reasonProblem(args.resolution)
      if (problem) fail("REASON_REQUIRED", problem)
      const timestamp = now()
      await ctx.db.patch(flag._id, {
        status: args.decision,
        reviewedBy: user._id,
        resolution: normalizeReason(args.resolution),
        resolvedAt: timestamp,
      })
      const message = await ctx.db.get(flag.messageId)
      if (args.removeMessage && message) {
        if (message.deletedAt) {
          // A repeated removal is a no-op on the message but still audited once.
        } else {
          await ctx.db.patch(message._id, {
            deletedAt: timestamp,
            deletedBy: user._id,
            removedBy: user._id,
            removalReason: normalizeReason(args.resolution),
          })
        }
        await writeAudit(ctx, {
          actorId: user._id,
          actorRole: viewer.roleLabel,
          action: "messaging.moderation.remove",
          entityType: "messages",
          entityId: message._id,
          reason: normalizeReason(args.resolution),
          after: { flagId: flag._id, conversationId: message.conversationId },
          severity: "warning",
        })
      }
      await writeAudit(ctx, {
        actorId: user._id,
        actorRole: viewer.roleLabel,
        action: "messaging.moderation.resolveFlag",
        entityType: "messageFlags",
        entityId: flag._id,
        reason: normalizeReason(args.resolution),
        after: { decision: args.decision },
        severity: "warning",
      })
      const conversationId = message?.conversationId
      if (conversationId) {
        const remaining = await activeFlagCount(ctx, conversationId)
        const conversation = await ctx.db.get(conversationId)
        if (remaining === 0 && conversation?.status === "flagged") {
          await ctx.db.patch(conversationId, {
            status: "open",
            updatedAt: timestamp,
          })
        }
      }
      await createInAppNotification(ctx, {
        recipientId: flag.reportedBy,
        template: "moderation.reviewed",
        title: "Laporan pesan ditinjau",
        body: "Tim moderasi sudah meninjau laporanmu.",
        payload: { conversationId: message?.conversationId },
      })
      return null
    },
  }),

  act: mutation({
    args: {
      conversationId: v.id("conversations"),
      action: v.union(
        v.literal("warn"),
        v.literal("mute"),
        v.literal("suspend_messaging"),
        v.literal("close_conversation"),
        v.literal("remove_message"),
      ),
      targetUserId: v.optional(v.id("users")),
      messageId: v.optional(v.id("messages")),
      reason: v.string(),
    },
    handler: async (ctx, args) => {
      const { user, viewer } = await requireViewer(ctx, "messages.moderate")
      const conversation = await conversationOrFail(ctx, args.conversationId)
      const problem = reasonProblem(args.reason)
      if (problem) fail("REASON_REQUIRED", problem)
      const reason = normalizeReason(args.reason)
      const timestamp = now()

      if (args.action === "close_conversation") {
        await ctx.db.patch(conversation._id, {
          status: "archived",
          updatedAt: timestamp,
        })
        await writeAudit(ctx, {
          actorId: user._id,
          actorRole: viewer.roleLabel,
          action: "messaging.moderation.close",
          entityType: "conversations",
          entityId: conversation._id,
          reason,
          severity: "warning",
        })
        return null
      }

      if (args.action === "remove_message") {
        if (!args.messageId) {
          fail("INVALID_ARGUMENT", "Pesan yang akan dihapus diperlukan.")
        }
        const message = await ctx.db.get(args.messageId)
        if (!message || message.conversationId !== conversation._id) {
          fail("NOT_FOUND", "Pesan tidak ditemukan di percakapan ini.")
        }
        await ctx.db.patch(message._id, {
          deletedAt: message.deletedAt ?? timestamp,
          deletedBy: user._id,
          removedBy: user._id,
          removalReason: reason,
        })
        await writeAudit(ctx, {
          actorId: user._id,
          actorRole: viewer.roleLabel,
          action: "messaging.moderation.remove",
          entityType: "messages",
          entityId: message._id,
          reason,
          after: { conversationId: conversation._id },
          severity: "warning",
        })
        return null
      }

      if (!args.targetUserId) {
        fail("INVALID_ARGUMENT", "Akun sasaran diperlukan.")
      }
      if (args.targetUserId === user._id) {
        fail("SELF_DEALING", "Tindakan moderasi tidak dapat ditujukan ke diri sendiri.")
      }
      const target = await ctx.db.get(args.targetUserId)
      if (!target) fail("NOT_FOUND", "Akun sasaran tidak ditemukan.")
      const targetMember = await memberRow(
        ctx,
        conversation._id,
        args.targetUserId,
      )

      if (args.action === "warn") {
        await createInAppNotification(ctx, {
          recipientId: target._id,
          template: "moderation.warning",
          title: "Peringatan pedoman percakapan",
          body: reason,
          payload: { conversationId: conversation._id },
        })
        await writeAudit(ctx, {
          actorId: user._id,
          actorRole: viewer.roleLabel,
          action: "messaging.moderation.warn",
          entityType: "users",
          entityId: target._id,
          reason,
          severity: "warning",
        })
        return null
      }

      if (args.action === "mute") {
        if (!targetMember) {
          fail("NOT_FOUND", "Akun sasaran bukan anggota percakapan ini.")
        }
        await ctx.db.patch(targetMember._id, {
          mutedUntil: timestamp + DAY_MS,
        })
        await writeAudit(ctx, {
          actorId: user._id,
          actorRole: viewer.roleLabel,
          action: "messaging.moderation.mute",
          entityType: "conversations",
          entityId: conversation._id,
          reason,
          after: { targetUserId: target._id, mutedUntil: timestamp + DAY_MS },
          severity: "warning",
        })
        return null
      }

      await ctx.db.insert("messagingRestrictions", {
        userId: target._id,
        actorId: user._id,
        reason,
        until: timestamp + DAY_MS,
        createdAt: timestamp,
      })
      await writeAudit(ctx, {
        actorId: user._id,
        actorRole: viewer.roleLabel,
        action: "messaging.moderation.suspend",
        entityType: "users",
        entityId: target._id,
        reason,
        after: { until: timestamp + DAY_MS },
        severity: "warning",
      })
      return null
    },
  }),
}


// Convex registers top-level function exports; the grouped objects above are
// internal organisation only. These aliases keep one messaging module without
// nesting function paths.
export const listConversations = conversations.list
export const listContacts = conversations.contacts
export const getConversation = conversations.get
export const startDirect = conversations.startDirect
export const startCohort = conversations.startCohort
export const startSupport = conversations.startSupport
export const joinSupport = conversations.joinSupport
export const muteConversation = conversations.mute
export const unmuteConversation = conversations.unmute
export const markRead = conversations.markRead
export const setTyping = conversations.setTyping
export const setPresence = conversations.setPresence
export const ensureSystemConversation = conversations.ensureSystem

export const listMessages = messages.list
export const listMessagePage = messages.listPage
export const searchMessages = messages.search
export const listReceipts = messages.receipts
export const listPresence = messages.presence
export const createUploadUrl = messages.createUploadUrl
export const sendMessage = messages.send
export const editMessage = messages.edit
export const removeMessage = messages.remove
export const reportMessage = messages.report

export const blockUser = blocks.create
export const unblockUser = blocks.remove

export const listFlags = moderation.listFlags
export const grantBreakGlass = moderation.grantBreakGlass
export const readContent = moderation.readContent
export const resolveFlag = moderation.resolveFlag
export const moderateMessage = moderation.act
