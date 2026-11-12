import { ConvexError, v } from "convex/values"

import type { Viewer } from "../lib/access/viewer"
import {
  CALL_CAPACITY,
  canJoinCall,
  consentState,
  internalKindFor,
  isTerminalCallStatus,
  joinBlockedReason as callJoinBlockedReason,
  publicKindFor,
  qualitySummaryFor,
  roomNameForCall,
} from "../lib/calls/policy"
import type {
  CallAcceptResult,
  CallDeclineResult,
  CallDetail,
  CallEndResult,
  CallKind,
  CallOverview,
  CallParticipantRole,
  CallParticipantView,
  CallRecordingConsent,
  CallRecordingConsentResult,
  CallRecordingView,
  CallScope,
  CallStartResult,
  CallStatusCounts,
  CallSummary,
} from "../lib/calls/types"
import { requireCapability, viewerForUser } from "./access"
import type { Doc, Id } from "./_generated/dataModel"
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"
import { createInAppNotification } from "./notifications"

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000

type DbCtx = Pick<QueryCtx | MutationCtx, "db">

type ParticipantSeed = {
  userId: Id<"users">
  role: CallParticipantRole
}

type BuiltParticipants = {
  hostId: Id<"users">
  title: string
  scope: CallScope
  conversationId?: Id<"conversations">
  cohortId?: Id<"cohorts">
  cohortSessionId?: Id<"cohortSessions">
  participants: ParticipantSeed[]
}

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

async function requireCallsViewer(
  ctx: QueryCtx | MutationCtx,
): Promise<{ user: Doc<"users">; viewer: Viewer }> {
  const account = await currentAccount(ctx)
  if (!account) fail("UNAUTHENTICATED", "Masuk diperlukan.")
  if (account.viewer.status !== "active") {
    fail("SUSPENDED", "Akun ini sedang ditangguhkan.")
  }
  if (
    !account.viewer.capabilities.includes("calls.start") &&
    !account.viewer.capabilities.includes("calls.monitor")
  ) {
    fail("FORBIDDEN", "Kemampuan panggilan tidak dimiliki akun ini.")
  }
  return account
}

async function requireStarter(
  ctx: QueryCtx | MutationCtx,
): Promise<{ user: Doc<"users">; viewer: Viewer }> {
  const account = await requireCallsViewer(ctx)
  requireCapability(account.viewer, "calls.start")
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

async function requireNotRestricted(
  ctx: DbCtx,
  userId: Id<"users">,
): Promise<void> {
  if (await messagingSuspended(ctx, userId)) {
    fail("MESSAGING_SUSPENDED", "Panggilan dibatasi oleh pengelola.")
  }
}

async function callOrNotFound(
  ctx: DbCtx,
  callId: Id<"callSessions">,
): Promise<Doc<"callSessions">> {
  const call = await ctx.db.get(callId)
  if (!call) fail("NOT_FOUND", "Panggilan tidak ditemukan.")
  return call
}

async function participantRow(
  ctx: DbCtx,
  callId: Id<"callSessions">,
  userId: Id<"users">,
): Promise<Doc<"callParticipants"> | null> {
  return await ctx.db
    .query("callParticipants")
    .withIndex("by_call_user", (q) =>
      q.eq("callId", callId).eq("userId", userId),
    )
    .unique()
}

async function requireParticipant(
  ctx: DbCtx,
  callId: Id<"callSessions">,
  userId: Id<"users">,
): Promise<Doc<"callParticipants">> {
  const participant = await participantRow(ctx, callId, userId)
  if (!participant) fail("NOT_FOUND", "Panggilan tidak ditemukan.")
  return participant
}

function hostIdOf(call: Doc<"callSessions">): Id<"users"> {
  return call.hostId ?? call.initiatorId
}

function isHost(call: Doc<"callSessions">, userId: Id<"users">): boolean {
  return hostIdOf(call) === userId
}

async function assertCallMembership(
  ctx: DbCtx,
  call: Doc<"callSessions">,
  userId: Id<"users">,
): Promise<void> {
  if (call.conversationId) {
    const conversation = await ctx.db.get(call.conversationId)
    if (!conversation) fail("NOT_FOUND", "Panggilan tidak ditemukan.")
    const member = await memberRow(ctx, conversation._id, userId)
    if (!member) fail("NOT_FOUND", "Panggilan tidak ditemukan.")
    return
  }
  if (call.cohortId) {
    const cohort = await ctx.db.get(call.cohortId)
    if (!cohort) fail("NOT_FOUND", "Panggilan tidak ditemukan.")
    if (cohort.teacherId === userId) return
    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_student_cohort", (q) =>
        q.eq("studentId", userId).eq("cohortId", cohort._id),
      )
      .unique()
    if (!enrollment || !["active", "completed"].includes(enrollment.status)) {
      fail("NOT_FOUND", "Panggilan tidak ditemukan.")
    }
  }
}

async function conversationScopeKind(
  ctx: DbCtx,
  conversationId: Id<"conversations">,
): Promise<"direct" | "cohort" | "support" | "system" | null> {
  const conversation = await ctx.db.get(conversationId)
  return conversation?.kind ?? null
}

async function scopeForCall(
  ctx: DbCtx,
  call: Doc<"callSessions">,
): Promise<CallScope> {
  if (call.cohortId || call.cohortSessionId) return "cohort"
  if (call.conversationId) {
    const kind = await conversationScopeKind(ctx, call.conversationId)
    if (kind === "support") return "support"
    if (kind === "cohort") return "cohort"
  }
  return "direct"
}

function sortParticipants(rows: Doc<"callParticipants">[]) {
  const roleOrder: Record<CallParticipantRole, number> = {
    host: 0,
    support: 1,
    guest: 2,
  }
  return [...rows].sort(
    (a, b) => roleOrder[a.role] - roleOrder[b.role],
  )
}

async function participantViews(
  ctx: DbCtx,
  rows: Doc<"callParticipants">[],
): Promise<CallParticipantView[]> {
  const views: CallParticipantView[] = []
  for (const row of sortParticipants(rows)) {
    const account = await ctx.db.get(row.userId)
    views.push({
      userId: row.userId,
      name: account?.name ?? "Akun tidak ditemukan",
      initials: account?.initials ?? "?",
      role: row.role,
      status: row.status ?? (row.joinedAt ? "joined" : "invited"),
      joinedAt: row.joinedAt ?? null,
      leftAt: row.leftAt ?? null,
      quality: row.quality ?? null,
    })
  }
  return views
}

function consentParticipantIds(rows: Doc<"callParticipants">[]): Id<"users">[] {
  return rows
    .filter(
      (row) => row.status !== "declined" && row.status !== "left",
    )
    .map((row) => row.userId)
}

async function toCallDetail(
  ctx: DbCtx,
  viewer: Viewer,
  call: Doc<"callSessions">,
): Promise<CallDetail> {
  const rows = await ctx.db
    .query("callParticipants")
    .withIndex("by_callId", (q) => q.eq("callId", call._id))
    .collect()
  const participant = rows.find(
    (row) => row.userId === (viewer.userId as Id<"users">),
  )
  const monitorOnly = !viewer.capabilities.includes("calls.start")
  const viewerRole = participant?.role ?? null
  const status = call.status
  let accessReason: string | null = null
  if (!monitorOnly && participant) {
    if (await messagingSuspended(ctx, viewer.userId as Id<"users">)) {
      accessReason = "MESSAGING_SUSPENDED"
    } else if (
      await directBlockedForCall(ctx, call, viewer.userId as Id<"users">)
    ) {
      accessReason = "BLOCKED"
    }
  }
  const joinable =
    !accessReason && canJoinCall({ status, viewerRole, monitorOnly })
  const consentIds = call.recordingConsentUserIds ?? []
  const endedBy = call.endedBy ?? null
  const endedByAccount = endedBy ? await ctx.db.get(endedBy) : null

  const recordingRows = await ctx.db
    .query("callRecordings")
    .withIndex("by_callId", (q) => q.eq("callId", call._id))
    .collect()
  const recordings: CallRecordingView[] = []
  for (const row of recordingRows.sort((a, b) => b.createdAt - a.createdAt)) {
    const consentedBy: CallRecordingView["consentedBy"] = []
    for (const userId of row.consentedBy) {
      const account = await ctx.db.get(userId)
      consentedBy.push({
        userId,
        name: account?.name ?? "Akun tidak ditemukan",
      })
    }
    recordings.push({
      id: row._id,
      createdAt: row.createdAt,
      retentionUntil: row.retentionUntil,
      consentedBy,
      accessLogCount: row.accessLog.length,
    })
  }

  return {
    id: call._id,
    roomName: call.roomName,
    kind: publicKindFor(call.kind),
    scope: await scopeForCall(ctx, call),
    title: call.title ?? "Panggilan",
    status,
    initiatorId: call.initiatorId,
    hostId: hostIdOf(call),
    conversationId: call.conversationId ?? null,
    cohortId: call.cohortId ?? null,
    cohortSessionId: call.cohortSessionId ?? null,
    scheduledAt: call.scheduledAt ?? null,
    scheduledEndsAt: call.scheduledEndsAt ?? null,
    startedAt: call.startedAt ?? null,
    endedAt: call.endedAt ?? null,
    endedBy,
    endedByName: endedByAccount?.name ?? null,
    cancelledAt: call.cancelledAt ?? null,
    endReason: call.endReason ?? null,
    durationMs: call.durationMs ?? null,
    recordingConsent: call.recordingConsent,
    recordingEnabled: call.recordingEnabled ?? false,
    recordingConsentUserIds: consentIds,
    recordingConsentRequired: consentParticipantIds(rows).length,
    qualitySummary: call.qualitySummary ?? null,
    recordings,
    participants: await participantViews(ctx, rows),
    viewerRole,
    isHost: Boolean(participant && participant.role === "host"),
    canJoin: joinable,
    canEnd: Boolean(
      participant &&
        participant.role === "host" &&
        (status === "ringing" || status === "active"),
    ),
    monitorOnly,
    joinBlockedReason: joinable
      ? null
      : (accessReason ??
        callJoinBlockedReason({ status, viewerRole, monitorOnly })),
    createdAt: call.createdAt,
  }
}

async function toCallSummary(
  ctx: DbCtx,
  call: Doc<"callSessions">,
  viewerId: Id<"users"> | null,
): Promise<CallSummary> {
  const rows = await ctx.db
    .query("callParticipants")
    .withIndex("by_callId", (q) => q.eq("callId", call._id))
    .collect()
  const host = await ctx.db.get(hostIdOf(call))
  const viewerParticipant = viewerId
    ? rows.find((row) => row.userId === viewerId)
    : null
  return {
    id: call._id,
    kind: publicKindFor(call.kind),
    scope: await scopeForCall(ctx, call),
    title: call.title ?? "Panggilan",
    status: call.status,
    initiatorId: call.initiatorId,
    hostId: hostIdOf(call),
    hostName: host?.name ?? "Akun tidak ditemukan",
    conversationId: call.conversationId ?? null,
    cohortId: call.cohortId ?? null,
    cohortSessionId: call.cohortSessionId ?? null,
    scheduledAt: call.scheduledAt ?? null,
    scheduledEndsAt: call.scheduledEndsAt ?? null,
    startedAt: call.startedAt ?? null,
    endedAt: call.endedAt ?? null,
    durationMs: call.durationMs ?? null,
    participantCount: rows.length,
    recordingConsent: call.recordingConsent,
    viewerRole: viewerParticipant?.role ?? null,
  }
}

async function notifyCallParticipants(
  ctx: MutationCtx,
  input: {
    callId: Id<"callSessions">
    actorId: Id<"users">
    template: string
    title: string
    body: string
    onlyRole?: CallParticipantRole
  },
): Promise<void> {
  const rows = await ctx.db
    .query("callParticipants")
    .withIndex("by_callId", (q) => q.eq("callId", input.callId))
    .collect()
  for (const row of rows) {
    if (row.userId === input.actorId) continue
    if (input.onlyRole && row.role !== input.onlyRole) continue
    await createInAppNotification(ctx, {
      recipientId: row.userId,
      template: input.template,
      title: input.title,
      body: input.body,
      entityType: "callSessions",
      entityId: input.callId,
      payload: { callId: input.callId },
      idempotencyKey: `call:${input.callId}:${input.template}:${row.userId}`,
    })
  }
}

async function notifyAdmins(
  ctx: MutationCtx,
  input: { callId: Id<"callSessions">; title: string; body: string },
): Promise<void> {
  const users = await ctx.db.query("users").collect()
  for (const user of users) {
    if (!user.roles.includes("admin") || user.status !== "active") continue
    await createInAppNotification(ctx, {
      recipientId: user._id,
      template: "call.reported",
      title: input.title,
      body: input.body,
      entityType: "callSessions",
      entityId: input.callId,
      payload: { callId: input.callId },
      idempotencyKey: `call:${input.callId}:reported:${user._id}`,
    })
  }
}

async function conversationParticipants(
  ctx: DbCtx,
  user: Doc<"users">,
  conversation: Doc<"conversations">,
): Promise<BuiltParticipants> {
  if (conversation.kind === "system") {
    fail("FORBIDDEN", "Percakapan sistem tidak dapat memulai panggilan.")
  }

  if (conversation.kind === "cohort") {
    if (!conversation.cohortId) {
      fail("NOT_FOUND", "Kohort percakapan tidak ditemukan.")
    }
    const cohort = await ctx.db.get(conversation.cohortId)
    if (!cohort) fail("NOT_FOUND", "Kohort tidak ditemukan.")
    if (cohort.teacherId !== user._id) {
      fail("FORBIDDEN", "Hanya pengajar kohort yang dapat memulai panggilan kohort.")
    }
    await requireNotRestricted(ctx, user._id)
    const participants: ParticipantSeed[] = [
      { userId: cohort.teacherId, role: "host" },
    ]
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_cohortId", (q) => q.eq("cohortId", cohort._id))
      .collect()
    for (const enrollment of enrollments) {
      if (!["active", "completed"].includes(enrollment.status)) continue
      if (enrollment.studentId === cohort.teacherId) continue
      if (await messagingSuspended(ctx, enrollment.studentId)) continue
      if (await isBlocked(ctx, cohort.teacherId, enrollment.studentId)) continue
      const student = await ctx.db.get(enrollment.studentId)
      if (!student || student.status !== "active") continue
      participants.push({ userId: enrollment.studentId, role: "guest" })
    }
    return {
      hostId: cohort.teacherId,
      title: cohort.title,
      scope: "cohort",
      conversationId: conversation._id,
      cohortId: cohort._id,
      participants,
    }
  }

  const members = await ctx.db
    .query("conversationMembers")
    .withIndex("by_conversationId", (q) =>
      q.eq("conversationId", conversation._id),
    )
    .collect()
  const activeMembers = members.filter((row) => !row.leftAt)
  if (activeMembers.length === 0) {
    fail("NOT_FOUND", "Percakapan tidak ditemukan.")
  }
  await requireNotRestricted(ctx, user._id)

  if (conversation.kind === "direct") {
    if (activeMembers.length !== 2) {
      fail("CONVERSATION_CLOSED", "Percakapan langsung tidak lagi aktif.")
    }
    const peerRow = activeMembers.find((row) => row.userId !== user._id)
    if (!peerRow) {
      fail("NOT_FOUND", "Lawan bicara tidak ditemukan.")
    }
    const peer = await ctx.db.get(peerRow.userId)
    if (!peer || peer.status !== "active") {
      fail("NOT_FOUND", "Lawan bicara tidak ditemukan.")
    }
    await requireNotRestricted(ctx, peer._id)
    if (await isBlocked(ctx, user._id, peer._id)) {
      fail("BLOCKED", "Panggilan ini diblokir.")
    }
    return {
      hostId: user._id,
      title: `Panggilan dengan ${peer.name}`,
      scope: "direct",
      conversationId: conversation._id,
      participants: [
        { userId: user._id, role: "host" },
        { userId: peer._id, role: "guest" },
      ],
    }
  }

  const participants: ParticipantSeed[] = []
  for (const member of activeMembers) {
    const account = await ctx.db.get(member.userId)
    if (!account || account.status !== "active") continue
    if (member.userId !== user._id) {
      if (await messagingSuspended(ctx, member.userId)) continue
      if (await isBlocked(ctx, user._id, member.userId)) continue
    }
    participants.push({
      userId: member.userId,
      role:
        member.userId === user._id
          ? "host"
          : member.role === "support"
            ? "support"
            : "guest",
    })
  }

  return {
    hostId: user._id,
    title: conversation.title ?? "Panggilan dukungan",
    scope: "support",
    conversationId: conversation._id,
    participants,
  }
}

async function cohortSessionParticipants(
  ctx: DbCtx,
  user: Doc<"users">,
  session: Doc<"cohortSessions">,
): Promise<BuiltParticipants> {
  const cohort = await ctx.db.get(session.cohortId)
  if (!cohort) fail("NOT_FOUND", "Kohort tidak ditemukan.")
  if (cohort.teacherId !== user._id) {
    fail("FORBIDDEN", "Hanya pengajar kohort yang dapat memulai panggilan sesi.")
  }
  if (session.status === "cancelled" || session.status === "ended") {
    fail("CALL_UNAVAILABLE", "Sesi ini sudah berakhir.")
  }
  if (cohort.status === "cancelled") {
    fail("CALL_UNAVAILABLE", "Kohort ini sudah dibatalkan.")
  }
  await requireNotRestricted(ctx, user._id)

  const participants: ParticipantSeed[] = [
    { userId: cohort.teacherId, role: "host" },
  ]
  const enrollments = await ctx.db
    .query("enrollments")
    .withIndex("by_cohortId", (q) => q.eq("cohortId", cohort._id))
    .collect()
  for (const enrollment of enrollments) {
    if (!["active", "completed"].includes(enrollment.status)) continue
    if (enrollment.studentId === cohort.teacherId) continue
    if (await messagingSuspended(ctx, enrollment.studentId)) continue
    if (await isBlocked(ctx, cohort.teacherId, enrollment.studentId)) continue
    const student = await ctx.db.get(enrollment.studentId)
    if (!student || student.status !== "active") continue
    participants.push({ userId: enrollment.studentId, role: "guest" })
  }

  return {
    hostId: cohort.teacherId,
    title: session.title,
    scope: "cohort",
    cohortId: cohort._id,
    cohortSessionId: session._id,
    participants,
  }
}

async function createCall(
  ctx: MutationCtx,
  input: {
    initiator: Doc<"users">
    viewer: Viewer
    kind: CallKind
    status: "ringing" | "scheduled"
    built: BuiltParticipants
    scheduledAt?: number
    scheduledEndsAt?: number
  },
): Promise<CallStartResult> {
  if (input.built.participants.length > CALL_CAPACITY) {
    fail("CALL_CAPACITY", "Panggilan kohort dibatasi 25 peserta pada versi ini.")
  }
  const timestamp = now()
  const callId = await ctx.db.insert("callSessions", {
    roomName: "pending",
    kind: internalKindFor(input.kind),
    initiatorId: input.initiator._id,
    hostId: input.built.hostId,
    cohortId: input.built.cohortId,
    conversationId: input.built.conversationId,
    cohortSessionId: input.built.cohortSessionId,
    title: input.built.title,
    status: input.status,
    scheduledAt: input.scheduledAt,
    scheduledEndsAt: input.scheduledEndsAt,
    recordingConsent: "pending",
    recordingConsentUserIds: [],
    recordingDeclinedBy: [],
    recordingEnabled: false,
    createdAt: timestamp,
  })
  await ctx.db.patch(callId, { roomName: roomNameForCall(callId) })
  for (const participant of input.built.participants) {
    await ctx.db.insert("callParticipants", {
      callId,
      userId: participant.userId,
      role: participant.role,
      status: "invited",
      invitedAt: timestamp,
    })
  }
  await ctx.db.insert("callEvents", {
    callId,
    kind: input.status === "scheduled" ? "scheduled" : "ringing",
    actorId: input.initiator._id,
    payload: {
      kind: input.kind,
      scope: input.built.scope,
      source: input.built.cohortSessionId
        ? "cohort_session"
        : input.built.cohortId
          ? "cohort"
          : "conversation",
    },
    createdAt: timestamp,
  })
  await writeAudit(ctx, {
    actorId: input.initiator._id,
    actorRole: input.viewer.roleLabel,
    action:
      input.status === "scheduled" ? "calls.schedule" : "calls.start",
    entityType: "callSessions",
    entityId: callId,
    reason: input.built.title,
    after: {
      kind: input.kind,
      scope: input.built.scope,
      participants: input.built.participants.length,
      scheduledAt: input.scheduledAt ?? null,
    },
  })
  if (input.status === "ringing") {
    await notifyCallParticipants(ctx, {
      callId,
      actorId: input.initiator._id,
      template: "call.ringing",
      title: `Panggilan dari ${input.initiator.name}`,
      body: input.built.title,
    })
  }
  return {
    callId,
    status: input.status,
    kind: input.kind,
    scope: input.built.scope,
  }
}

async function directBlockedForCall(
  ctx: DbCtx,
  call: Doc<"callSessions">,
  userId: Id<"users">,
): Promise<boolean> {
  if (!call.conversationId) return false
  const kind = await conversationScopeKind(ctx, call.conversationId)
  if (kind !== "direct") return false
  const rows = await ctx.db
    .query("callParticipants")
    .withIndex("by_callId", (q) => q.eq("callId", call._id))
    .collect()
  const peer = rows.find((row) => row.userId !== userId)
  const blocked = peer ? await isBlocked(ctx, userId, peer.userId) : false
  if (!peer) return false
  return blocked
}

export const startCall = mutation({
  args: {
    conversationId: v.optional(v.id("conversations")),
    cohortSessionId: v.optional(v.id("cohortSessions")),
    kind: v.union(v.literal("audio"), v.literal("video")),
  },
  handler: async (ctx, args): Promise<CallStartResult> => {
    const { user, viewer } = await requireStarter(ctx)
    const origins = Number(Boolean(args.conversationId)) + Number(Boolean(args.cohortSessionId))
    if (origins !== 1) {
      fail(
        "INVALID_ARGUMENT",
        "Panggilan harus berasal dari satu percakapan atau sesi kohort.",
      )
    }

    if (args.conversationId) {
      const conversation = await ctx.db.get(args.conversationId)
      if (!conversation) fail("NOT_FOUND", "Percakapan tidak ditemukan.")
      const member = await memberRow(ctx, conversation._id, user._id)
      if (!member) fail("NOT_FOUND", "Percakapan tidak ditemukan.")
      if (conversation.status === "archived") {
        fail("CONVERSATION_CLOSED", "Percakapan ini sudah ditutup.")
      }
      const built = await conversationParticipants(ctx, user, conversation)
      return await createCall(ctx, {
        initiator: user,
        viewer,
        kind: args.kind,
        status: "ringing",
        built,
      })
    }

    const session = await ctx.db.get(args.cohortSessionId!)
    if (!session) fail("NOT_FOUND", "Sesi kohort tidak ditemukan.")
    const built = await cohortSessionParticipants(ctx, user, session)
    return await createCall(ctx, {
      initiator: user,
      viewer,
      kind: args.kind,
      status: "ringing",
      built,
    })
  },
})

export const scheduleCall = mutation({
  args: {
    conversationId: v.optional(v.id("conversations")),
    cohortSessionId: v.optional(v.id("cohortSessions")),
    kind: v.union(v.literal("audio"), v.literal("video")),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<CallStartResult> => {
    const { user, viewer } = await requireStarter(ctx)
    const origins = Number(Boolean(args.conversationId)) + Number(Boolean(args.cohortSessionId))
    if (origins !== 1) {
      fail(
        "INVALID_ARGUMENT",
        "Jadwal panggilan harus berasal dari satu percakapan atau sesi kohort.",
      )
    }
    const timestamp = now()

    if (args.conversationId) {
      const conversation = await ctx.db.get(args.conversationId)
      if (!conversation) fail("NOT_FOUND", "Percakapan tidak ditemukan.")
      const member = await memberRow(ctx, conversation._id, user._id)
      if (!member) fail("NOT_FOUND", "Percakapan tidak ditemukan.")
      if (conversation.status === "archived") {
        fail("CONVERSATION_CLOSED", "Percakapan ini sudah ditutup.")
      }
      const startsAt = args.startsAt
      if (!startsAt || !Number.isFinite(startsAt) || startsAt <= timestamp) {
        fail("INVALID_ARGUMENT", "Waktu mulai panggilan harus di masa depan.")
      }
      if (args.endsAt !== undefined && args.endsAt <= startsAt) {
        fail("INVALID_ARGUMENT", "Waktu selesai harus setelah waktu mulai.")
      }
      const built = await conversationParticipants(ctx, user, conversation)
      return await createCall(ctx, {
        initiator: user,
        viewer,
        kind: args.kind,
        status: "scheduled",
        built,
        scheduledAt: startsAt,
        scheduledEndsAt: args.endsAt,
      })
    }

    const session = await ctx.db.get(args.cohortSessionId!)
    if (!session) fail("NOT_FOUND", "Sesi kohort tidak ditemukan.")
    const built = await cohortSessionParticipants(ctx, user, session)
    const startsAt =
      args.startsAt ?? Math.max(session.startsAt, timestamp + MINUTE_MS)
    if (!Number.isFinite(startsAt) || startsAt <= timestamp) {
      fail("INVALID_ARGUMENT", "Waktu mulai panggilan harus di masa depan.")
    }
    const endsAt =
      args.endsAt ?? Math.max(session.endsAt, startsAt + MINUTE_MS)
    if (endsAt <= startsAt) {
      fail("INVALID_ARGUMENT", "Waktu selesai harus setelah waktu mulai.")
    }
    return await createCall(ctx, {
      initiator: user,
      viewer,
      kind: args.kind,
      status: "scheduled",
      built,
      scheduledAt: startsAt,
      scheduledEndsAt: endsAt,
    })
  },
})

export const ring = mutation({
  args: { callId: v.id("callSessions") },
  handler: async (ctx, args): Promise<{ status: "ringing" }> => {
    const { user, viewer } = await requireStarter(ctx)
    const call = await callOrNotFound(ctx, args.callId)
    const participant = await requireParticipant(ctx, call._id, user._id)
    if (!isHost(call, user._id)) {
      fail("FORBIDDEN", "Hanya tuan rumah yang dapat memulai dering.")
    }
    if (participant.status === "declined") {
      fail("INVALID_TRANSITION", "Panggilan ini telah ditolak.")
    }
    if (call.status === "scheduled") {
      await ctx.db.patch(call._id, { status: "ringing" })
      await ctx.db.insert("callEvents", {
        callId: call._id,
        kind: "ringing",
        actorId: user._id,
        payload: { scheduledAt: call.scheduledAt ?? null },
        createdAt: now(),
      })
      await notifyCallParticipants(ctx, {
        callId: call._id,
        actorId: user._id,
        template: "call.ringing",
        title: `Panggilan dari ${user.name}`,
        body: call.title ?? "Panggilan kohort",
      })
      await writeAudit(ctx, {
        actorId: user._id,
        actorRole: viewer.roleLabel,
        action: "calls.ring",
        entityType: "callSessions",
        entityId: call._id,
      })
      return { status: "ringing" }
    }
    if (call.status === "ringing") return { status: "ringing" }
    fail("INVALID_TRANSITION", "Panggilan ini tidak dapat dimulai.")
  },
})

export const accept = mutation({
  args: { callId: v.id("callSessions") },
  handler: async (ctx, args): Promise<CallAcceptResult> => {
    const { user, viewer } = await requireStarter(ctx)
    const call = await callOrNotFound(ctx, args.callId)
    const participant = await requireParticipant(ctx, call._id, user._id)
    await requireNotRestricted(ctx, user._id)
    await assertCallMembership(ctx, call, user._id)
    if (await directBlockedForCall(ctx, call, user._id)) {
      fail("BLOCKED", "Panggilan ini diblokir.")
    }
    if (participant.status === "declined") {
      fail("INVALID_TRANSITION", "Panggilan ini telah ditolak.")
    }

    const timestamp = now()
    if (call.status === "active") {
      await ctx.db.patch(participant._id, {
        status: "joined",
        joinedAt: participant.joinedAt ?? timestamp,
      })
      await ctx.db.insert("callEvents", {
        callId: call._id,
        kind: "joined",
        actorId: user._id,
        payload: { waiting: false },
        createdAt: timestamp,
      })
      return { status: "active", waiting: false }
    }
    if (call.status !== "ringing") {
      fail("INVALID_TRANSITION", "Panggilan ini tidak dapat diterima.")
    }

    await ctx.db.patch(participant._id, {
      status: "joined",
      joinedAt: participant.joinedAt ?? timestamp,
    })
    if (isHost(call, user._id)) {
      await ctx.db.patch(call._id, {
        status: "active",
        startedAt: timestamp,
      })
      await ctx.db.insert("callEvents", {
        callId: call._id,
        kind: "accepted",
        actorId: user._id,
        payload: { waiting: false, host: true },
        createdAt: timestamp,
      })
      await writeAudit(ctx, {
        actorId: user._id,
        actorRole: viewer.roleLabel,
        action: "calls.accept",
        entityType: "callSessions",
        entityId: call._id,
      })
      return { status: "active", waiting: false }
    }

    await ctx.db.insert("callEvents", {
      callId: call._id,
      kind: "joined",
      actorId: user._id,
      payload: { waiting: true },
      createdAt: timestamp,
    })
    return { status: "ringing", waiting: true }
  },
})

export const decline = mutation({
  args: {
    callId: v.id("callSessions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<CallDeclineResult> => {
    const { user, viewer } = await requireStarter(ctx)
    const call = await callOrNotFound(ctx, args.callId)
    const participant = await requireParticipant(ctx, call._id, user._id)
    if (isHost(call, user._id)) {
      fail("FORBIDDEN", "Tuan rumah menutup panggilan dengan Akhiri.")
    }
    if (!["scheduled", "ringing"].includes(call.status)) {
      fail("INVALID_TRANSITION", "Panggilan ini tidak dapat ditolak.")
    }
    if (participant.status === "declined") {
      return { status: call.status, declined: true }
    }
    const timestamp = now()
    await ctx.db.patch(participant._id, {
      status: "declined",
      leftAt: timestamp,
    })
    const rows = await ctx.db
      .query("callParticipants")
      .withIndex("by_callId", (q) => q.eq("callId", call._id))
      .collect()
    const remaining = rows.filter(
      (row) =>
        row.userId !== hostIdOf(call) &&
        row.status !== "declined" &&
        row.status !== "left",
    )
    const terminal = rows.length <= 2 || remaining.length === 0
    if (terminal) {
      await ctx.db.patch(call._id, {
        status: "declined",
        endedAt: timestamp,
        durationMs: 0,
        endReason: args.reason?.trim() || "Ditolak peserta",
      })
      await notifyCallParticipants(ctx, {
        callId: call._id,
        actorId: user._id,
        template: "call.declined",
        title: "Panggilan ditolak",
        body: `${user.name} tidak dapat menerima panggilan.`,
        onlyRole: "host",
      })
    }
    await ctx.db.insert("callEvents", {
      callId: call._id,
      kind: "declined",
      actorId: user._id,
      payload: { terminal, reason: args.reason ?? null },
      createdAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: user._id,
      actorRole: viewer.roleLabel,
      action: "calls.decline",
      entityType: "callSessions",
      entityId: call._id,
      reason: args.reason,
      after: { terminal },
    })
    return { status: terminal ? "declined" : call.status, declined: true }
  },
})

export const end = mutation({
  args: {
    callId: v.id("callSessions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<CallEndResult> => {
    const { user, viewer } = await requireStarter(ctx)
    const call = await callOrNotFound(ctx, args.callId)
    const participant = await requireParticipant(ctx, call._id, user._id)
    if (!isHost(call, user._id)) {
      fail("FORBIDDEN", "Hanya tuan rumah yang dapat mengakhiri panggilan.")
    }
    if (call.status === "ended") {
      return { status: "ended", durationMs: call.durationMs ?? 0 }
    }
    if (!["ringing", "active"].includes(call.status)) {
      fail("INVALID_TRANSITION", "Panggilan ini tidak dapat diakhiri.")
    }
    if (participant.status === "declined") {
      fail("INVALID_TRANSITION", "Panggilan ini telah ditolak.")
    }

    const timestamp = now()
    const startedAt = call.startedAt ?? timestamp
    const durationMs = Math.max(0, timestamp - startedAt)
    const rows = await ctx.db
      .query("callParticipants")
      .withIndex("by_callId", (q) => q.eq("callId", call._id))
      .collect()
    const named = []
    for (const row of rows) {
      const account = await ctx.db.get(row.userId)
      named.push({
        name: account?.name ?? "Akun tidak ditemukan",
        quality: row.quality ?? null,
      })
    }
    const qualitySummary = qualitySummaryFor(named)

    await ctx.db.patch(call._id, {
      status: "ended",
      endedAt: timestamp,
      endedBy: user._id,
      endReason: args.reason?.trim() || undefined,
      durationMs,
      qualitySummary: qualitySummary ?? undefined,
    })
    for (const row of rows) {
      if (row.leftAt) continue
      await ctx.db.patch(row._id, {
        status: "left",
        leftAt: timestamp,
      })
    }
    await ctx.db.insert("callEvents", {
      callId: call._id,
      kind: "ended",
      actorId: user._id,
      payload: { durationMs, qualitySummary },
      createdAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: user._id,
      actorRole: viewer.roleLabel,
      action: "calls.end",
      entityType: "callSessions",
      entityId: call._id,
      reason: args.reason,
      after: { durationMs, qualitySummary },
    })
    return { status: "ended", durationMs }
  },
})

export const markMissed = mutation({
  args: {
    callId: v.id("callSessions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ status: "missed" }> => {
    const { user, viewer } = await requireStarter(ctx)
    const call = await callOrNotFound(ctx, args.callId)
    await requireParticipant(ctx, call._id, user._id)
    if (!isHost(call, user._id)) {
      fail("FORBIDDEN", "Hanya tuan rumah yang dapat menandai panggilan terlewat.")
    }
    if (call.status === "missed") return { status: "missed" }
    if (!["scheduled", "ringing"].includes(call.status)) {
      fail("INVALID_TRANSITION", "Panggilan ini tidak dapat ditandai terlewat.")
    }
    const timestamp = now()
    await ctx.db.patch(call._id, {
      status: "missed",
      endedAt: timestamp,
      durationMs: 0,
      endReason: args.reason?.trim() || "Tidak dijawab",
    })
    await ctx.db.insert("callEvents", {
      callId: call._id,
      kind: "missed",
      actorId: user._id,
      payload: { reason: args.reason ?? null },
      createdAt: timestamp,
    })
    await notifyCallParticipants(ctx, {
      callId: call._id,
      actorId: user._id,
      template: "call.missed",
      title: "Panggilan terlewat",
      body: call.title ?? "Panggilan tidak dijawab.",
    })
    await writeAudit(ctx, {
      actorId: user._id,
      actorRole: viewer.roleLabel,
      action: "calls.missed",
      entityType: "callSessions",
      entityId: call._id,
      reason: args.reason,
    })
    return { status: "missed" }
  },
})

export const cancelCall = mutation({
  args: {
    callId: v.id("callSessions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ status: "cancelled" }> => {
    const { user, viewer } = await requireStarter(ctx)
    const call = await callOrNotFound(ctx, args.callId)
    await requireParticipant(ctx, call._id, user._id)
    if (!isHost(call, user._id)) {
      fail("FORBIDDEN", "Hanya tuan rumah yang dapat membatalkan panggilan.")
    }
    if (call.status === "cancelled") return { status: "cancelled" }
    if (!["scheduled", "ringing"].includes(call.status)) {
      fail("INVALID_TRANSITION", "Panggilan ini tidak dapat dibatalkan.")
    }
    const timestamp = now()
    await ctx.db.patch(call._id, {
      status: "cancelled",
      cancelledAt: timestamp,
      endedAt: timestamp,
      durationMs: 0,
      endReason: args.reason?.trim() || "Dibatalkan tuan rumah",
    })
    await ctx.db.insert("callEvents", {
      callId: call._id,
      kind: "cancelled",
      actorId: user._id,
      payload: { reason: args.reason ?? null },
      createdAt: timestamp,
    })
    await notifyCallParticipants(ctx, {
      callId: call._id,
      actorId: user._id,
      template: "call.cancelled",
      title: "Panggilan dibatalkan",
      body: call.title ?? "Panggilan dibatalkan oleh tuan rumah.",
    })
    await writeAudit(ctx, {
      actorId: user._id,
      actorRole: viewer.roleLabel,
      action: "calls.cancel",
      entityType: "callSessions",
      entityId: call._id,
      reason: args.reason,
    })
    return { status: "cancelled" }
  },
})

export const recordParticipant = mutation({
  args: {
    callId: v.id("callSessions"),
    event: v.union(v.literal("join"), v.literal("leave"), v.literal("quality")),
    quality: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    const { user } = await requireStarter(ctx)
    const call = await callOrNotFound(ctx, args.callId)
    const participant = await requireParticipant(ctx, call._id, user._id)
    if (isTerminalCallStatus(call.status)) {
      fail("CALL_ENDED", "Panggilan ini sudah berakhir.")
    }
    if (participant.status === "declined") {
      fail("INVALID_TRANSITION", "Panggilan ini telah ditolak.")
    }
    const timestamp = now()

    if (args.event === "join") {
      await ctx.db.patch(participant._id, {
        status: "joined",
        joinedAt: participant.joinedAt ?? timestamp,
      })
      await ctx.db.insert("callEvents", {
        callId: call._id,
        kind: "joined",
        actorId: user._id,
        payload: { transport: "livekit" },
        createdAt: timestamp,
      })
      return null
    }

    if (args.event === "leave") {
      await ctx.db.patch(participant._id, {
        status: "left",
        leftAt: participant.leftAt ?? timestamp,
      })
      await ctx.db.insert("callEvents", {
        callId: call._id,
        kind: "left",
        actorId: user._id,
        payload: {},
        createdAt: timestamp,
      })
      return null
    }

    const quality = args.quality?.trim().slice(0, 40)
    if (!quality) fail("INVALID_ARGUMENT", "Ringkasan kualitas diperlukan.")
    await ctx.db.patch(participant._id, { quality })
    await ctx.db.insert("callEvents", {
      callId: call._id,
      kind: "quality",
      actorId: user._id,
      payload: { quality },
      createdAt: timestamp,
    })
    return null
  },
})

export const setRecordingConsent = mutation({
  args: {
    callId: v.id("callSessions"),
    consent: v.boolean(),
  },
  handler: async (ctx, args): Promise<CallRecordingConsentResult> => {
    const { user, viewer } = await requireStarter(ctx)
    const call = await callOrNotFound(ctx, args.callId)
    await requireParticipant(ctx, call._id, user._id)
    if (isTerminalCallStatus(call.status)) {
      fail("CALL_ENDED", "Panggilan ini sudah berakhir.")
    }

    const rows = await ctx.db
      .query("callParticipants")
      .withIndex("by_callId", (q) => q.eq("callId", call._id))
      .collect()
    const required = consentParticipantIds(rows)
    const declined = new Set(call.recordingDeclinedBy ?? [])
    const consented = new Set(call.recordingConsentUserIds ?? [])

    if (args.consent) {
      if (declined.size === 0) consented.add(user._id)
    } else {
      declined.add(user._id)
      consented.delete(user._id)
    }

    const state: CallRecordingConsent = consentState({
      participantIds: required,
      consentedIds: [...consented],
      declinedIds: [...declined],
    })

    await ctx.db.patch(call._id, {
      recordingConsent: state,
      recordingConsentUserIds: [...consented],
      recordingDeclinedBy: [...declined],
      recordingEnabled: false,
    })
    await ctx.db.insert("callEvents", {
      callId: call._id,
      kind: "recording",
      actorId: user._id,
      payload: {
        consent: args.consent,
        state,
        consentCount: consented.size,
        required: required.length,
        egress: false,
      },
      createdAt: now(),
    })
    await writeAudit(ctx, {
      actorId: user._id,
      actorRole: viewer.roleLabel,
      action: "calls.recording.consent",
      entityType: "callSessions",
      entityId: call._id,
      after: { consent: args.consent, state, consented: consented.size },
      severity: "warning",
    })

    return {
      recordingConsent: state,
      recordingEnabled: false,
      recordingConsentRequired: required.length,
      consented: consented.size,
    }
  },
})

export const reportCall = mutation({
  args: { callId: v.id("callSessions"), reason: v.string() },
  handler: async (ctx, args): Promise<null> => {
    const { user, viewer } = await requireStarter(ctx)
    const call = await callOrNotFound(ctx, args.callId)
    await requireParticipant(ctx, call._id, user._id)
    const reason = args.reason.trim()
    if (reason.length < 5) {
      fail("REASON_REQUIRED", "Alasan laporan minimal lima karakter.")
    }
    await writeAudit(ctx, {
      actorId: user._id,
      actorRole: viewer.roleLabel,
      action: "calls.report",
      entityType: "callSessions",
      entityId: call._id,
      reason: reason.slice(0, 400),
      severity: "warning",
    })
    await notifyAdmins(ctx, {
      callId: call._id,
      title: "Laporan panggilan baru",
      body: reason.slice(0, 200),
    })
    return null
  },
})

export const getCall = query({
  args: { callId: v.id("callSessions") },
  handler: async (ctx, args): Promise<CallDetail> => {
    const { user, viewer } = await requireCallsViewer(ctx)
    const call = await callOrNotFound(ctx, args.callId)
    const participant = await participantRow(ctx, call._id, user._id)
    const monitorOnly = !viewer.capabilities.includes("calls.start")

    if (!monitorOnly) {
      if (!participant) fail("NOT_FOUND", "Panggilan tidak ditemukan.")
      await assertCallMembership(ctx, call, user._id)
    }
    return await toCallDetail(ctx, viewer, call)
  },
})

export const listUpcoming = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<CallSummary[]> => {
    const { user } = await requireCallsViewer(ctx)
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50)
    const rows = await ctx.db
      .query("callParticipants")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect()
    const calls: Doc<"callSessions">[] = []
    for (const row of rows) {
      if (row.status === "declined") continue
      const call = await ctx.db.get(row.callId)
      if (!call) continue
      if (call.status !== "scheduled" && call.status !== "ringing") continue
      calls.push(call)
    }
    const summaries = await Promise.all(
      calls.map((call) => toCallSummary(ctx, call, user._id)),
    )
    return summaries
      .sort(
        (a, b) =>
          (a.scheduledAt ?? a.startedAt ?? 0) -
          (b.scheduledAt ?? b.startedAt ?? 0),
      )
      .slice(0, limit)
  },
})

export const listHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<CallSummary[]> => {
    const { user } = await requireCallsViewer(ctx)
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50)
    const rows = await ctx.db
      .query("callParticipants")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect()
    const calls: Doc<"callSessions">[] = []
    for (const row of rows) {
      const call = await ctx.db.get(row.callId)
      if (!call) continue
      if (!isTerminalCallStatus(call.status)) continue
      calls.push(call)
    }
    const summaries = await Promise.all(
      calls.map((call) => toCallSummary(ctx, call, user._id)),
    )
    return summaries
      .sort(
        (a, b) =>
          (b.endedAt ?? b.scheduledAt ?? b.startedAt ?? 0) -
          (a.endedAt ?? a.scheduledAt ?? a.startedAt ?? 0),
      )
      .slice(0, limit)
  },
})

export const callOverview = query({
  args: {},
  handler: async (ctx): Promise<CallOverview> => {
    const { viewer } = await requireCallsViewer(ctx)
    requireCapability(viewer, "calls.monitor")
    const calls = await ctx.db.query("callSessions").collect()
    const counts: CallStatusCounts = {
      scheduled: 0,
      ringing: 0,
      active: 0,
      ended: 0,
      missed: 0,
      declined: 0,
      cancelled: 0,
    }
    let activeParticipants = 0
    let scheduledNext24h = 0
    let recordingPending = 0
    const timestamp = now()
    for (const call of calls) {
      counts[call.status] += 1
      if (call.status === "active") {
        const rows = await ctx.db
          .query("callParticipants")
          .withIndex("by_callId", (q) => q.eq("callId", call._id))
          .collect()
        activeParticipants += rows.filter((row) => !row.leftAt).length
        if (call.recordingConsent === "pending") recordingPending += 1
      }
      if (
        call.status === "scheduled" &&
        call.scheduledAt !== undefined &&
        call.scheduledAt >= timestamp &&
        call.scheduledAt <= timestamp + DAY_MS
      ) {
        scheduledNext24h += 1
      }
    }
    const recentCalls = [...calls]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 12)
    const recent = await Promise.all(
      recentCalls.map((call) => toCallSummary(ctx, call, null)),
    )
    return {
      counts,
      activeParticipants,
      scheduledNext24h,
      recordingPending,
      recent,
    }
  },
})
