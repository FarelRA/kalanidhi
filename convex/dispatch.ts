import { v } from "convex/values"

import type { Doc } from "./_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server"

/**
 * Outbound delivery primitives for the notification outbox and webhook
 * deliveries. The orchestration action lives in `notifications.processOutbox`
 * so this module stays free of Convex action wiring.
 *
 * `webhookEndpoints.secretHash` is a one-way SHA-256 hash, so it cannot be used
 * to sign a request. Signing therefore uses the separate
 * `WEBHOOK_SIGNING_SECRET` environment variable. The endpoint hash is still
 * useful for verifying a secret the operator already holds.
 */

const OUTBOX_BATCH = 20
const DELIVERY_BATCH = 20
const MAX_DELIVERY_ATTEMPTS = 5
const CLAIM_LEASE_MS = 5 * 60_000
const DELIVERY_BACKOFF_MS = [
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  6 * 60 * 60_000,
]

export type OutboxChannel = Doc<"notificationOutbox">["channel"]
export type ExternalChannel = Exclude<OutboxChannel, "in_app">

const PROVIDER_ENV: Record<ExternalChannel, string> = {
  email: "EMAIL_PROVIDER_URL",
  whatsapp: "WHATSAPP_PROVIDER_URL",
  push: "PUSH_PROVIDER_URL",
}

/**
 * The only outbound transport wired in this phase is a generic webhook. A
 * channel-specific URL wins; otherwise `NOTIFICATION_WEBHOOK_URL` is used.
 * No vendor SDK or provider is invented here.
 */
export function providerUrlFor(channel: ExternalChannel): string | null {
  return (
    process.env[PROVIDER_ENV[channel]] ??
    process.env.NOTIFICATION_WEBHOOK_URL ??
    null
  )
}

export function deliveryBackoffMs(attempts: number): number {
  const index = Math.min(
    Math.max(attempts - 1, 0),
    DELIVERY_BACKOFF_MS.length - 1,
  )
  return DELIVERY_BACKOFF_MS[index] ?? DELIVERY_BACKOFF_MS[0]!
}

export type EnqueueWebhookInput = {
  event: string
  eventId: string
}

/**
 * Inserts one pending delivery per active endpoint subscribed to the event.
 * The dispatcher sends it later; callers never perform network I/O inside a
 * mutation. The schema has no payload column, so the delivery envelope is
 * reconstructed from `event` and `eventId` at send time.
 */
export async function enqueueWebhookDelivery(
  ctx: MutationCtx,
  input: EnqueueWebhookInput,
): Promise<number> {
  const endpoints = await ctx.db
    .query("webhookEndpoints")
    .withIndex("by_status", (q) => q.eq("status", "active"))
    .collect()
  const matching = endpoints.filter((endpoint) =>
    endpoint.events.includes(input.event),
  )
  if (matching.length === 0) return 0

  const timestamp = Date.now()
  let inserted = 0
  for (const endpoint of matching) {
    const eventId = `${input.eventId}:${endpoint._id}`
    const existing = await ctx.db
      .query("webhookDeliveries")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .first()
    if (existing) continue
    await ctx.db.insert("webhookDeliveries", {
      endpointId: endpoint._id,
      eventId,
      event: input.event,
      url: endpoint.url,
      status: "pending",
      attempts: 0,
      nextAttemptAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    inserted += 1
  }
  return inserted
}

/**
 * Claims a small batch of due outbox rows by moving `scheduledAt` forward as a
 * lease and incrementing `attempts`. A crashed action leaves the row pending
 * and it becomes claimable again after the lease expires.
 */
export const claimOutboxBatch = internalMutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const timestamp = Date.now()
    const limit = Math.min(Math.max(args.limit ?? OUTBOX_BATCH, 1), 50)
    const rows = await ctx.db
      .query("notificationOutbox")
      .withIndex("by_status_scheduledAt", (q) =>
        q.eq("status", "pending").lte("scheduledAt", timestamp),
      )
      .take(limit)

    const claimed = []
    for (const row of rows) {
      const attempts = row.attempts + 1
      await ctx.db.patch(row._id, {
        scheduledAt: timestamp + CLAIM_LEASE_MS,
        attempts,
        updatedAt: timestamp,
      })
      claimed.push({
        id: row._id,
        channel: row.channel,
        recipient: row.recipient,
        template: row.template,
        payload: row.payload,
        title: row.title ?? null,
        body: row.body ?? null,
        entityType: row.entityType ?? null,
        entityId: row.entityId ?? null,
        attempts,
      })
    }
    return claimed
  },
})

export const markOutboxSent = internalMutation({
  args: { id: v.id("notificationOutbox") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id)
    if (!row) return null
    const timestamp = Date.now()
    await ctx.db.patch(row._id, {
      status: "sent",
      sentAt: timestamp,
      error: undefined,
      updatedAt: timestamp,
    })
    return null
  },
})

export const markOutboxFailed = internalMutation({
  args: { id: v.id("notificationOutbox"), error: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id)
    if (!row) return null
    const timestamp = Date.now()
    await ctx.db.patch(row._id, {
      status: "failed",
      error: args.error,
      updatedAt: timestamp,
    })
    return null
  },
})

/**
 * Returns pending deliveries plus retryable failures whose backoff has
 * elapsed. `failed` is a retryable state until the fifth attempt marks the row
 * `dead`.
 */
export const pendingDeliveries = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const timestamp = Date.now()
    const limit = Math.min(Math.max(args.limit ?? DELIVERY_BATCH, 1), 50)
    const [pending, failed] = await Promise.all([
      ctx.db
        .query("webhookDeliveries")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .take(200),
      ctx.db
        .query("webhookDeliveries")
        .withIndex("by_status", (q) => q.eq("status", "failed"))
        .take(200),
    ])

    return [...pending, ...failed]
      .filter((row) => (row.nextAttemptAt ?? row.createdAt) <= timestamp)
      .sort(
        (a, b) =>
          (a.nextAttemptAt ?? a.createdAt) - (b.nextAttemptAt ?? b.createdAt),
      )
      .slice(0, limit)
      .map((row) => ({
        id: row._id,
        eventId: row.eventId,
        event: row.event,
        url: row.url,
        attempts: row.attempts,
      }))
  },
})

export const recordDelivery = internalMutation({
  args: {
    id: v.id("webhookDeliveries"),
    ok: v.boolean(),
    responseStatus: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id)
    if (!row) return null
    const timestamp = Date.now()
    const attempts = row.attempts + 1

    if (args.ok) {
      await ctx.db.patch(row._id, {
        status: "delivered",
        attempts,
        lastAttemptAt: timestamp,
        responseStatus: args.responseStatus,
        error: undefined,
        nextAttemptAt: undefined,
        updatedAt: timestamp,
      })
      return { status: "delivered" as const, attempts }
    }

    const dead = attempts >= MAX_DELIVERY_ATTEMPTS
    await ctx.db.patch(row._id, {
      status: dead ? "dead" : "failed",
      attempts,
      lastAttemptAt: timestamp,
      responseStatus: args.responseStatus,
      error: args.error ?? "Pengiriman webhook gagal.",
      nextAttemptAt: dead ? undefined : timestamp + deliveryBackoffMs(attempts),
      updatedAt: timestamp,
    })
    return { status: dead ? ("dead" as const) : ("failed" as const), attempts }
  },
})

export type NotificationEnvelope = {
  channel: string
  recipient: string
  template: string
  title: string | null
  body: string | null
  payload: Record<string, unknown>
  entityType: string | null
  entityId: string | null
}

export type PostResult = {
  ok: boolean
  status: number
  error?: string
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Pengiriman gagal."
}

export async function postNotification(
  url: string,
  envelope: NotificationEnvelope,
): Promise<PostResult> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(envelope),
    })
    if (!response.ok) {
      return { ok: false, status: response.status, error: `HTTP ${response.status}` }
    }
    return { ok: true, status: response.status }
  } catch (error) {
    return { ok: false, status: 0, error: errorMessage(error) }
  }
}

export async function signWebhookBody(
  secret: string,
  body: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  )
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export async function postWebhook(
  url: string,
  body: string,
  secret: string,
  headers: Record<string, string>,
): Promise<PostResult> {
  try {
    const signature = await signWebhookBody(secret, body)
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-kalanidhi-signature": `sha256=${signature}`,
        ...headers,
      },
      body,
    })
    if (!response.ok) {
      return { ok: false, status: response.status, error: `HTTP ${response.status}` }
    }
    return { ok: true, status: response.status }
  } catch (error) {
    return { ok: false, status: 0, error: errorMessage(error) }
  }
}
