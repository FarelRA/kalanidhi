import { ConvexError, v } from "convex/values"

import type { Capability } from "../lib/access/capabilities"
import type { WorkspaceRole } from "../lib/access/capabilities"
import { initialsFor } from "../lib/access/viewer"
import type { Viewer } from "../lib/access/viewer"
import {
  requireCapability,
  viewerForUser,
} from "./access"
import type { Doc, Id } from "./_generated/dataModel"
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"
import { roleValidator } from "./tables/common"

const DAY_MS = 86_400_000

function now(): number {
  return Date.now()
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

async function currentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<{ user: Doc<"users">; viewer: Viewer } | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null

  const user = await ctx.db
    .query("users")
    .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
    .unique()

  if (!user) return null
  const viewer = await viewerForUser(ctx, user)
  return { user, viewer }
}

async function requireOperator(
  ctx: QueryCtx | MutationCtx,
  capability: Capability,
): Promise<{ user: Doc<"users">; viewer: Viewer }> {
  const current = await currentUser(ctx)
  if (!current) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Masuk diperlukan.",
    })
  }
  requireCapability(current.viewer, capability)
  return current
}

async function writeAudit(
  ctx: MutationCtx,
  input: {
    actorId: string
    actorRole: string
    action: string
    entityType: string
    entityId?: string
    reason: string
    before?: Record<string, unknown>
    after?: Record<string, unknown>
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
    severity: "info",
    createdAt: now(),
  })
}

function normalizeRoles(roles: WorkspaceRole[]): WorkspaceRole[] {
  return Array.from(new Set(roles))
}

function assertRoles(roles: WorkspaceRole[]): void {
  if (roles.length === 0) {
    throw new ConvexError({
      code: "INVALID_ROLES",
      message: "Akun harus memiliki setidaknya satu peran.",
    })
  }
}

/** Raw application account for the authenticated Better Auth identity. */
export const current = query({
  args: {},
  handler: async (ctx): Promise<Viewer | null> => {
    const currentAccount = await currentUser(ctx)
    return currentAccount?.viewer ?? null
  },
})

export const invite = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    roles: v.array(roleValidator),
    reason: v.string(),
    ttlDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireOperator(ctx, "people.manage")
    assertRoles(args.roles)

    const email = args.email.trim().toLowerCase()
    if (!email.includes("@")) {
      throw new ConvexError({ code: "INVALID_EMAIL", message: "Email tidak sah." })
    }
    if (args.roles.includes("student")) {
      throw new ConvexError({
        code: "INVALID_ROLES",
        message: "Peserta mendaftar sendiri; undangan hanya untuk admin atau pengajar.",
      })
    }

    const timestamp = now()
    const pending = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect()
    for (const old of pending) {
      if (old.status === "pending") {
        await ctx.db.patch(old._id, { status: "expired" })
      }
    }

    const token = randomToken()
    const tokenHash = await sha256Hex(token)
    const expiresAt = timestamp + Math.max(1, args.ttlDays ?? 7) * DAY_MS

    const inviteId = await ctx.db.insert("invites", {
      email,
      name: args.name,
      roles: normalizeRoles(args.roles),
      tokenHash,
      status: "pending",
      invitedBy: viewer.userId,
      reason: args.reason,
      expiresAt,
      createdAt: timestamp,
    })

    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "users.invite",
      entityType: "invites",
      entityId: inviteId,
      reason: args.reason,
      after: { email, roles: args.roles, expiresAt },
    })

    return { inviteId, token, expiresAt }
  },
})

/** Applies pending invite roles to the authenticated account. */
export const acceptInvite = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Viewer> => {
    const currentAccount = await currentUser(ctx)
    if (!currentAccount) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Masuk diperlukan.",
      })
    }
    const { user, viewer } = currentAccount
    if (!user.emailVerified) {
      throw new ConvexError({
        code: "EMAIL_UNVERIFIED",
        message: "Verifikasi email sebelum menerima undangan.",
      })
    }

    const invites = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", user.email.toLowerCase()))
      .collect()
    const timestamp = now()
    const tokenHash = args.token ? await sha256Hex(args.token) : null
    const invite = invites.find(
      (item) =>
        item.status === "pending" &&
        item.expiresAt > timestamp &&
        (tokenHash === null || item.tokenHash === tokenHash),
    )

    if (!invite) {
      throw new ConvexError({
        code: "INVITE_NOT_FOUND",
        message: "Undangan tidak ditemukan atau sudah kedaluwarsa.",
      })
    }

    const nextRoles = normalizeRoles([...user.roles, ...invite.roles])
    const added = invite.roles.filter((role) => !user.roles.includes(role))
    for (const role of added) {
      await ctx.db.insert("roleAssignments", {
        userId: user._id,
        role,
        action: "grant",
        actorId: invite.invitedBy,
        reason: `Invitation accepted: ${invite.reason}`,
        createdAt: timestamp,
      })
    }

    await ctx.db.patch(user._id, {
      roles: nextRoles,
      status: "active",
      updatedAt: timestamp,
    })
    await ctx.db.patch(invite._id, {
      status: "accepted",
      acceptedBy: user._id,
      acceptedAt: timestamp,
    })
    await ctx.db.insert("authLogs", {
      userId: user._id,
      authUserId: user.authUserId,
      kind: "invite_accepted",
      createdAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: user._id,
      actorRole: viewer.roleLabel,
      action: "users.acceptInvite",
      entityType: "users",
      entityId: user._id,
      reason: invite.reason,
      before: { roles: user.roles },
      after: { roles: nextRoles },
    })

    return await viewerForUser(ctx, {
      ...user,
      roles: nextRoles,
      status: "active",
      updatedAt: timestamp,
    })
  },
})

/** Role changes are append-only events plus a current projection on the user. */
export const setRoles = mutation({
  args: {
    userId: v.id("users"),
    roles: v.array(roleValidator),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireOperator(ctx, "people.manage")
    assertRoles(args.roles)

    const target = await ctx.db.get(args.userId)
    if (!target) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Akun tidak ditemukan." })
    }

    const nextRoles = normalizeRoles(args.roles)
    const added = nextRoles.filter((role) => !target.roles.includes(role))
    const removed = target.roles.filter((role) => !nextRoles.includes(role))

    if (removed.includes("admin")) {
      const admins = (await ctx.db.query("users").collect()).filter(
        (user) => user.roles.includes("admin") && user.status === "active",
      )
      if (admins.length <= 1) {
        throw new ConvexError({
          code: "LAST_ADMIN",
          message: "Admin terakhir tidak dapat diturunkan.",
        })
      }
    }

    const timestamp = now()
    for (const role of added) {
      await ctx.db.insert("roleAssignments", {
        userId: target._id,
        role,
        action: "grant",
        actorId: viewer.userId,
        reason: args.reason,
        createdAt: timestamp,
      })
    }
    for (const role of removed) {
      await ctx.db.insert("roleAssignments", {
        userId: target._id,
        role,
        action: "revoke",
        actorId: viewer.userId,
        reason: args.reason,
        createdAt: timestamp,
      })
    }

    await ctx.db.patch(target._id, { roles: nextRoles, updatedAt: timestamp })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "users.setRoles",
      entityType: "users",
      entityId: target._id,
      reason: args.reason,
      before: { roles: target.roles },
      after: { roles: nextRoles },
    })

    return null
  },
})

export const suspend = mutation({
  args: {
    userId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireOperator(ctx, "people.manage")
    if (args.userId === viewer.userId) {
      throw new ConvexError({
        code: "SELF_DEALING",
        message: "Admin tidak dapat menangguhkan akunnya sendiri.",
      })
    }

    const target = await ctx.db.get(args.userId)
    if (!target) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Akun tidak ditemukan." })
    }

    if (target.roles.includes("admin")) {
      const admins = (await ctx.db.query("users").collect()).filter(
        (user) => user.roles.includes("admin") && user.status === "active",
      )
      if (admins.length <= 1) {
        throw new ConvexError({
          code: "LAST_ADMIN",
          message: "Admin terakhir tidak dapat ditangguhkan.",
        })
      }
    }

    const timestamp = now()
    await ctx.db.patch(target._id, {
      status: "suspended",
      suspendedReason: args.reason,
      suspendedAt: timestamp,
      updatedAt: timestamp,
    })

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", target._id))
      .collect()
    let revoked = 0
    for (const session of sessions) {
      if (session.revokedAt) continue
      await ctx.db.patch(session._id, {
        revokedAt: timestamp,
        revokedBy: viewer.userId,
        revokedReason: args.reason,
      })
      revoked += 1
    }

    await ctx.db.insert("authLogs", {
      userId: target._id,
      authUserId: target.authUserId,
      kind: "session_revoked",
      requestId: undefined,
      createdAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "users.suspend",
      entityType: "users",
      entityId: target._id,
      reason: args.reason,
      before: { status: target.status },
      after: { status: "suspended", revokedSessions: revoked },
    })

    return { revokedSessions: revoked }
  },
})

/**
 * Creates the first admin. This is an internal mutation, callable only from
 * the Convex CLI or another internal function. There is no public elevation
 * path and no default password.
 */
export const bootstrapAdmin = internalMutation({
  args: {
    authUserId: v.optional(v.string()),
    email: v.string(),
    name: v.string(),
    region: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"users">> => {
    const users = await ctx.db.query("users").collect()
    if (users.some((user) => user.roles.includes("admin"))) {
      throw new ConvexError({
        code: "ADMIN_EXISTS",
        message: "Admin sudah ada. Gunakan users.setRoles.",
      })
    }

    const timestamp = now()
    const email = args.email.trim().toLowerCase()
    const existing = args.authUserId
      ? await ctx.db
          .query("users")
          .withIndex("by_authUserId", (q) =>
            q.eq("authUserId", args.authUserId as string),
          )
          .unique()
      : await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", email))
          .unique()

    if (!existing && !args.authUserId) {
      throw new ConvexError({
        code: "SIGN_UP_FIRST",
        message:
          "Akun belum ada. Daftar lebih dulu, lalu jalankan bootstrap dengan email tersebut, atau sertakan authUserId.",
      })
    }

    let userId: Id<"users">
    if (existing) {
      userId = existing._id
      await ctx.db.patch(userId, {
        roles: ["admin"],
        status: "active",
        updatedAt: timestamp,
      })
    } else {
      userId = await ctx.db.insert("users", {
        authUserId: args.authUserId as string,
        name: args.name,
        email,
        emailVerified: true,
        initials: initialsFor(args.name),
        region: args.region ?? "",
        roles: ["admin"],
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    }

    await ctx.db.insert("roleAssignments", {
      userId,
      role: "admin",
      action: "grant",
      actorId: "system",
      reason: "First admin bootstrap",
      createdAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: "system",
      actorRole: "system",
      action: "users.bootstrapAdmin",
      entityType: "users",
      entityId: userId,
      reason: "First admin bootstrap",
      after: { email, roles: ["admin"] },
    })

    return userId
  },
})
