import { createClient, type AuthFunctions } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import type { GenericCtx } from "@convex-dev/better-auth/utils"
import type { BetterAuthOptions } from "better-auth"
import { betterAuth } from "better-auth"

import { components, internal } from "./_generated/api"
import type { DataModel } from "./_generated/dataModel"
import authConfig from "./auth.config"
import { initialsFor } from "../lib/access/viewer"
import { normalizeIndonesianPhone } from "../lib/phone"
import { findProvince } from "../lib/regions/provinces"

type AuthUserExtras = {
  phone?: string
  phoneNumber?: string
  province?: string
  whatsappVerified?: boolean
}

function phoneFromAuthDoc(doc: AuthUserExtras): string {
  const raw = doc.phone ?? doc.phoneNumber
  if (!raw) return ""
  try {
    return normalizeIndonesianPhone(raw)
  } catch {
    return ""
  }
}

const authFunctions: AuthFunctions = (
  internal as unknown as { auth: AuthFunctions }
).auth

export const authComponent: ReturnType<typeof createClient<DataModel>> =
  createClient<DataModel>(components.betterAuth, {
  authFunctions,
  triggers: {
    user: {
      onCreate: async (ctx, doc) => {
        const email = doc.email.toLowerCase()
        const timestamp = Date.now()
        const invites = await ctx.db
          .query("invites")
          .withIndex("by_email", (q) => q.eq("email", email))
          .collect()
        const invite = invites.find(
          (item) =>
            item.status === "pending" && item.expiresAt > timestamp,
        )
        const roles = invite?.roles.length
          ? Array.from(new Set(invite.roles))
          : (["student"] as const)

        const extras = doc as typeof doc & AuthUserExtras
        const phone = phoneFromAuthDoc(extras)
        const province = extras.province
          ? (findProvince(extras.province)?.name ?? "")
          : ""

        const userId = await ctx.db.insert("users", {
          authUserId: doc._id,
          name: doc.name || email.split("@")[0],
          email,
          emailVerified: Boolean(doc.emailVerified),
          phone,
          province,
          whatsappVerified: Boolean(extras.whatsappVerified),
          image: doc.image ?? undefined,
          initials: initialsFor(doc.name || email),
          region: province,
          roles: [...roles],
          status: "active",
          createdAt: timestamp,
          updatedAt: timestamp,
        })

        for (const role of roles) {
          await ctx.db.insert("roleAssignments", {
            userId,
            role,
            action: "grant",
            actorId: invite?.invitedBy ?? "system",
            reason: invite
              ? `Invitation accepted: ${invite.reason}`
              : "Student registration",
            createdAt: timestamp,
          })
        }

        if (invite) {
          await ctx.db.patch(invite._id, {
            status: "accepted",
            acceptedBy: userId,
            acceptedAt: timestamp,
          })
          await ctx.db.insert("authLogs", {
            userId,
            authUserId: doc._id,
            kind: "invite_accepted",
            createdAt: timestamp,
          })
        } else {
          await ctx.db.insert("authLogs", {
            userId,
            authUserId: doc._id,
            kind: "sign_in",
            createdAt: timestamp,
          })
        }

        await ctx.db.insert("auditLogs", {
          actorId: "system",
          actorRole: "system",
          action: "users.provision",
          entityType: "users",
          entityId: userId,
          reason: invite ? "Invited account created" : "Student registration",
          after: { email, roles: [...roles] },
          severity: "info",
          createdAt: timestamp,
        })
      },
      onUpdate: async (ctx, newDoc) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_authUserId", (q) => q.eq("authUserId", newDoc._id))
          .unique()
        if (!user) return
        await ctx.db.patch(user._id, {
          name: newDoc.name || user.name,
          email: newDoc.email.toLowerCase(),
          emailVerified: Boolean(newDoc.emailVerified),
          image: newDoc.image ?? user.image,
          updatedAt: Date.now(),
        })
      },
      onDelete: async (ctx, doc) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_authUserId", (q) => q.eq("authUserId", doc._id))
          .unique()
        if (!user) return
        const timestamp = Date.now()
        await ctx.db.patch(user._id, {
          status: "deleted",
          roles: [],
          name: "Akun dihapus",
          email: `deleted+${user._id}@invalid.local`,
          updatedAt: timestamp,
        })
        await ctx.db.insert("auditLogs", {
          actorId: "system",
          actorRole: "system",
          action: "users.delete",
          entityType: "users",
          entityId: user._id,
          reason: "Better Auth user deleted",
          before: { roles: user.roles },
          severity: "warning",
          createdAt: timestamp,
        })
      },
    },
  },
})

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi()

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  return {
    appName: "KalaNidhi Digital",
    baseURL: process.env.SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
    },
    trustedOrigins: process.env.SITE_URL ? [process.env.SITE_URL] : [],
    plugins: [convex({ authConfig })],
  } satisfies BetterAuthOptions
}

// Used by the Better Auth CLI when generating schemas.
export const options = createAuthOptions({} as GenericCtx<DataModel>)

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx))
}
