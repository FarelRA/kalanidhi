import { describe, expect, it } from "vitest"

import { internal } from "../convex/_generated/api"
import {
  pathsSeed,
  siteSeed,
  teachersSeed,
  worksSeed,
} from "../convex/seed/content/data"
import { SEED_VERSION } from "../convex/seed/run"
import { CURRICULUM_IMAGE_FILES } from "../convex/seed/domains/curriculum"
import { MESSAGING_IMAGE_FILES } from "../convex/seed/domains/messaging"
import { createTestDb, type TestDb } from "./helpers/convex"

/** A fixed instant: the seed must be reproducible from this alone. */
const NOW = Date.UTC(2026, 10, 18, 10, 0, 0)
const MINUTE = 60_000

function seedFilenames(): string[] {
  return Array.from(
    new Set([
      siteSeed.hero.plate.imageFile,
      siteSeed.metadata.image.imageFile,
      ...pathsSeed.map((path) => path.imageFile),
      ...teachersSeed.map((teacher) => teacher.imageFile),
      ...worksSeed.map((work) => work.imageFile),
      ...CURRICULUM_IMAGE_FILES,
      ...MESSAGING_IMAGE_FILES,
    ]),
  )
}

async function registerImages(t: TestDb) {
  await t.run(async (ctx) => {
    for (const filename of seedFilenames()) {
      const storageId = await ctx.storage.store(
        new Blob([`image:${filename}`], { type: "image/jpeg" }),
      )
      await ctx.db.insert("mediaAssets", {
        kind: "image",
        storageId,
        filename,
        mimeType: "image/jpeg",
        size: 10,
        alt: filename,
        status: "active",
        uploadedBy: "system",
        createdAt: NOW,
      })
    }
  })
}

async function insertRun(
  t: TestDb,
  input: {
    status: "running" | "complete" | "failed"
    startedAt: number
    step?: string
    error?: string
  },
) {
  return await t.run(async (ctx) =>
    await ctx.db.insert("seedRuns", {
      status: input.status,
      step: input.step ?? "clear",
      version: SEED_VERSION,
      startedAt: input.startedAt,
      finishedAt:
        input.status === "running" ? undefined : input.startedAt + 1_000,
      now: input.startedAt,
      error: input.error,
    }),
  )
}

/** A comparable slice of the seeded world: identity plus timeline. */
async function timestampSnapshot(t: TestDb) {
  return await t.run(async (ctx) => {
    const users = (await ctx.db.query("users").collect())
      .map((row) => [row.name, row.createdAt] as const)
      .sort((a, b) => a[0].localeCompare(b[0]))
    const cohorts = (await ctx.db.query("cohorts").collect())
      .map(
        (row) =>
          [row.code, row.startDate, row.endDate, row.createdAt] as const,
      )
      .sort((a, b) => a[0].localeCompare(b[0]))
    const messages = (await ctx.db.query("messages").collect())
      .map((row) => [row.body ?? "", row.createdAt] as const)
      .sort((a, b) => a[0].localeCompare(b[0]))
    const metrics = (await ctx.db.query("dailyMetrics").collect())
      .map((row) => [row.date, row.metricKey, row.computedAt] as const)
      .sort((a, b) =>
        `${a[0]}:${a[1]}`.localeCompare(`${b[0]}:${b[1]}`),
      )
    const site = await ctx.db
      .query("siteContent")
      .withIndex("by_key", (q) => q.eq("key", "site"))
      .unique()
    return {
      users,
      cohorts,
      messages,
      metrics,
      siteUpdatedAt: site?.updatedAt,
    }
  })
}

describe("seed runtime", () => {
  it("reproduces the same counts when run twice and completes", async () => {
    const t = createTestDb()
    await registerImages(t)

    const first = await t.action(internal.seed.run.run, { now: NOW })
    const second = await t.action(internal.seed.run.run, { now: NOW })

    expect(second).toEqual(first)

    const runs = await t.run(
      async (ctx) => await ctx.db.query("seedRuns").collect(),
    )
    // History is preserved: the lock row survives clearBatch.
    expect(runs).toHaveLength(2)
    expect(runs.map((row) => row.status)).toEqual(["complete", "complete"])

    const latest = await t.query(internal.seed.run.status, {})
    expect(latest?.status).toBe("complete")
    expect(latest?.step).toBe("done")
    expect(latest?.finishedAt).toBe(NOW)
    expect(latest?.counts).toBeDefined()
  }, 180_000)

  it("closes a stale running row and proceeds", async () => {
    const t = createTestDb()
    await registerImages(t)
    const stale = await insertRun(t, {
      status: "running",
      startedAt: NOW - 11 * MINUTE,
    })

    await t.action(internal.seed.run.run, { now: NOW })

    const staleRow = await t.run(async (ctx) => await ctx.db.get(stale))
    expect(staleRow?.status).toBe("failed")
    expect(staleRow?.error).toMatch(/Stale/)
    expect(staleRow?.finishedAt).toBe(NOW)

    const latest = await t.query(internal.seed.run.status, {})
    expect(latest?.status).toBe("complete")
  }, 180_000)

  it("rejects a concurrent run while the lock is fresh", async () => {
    const t = createTestDb()
    await registerImages(t)
    await insertRun(t, {
      status: "running",
      startedAt: NOW - 1 * MINUTE,
    })

    await expect(
      t.action(internal.seed.run.run, { now: NOW }),
    ).rejects.toThrow(/SEED_RUNNING/)

    const latest = await t.query(internal.seed.run.status, {})
    expect(latest?.status).toBe("running")
  }, 180_000)

  it("reruns after a failed run and skips after a complete one", async () => {
    const t = createTestDb()
    await registerImages(t)
    await insertRun(t, {
      status: "failed",
      startedAt: NOW - 5 * MINUTE,
      step: "commerce",
      error: "boom",
    })

    const rerun = await t.action(internal.seed.run.runIfEmpty, {})
    expect(rerun.seeded).toBe(true)

    const skip = await t.action(internal.seed.run.runIfEmpty, {})
    expect(skip.seeded).toBe(false)

    const latest = await t.query(internal.seed.run.status, {})
    expect(latest?.status).toBe("complete")
  }, 180_000)

  it("keeps the batched seed's row counts and integrity", async () => {
    const t = createTestDb()
    await registerImages(t)

    const counts = await t.action(internal.seed.run.run, { now: NOW })

    // Learning is split by cohort; messaging by conversation group. The totals
    // must match the pre-batching seed exactly.
    expect(counts.learning).toEqual({
      cohorts: 10,
      enrollments: 29,
      submissions: 29,
      assessments: 27,
    })
    expect(counts.messaging).toEqual({
      conversations: 10,
      messages: 48,
      calls: 4,
    })
    expect(counts.auth).toEqual({ accounts: 0, unavailable: true })
    const growth = counts.growth as {
      signups: number
      enrollments: number
      pathOrders: number
      workOrders: number
      messaging: { conversations: number; messages: number; calls: number }
    }
    expect(growth.signups).toBe(129)
    expect(growth.enrollments).toBe(96)
    expect(growth.pathOrders).toBe(96)
    expect(growth.workOrders).toBe(58)
    expect(growth.messaging).toEqual({
      conversations: 38,
      messages: 241,
      calls: 10,
    })

    const integrity = await t.query(internal.seed.integrity.verify, {})
    expect(integrity).toEqual([])

    const tickets = await t.run(async (ctx) =>
      await ctx.db.query("supportTickets").collect(),
    )
    const resolved = tickets.filter(
      (ticket) => ticket.status === "resolved" || ticket.status === "closed",
    )
    const notes = resolved.map((ticket) => ticket.resolutionNote ?? "")
    expect(notes.every((note) => note.length > 10)).toBe(true)
    expect(new Set(notes).size).toBe(notes.length)
    const priorities = new Set(tickets.map((ticket) => ticket.priority))
    expect(priorities.has("high")).toBe(true)
    expect(priorities.has("low")).toBe(true)
  }, 180_000)

  it("produces identical timestamps for two worlds at the same now", async () => {
    const a = createTestDb()
    const b = createTestDb()
    await registerImages(a)
    await registerImages(b)

    await a.action(internal.seed.run.run, { now: NOW })
    await b.action(internal.seed.run.run, { now: NOW })

    expect(await timestampSnapshot(b)).toEqual(await timestampSnapshot(a))
  }, 180_000)
})
