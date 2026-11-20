import type { MutationCtx, QueryCtx } from "./_generated/server"

type GuardCtx = Pick<QueryCtx, "db" | "auth"> | Pick<MutationCtx, "db" | "auth">

/**
 * The Convex JWT carries the Better Auth session id. A session revoked from
 * settings must stop resolving an identity even while the cached JWT is still
 * inside its short lifetime. The projection is written by the Better Auth
 * triggers, so every resolver can share this check.
 *
 * A missing projection row is allowed because the trigger projects a brand-new
 * session asynchronously. Only an existing row can block the identity.
 */
export async function hasLiveSession(
  ctx: Pick<GuardCtx, "db">,
  identity: unknown,
): Promise<boolean> {
  const sessionId = (identity as { sessionId?: unknown } | null)?.sessionId
  if (typeof sessionId !== "string" || !sessionId) return true
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_authSessionId", (q) => q.eq("authSessionId", sessionId))
    .unique()
  if (!session) return true
  return !session.revokedAt && session.expiresAt > Date.now()
}

/** Identity for a request that still has a live Better Auth session. */
export async function liveIdentity(ctx: GuardCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  return (await hasLiveSession(ctx, identity)) ? identity : null
}
