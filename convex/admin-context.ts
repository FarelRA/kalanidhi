import { ConvexError } from "convex/values"

import type { Capability } from "../lib/access/capabilities"
import type { Viewer } from "../lib/access/viewer"
import { requireCapability, viewerForUser } from "./access"
import type { Doc } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"

export function now(): number {
  return Date.now()
}

export const PRODUCT_TIMEZONE_OFFSET_MS = 7 * 60 * 60 * 1_000

export type AdminContext = {
  user: Doc<"users">
  viewer: Viewer
}

/**
 * Resolves the authenticated application account through the shared access
 * layer. Feature modules must use this instead of trusting a client argument.
 */
export async function resolveViewer(
  ctx: QueryCtx | MutationCtx,
): Promise<AdminContext | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null

  const user = await ctx.db
    .query("users")
    .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
    .unique()

  if (!user) return null
  return { user, viewer: await viewerForUser(ctx, user) }
}

function accessError(code: string, message: string): never {
  throw new ConvexError({ code, message })
}

export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  capability: Capability,
): Promise<AdminContext> {
  const context = await resolveViewer(ctx)
  if (!context) accessError("UNAUTHENTICATED", "Masuk diperlukan.")
  requireCapability(context.viewer, capability)
  return context
}

export function requireReason(reason: string, minimum = 4): string {
  const value = reason.trim()
  if (value.length < minimum) {
    accessError(
      "REASON_REQUIRED",
      `Alasan wajib diisi minimal ${minimum} karakter untuk tindakan ini.`,
    )
  }
  return value
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}
