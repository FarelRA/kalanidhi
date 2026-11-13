import { describe, expect, it } from "vitest"

import { internal } from "../convex/_generated/api"
import {
  pathsSeed,
  siteSeed,
  teachersSeed,
  worksSeed,
} from "../convex/seedData"
import { SEED_START } from "../convex/seedIdentities"
import { createTestDb } from "./helpers/convex"

const NOW = Date.now()
const DAY = 86_400_000

function seedFilenames(): string[] {
  return Array.from(
    new Set([
      siteSeed.hero.plate.imageFile,
      siteSeed.metadata.image.imageFile,
      ...pathsSeed.map((path) => path.imageFile),
      ...teachersSeed.map((teacher) => teacher.imageFile),
      ...worksSeed.map((work) => work.imageFile),
    ]),
  )
}

async function seedWorkspace(t: ReturnType<typeof createTestDb>) {
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
  await t.action(internal.seedRunner.run, {})
}

function timestampRange(values: Array<number | undefined>) {
  const filled = values.filter((value): value is number => value !== undefined)
  return {
    min: Math.min(...filled),
    max: Math.max(...filled),
    count: filled.length,
  }
}

describe("seed realism", () => {
  it("uses plausible Gmail, WhatsApp, and DIY identities", async () => {
    const t = createTestDb()
    await seedWorkspace(t)

    const users = await t.run(async (ctx) => {
      return await ctx.db.query("users").collect()
    })

    const emails = new Set<string>()
    const phones = new Set<string>()
    for (const user of users) {
      if (user.roles.includes("admin")) {
        // The operator account is provisioned by Better Auth, not the seed.
        expect(user.province).toBe("DI Yogyakarta")
        continue
      }

      expect(user.email).toMatch(/^[a-z0-9]+(\.[a-z0-9]+)*\d{2}@gmail\.com$/)
      expect(user.phone).toMatch(/^628\d{8,11}$/)
      expect(user.province).toBe("DI Yogyakarta")
      expect(user.region.toLowerCase()).toContain("yogyakarta")
      expect(user.whatsappVerified).toBe(true)
      expect(user.createdAt).toBeGreaterThanOrEqual(SEED_START)
      expect(user.createdAt).toBeLessThanOrEqual(NOW)

      emails.add(user.email)
      phones.add(user.phone)
    }

    expect(emails.size).toBe(users.length - 1)
    expect(phones.size).toBe(users.length - 1)
  })

  it("masks payout accounts like real bank records", async () => {
    const t = createTestDb()
    await seedWorkspace(t)

    const accounts = await t.run(async (ctx) => {
      return await ctx.db.query("payoutAccounts").collect()
    })

    expect(accounts.length).toBeGreaterThan(0)
    const suffixes = new Set<string>()
    for (const account of accounts) {
      expect(account.accountNumberMasked).toMatch(/^\*{4}\d{4}$/)
      expect(account.accountName.trim().length).toBeGreaterThan(3)
      expect(["BCA", "BRI", "BNI", "Mandiri"]).toContain(account.bankCode)
      suffixes.add(account.accountNumberMasked)
    }
    expect(suffixes.size).toBe(accounts.length)
  })

  it("keeps order codes in chronological order", async () => {
    const t = createTestDb()
    await seedWorkspace(t)

    const orders = await t.run(async (ctx) => {
      return await ctx.db.query("orders").collect()
    })
    const sorted = [...orders].sort((a, b) => a.code.localeCompare(b.code))
    for (let index = 1; index < sorted.length; index += 1) {
      expect(
        sorted[index].createdAt,
        `${sorted[index].code} should be newer than ${sorted[index - 1].code}`,
      ).toBeGreaterThanOrEqual(sorted[index - 1].createdAt)
    }
  })

  it("spreads domain activity from January 2026 to the present", async () => {
    const t = createTestDb()
    await seedWorkspace(t)

    const ranges = await t.run(async (ctx) => {
      const collect = async (table: string) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await ctx.db.query(table as any).collect()
      const tables = [
        "submissions",
        "assessments",
        "certificates",
        "orders",
        "payments",
        "payouts",
        "messages",
        "leads",
        "supportTickets",
        "culturalSources",
        "auditLogs",
        "cohorts",
        "pathModules",
        "lessons",
        "works",
      ]
      const result: Record<string, ReturnType<typeof timestampRange>> = {}
      for (const table of tables) {
        const docs = (await collect(table)) as Array<{ createdAt?: number }>
        result[table] = timestampRange(docs.map((doc) => doc.createdAt))
      }
      return result
    })

    for (const [table, range] of Object.entries(ranges)) {
      expect(range.count, `${table} should not be empty`).toBeGreaterThan(0)
      expect(range.min, `${table} starts before opening`).toBeGreaterThanOrEqual(
        SEED_START - DAY,
      )
      expect(range.max, `${table} is dated in the future`).toBeLessThanOrEqual(
        NOW + 2 * DAY,
      )
    }

    const startOfMarch = Date.UTC(2026, 2, 1)
    const startOfFebruary = Date.UTC(2026, 1, 10)
    const sixtyDaysAgo = NOW - 60 * DAY
    const ninetyDaysAgo = NOW - 90 * DAY
    const sevenDaysAgo = NOW - 7 * DAY

    expect(ranges.submissions.min).toBeLessThan(startOfMarch)
    expect(ranges.submissions.max).toBeGreaterThan(sixtyDaysAgo)
    expect(ranges.orders.min).toBeLessThan(startOfFebruary)
    expect(ranges.orders.max).toBeGreaterThan(sixtyDaysAgo)
    expect(ranges.messages.min).toBeLessThan(startOfMarch)
    expect(ranges.messages.max).toBeGreaterThan(sevenDaysAgo)
    expect(ranges.leads.min).toBeLessThan(startOfFebruary)
    expect(ranges.leads.max).toBeGreaterThan(sevenDaysAgo)
    expect(ranges.auditLogs.min).toBeLessThanOrEqual(SEED_START + DAY)
    expect(ranges.auditLogs.max).toBeGreaterThan(ninetyDaysAgo)
    expect(ranges.certificates.max).toBeGreaterThan(ninetyDaysAgo)
  })
})
