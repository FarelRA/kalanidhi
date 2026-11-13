import { internal } from "./_generated/api"
import { internalAction } from "./_generated/server"
import { DAY, SEED_START } from "./seedIdentities"
import { jakartaDayStart } from "./seedOperations"

export const run = internalAction({
  args: {},
  handler: async (ctx): Promise<Record<string, unknown>> => {
    // Convex caps a mutation at one second, so the workspace is cleared in
    // budget-sized slices instead of one large transaction.
    let cleared = false
    while (!cleared) {
      const result = await ctx.runMutation(internal.seed.clearBatch)
      cleared = result.done
    }
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
    await ctx.runMutation(internal.seedOperations.seedMetricDefinitions)
    const now = Date.now()
    let metricStart = jakartaDayStart(SEED_START)
    let metricDays = 0
    while (metricStart <= now) {
      const metricEnd = Math.min(metricStart + 30 * DAY, now + 1)
      const slice = await ctx.runMutation(
        internal.seedOperations.seedMetrics,
        { start: metricStart, end: metricEnd },
      )
      metricDays += slice.days
      if (metricEnd > now) break
      metricStart = metricEnd
    }
    const metrics = { days: metricDays }
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
