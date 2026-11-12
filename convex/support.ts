import { ConvexError, v } from "convex/values"

import { flowSpec } from "../lib/flows/definitions"
import type {
  SupportCannedReplyView,
  SupportLink,
  SupportMessageView,
  SupportQueueSummary,
  SupportTicketDetail,
  SupportTicketSummary,
} from "../lib/support/types"
import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import { viewerForUser } from "./access"
import { appendAudit } from "./audit"

const MINUTE_MS = 60_000
const TICKET_PREFIX = "DKN"
const DEFAULT_SUPPORT_SLA_MINUTES = flowSpec("support").sla.targetMinutes

const statusValidator = v.union(
  v.literal("open"),
  v.literal("pending"),
  v.literal("resolved"),
  v.literal("closed"),
)
const priorityValidator = v.union(
  v.literal("low"),
  v.literal("normal"),
  v.literal("high"),
  v.literal("urgent"),
)
const channelValidator = v.union(
  v.literal("chat"),
  v.literal("email"),
  v.literal("whatsapp"),
)
const linkTypeValidator = v.union(
  v.literal("account"),
  v.literal("order"),
  v.literal("payment"),
  v.literal("enrollment"),
  v.literal("certificate"),
  v.literal("work"),
  v.literal("conversation"),
)
const linkValidator = v.object({
  type: linkTypeValidator,
  id: v.string(),
  label: v.optional(v.string()),
})
const cannedCategoryValidator = v.union(
  v.literal("payment"),
  v.literal("content"),
  v.literal("trust_safety"),
  v.literal("technical"),
  v.literal("general"),
)
const escalationValidator = v.union(
  v.literal("payment"),
  v.literal("content"),
  v.literal("trust_safety"),
  v.literal("technical"),
)

function fail(code: string, message: string): never {
  throw new ConvexError({ code, message })
}

function ticketCode(): string {
  const year = new Date().getUTCFullYear()
  const random = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0
  return `${TICKET_PREFIX}-${year}-${String(random % 1_000_000).padStart(6, "0")}`
}

async function uniqueTicketCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = ticketCode()
    const existing = await ctx.db
      .query("supportTickets")
      .withIndex("by_code", (q) => q.eq("code", candidate))
      .unique()
    if (!existing) return candidate
  }
  fail("CODE_EXHAUSTED", "Kode tiket tidak dapat dibuat. Coba lagi.")
}

type SupportViewer = {
  user: Doc<"users">
  viewer: Awaited<ReturnType<typeof viewerForUser>>
  admin: boolean
}

async function resolveSupportViewer(
  ctx: QueryCtx | MutationCtx,
): Promise<SupportViewer> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) fail("UNAUTHENTICATED", "Masuk diperlukan.")
  const user = await ctx.db
    .query("users")
    .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
    .unique()
  if (!user) fail("UNAUTHENTICATED", "Masuk diperlukan.")
  if (user.status !== "active") fail("SUSPENDED", "Akun ini sedang ditangguhkan.")
  const viewer = await viewerForUser(ctx, user)
  const admin = viewer.capabilities.includes("support.manage")
  if (!admin && !viewer.capabilities.includes("support.request")) {
    fail("FORBIDDEN", "Akun ini tidak memiliki akses dukungan.")
  }
  return { user, viewer, admin }
}

async function supportSlaMinutes(
  ctx: QueryCtx | MutationCtx,
): Promise<number> {
  const rows = await ctx.db
    .query("slaPolicies")
    .withIndex("by_flowKey", (q) => q.eq("flowKey", "support"))
    .collect()
  const active = rows
    .filter((row) => row.active)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]
  return active?.targetMinutes ?? DEFAULT_SUPPORT_SLA_MINUTES
}

async function userNames(
  ctx: QueryCtx | MutationCtx,
): Promise<Map<string, string>> {
  const users = await ctx.db.query("users").collect()
  return new Map(users.map((user) => [user._id, user.name]))
}

async function toSummary(
  ctx: QueryCtx | MutationCtx,
  ticket: Doc<"supportTickets">,
  names: Map<string, string>,
  slaMinutes: number,
): Promise<SupportTicketSummary> {
  const messages = await ctx.db
    .query("supportMessages")
    .withIndex("by_ticketId", (q) => q.eq("ticketId", ticket._id))
    .collect()
  const last = messages.sort((a, b) => b.createdAt - a.createdAt)[0]
  const timestamp = Date.now()
  const ageMinutes = Math.max(
    0,
    Math.floor((timestamp - ticket.createdAt) / MINUTE_MS),
  )
  const firstResponseMinutes = ticket.firstResponseAt
    ? Math.max(
        1,
        Math.floor((ticket.firstResponseAt - ticket.createdAt) / MINUTE_MS),
      )
    : null
  const dueAt = ticket.createdAt + slaMinutes * MINUTE_MS

  return {
    id: ticket._id,
    code: ticket.code,
    subject: ticket.subject,
    requesterId: ticket.requesterId ?? null,
    requesterName: ticket.requesterName ?? "Belum diisi",
    requesterEmail: ticket.requesterEmail ?? null,
    priority: ticket.priority,
    status: ticket.status,
    assigneeId: ticket.assigneeId ?? null,
    assigneeName: ticket.assigneeId
      ? (names.get(ticket.assigneeId) ?? null)
      : null,
    channel: ticket.channel,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    ageMinutes,
    firstResponseAt: ticket.firstResponseAt ?? null,
    firstResponseMinutes,
    slaMinutes,
    slaBreached: !ticket.firstResponseAt && timestamp > dueAt,
    escalatedTo: ticket.escalatedTo ?? null,
    links: (ticket.linkedRecords ?? []) as SupportLink[],
    messageCount: messages.length,
    lastMessagePreview: last
      ? `${last.kind === "internal" ? "[catatan internal] " : ""}${last.body.slice(0, 120)}`
      : null,
  }
}

type ListArgs = {
  view?: "inbox" | "mine" | "all"
  status?: "open" | "pending" | "resolved" | "closed"
  priority?: "low" | "normal" | "high" | "urgent"
  q?: string
}

export const list = query({
  args: {
    view: v.optional(v.union(v.literal("inbox"), v.literal("mine"), v.literal("all"))),
    status: v.optional(statusValidator),
    priority: v.optional(priorityValidator),
    q: v.optional(v.string()),
  },
  handler: async (ctx, args: ListArgs): Promise<SupportTicketSummary[]> => {
    const { user, admin } = await resolveSupportViewer(ctx)
    const slaMinutes = await supportSlaMinutes(ctx)
    const names = await userNames(ctx)
    const all = await ctx.db.query("supportTickets").collect()

    const needle = args.q?.trim().toLowerCase() ?? ""
    const mineOnly = !admin || args.view === "mine"
    const rows = all
      .filter((ticket) => !mineOnly || ticket.requesterId === user._id)
      .filter((ticket) => (admin ? true : ticket.requesterId === user._id))
      .filter((ticket) => !args.status || ticket.status === args.status)
      .filter((ticket) => !args.priority || ticket.priority === args.priority)
      .filter((ticket) => {
        if (!needle) return true
        const haystack = `${ticket.code} ${ticket.subject} ${ticket.requesterName ?? ""} ${ticket.requesterEmail ?? ""}`.toLowerCase()
        return haystack.includes(needle)
      })

    const summaries = await Promise.all(
      rows.map((ticket) => toSummary(ctx, ticket, names, slaMinutes)),
    )
    const priorityRank = { urgent: 0, high: 1, normal: 2, low: 3 }
    return summaries.sort((a, b) => {
      const statusRank = { open: 0, pending: 1, resolved: 2, closed: 3 }
      if (statusRank[a.status] !== statusRank[b.status]) {
        return statusRank[a.status] - statusRank[b.status]
      }
      if (priorityRank[a.priority] !== priorityRank[b.priority]) {
        return priorityRank[a.priority] - priorityRank[b.priority]
      }
      return a.createdAt - b.createdAt
    })
  },
})

export const get = query({
  args: { ticketId: v.id("supportTickets") },
  handler: async (ctx, args): Promise<SupportTicketDetail | null> => {
    const { user, admin } = await resolveSupportViewer(ctx)
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) return null
    if (!admin && ticket.requesterId !== user._id) return null

    const slaMinutes = await supportSlaMinutes(ctx)
    const names = await userNames(ctx)
    const summary = await toSummary(ctx, ticket, names, slaMinutes)
    const messages = await ctx.db
      .query("supportMessages")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", ticket._id))
      .collect()
    const visible = messages
      .filter((message) => admin || message.kind !== "internal")
      .sort((a, b) => a.createdAt - b.createdAt)

    const views: SupportMessageView[] = visible.map((message) => ({
      id: message._id,
      kind: message.kind,
      authorName: message.authorId
        ? (names.get(message.authorId) ?? "Tidak ditemukan")
        : "Sistem",
      body: message.body,
      createdAt: message.createdAt,
    }))

    return {
      ...summary,
      messages: views,
      resolutionNote: ticket.resolutionNote ?? null,
      resolvedAt: ticket.resolvedAt ?? null,
      closedAt: ticket.closedAt ?? null,
      reopenedAt: ticket.reopenedAt ?? null,
      escalationReason: ticket.escalationReason ?? null,
      sourceConversationId: ticket.sourceConversationId ?? null,
      assignedAt: ticket.assignedAt ?? null,
      assignedBy: ticket.assignedBy ?? null,
      assignedByName: ticket.assignedBy
        ? (names.get(ticket.assignedBy) ?? null)
        : null,
      resolvedBy: ticket.resolvedBy ?? null,
      resolvedByName: ticket.resolvedBy
        ? (names.get(ticket.resolvedBy) ?? null)
        : null,
      lastResponseAt: ticket.lastResponseAt ?? null,
      canReply: ticket.status !== "closed",
    }
  },
})

export const queueSummary = query({
  args: {},
  handler: async (ctx): Promise<SupportQueueSummary> => {
    const { admin } = await resolveSupportViewer(ctx)
    if (!admin) fail("FORBIDDEN", "Hanya pengelola dukungan yang dapat melihat antrean.")
    const slaMinutes = await supportSlaMinutes(ctx)
    const tickets = await ctx.db.query("supportTickets").collect()
    const timestamp = Date.now()
    return {
      open: tickets.filter((ticket) => ticket.status === "open").length,
      pending: tickets.filter((ticket) => ticket.status === "pending").length,
      resolved: tickets.filter((ticket) => ticket.status === "resolved").length,
      breached: tickets.filter(
        (ticket) =>
          !ticket.firstResponseAt &&
          ["open", "pending"].includes(ticket.status) &&
          timestamp > ticket.createdAt + slaMinutes * MINUTE_MS,
      ).length,
      unassigned: tickets.filter(
        (ticket) =>
          !ticket.assigneeId && ["open", "pending"].includes(ticket.status),
      ).length,
    }
  },
})

export const create = mutation({
  args: {
    subject: v.string(),
    body: v.optional(v.string()),
    priority: v.optional(priorityValidator),
    channel: v.optional(channelValidator),
    links: v.optional(v.array(linkValidator)),
    sourceConversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const { user, viewer } = await resolveSupportViewer(ctx)
    const subject = args.subject.trim()
    if (subject.length < 4) fail("INVALID_TICKET", "Subjek tiket terlalu pendek.")
    if (args.body && args.body.trim().length < 4) {
      fail("INVALID_TICKET", "Isi tiket terlalu pendek.")
    }
    if (args.sourceConversationId) {
      const conversation = await ctx.db.get(args.sourceConversationId)
      if (!conversation) fail("NOT_FOUND", "Percakapan tidak ditemukan.")
      const member = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversation_user", (q) =>
          q
            .eq("conversationId", args.sourceConversationId as Id<"conversations">)
            .eq("userId", user._id),
        )
        .unique()
      if (!member) fail("NOT_FOUND", "Percakapan tidak ditemukan.")
    }

    const timestamp = Date.now()
    const code = await uniqueTicketCode(ctx)
    const ticketId = await ctx.db.insert("supportTickets", {
      code,
      requesterId: user._id,
      requesterName: user.name,
      requesterEmail: user.email,
      subject,
      priority: args.priority ?? "normal",
      status: "open",
      channel: args.channel ?? "chat",
      linkedRecords: args.links,
      sourceConversationId: args.sourceConversationId,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    if (args.body?.trim()) {
      await ctx.db.insert("supportMessages", {
        ticketId,
        authorId: user._id,
        kind: "user",
        body: args.body.trim(),
        createdAt: timestamp,
      })
    }
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "support.create",
      entityType: "supportTickets",
      entityId: ticketId,
      reason: `Tiket baru: ${subject}`,
      after: { code, subject, priority: args.priority ?? "normal" },
    })
    return { ticketId, code }
  },
})

export const createFromConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    subject: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, viewer } = await resolveSupportViewer(ctx)
    const conversation = await ctx.db.get(args.conversationId)
    if (!conversation) fail("NOT_FOUND", "Percakapan tidak ditemukan.")
    const member = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", user._id),
      )
      .unique()
    if (!member) fail("NOT_FOUND", "Percakapan tidak ditemukan.")

    const timestamp = Date.now()
    const code = await uniqueTicketCode(ctx)
    const subject =
      args.subject?.trim() ||
      conversation.title ||
      "Permintaan dukungan dari percakapan"
    const ticketId = await ctx.db.insert("supportTickets", {
      code,
      requesterId: user._id,
      requesterName: user.name,
      requesterEmail: user.email,
      subject,
      priority: "normal",
      status: "open",
      channel: "chat",
      linkedType: "conversation",
      linkedId: args.conversationId,
      linkedRecords: [
        {
          type: "conversation",
          id: args.conversationId,
          label: conversation.title ?? "Percakapan",
        },
      ],
      sourceConversationId: args.conversationId,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "support.create",
      entityType: "supportTickets",
      entityId: ticketId,
      reason: "Tiket dibuat dari percakapan tanpa menyalin pesan.",
      after: { code, subject, conversationId: args.conversationId },
    })
    return { ticketId, code }
  },
})

export const reply = mutation({
  args: {
    ticketId: v.id("supportTickets"),
    body: v.string(),
    internal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user, viewer, admin } = await resolveSupportViewer(ctx)
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) fail("NOT_FOUND", "Tiket tidak ditemukan.")
    if (!admin && ticket.requesterId !== user._id) {
      fail("NOT_FOUND", "Tiket tidak ditemukan.")
    }
    const body = args.body.trim()
    if (body.length < 2) fail("INVALID_MESSAGE", "Isi balasan terlalu pendek.")
    if (args.internal && !admin) {
      fail("FORBIDDEN", "Catatan internal hanya untuk tim dukungan.")
    }
    if (ticket.status === "closed" && !args.internal) {
      fail("INVALID_TRANSITION", "Tiket tertutup harus dibuka kembali dulu.")
    }

    const timestamp = Date.now()
    const internal = Boolean(args.internal && admin)
    await ctx.db.insert("supportMessages", {
      ticketId: ticket._id,
      authorId: user._id,
      kind: internal ? "internal" : "user",
      body,
      createdAt: timestamp,
    })

    if (internal) {
      await ctx.db.patch(ticket._id, { updatedAt: timestamp })
      await appendAudit(ctx, {
        actorId: viewer.userId,
        actorRole: viewer.roleLabel,
        action: "support.note",
        entityType: "supportTickets",
        entityId: ticket._id,
        reason: "Catatan internal ditambahkan.",
      })
      return { internal: true, status: ticket.status }
    }

    let status: Doc<"supportTickets">["status"] = ticket.status
    if (admin) {
      if (status === "open") status = "pending"
    } else if (status === "pending" || status === "resolved") {
      status = "open"
    }

    await ctx.db.patch(ticket._id, {
      status,
      firstResponseAt: admin
        ? (ticket.firstResponseAt ?? timestamp)
        : ticket.firstResponseAt,
      lastResponseAt: timestamp,
      updatedAt: timestamp,
      reopenedAt:
        !admin && ticket.status === "closed" ? timestamp : ticket.reopenedAt,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "support.reply",
      entityType: "supportTickets",
      entityId: ticket._id,
      reason: admin ? "Balasan terlihat pengguna." : "Balasan pengguna.",
      before: { status: ticket.status },
      after: { status },
    })
    return { internal: false, status }
  },
})

export const assign = mutation({
  args: {
    ticketId: v.id("supportTickets"),
    assigneeId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await resolveSupportViewer(ctx)
    if (!viewer.capabilities.includes("support.manage")) {
      fail("FORBIDDEN", "Hanya pengelola dukungan yang dapat menugaskan tiket.")
    }
    const reason = args.reason.trim()
    if (reason.length < 4) fail("REASON_REQUIRED", "Alasan penugasan wajib diisi.")
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) fail("NOT_FOUND", "Tiket tidak ditemukan.")
    const assignee = await ctx.db.get(args.assigneeId)
    if (!assignee || !assignee.roles.includes("admin")) {
      fail("INVALID_ASSIGNEE", "Penerima tugas harus pengelola.")
    }
    const timestamp = Date.now()
    await ctx.db.patch(ticket._id, {
      assigneeId: assignee._id,
      assignedAt: timestamp,
      assignedBy: viewer.userId,
      updatedAt: timestamp,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "support.assign",
      entityType: "supportTickets",
      entityId: ticket._id,
      reason,
      before: { assigneeId: ticket.assigneeId ?? null },
      after: { assigneeId: assignee._id },
    })
    return null
  },
})

export const setPriority = mutation({
  args: {
    ticketId: v.id("supportTickets"),
    priority: priorityValidator,
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await resolveSupportViewer(ctx)
    if (!viewer.capabilities.includes("support.manage")) {
      fail("FORBIDDEN", "Hanya pengelola dukungan yang dapat mengubah prioritas.")
    }
    const reason = args.reason.trim()
    if (reason.length < 4) fail("REASON_REQUIRED", "Alasan perubahan prioritas wajib diisi.")
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) fail("NOT_FOUND", "Tiket tidak ditemukan.")
    await ctx.db.patch(ticket._id, {
      priority: args.priority,
      updatedAt: Date.now(),
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "support.priority",
      entityType: "supportTickets",
      entityId: ticket._id,
      reason,
      before: { priority: ticket.priority },
      after: { priority: args.priority },
    })
    return null
  },
})

export const escalate = mutation({
  args: {
    ticketId: v.id("supportTickets"),
    to: escalationValidator,
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await resolveSupportViewer(ctx)
    if (!viewer.capabilities.includes("support.manage")) {
      fail("FORBIDDEN", "Hanya pengelola dukungan yang dapat mengeskalasi tiket.")
    }
    const reason = args.reason.trim()
    if (reason.length < 4) fail("REASON_REQUIRED", "Alasan eskalasi wajib diisi.")
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) fail("NOT_FOUND", "Tiket tidak ditemukan.")
    await ctx.db.patch(ticket._id, {
      escalatedTo: args.to,
      escalationReason: reason,
      status: ticket.status === "closed" ? ticket.status : "pending",
      updatedAt: Date.now(),
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "support.escalate",
      entityType: "supportTickets",
      entityId: ticket._id,
      reason,
      after: { escalatedTo: args.to },
      severity: "warning",
    })
    return null
  },
})

export const link = mutation({
  args: {
    ticketId: v.id("supportTickets"),
    link: linkValidator,
  },
  handler: async (ctx, args) => {
    const { viewer } = await resolveSupportViewer(ctx)
    if (!viewer.capabilities.includes("support.manage")) {
      fail("FORBIDDEN", "Hanya pengelola dukungan yang dapat menautkan catatan.")
    }
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) fail("NOT_FOUND", "Tiket tidak ditemukan.")
    const existing = ticket.linkedRecords ?? []
    if (
      existing.some(
        (item) => item.type === args.link.type && item.id === args.link.id,
      )
    ) {
      return null
    }
    const next = [...existing, args.link]
    await ctx.db.patch(ticket._id, {
      linkedRecords: next,
      linkedType: ticket.linkedType ?? args.link.type,
      linkedId: ticket.linkedId ?? args.link.id,
      updatedAt: Date.now(),
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "support.link",
      entityType: "supportTickets",
      entityId: ticket._id,
      reason: `Tautan ${args.link.type} ditambahkan.`,
      after: { link: args.link },
    })
    return null
  },
})

export const resolve = mutation({
  args: {
    ticketId: v.id("supportTickets"),
    resolution: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { viewer } = await resolveSupportViewer(ctx)
    if (!viewer.capabilities.includes("support.manage")) {
      fail("FORBIDDEN", "Hanya pengelola dukungan yang dapat menyelesaikan tiket.")
    }
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) fail("NOT_FOUND", "Tiket tidak ditemukan.")
    if (!ticket.firstResponseAt) {
      fail(
        "INVALID_TRANSITION",
        "Tiket harus memiliki balasan pengguna terlihat sebelum diselesaikan.",
      )
    }
    if (!["open", "pending"].includes(ticket.status)) {
      fail("INVALID_TRANSITION", "Tiket ini tidak berada pada keadaan yang bisa diselesaikan.")
    }
    const resolution = args.resolution.trim()
    if (resolution.length < 4) {
      fail("REASON_REQUIRED", "Catatan resolusi wajib diisi.")
    }
    const timestamp = Date.now()
    await ctx.db.patch(ticket._id, {
      status: "resolved",
      resolutionNote: resolution,
      resolvedAt: timestamp,
      resolvedBy: viewer.userId,
      updatedAt: timestamp,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "support.resolve",
      entityType: "supportTickets",
      entityId: ticket._id,
      reason: args.reason?.trim() || resolution,
      before: { status: ticket.status },
      after: { status: "resolved" },
    })
    return null
  },
})

export const close = mutation({
  args: { ticketId: v.id("supportTickets"), reason: v.string() },
  handler: async (ctx, args) => {
    const { viewer } = await resolveSupportViewer(ctx)
    if (!viewer.capabilities.includes("support.manage")) {
      fail("FORBIDDEN", "Hanya pengelola dukungan yang dapat menutup tiket.")
    }
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) fail("NOT_FOUND", "Tiket tidak ditemukan.")
    if (ticket.status !== "resolved") {
      fail("INVALID_TRANSITION", "Tiket hanya dapat ditutup setelah diselesaikan.")
    }
    const reason = args.reason.trim()
    if (reason.length < 4) fail("REASON_REQUIRED", "Alasan penutupan wajib diisi.")
    const timestamp = Date.now()
    await ctx.db.patch(ticket._id, {
      status: "closed",
      closedAt: timestamp,
      updatedAt: timestamp,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "support.close",
      entityType: "supportTickets",
      entityId: ticket._id,
      reason,
      before: { status: "resolved" },
      after: { status: "closed" },
    })
    return null
  },
})

export const reopen = mutation({
  args: { ticketId: v.id("supportTickets"), reason: v.string() },
  handler: async (ctx, args) => {
    const { user, viewer, admin } = await resolveSupportViewer(ctx)
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) fail("NOT_FOUND", "Tiket tidak ditemukan.")
    if (!admin && ticket.requesterId !== user._id) {
      fail("NOT_FOUND", "Tiket tidak ditemukan.")
    }
    if (!["closed", "resolved"].includes(ticket.status)) {
      fail("INVALID_TRANSITION", "Tiket ini masih terbuka.")
    }
    const reason = args.reason.trim()
    if (reason.length < 4) fail("REASON_REQUIRED", "Alasan pembukaan kembali wajib diisi.")
    const timestamp = Date.now()
    await ctx.db.patch(ticket._id, {
      status: "open",
      reopenedAt: timestamp,
      closedAt: undefined,
      updatedAt: timestamp,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "support.reopen",
      entityType: "supportTickets",
      entityId: ticket._id,
      reason,
      before: { status: ticket.status },
      after: { status: "open" },
    })
    return null
  },
})

export const listCannedReplies = query({
  args: {},
  handler: async (ctx): Promise<SupportCannedReplyView[]> => {
    const { admin } = await resolveSupportViewer(ctx)
    if (!admin) fail("FORBIDDEN", "Hanya pengelola dukungan yang dapat melihat balasan siap pakai.")
    const rows = await ctx.db.query("supportCannedReplies").collect()
    return rows
      .filter((row) => row.active)
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((row) => ({
        id: row._id,
        key: row.key,
        title: row.title,
        body: row.body,
        category: row.category,
        active: row.active,
        updatedAt: row.updatedAt,
      }))
  },
})

export const saveCannedReply = mutation({
  args: {
    key: v.string(),
    title: v.string(),
    body: v.string(),
    category: cannedCategoryValidator,
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { viewer } = await resolveSupportViewer(ctx)
    if (!viewer.capabilities.includes("support.manage")) {
      fail("FORBIDDEN", "Hanya pengelola dukungan yang dapat menyimpan balasan siap pakai.")
    }
    const key = args.key.trim()
    const title = args.title.trim()
    const body = args.body.trim()
    if (!key || title.length < 3 || body.length < 4) {
      fail("INVALID_TEMPLATE", "Kunci, judul, dan isi balasan wajib diisi.")
    }
    const timestamp = Date.now()
    const existing = await ctx.db
      .query("supportCannedReplies")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, {
        title,
        body,
        category: args.category,
        active: args.active ?? existing.active,
        updatedAt: timestamp,
      })
    } else {
      await ctx.db.insert("supportCannedReplies", {
        key,
        title,
        body,
        category: args.category,
        active: args.active ?? true,
        createdBy: viewer.userId,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    }
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "support.canned.save",
      entityType: "supportCannedReplies",
      entityId: key,
      reason: "Balasan siap pakai diperbarui.",
    })
    return { key }
  },
})
