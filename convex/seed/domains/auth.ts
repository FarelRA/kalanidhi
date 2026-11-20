import { v } from "convex/values"

import { components, internal } from "../../_generated/api"
import type { Id } from "../../_generated/dataModel"
import { internalAction, internalMutation, internalQuery } from "../../_generated/server"
import { createAuth } from "../../auth"
import {
  authCandidates,
  isPlaceholderAuthId,
  normalizeSeedEmail,
  SEED_PASSWORD,
} from "../lib/auth"

const linkRow = v.object({
  userId: v.id("users"),
  email: v.string(),
  authUserId: v.string(),
})

function authUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /component|betterauth|secret|BETTER_AUTH/i.test(message)
}

async function findAuthUserByEmail(
  ctx: Parameters<typeof createAuth>[0],
  email: string,
): Promise<string | undefined> {
  const doc = await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "email", operator: "eq", value: email }],
  })
  return (doc as { _id?: string } | null)?._id
}

/**
 * Signs every placeholder account up once and returns the link list.
 *
 * The action is deliberately idempotent: an existing `seedAuthAccounts`
 * mapping skips sign-up, and an address that already exists in Better Auth is
 * resolved through the component adapter instead of failing.
 */
export const seedAuthAccounts = internalAction({
  args: { now: v.number() },
  handler: async (ctx, args): Promise<{
    accounts: number
    provisioned: number
    linked: number
    unavailable: boolean
  }> => {
    const { users, mappings } = await ctx.runQuery(
      internal.seed.domains.auth.seedAuthSnapshot,
      {},
    )
    const candidates = authCandidates(users, mappings)
    if (candidates.length === 0) {
      return {
        accounts: mappings.length,
        provisioned: 0,
        linked: 0,
        unavailable: false,
      }
    }

    const links: Array<{
      userId: Id<"users">
      email: string
      authUserId: string
    }> = []
    const linkedEmails = new Set<string>()
    let linkedCount = 0
    const flush = async (): Promise<void> => {
      for (let start = 0; start < links.length; start += 20) {
        await ctx.runMutation(
          internal.seed.domains.auth.linkSeedAuthAccounts,
          { links: links.slice(start, start + 20), now: args.now },
        )
      }
      for (const link of links) linkedEmails.add(link.email)
      linkedCount += links.length
      links.length = 0
    }
    for (const candidate of candidates) {
      if (!candidate.authUserId) continue
      links.push({
        userId: candidate.userId as Id<"users">,
        email: candidate.email,
        authUserId: candidate.authUserId,
      })
      if (links.length >= 20) await flush()
    }

    const unmapped = candidates.filter((candidate) => !candidate.authUserId)
    let auth: ReturnType<typeof createAuth> | undefined
    if (unmapped.length > 0) {
      try {
        auth = createAuth(ctx)
      } catch (error) {
        if (!authUnavailable(error)) throw error
        auth = undefined
      }
    }
    if (!auth) {
      await flush()
      return {
        accounts: new Set([
          ...mappings.map((row) => normalizeSeedEmail(row.email)),
          ...linkedEmails,
        ]).size,
        provisioned: 0,
        linked: linkedCount,
        unavailable: unmapped.length > 0,
      }
    }

    let provisioned = 0
    for (const candidate of unmapped) {
      let authUserId: string | undefined
      let created = false
      try {
        // Look up first so an existing Better Auth account is never counted
        // as a new provisioning.
        authUserId = await findAuthUserByEmail(ctx, candidate.email)
        if (!authUserId) {
          const result = await auth.api.signUpEmail({
            body: {
              name: candidate.name,
              email: candidate.email,
              password: SEED_PASSWORD,
            },
          })
          authUserId = (result as { user?: { id?: string } }).user?.id
          created = Boolean(authUserId)
          if (!authUserId) {
            authUserId = await findAuthUserByEmail(ctx, candidate.email)
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error)
        if (!/exist|already|unique/i.test(message)) {
          if (authUnavailable(error)) {
            await flush()
            return {
              accounts: new Set([
                ...mappings.map((row) => normalizeSeedEmail(row.email)),
                ...linkedEmails,
              ]).size,
              provisioned,
              linked: linkedCount,
              unavailable: true,
            }
          }
          throw new Error(
            `Seed auth, gagal mendaftarkan ${candidate.email}: ${message}`,
          )
        }
        authUserId = await findAuthUserByEmail(ctx, candidate.email)
        if (!authUserId) {
          throw new Error(
            `Seed auth, ${candidate.email} sudah ada di Better Auth tetapi id-nya tidak ditemukan. Jalankan ulang setelah memeriksa komponen betterAuth.`,
          )
        }
      }
      if (!authUserId) {
        throw new Error(
          `Seed auth, Better Auth tidak mengembalikan id untuk ${candidate.email}.`,
        )
      }
      if (created) provisioned += 1
      links.push({
        userId: candidate.userId as Id<"users">,
        email: candidate.email,
        authUserId,
      })
      if (links.length >= 20) await flush()
    }

    await flush()
    return {
      accounts: new Set([
        ...mappings.map((row) => normalizeSeedEmail(row.email)),
        ...linkedEmails,
      ]).size,
      provisioned,
      linked: linkedCount,
      unavailable: false,
    }
  },
})

/** Read-only view used by the action and by the seed tests. */
export const seedAuthSnapshot = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect()
    const mappings = await ctx.db.query("seedAuthAccounts").collect()
    return {
      users: users.map((user) => ({
        _id: user._id as string,
        name: user.name,
        email: user.email,
        authUserId: user.authUserId,
        roles: user.roles as string[],
        status: user.status,
      })),
      mappings: mappings.map((row) => ({
        email: row.email,
        authUserId: row.authUserId,
      })),
    }
  },
})

/**
 * Deletes the trigger-created duplicate and points the original app row at the
 * Better Auth subject. Roles, enrollments, orders, and the original profile
 * stay on the original row.
 */
export const linkSeedAuthAccounts = internalMutation({
  args: { links: v.array(linkRow), now: v.number() },
  handler: async (ctx, args) => {
    let linked = 0
    let duplicates = 0
    for (const link of args.links) {
      const original = await ctx.db.get(link.userId)
      if (!original) continue
      if (!isPlaceholderAuthId(original.authUserId)) {
        // Already linked by an earlier run; keep the real subject.
        continue
      }

      const sameSubject = await ctx.db
        .query("users")
        .withIndex("by_authUserId", (q) =>
          q.eq("authUserId", link.authUserId),
        )
        .collect()
      for (const duplicate of sameSubject) {
        if (duplicate._id === original._id) continue
        const roleRows = await ctx.db
          .query("roleAssignments")
          .withIndex("by_userId", (q) => q.eq("userId", duplicate._id))
          .collect()
        for (const row of roleRows) await ctx.db.delete(row._id)
        const consentRows = await ctx.db
          .query("consents")
          .withIndex("by_userId", (q) => q.eq("userId", duplicate._id))
          .collect()
        for (const row of consentRows) await ctx.db.delete(row._id)
        const sessionRows = await ctx.db
          .query("sessions")
          .withIndex("by_userId", (q) => q.eq("userId", duplicate._id))
          .collect()
        for (const row of sessionRows) await ctx.db.delete(row._id)
        const authRows = await ctx.db
          .query("authLogs")
          .withIndex("by_userId", (q) => q.eq("userId", duplicate._id))
          .collect()
        for (const row of authRows) await ctx.db.delete(row._id)
        const whatsappRows = await ctx.db
          .query("whatsappVerifications")
          .withIndex("by_userId", (q) => q.eq("userId", duplicate._id))
          .collect()
        for (const row of whatsappRows) await ctx.db.delete(row._id)
        await ctx.db.delete(duplicate._id)
        duplicates += 1
      }

      // Keep Better Auth's own flag in step with the Convex projection.
      // Seeded addresses are treated as verified so the two sources agree.
      try {
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
          input: {
            model: "user",
            where: [{ field: "_id", value: link.authUserId }],
            update: { emailVerified: true, updatedAt: args.now },
          },
        })
      } catch {
        // A later reseed retries once the auth component is reachable.
      }

      await ctx.db.patch(original._id, {
        authUserId: link.authUserId,
        emailVerified: true,
        updatedAt: args.now,
      })
      const email = normalizeSeedEmail(link.email)
      const existing = await ctx.db
        .query("seedAuthAccounts")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique()
      if (existing) {
        await ctx.db.patch(existing._id, {
          authUserId: link.authUserId,
          updatedAt: args.now,
        })
      } else {
        await ctx.db.insert("seedAuthAccounts", {
          email,
          authUserId: link.authUserId,
          createdAt: args.now,
          updatedAt: args.now,
        })
      }
      linked += 1
    }
    return { linked, duplicates }
  },
})

/**
 * Neutralises the two accounts created by a live auth audit without deleting
 * data or touching any other address. Run manually:
 *
 *   npx convex run seed/domains/auth:neutralizeAuditArtifacts
 *
 * The probe account is suspended and its sessions are revoked; the pending
 * audit invite is revoked. Re-run after an audit recreates either row.
 */
export const neutralizeAuditArtifacts = internalMutation({
  args: {
    probeEmail: v.optional(v.string()),
    inviteEmail: v.optional(v.string()),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const timestamp = args.now ?? Date.now()
    const probeEmail = (
      args.probeEmail ?? "farel@kalanidhi.site"
    ).toLowerCase()
    const inviteEmail = (
      args.inviteEmail ?? "audit.invite@example.com"
    ).toLowerCase()

    const users = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", probeEmail))
      .collect()
    let sessionsRevoked = 0
    for (const user of users) {
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect()
      for (const session of sessions) {
        if (session.revokedAt) continue
        await ctx.db.patch(session._id, {
          revokedAt: timestamp,
          revokedReason: "Pembersihan akun probe audit.",
        })
        sessionsRevoked += 1
      }
      await ctx.db.patch(user._id, {
        status: "suspended",
        suspendedReason: "Akun probe audit dinetralkan.",
        suspendedAt: timestamp,
        updatedAt: timestamp,
      })
    }

    const invites = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", inviteEmail))
      .collect()
    let invitesRevoked = 0
    for (const invite of invites) {
      if (invite.status === "pending") {
        await ctx.db.patch(invite._id, {
          status: "revoked",
          reason: "Undangan audit dicabut setelah pemeriksaan.",
        })
        invitesRevoked += 1
      }
    }

    return {
      probeEmail,
      usersNeutralized: users.length,
      sessionsRevoked,
      inviteEmail,
      invitesRevoked,
    }
  },
})
