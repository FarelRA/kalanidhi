import { ConvexError, v } from "convex/values"

import { internal } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server"
import { DAY, jakartaDayStart, SEED_START } from "./lib/clock"

/** Bumped whenever the seed's shape changes; stored on every run row. */
export const SEED_VERSION = "2026-11-seed-v3"

/** A run younger than this still owns the lock. */
const LOCK_TTL_MS = 10 * 60_000

/**
 * Acquires the seed lock and opens a run row.
 *
 * A `running` row younger than `LOCK_TTL_MS` means another run is in flight,
 * so the caller throws `SEED_RUNNING`. An older one is a crash leftover: it is
 * closed as failed so the new run can proceed.
 */
export const beginRun = internalMutation({
  args: { now: v.number(), version: v.string() },
  handler: async (ctx, args): Promise<Id<"seedRuns">> => {
    const running = await ctx.db
      .query("seedRuns")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .collect()
    for (const row of running) {
      if (row.startedAt > args.now - LOCK_TTL_MS) {
        throw new ConvexError({
          code: "SEED_RUNNING",
          message: `Seed lain masih berjalan sejak ${new Date(row.startedAt).toISOString()} (langkah: ${row.step}).`,
        })
      }
      await ctx.db.patch(row._id, {
        status: "failed",
        finishedAt: args.now,
        error: "Stale running row: the previous seed process stopped early.",
      })
    }
    return await ctx.db.insert("seedRuns", {
      status: "running",
      step: "start",
      version: args.version,
      startedAt: args.now,
      now: args.now,
    })
  },
})

export const setStep = internalMutation({
  args: { runId: v.id("seedRuns"), step: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, { step: args.step })
  },
})

export const markComplete = internalMutation({
  args: {
    runId: v.id("seedRuns"),
    now: v.number(),
    counts: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      status: "complete",
      step: "done",
      finishedAt: args.now,
      counts: args.counts,
    })
  },
})

export const markFailed = internalMutation({
  args: { runId: v.id("seedRuns"), now: v.number(), error: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      status: "failed",
      finishedAt: args.now,
      error: args.error,
    })
  },
})

/** The most recent run, for ops and debugging. */
export const status = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("seedRuns")
      .withIndex("by_startedAt")
      .order("desc")
      .first()
  },
})

/**
 * Full reseed.
 *
 * The wall clock is read exactly once; every mutation and action receives that
 * `now` so two runs anchored to the same instant produce identical rows. Run
 * history is never cleared: `seedRuns` sits outside `CLEAR_TABLES`.
 */
export const run = internalAction({
  args: {
    /** Test/ops replay hook; production reads the wall clock exactly once. */
    now: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const now = args.now ?? Date.now()
    const runId = await ctx.runMutation(internal.seed.run.beginRun, {
      now,
      version: SEED_VERSION,
    })

    const step = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
      await ctx.runMutation(internal.seed.run.setStep, { runId, step: name })
      return await fn()
    }

    try {
      // Convex caps a mutation at one second, so the workspace is cleared in
      // budget-sized slices instead of one large transaction.
      await step("clear", async () => {
        let cleared = false
        while (!cleared) {
          const result = await ctx.runMutation(internal.seed.domains.clear.clearBatch)
          cleared = result.done
        }
      })
      await step("people", () =>
        ctx.runMutation(internal.seed.domains.people.seedPeople, { now }),
      )
      const content = await step("content", () =>
        ctx.runMutation(internal.seed.domains.content.seedContent, { now }),
      )
      const curriculum = await step("curriculum", () =>
        ctx.runMutation(internal.seed.domains.curriculum.seedCurriculum, { now }),
      )
      const learning = await step("learning", () =>
        ctx.runAction(internal.seed.domains.learning.seedLearning, { now }),
      )
      const credentials = await step("credentials", () =>
        ctx.runMutation(internal.seed.domains.credentials.seedCredentials, { now }),
      )
      const commerce = await step("commerce", () =>
        ctx.runMutation(internal.seed.domains.commerce.seedCommerce, { now }),
      )
      const messaging = await step("messaging", () =>
        ctx.runAction(internal.seed.domains.messaging.seedMessaging, { now }),
      )
      const settings = await step("settings", () =>
        ctx.runMutation(internal.seed.domains.settings.seedSettings, { now }),
      )
      const ops = await step("ops", () =>
        ctx.runMutation(internal.seed.domains.ops.seedOps, { now }),
      )
      const governance = await step("governance", () =>
        ctx.runMutation(internal.seed.domains.governance.seedGovernance, { now }),
      )
      await step("metricDefinitions", () =>
        ctx.runMutation(internal.seed.domains.metrics.seedMetricDefinitions, { now }),
      )
      // Growth intake runs after commerce and credentials but before the metric
      // slices, so daily GMV, activation, and cohort fill include it.
      const growth = await step("growth", () =>
        ctx.runAction(internal.seed.domains.growth.seedGrowth, { now }),
      )
      const metrics = await step("metrics", async () => {
        let metricStart = jakartaDayStart(SEED_START)
        let metricDays = 0
        while (metricStart <= now) {
          const metricEnd = Math.min(metricStart + 15 * DAY, now + 1)
          const slice = await ctx.runMutation(
            internal.seed.domains.metrics.seedMetrics,
            { start: metricStart, end: metricEnd, now },
          )
          metricDays += slice.days
          if (metricEnd > now) break
          metricStart = metricEnd
        }
        return { days: metricDays }
      })
      const audit = await step("audit", () =>
        ctx.runMutation(internal.seed.domains.audit.seedAudit, { now }),
      )
      // Provision Better Auth subjects before integrity checks the final users.
      const auth = await step("auth", () =>
        ctx.runAction(internal.seed.domains.auth.seedAuthAccounts, {}),
      )
      // A broken seed must be `failed`, never `complete`.
      const integrity = await step("integrity", () =>
        ctx.runMutation(internal.seed.integrity.assert),
      )

      const counts = {
        content,
        curriculum,
        learning,
        credentials,
        commerce,
        messaging,
        settings,
        ops,
        governance,
        growth,
        metrics,
        audit,
        auth: { accounts: auth.accounts, unavailable: auth.unavailable },
        integrity,
      }
      await ctx.runMutation(internal.seed.run.markComplete, {
        runId,
        now,
        counts,
      })
      return counts
    } catch (error) {
      await ctx.runMutation(internal.seed.run.markFailed, {
        runId,
        now,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  },
})

/**
 * Seeds only when there is nothing trustworthy to keep.
 *
 * A `complete` run plus a `siteContent` row means skip. A `failed` run (or no
 * run at all) means the last attempt left a half-seeded database, so clear and
 * run again.
 */
export const runIfEmpty = internalAction({
  args: {},
  handler: async (ctx): Promise<{ seeded: boolean }> => {
    const latest = await ctx.runQuery(internal.seed.run.status, {})
    if (latest?.status === "complete") {
      const existing = await ctx.runQuery(internal.seed.domains.content.hasContent, {})
      if (existing) return { seeded: false }
    }
    await ctx.runAction(internal.seed.run.run, {})
    return { seeded: true }
  },
})
