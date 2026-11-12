import { ConvexError } from "convex/values"

import type { Capability } from "../lib/access/capabilities"
import type { Viewer } from "../lib/access/viewer"
import { requireCapability, viewerForUser } from "./access"
import type { Doc, Id } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"

export const DAY_MS = 86_400_000
export const PAYMENT_TTL_SECONDS = 15 * 60
export const PAYMENT_SKEW_MS = 60_000
export const MIN_REASON_LENGTH = 8
export const ORDER_TOKEN_BYTES = 32
export const CONSENT_VERSION = "2026-11-transactional"

export type DatabaseCtx = Pick<QueryCtx, "db" | "auth">
export type WriteCtx = MutationCtx

export function now(): number {
  return Date.now()
}

export function commerceError(
  code: string,
  message: string,
): never {
  throw new ConvexError({ code, message })
}

export function notFound(message = "Catatan tidak ditemukan."): never {
  commerceError("NOT_FOUND", message)
}

export function assertReason(reason: string | undefined, field = "Alasan"): string {
  const trimmed = (reason ?? "").trim()
  if (trimmed.length < MIN_REASON_LENGTH) {
    commerceError(
      "REASON_REQUIRED",
      `${field} wajib diisi minimal ${MIN_REASON_LENGTH} karakter.`,
    )
  }
  return trimmed
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function assertEmail(email: string): string {
  const normalized = normalizeEmail(email)
  if (!normalized.includes("@") || normalized.length < 5) {
    commerceError("INVALID_EMAIL", "Alamat email tidak sah.")
  }
  return normalized
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!domain || !local) return "***"
  const visible = local.slice(0, 2)
  return `${visible}${"*".repeat(Math.max(3, local.length - 2))}@${domain}`
}

export async function hashToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export function randomToken(bytes = ORDER_TOKEN_BYTES): string {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes))
  return Array.from(buffer)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export function orderCode(): string {
  const year = new Date(now()).getUTCFullYear()
  const random = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0
  const suffix = String(random % 1_000_000).padStart(6, "0")
  return `KN-${year}-${suffix}`
}

export async function findByToken(
  ctx: DatabaseCtx,
  token: string | undefined,
): Promise<Doc<"orders"> | null> {
  if (!token || token.length < 32) return null
  const tokenHash = await hashToken(token)
  return await ctx.db
    .query("orders")
    .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
    .unique()
}

export type ViewerContext = {
  user: Doc<"users">
  viewer: Viewer
}

/** Resolves the current application viewer from the Convex identity. */
export async function currentViewer(
  ctx: DatabaseCtx,
): Promise<ViewerContext | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null

  const user = await ctx.db
    .query("users")
    .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
    .unique()
  if (!user) return null

  return { user, viewer: await viewerForUser(ctx, user) }
}

export async function requireViewer(
  ctx: DatabaseCtx,
  capability: Capability,
): Promise<ViewerContext> {
  const current = await currentViewer(ctx)
  if (!current) commerceError("UNAUTHENTICATED", "Masuk diperlukan.")
  requireCapability(current.viewer, capability)
  return current
}

/** Optional viewer: guest flows run without an identity. */
export async function optionalViewer(
  ctx: DatabaseCtx,
): Promise<ViewerContext | null> {
  try {
    return await currentViewer(ctx)
  } catch {
    return null
  }
}

/**
 * Sellers earn from an active seller profile plus an issued certificate or an
 * active teacher profile path. Revocation removes the scope immediately.
 */
export async function assertSellerScope(
  ctx: DatabaseCtx,
  sellerId: Id<"users">,
  pathId: string,
): Promise<Doc<"users">> {
  const user = await ctx.db.get(sellerId)
  if (!user) notFound("Penjual tidak ditemukan.")
  if (user.status !== "active") {
    commerceError("SELLER_INACTIVE", "Akun penjual tidak aktif.")
  }
  const viewer = await viewerForUser(ctx, user)
  if (!viewer.entitlements.sellActive) {
    commerceError("SELLER_INACTIVE", "Profil penjual belum aktif.")
  }
  if (!viewer.sellScopes.includes(pathId)) {
    commerceError(
      "OUT_OF_SCOPE",
      `Jalur ${pathId} berada di luar cakupan penjual.`,
    )
  }
  return user
}

export async function writeAudit(
  ctx: WriteCtx,
  input: {
    actorId: string
    actorRole: string
    action: string
    entityType: string
    entityId?: string
    reason: string
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

/**
 * Internal mutation guard for server-to-Convex calls (webhook settlement,
 * gateway health). The key lives in Convex env, never in the client bundle.
 * A missing key fails closed.
 */
export function assertInternalKey(supplied: string | undefined): void {
  const expected = process.env.PAYMENTS_INTERNAL_KEY ?? ""
  if (!expected || !supplied || supplied.length !== expected.length) {
    commerceError("UNAUTHORIZED", "Kunci internal tidak sah.")
  }
  let mismatch = 0
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ supplied.charCodeAt(index)
  }
  if (mismatch !== 0) {
    commerceError("UNAUTHORIZED", "Kunci internal tidak sah.")
  }
}

/** Admin-facing money actions cannot be performed on the actor's own records. */
export function assertNotOwnMoney(
  viewer: Viewer,
  action: string,
  order: Doc<"orders">,
): void {
  if (order.buyerUserId === viewer.userId || order.sellerId === viewer.userId) {
    commerceError(
      "SELF_DEALING",
      `Tindakan ${action} tidak boleh dilakukan pada pesanan sendiri.`,
    )
  }
}
