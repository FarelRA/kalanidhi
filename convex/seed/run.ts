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
export const SEED_VERSION = "2026-11-seed-v7"

/** A run whose last heartbeat is younger than this still owns the lock. */
const LOCK_TTL_MS = 10 * 60_000

/**
 * Acquires the seed lock and opens a run row.
 *
 * The lock is measured from the last heartbeat, not from `startedAt`: the
 * action writes `finishedAt` as a heartbeat on every step while running. A
 * `running` row with a recent heartbeat means another run is in flight, so the
 * caller throws `SEED_RUNNING`. An older one is a crash leftover: it is closed
 * as failed so the new run can proceed.
 */
export const beginRun = internalMutation({
  args: {
    now: v.number(),
    version: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"seedRuns">> => {
    // Reseeding an occupied deployment would leave rows that the seed does
    // not own. Full reset belongs to the self-hosted Convex volume, not to a
    // collection of application-level deletion rules.
    const occupied = await Promise.all([
      ctx.db.query("users").first(),
      ctx.db.query("paths").first(),
      ctx.db.query("siteContent").first(),
      ctx.db.query("cohorts").first(),
      ctx.db.query("orders").first(),
    ])
    if (occupied.some(Boolean)) {
      throw new ConvexError({
        code: "SEED_REQUIRES_EMPTY_DEPLOYMENT",
        message:
          "Seed hanya dapat dijalankan pada deployment kosong. Reset volume Convex lebih dulu, deploy functions, unggah media seed, lalu jalankan seed.",
      })
    }

    const running = await ctx.db
      .query("seedRuns")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .collect()
    for (const row of running) {
      // While running, `finishedAt` doubles as the last-activity heartbeat.
      const lastActivity = Math.max(
        row.startedAt,
        row.finishedAt ?? row.startedAt,
      )
      if (lastActivity > args.now - LOCK_TTL_MS) {
        throw new ConvexError({
          code: "SEED_RUNNING",
          message: `Seed lain masih berjalan sejak ${new Date(row.startedAt).toISOString()} (langkah ${row.step}).`,
        })
      }
      await ctx.db.patch(row._id, {
        status: "failed",
        finishedAt: args.now,
        error: "Stale running row, the previous seed process stopped early.",
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
  args: { runId: v.id("seedRuns"), step: v.string(), now: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // Heartbeat the lock on every step; `finishedAt` is only meaningful once
    // the run completes or fails, so a running row can use it as last activity.
    await ctx.db.patch(args.runId, {
      step: args.step,
      finishedAt: args.now ?? Date.now(),
    })
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
 * Seed an empty deployment.
 *
 * The wall clock is read exactly once; every mutation and action receives that
 * `now` so two empty deployments anchored to the same instant produce
 * identical rows. Production is anchored to the completed previous day so the
 * last full reporting day is stable. Resetting a deployment removes run
 * history with every other application row.
 */
export const run = internalAction({
  args: {
    /** Test/ops replay hook; production reads the wall clock exactly once. */
    now: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const now = args.now ?? Date.now() - DAY
    const runId = await ctx.runMutation(internal.seed.run.beginRun, {
      now,
      version: SEED_VERSION,
    })

    const step = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
      await ctx.runMutation(internal.seed.run.setStep, { runId, step: name, now })
      return await fn()
    }

    try {
      await step("people", () =>
        ctx.runMutation(internal.seed.domains.people.seedPeople, { now }),
      )
      const content = await step("content", () =>
        ctx.runMutation(internal.seed.domains.content.seedContent, { now }),
      )
      const curriculum = await step("curriculum", () =>
        ctx.runMutation(internal.seed.domains.curriculum.seedCurriculum, { now }),
      )
      const commerce = await step("commerce", () =>
        ctx.runMutation(internal.seed.domains.commerce.seedCommerce, { now }),
      )
      const settings = await step("settings", () =>
        ctx.runMutation(internal.seed.domains.settings.seedSettings, { now }),
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
      const messaging = await step("messaging", () =>
        ctx.runAction(internal.seed.domains.messaging.seedMessaging, { now }),
      )
      const codes = await step("codes", () =>
        ctx.runMutation(internal.seed.domains.codes.renumberOrders),
      )
      // Ops and the audit trail read the final order codes.
      const ops = await step("ops", () =>
        ctx.runMutation(internal.seed.domains.ops.seedOps, { now }),
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
        ctx.runAction(internal.seed.domains.auth.seedAuthAccounts, { now }),
      )
      // A broken seed must be `failed`, never `complete`.
      const integrity = await step("integrity", () =>
        ctx.runMutation(internal.seed.integrity.assert),
      )

      const counts = {
        content,
        curriculum,
        commerce,
        messaging,
        settings,
        ops,
        governance,
        growth,
        codes,
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
