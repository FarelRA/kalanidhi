import { ConvexError, v } from "convex/values"

import type { NotificationView } from "../lib/messaging/types"
import { requireCapability, viewerForUser } from "./access"
import type { Viewer } from "../lib/access/viewer"
import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"

function now(): number {
  return Date.now()
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
): Promise<{ user: Doc<"users">; viewer: Viewer }> {
  const account = await currentAccount(ctx)
  if (!account) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Masuk diperlukan.",
    })
  }
  requireCapability(account.viewer, "messages.read.own")
  return account
}

function toView(row: Doc<"notificationOutbox">): NotificationView {
  const payload = (row.payload ?? {}) as Record<string, unknown>
  return {
    id: row._id,
    template: row.template,
    title: row.title ?? "Pemberitahuan",
    body: row.body ?? "",
    entityType: row.entityType ?? null,
    entityId: row.entityId ?? null,
    conversationId:
      typeof payload.conversationId === "string"
        ? payload.conversationId
        : row.entityType === "conversations"
          ? (row.entityId ?? null)
          : null,
    createdAt: row.createdAt,
    readAt: row.readAt ?? null,
  }
}

export type InAppNotificationInput = {
  recipientId: Id<"users">
  template: string
  title: string
  body: string
  entityType?: string
  entityId?: string
  payload?: Record<string, unknown>
  idempotencyKey?: string
}

/**
 * Writes the in-app projection of a notification. Email, WhatsApp, and push
 * stay out of this phase: the outbox record is marked sent for in-app only.
 */
export async function createInAppNotification(
  ctx: MutationCtx,
  input: InAppNotificationInput,
): Promise<Id<"notificationOutbox"> | null> {
  const timestamp = now()
  if (input.idempotencyKey) {
    const existing = await ctx.db
      .query("notificationOutbox")
      .withIndex("by_idempotencyKey", (q) =>
        q.eq("idempotencyKey", input.idempotencyKey),
      )
      .unique()
    if (existing) return existing._id
  }

  const recipient = await ctx.db.get(input.recipientId)
  if (!recipient || recipient.status !== "active") return null

  return await ctx.db.insert("notificationOutbox", {
    channel: "in_app",
    recipient: recipient.email,
    recipientId: recipient._id,
    template: input.template,
    payload: input.payload ?? {},
    status: "sent",
    attempts: 0,
    scheduledAt: timestamp,
    sentAt: timestamp,
    idempotencyKey: input.idempotencyKey,
    title: input.title,
    body: input.body,
    entityType: input.entityType,
    entityId: input.entityId,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
}

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<NotificationView[]> => {
    const { user } = await requireViewer(ctx)
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100)
    const rows = await ctx.db
      .query("notificationOutbox")
      .withIndex("by_recipientId", (q) => q.eq("recipientId", user._id))
      .order("desc")
      .take(limit)
    return rows.map(toView)
  },
})

export const unreadCount = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const { user } = await requireViewer(ctx)
    const rows = await ctx.db
      .query("notificationOutbox")
      .withIndex("by_recipientId", (q) => q.eq("recipientId", user._id))
      .collect()
    return rows.filter((row) => row.readAt === undefined).length
  },
})

export const markRead = mutation({
  args: { notificationId: v.id("notificationOutbox") },
  handler: async (ctx, args) => {
    const { user } = await requireViewer(ctx)
    const row = await ctx.db.get(args.notificationId)
    if (!row || row.recipientId !== user._id) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Pemberitahuan tidak ditemukan.",
      })
    }
    if (row.readAt === undefined) {
      const timestamp = now()
      await ctx.db.patch(row._id, { readAt: timestamp, updatedAt: timestamp })
    }
    return null
  },
})

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireViewer(ctx)
    const rows = await ctx.db
      .query("notificationOutbox")
      .withIndex("by_recipientId", (q) => q.eq("recipientId", user._id))
      .collect()
    const timestamp = now()
    let marked = 0
    for (const row of rows) {
      if (row.readAt !== undefined) continue
      await ctx.db.patch(row._id, { readAt: timestamp, updatedAt: timestamp })
      marked += 1
    }
    return marked
  },
})
