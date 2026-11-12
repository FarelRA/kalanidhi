import { ConvexError } from "convex/values"

import type { Capability } from "../lib/access/capabilities"
import type { Viewer } from "../lib/access/viewer"
import { requireCapability, viewerForUser } from "./access"
import type { Doc } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"

type DomainCtx = QueryCtx | MutationCtx

/** Resolves the viewer through the Phase 0 access contract, never a client argument. */
export async function resolveViewer(ctx: DomainCtx): Promise<Viewer | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null

  const user = await ctx.db
    .query("users")
    .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
    .unique()

  if (!user) return null
  return await viewerForUser(ctx, user)
}

export async function resolveViewerUser(
  ctx: DomainCtx,
): Promise<{ viewer: Viewer; user: Doc<"users"> } | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null

  const user = await ctx.db
    .query("users")
    .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
    .unique()

  if (!user) return null
  return { viewer: await viewerForUser(ctx, user), user }
}

export function requireActiveViewer(viewer: Viewer | null): Viewer {
  if (!viewer) {
    throw new ConvexError({ code: "UNAUTHENTICATED", message: "Masuk diperlukan." })
  }
  if (viewer.status !== "active") {
    throw new ConvexError({
      code: "SUSPENDED",
      message: "Akun ini sedang ditangguhkan.",
    })
  }
  return viewer
}

export function requireAnyCapability(
  viewer: Viewer,
  capabilities: Capability[],
): Viewer {
  const matched = capabilities.find((capability) =>
    viewer.capabilities.includes(capability),
  )
  if (!matched) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: `Akun ini tidak memiliki kemampuan ${capabilities.join(" atau ")}.`,
    })
  }
  return requireCapability(viewer, matched)
}

/** Workspace reads need an active viewer with one of the learning/teaching/operator capabilities. */
export async function requireWorkspaceViewer(
  ctx: DomainCtx,
): Promise<Viewer> {
  const viewer = requireActiveViewer(await resolveViewer(ctx))
  return requireAnyCapability(viewer, ["learn", "teach", "operate"])
}

export async function requireDomainViewer(
  ctx: DomainCtx,
  capability: Capability,
): Promise<Viewer> {
  const viewer = requireActiveViewer(await resolveViewer(ctx))
  return requireCapability(viewer, capability)
}

export function nowMs(): number {
  return Date.now()
}

export async function writeAudit(
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
    createdAt: nowMs(),
  })
}

export function randomCode(prefix: string, bytes = 6): string {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes))
  const token = Array.from(buffer)
    .map((value) => value.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, bytes * 2)
  return `${prefix}-${token}`
}
