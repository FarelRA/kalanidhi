import { v } from "convex/values"

import { components, internal } from "../../_generated/api"
import { internalAction, internalQuery } from "../../_generated/server"
import { createAuth } from "../../auth"

/** Documented password for accounts in a freshly seeded deployment. */
export const SEED_PASSWORD = "KalaNidhi2026!"

function authUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /component|betterauth|secret|BETTER_AUTH/i.test(message)
}

/**
 * Creates Better Auth subjects for the users of a new seed. A full volume
 * reset precedes this step, so an existing address is always a deployment
 * error rather than something to merge with old data.
 */
export const seedAuthAccounts = internalAction({
  args: { now: v.number() },
  handler: async (ctx, args): Promise<{
    accounts: number
    provisioned: number
    linked: number
    unavailable: boolean
  }> => {
    const candidates = await ctx.runQuery(
      internal.seed.domains.auth.seedAuthSnapshot,
      {},
    )
    if (candidates.length === 0) {
      return { accounts: 0, provisioned: 0, linked: 0, unavailable: false }
    }

    let auth: ReturnType<typeof createAuth>
    try {
      auth = createAuth(ctx)
    } catch (error) {
      if (!authUnavailable(error)) throw error
      return {
        accounts: 0,
        provisioned: 0,
        linked: 0,
        unavailable: true,
      }
    }

    let provisioned = 0
    try {
      for (const candidate of candidates) {
        const result = await auth.api.signUpEmail({
          body: {
            name: candidate.name,
            email: candidate.email,
            password: SEED_PASSWORD,
          },
        })
        const authUserId = (result as { user?: { id?: string } }).user?.id
        if (!authUserId) {
          throw new Error(
            `Seed auth tidak mengembalikan id untuk ${candidate.email}.`,
          )
        }
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
          input: {
            model: "user",
            where: [{ field: "_id", value: authUserId }],
            update: { emailVerified: true, updatedAt: args.now },
          },
        })
        provisioned += 1
      }
    } catch (error) {
      if (!authUnavailable(error)) throw error
      return {
        accounts: 0,
        provisioned: 0,
        linked: 0,
        unavailable: true,
      }
    }

    return {
      accounts: candidates.length,
      provisioned,
      linked: candidates.length,
      unavailable: false,
    }
  },
})

/** Read-only candidate list for the new deployment's seed accounts. */
export const seedAuthSnapshot = internalQuery({
  args: {},
  handler: async (ctx) =>
    (await ctx.db.query("users").collect())
      .filter(
        (user) =>
          user.status !== "deleted" &&
          user.authUserId.startsWith("seed-") &&
          user.email.includes("@"),
      )
      .map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email.trim().toLowerCase(),
      })),
})
