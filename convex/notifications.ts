import { ConvexError, v } from "convex/values"

import type { NotificationView } from "../lib/messaging/types"
import type { WebhookDeliveryView } from "../lib/settings/types"
import { requireCapability, viewerForUser } from "./access"
import { requireAdmin } from "./admin_context"
import type { Viewer } from "../lib/access/viewer"
import { internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import {
  internalAction,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"
import { postNotification, postWebhook, providerUrlFor } from "./dispatch"

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
    attempts: row.attempts,
    scheduledAt: row.scheduledAt,
    sentAt: row.sentAt ?? null,
    error: row.error ?? null,
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

/** Admin-only view of recent outbound webhook attempts. */
export const listDeliveries = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<WebhookDeliveryView[]> => {
    await requireAdmin(ctx, "settings.platform")
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100)
    const rows = await ctx.db.query("webhookDeliveries").collect()
    const recent = rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)

    const endpointIds = Array.from(
      new Set(
        recent
          .map((row) => row.endpointId)
          .filter((id): id is Id<"webhookEndpoints"> => Boolean(id)),
      ),
    )
    const endpoints = await Promise.all(
      endpointIds.map((id) => ctx.db.get(id)),
    )
    const names = new Map(
      endpoints
        .filter((endpoint): endpoint is Doc<"webhookEndpoints"> => Boolean(endpoint))
        .map((endpoint) => [endpoint._id, endpoint.name]),
    )

    return recent.map((row) => ({
      id: row._id,
      endpointName: row.endpointId
        ? (names.get(row.endpointId) ?? "Endpoint dihapus")
        : "Tanpa endpoint",
      event: row.event,
      status: row.status,
      attempts: row.attempts,
      responseStatus: row.responseStatus ?? null,
      error: row.error ?? null,
      createdAt: row.createdAt,
      lastAttemptAt: row.lastAttemptAt ?? null,
      nextAttemptAt: row.nextAttemptAt ?? null,
    }))
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

/**
 * Drains the notification outbox and retries due webhook deliveries. Runs from
 * the one-minute cron. In-app rows are marked sent without network I/O. Email,
 * WhatsApp, and push rows fail honestly when no provider URL is configured;
 * the dispatcher never invents a provider.
 */
export const processOutbox = internalAction({
  args: {},
  handler: async (ctx) => {
    const outbox = await ctx.runMutation(
      internal.dispatch.claimOutboxBatch,
      {},
    )
    let sent = 0
    let failed = 0

    for (const row of outbox) {
      if (row.channel === "in_app") {
        await ctx.runMutation(internal.dispatch.markOutboxSent, { id: row.id })
        sent += 1
        continue
      }

      const url = providerUrlFor(row.channel)
      if (!url) {
        await ctx.runMutation(internal.dispatch.markOutboxFailed, {
          id: row.id,
          error: `Provider ${row.channel} belum dikonfigurasi.`,
        })
        failed += 1
        continue
      }

      const result = await postNotification(url, {
        channel: row.channel,
        recipient: row.recipient,
        template: row.template,
        title: row.title,
        body: row.body,
        payload: (row.payload ?? {}) as Record<string, unknown>,
        entityType: row.entityType,
        entityId: row.entityId,
      })
      if (result.ok) {
        await ctx.runMutation(internal.dispatch.markOutboxSent, { id: row.id })
        sent += 1
      } else {
        await ctx.runMutation(internal.dispatch.markOutboxFailed, {
          id: row.id,
          error: result.error ?? `HTTP ${result.status}`,
        })
        failed += 1
      }
    }

    const deliveries = await ctx.runQuery(
      internal.dispatch.pendingDeliveries,
      {},
    )
    const signingSecret = process.env.WEBHOOK_SIGNING_SECRET
    let delivered = 0
    let deliveryFailed = 0
    let dead = 0

    for (const delivery of deliveries) {
      if (!signingSecret) {
        const recorded = await ctx.runMutation(
          internal.dispatch.recordDelivery,
          {
            id: delivery.id,
            ok: false,
            error: "WEBHOOK_SIGNING_SECRET belum dikonfigurasi.",
          },
        )
        if (recorded?.status === "dead") dead += 1
        else deliveryFailed += 1
        continue
      }

      const body = JSON.stringify({
        event: delivery.event,
        eventId: delivery.eventId,
        deliveryId: delivery.id,
        sentAt: Date.now(),
      })
      const result = await postWebhook(delivery.url, body, signingSecret, {
        "x-kalanidhi-event": delivery.event,
        "x-kalanidhi-delivery": delivery.id,
      })
      const recorded = await ctx.runMutation(
        internal.dispatch.recordDelivery,
        {
          id: delivery.id,
          ok: result.ok,
          responseStatus: result.status || undefined,
          error: result.ok ? undefined : result.error,
        },
      )
      if (recorded?.status === "delivered") delivered += 1
      else if (recorded?.status === "dead") dead += 1
      else deliveryFailed += 1
    }

    return {
      outbox: { sent, failed },
      deliveries: { delivered, failed: deliveryFailed, dead },
    }
  },
})
