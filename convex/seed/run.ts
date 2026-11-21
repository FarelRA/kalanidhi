import { ConvexError, v } from "convex/values"

import { internal } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server"
import { isPlaceholderAuthId, normalizeSeedEmail } from "./lib/auth"
import { DAY, jakartaDayStart, SEED_START } from "./lib/clock"
import {
  pathsSeed,
  siteSeed,
  teachersSeed,
  worksSeed,
} from "./content/data"
import {
  CURRICULUM_IMAGE_FILES,
  CURRICULUM_MEDIA_FILES,
} from "./domains/curriculum"
import { MESSAGING_IMAGE_FILES } from "./domains/messaging"

/** Bumped whenever the seed's shape changes; stored on every run row. */
export const SEED_VERSION = "2026-11-seed-v5"

/** A run whose last heartbeat is younger than this still owns the lock. */
const LOCK_TTL_MS = 10 * 60_000

/** Every media file the seed expects to keep active, one row per filename. */
const SEED_MEDIA_FILES = Array.from(
  new Set([
    siteSeed.hero.plate.imageFile,
    siteSeed.metadata.image.imageFile,
    ...pathsSeed.map((path) => path.imageFile),
    ...teachersSeed.map((teacher) => teacher.imageFile),
    ...worksSeed.map((work) => work.imageFile),
    ...CURRICULUM_IMAGE_FILES,
    ...CURRICULUM_MEDIA_FILES,
    ...MESSAGING_IMAGE_FILES,
  ]),
)

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
    allowRealUsers: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<Id<"seedRuns">> => {
    // A full seed clears every domain table. Preserving a real account row
    // would leave that account without its orders, certificates, or messages,
    // so refuse before touching anything unless the operator explicitly asks
    // for a destructive replay.
    const mappings = await ctx.db.query("seedAuthAccounts").collect()
    const seedEmails = new Set(
      mappings.map((row) => normalizeSeedEmail(row.email)),
    )
    const users = await ctx.db.query("users").collect()
    const realUsers = users.filter(
      (user) =>
        user.status !== "deleted" &&
        !user.roles.includes("admin") &&
        !isPlaceholderAuthId(user.authUserId) &&
        !seedEmails.has(normalizeSeedEmail(user.email)),
    )
    if (realUsers.length > 0 && !args.allowRealUsers) {
      throw new ConvexError({
        code: "SEED_REAL_USERS_PRESENT",
        message:
          `Seed dihentikan karena ada ${realUsers.length} akun nyata. ` +
          "Data akun itu bisa ikut terhapus. Jalankan ulang dengan allowRealUsers bila memang ingin mengganti seluruh data.",
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
 * Readiness signal for `runIfEmpty`. A `complete` run row alone is not enough:
 * a process can die after writing the row but before every domain committed, or
 * an operator can clear one table by hand. The seed is ready to skip only when
 * each key table has at least one row.
 */
export const readiness = internalQuery({
  args: {},
  handler: async (ctx) => {
    const checks = {
      users: (await ctx.db.query("users").first()) !== null,
      paths: (await ctx.db.query("paths").first()) !== null,
      pathModules: (await ctx.db.query("pathModules").first()) !== null,
      lessons: (await ctx.db.query("lessons").first()) !== null,
      cohorts: (await ctx.db.query("cohorts").first()) !== null,
      enrollments: (await ctx.db.query("enrollments").first()) !== null,
      orders: (await ctx.db.query("orders").first()) !== null,
      payments: (await ctx.db.query("payments").first()) !== null,
      siteContent:
        (await ctx.db
          .query("siteContent")
          .withIndex("by_key", (q) => q.eq("key", "site"))
          .first()) !== null,
    }
    return {
      ready: Object.values(checks).every(Boolean),
      checks,
    }
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
    /** Only set this when a destructive replay with real accounts is intended. */
    allowRealUsers: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const now = args.now ?? Date.now()
    const runId = await ctx.runMutation(internal.seed.run.beginRun, {
      now,
      version: SEED_VERSION,
      allowRealUsers: args.allowRealUsers,
    })

    const step = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
      await ctx.runMutation(internal.seed.run.setStep, { runId, step: name, now })
      return await fn()
    }

    try {
      // Convex caps a mutation at one second, so the workspace is cleared in
      // budget-sized slices instead of one large transaction.
      await step("clear", async () => {
        let cleared = false
        while (!cleared) {
          const result = await ctx.runMutation(
            internal.seed.domains.clear.clearBatch,
            { includeRealUsers: args.allowRealUsers },
          )
          cleared = result.done
        }
      })
      await step("retireRemovedAccounts", () =>
        ctx.runAction(internal.seed.domains.auth.retireRemovedSeedAccounts, {}),
      )
      await step("retireRemovedMedia", () =>
        ctx.runMutation(internal.media.purgeRetiredSeedMedia, {}),
      )
      // The registry lives outside CLEAR_TABLES, so stale and duplicate seed
      // rows survive a reseed. Archive them now, keeping every filename the
      // seed uses and every asset a content row still references.
      await step("media", () =>
        ctx.runMutation(internal.media.pruneSeedImagesInternal, {
          keepFilenames: SEED_MEDIA_FILES,
        }),
      )
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
      // The operator's admin account is created by Better Auth itself and keeps
      // its real subject, so `seedAuthAccounts` intentionally has no admin
      // mapping; only placeholder seed accounts are mapped here.
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
        learning,
        credentials,
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

/**
 * Seeds only when there is nothing trustworthy to keep.
 *
 * A `complete` run plus every key table populated means skip. A `failed` run,
 * no run at all, or a complete row with missing tables means the last attempt
 * left a half-seeded database, so clear and run again.
 */
export const runIfEmpty = internalAction({
  args: {},
  handler: async (ctx): Promise<{ seeded: boolean }> => {
    const latest = await ctx.runQuery(internal.seed.run.status, {})
    if (latest?.status === "complete") {
      const { ready } = await ctx.runQuery(internal.seed.run.readiness, {})
      if (ready) return { seeded: false }
    }
    await ctx.runAction(internal.seed.run.run, {})
    return { seeded: true }
  },
})
