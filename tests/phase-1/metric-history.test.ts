import { describe, expect, it } from "vitest"

import { api } from "../../convex/_generated/api"
import { createTestDb } from "../helpers/convex"
import { NOW, seedAdmin } from "./fixtures"

const DAY = 86_400_000

async function adminDb() {
  const t = createTestDb()
  await seedAdmin(t, "auth-admin")
  return t
}

describe("stats / metric history", () => {
  it("returns active definitions with their daily series in range", async () => {
    const t = await adminDb()
    await t.run(async (ctx) => {
      await ctx.db.insert("metricDefinitions", {
        key: "lead_conversion",
        label: "Konversi lead",
        definition: "Lead selesai dibagi lead terkualifikasi.",
        formula: "converted ÷ qualified",
        owner: "admin",
        version: 1,
        active: true,
        updatedAt: NOW,
      })
      await ctx.db.insert("metricDefinitions", {
        key: "retired_metric",
        label: "Metrik lama",
        definition: "Tidak lagi aktif.",
        formula: "lama",
        owner: "admin",
        version: 1,
        active: false,
        updatedAt: NOW,
      })
      await ctx.db.insert("dailyMetrics", {
        date: "2025-10-08",
        metricKey: "lead_conversion",
        value: 0.4,
        computedAt: NOW,
      })
      await ctx.db.insert("dailyMetrics", {
        date: "2025-10-09",
        metricKey: "lead_conversion",
        value: 0.5,
        computedAt: NOW,
      })
      // A dimension row is a breakdown, not the daily aggregate.
      await ctx.db.insert("dailyMetrics", {
        date: "2025-10-09",
        metricKey: "lead_conversion",
        dimension: "region:DIY",
        value: 0.9,
        computedAt: NOW,
      })
      // Outside the requested range.
      await ctx.db.insert("dailyMetrics", {
        date: "2025-09-01",
        metricKey: "lead_conversion",
        value: 0.1,
        computedAt: NOW,
      })
      await ctx.db.insert("dailyMetrics", {
        date: "2025-10-09",
        metricKey: "retired_metric",
        value: 12,
        computedAt: NOW,
      })
    })

    const report = await t
      .withIdentity({ subject: "auth-admin" })
      .query(api.stats.metricHistory, {
        from: NOW - 2 * DAY,
        to: NOW + DAY,
      })

    expect(report.definitions).toHaveLength(1)
    const series = report.definitions[0]
    expect(series.key).toBe("lead_conversion")
    expect(series.label).toBe("Konversi lead")
    expect(series.formula).toBe("converted ÷ qualified")
    expect(series.points).toEqual([
      { date: "2025-10-08", value: 0.4 },
      { date: "2025-10-09", value: 0.5 },
    ])
  })

  it("returns an honest empty report when no definitions exist", async () => {
    const t = await adminDb()
    const report = await t
      .withIdentity({ subject: "auth-admin" })
      .query(api.stats.metricHistory, {})

    expect(report.definitions).toEqual([])
    expect(report.range.to).toBeGreaterThanOrEqual(report.range.from)
  })

  it("rejects metric history for non-admin accounts", async () => {
    const t = createTestDb()
    await expect(
      t.query(api.stats.metricHistory, {}),
    ).rejects.toThrow()
  })
})
