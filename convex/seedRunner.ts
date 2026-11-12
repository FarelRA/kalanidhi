import { internal } from "./_generated/api"
import { internalAction } from "./_generated/server"

export const run = internalAction({
  args: {},
  handler: async (ctx): Promise<Record<string, unknown>> => {
    await ctx.runMutation(internal.seed.clearAll)
    await ctx.runMutation(internal.seedWorkspace.seedPeople)
    const content = await ctx.runMutation(internal.seed.seedContent)
    const curriculum = await ctx.runMutation(
      internal.seedWorkspace.seedCurriculum,
    )
    const learning = await ctx.runMutation(internal.seedWorkspace.seedLearning)
    const credentials = await ctx.runMutation(
      internal.seedWorkspace.seedCredentials,
    )
    const commerce = await ctx.runMutation(
      internal.seedWorkspace.seedCommerce,
    )
    const messaging = await ctx.runMutation(
      internal.seedOperations.seedMessaging,
    )
    const settings = await ctx.runMutation(
      internal.seedOperations.seedSettings,
    )
    const ops = await ctx.runMutation(internal.seedOperations.seedOps)
    const governance = await ctx.runMutation(
      internal.seedOperations.seedGovernance,
    )
    const metrics = await ctx.runMutation(
      internal.seedOperations.seedMetrics,
    )
    const audit = await ctx.runMutation(internal.seedOperations.seedAudit)

    return {
      content,
      curriculum,
      learning,
      credentials,
      commerce,
      messaging,
      settings,
      ops,
      governance,
      metrics,
      audit,
    }
  },
})

export const runIfEmpty = internalAction({
  args: {},
  handler: async (ctx): Promise<{ seeded: boolean }> => {
    const existing = await ctx.runQuery(internal.seed.hasContent)
    if (existing) return { seeded: false }
    await ctx.runAction(internal.seedRunner.run)
    return { seeded: true }
  },
})
