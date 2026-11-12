import { readFile, readdir, stat } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { api } from "../convex/_generated/api"
import type { Id } from "../convex/_generated/dataModel"
import type { ContentDocument } from "../lib/content/types"
import { catalogFieldsSeed, worksSeed } from "../convex/seedData"
import { createTestDb } from "./helpers/convex"
import { seedAdmin, seedContent } from "./phase-1/fixtures"

async function adminDb() {
  const t = createTestDb()
  await seedAdmin(t, "auth-admin")
  return t
}

describe("landing selection / copy-only admin", () => {
  it("admin state contains copy and selection, never entity snapshots", async () => {
    const t = await adminDb()
    await seedContent(t)

    const state = await t
      .withIdentity({ subject: "auth-admin" })
      .query(api.content.getAdminState, {})
    expect(state.draftValue).not.toBeNull()

    const value = state.draftValue as ContentDocument & Record<string, unknown>
    for (const key of ["paths", "teachers", "works", "testimonials", "faqs"]) {
      expect(key in value).toBe(false)
    }
    expect(value.catalog).not.toHaveProperty("fields")
    expect(value.featured.heroWorkSlug).toBeTruthy()
    expect(value.featured.catalogFieldKeys).toHaveLength(
      catalogFieldsSeed.length,
    )
  })

  it("getSite resolves the hero work card from works, workCards, users, and teachers", async () => {
    const t = await adminDb()
    await seedContent(t)

    const site = await t.query(api.content.getSite, {})
    expect(site?.heroWorkCard).not.toBeNull()
    const hero = site?.heroWorkCard
    if (!hero) throw new Error("hero work card missing")

    const expected = await t.run(async (ctx) => {
      const work = await ctx.db
        .query("works")
        .withIndex("by_slug", (q) => q.eq("slug", hero.slug))
        .unique()
      if (!work) throw new Error("work missing")
      const card = await ctx.db
        .query("workCards")
        .withIndex("by_workId", (q) => q.eq("workId", work._id))
        .unique()
      if (!card) throw new Error("work card missing")
      const maker = work.makerId ? await ctx.db.get(work.makerId) : null
      const workPath = work.pathId
        ? await ctx.db
            .query("paths")
            .withIndex("by_slug", (q) => q.eq("slug", work.pathId as string))
            .unique()
        : null
      const teacher =
        workPath?.teacherId && workPath.teacherId
          ? await ctx.db
              .query("teachers")
              .withIndex("by_userId", (q) =>
                q.eq("userId", workPath.teacherId as Id<"users">),
              )
              .unique()
          : null
      return {
        serial: card.serial,
        work: work.title,
        maker: maker?.name,
        teacher: teacher?.name,
      }
    })

    expect(hero).toEqual({
      slug: hero.slug,
      serial: expected.serial,
      work: expected.work,
      maker: expected.maker,
      teacher: expected.teacher,
    })
    expect(site?.hero.workCard).toEqual({ title: "Kartu Karya" })

    await t.run(async (ctx) => {
      const work = await ctx.db
        .query("works")
        .withIndex("by_slug", (q) => q.eq("slug", hero.slug))
        .unique()
      if (!work) return
      const card = await ctx.db
        .query("workCards")
        .withIndex("by_workId", (q) => q.eq("workId", work._id))
        .unique()
      if (card) await ctx.db.patch(card._id, { serial: "KN-HERO-BARU" })
      await ctx.db.patch(work._id, { title: "Karya Hero Baru" })
      if (work.makerId) {
        await ctx.db.patch(work.makerId, { name: "Pembuat Baru" })
      }
    })

    const updated = await t.query(api.content.getSite, {})
    expect(updated?.heroWorkCard?.serial).toBe("KN-HERO-BARU")
    expect(updated?.heroWorkCard?.work).toBe("Karya Hero Baru")
    expect(updated?.heroWorkCard?.maker).toBe("Pembuat Baru")
  })

  it("featured options cover every landing node type and persist the selection", async () => {
    const t = await adminDb()
    await seedContent(t)
    const identity = t.withIdentity({ subject: "auth-admin" })

    const options = await identity.query(api.content.getFeaturedOptions, {})
    expect(options.paths.length).toBeGreaterThan(0)
    expect(options.teachers.length).toBeGreaterThan(0)
    expect(options.works.length).toBeGreaterThan(0)
    expect(options.testimonials.length).toBeGreaterThan(0)
    expect(options.catalogFields.length).toBeGreaterThan(0)
    expect(options.faqs.length).toBeGreaterThan(0)
    expect(options.featured?.catalogFieldKeys).toHaveLength(
      options.catalogFields.length,
    )
    expect(options.featured?.faqKeys).toHaveLength(options.faqs.length)

    const pathSlug = options.paths[0].slug
    const teacherSlug = options.teachers[0].slug
    const workSlug = options.works[options.works.length - 1].slug
    const testimonialId = options.testimonials[0].id
    const catalogFieldKey = options.catalogFields[0].key
    const faqKey = options.faqs[0].key

    await identity.mutation(api.content.setFeatured, {
      pathSlugs: [pathSlug],
      teacherSlugs: [teacherSlug],
      workSlugs: [workSlug],
      testimonialIds: [testimonialId],
      catalogFieldKeys: [catalogFieldKey],
      faqKeys: [faqKey],
      heroWorkSlug: workSlug,
      reason: "Kurasi uji seluruh tipe node",
    })

    const site = await t.query(api.content.getSite, {})
    expect(site?.paths.map((item) => item.slug)).toEqual([pathSlug])
    expect(site?.teachers.map((item) => item.slug)).toEqual([teacherSlug])
    expect(site?.works.map((item) => item.slug)).toEqual([workSlug])
    expect(site?.testimonials).toHaveLength(1)
    expect(site?.catalog.fields.map((field) => field.name)).toEqual([
      catalogFieldKey,
    ])
    expect(site?.faqs).toHaveLength(1)
    expect(site?.heroWorkCard?.slug).toBe(workSlug)
  })

  it("omits selected nodes that no longer exist instead of rendering a broken card", async () => {
    const t = await adminDb()
    await seedContent(t)

    await t.run(async (ctx) => {
      const site = await ctx.db
        .query("siteContent")
        .withIndex("by_key", (q) => q.eq("key", "site"))
        .unique()
      if (!site) return
      const value = site.value as Record<string, unknown>
      await ctx.db.patch(site._id, {
        value: {
          ...value,
          featured: {
            pathSlugs: ["jalur-hilang"],
            teacherSlugs: ["pengajar-hilang"],
            workSlugs: ["karya-hilang"],
            testimonialIds: ["testimoni-hilang"],
            catalogFieldKeys: ["Bidang hilang"],
            faqKeys: ["faq-hilang"],
            heroWorkSlug: "karya-hilang",
          },
        },
      })
    })

    const site = await t.query(api.content.getSite, {})
    expect(site?.paths).toEqual([])
    expect(site?.teachers).toEqual([])
    expect(site?.works).toEqual([])
    expect(site?.testimonials).toEqual([])
    expect(site?.catalog.fields).toEqual([])
    expect(site?.faqs).toEqual([])
    expect(site?.heroWorkCard).toBeNull()
  })

  it("omits a selected work whose work card is missing", async () => {
    const t = await adminDb()
    await seedContent(t)
    const slug = worksSeed[0].slug

    await t.run(async (ctx) => {
      const work = await ctx.db
        .query("works")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique()
      if (work) {
        const card = await ctx.db
          .query("workCards")
          .withIndex("by_workId", (q) => q.eq("workId", work._id))
          .unique()
        if (card) await ctx.db.delete(card._id)
      }
      const site = await ctx.db
        .query("siteContent")
        .withIndex("by_key", (q) => q.eq("key", "site"))
        .unique()
      if (!site) return
      const value = site.value as Record<string, unknown>
      await ctx.db.patch(site._id, {
        value: {
          ...value,
          featured: {
            pathSlugs: [],
            teacherSlugs: [],
            workSlugs: [slug],
            testimonialIds: [],
            catalogFieldKeys: [],
            faqKeys: [],
            heroWorkSlug: slug,
          },
        },
      })
    })

    const site = await t.query(api.content.getSite, {})
    expect(site?.works).toEqual([])
    expect(site?.heroWorkCard).toBeNull()
  })
})

describe("images / no static public assets", () => {
  it("has no static public asset references and keeps only the seed upload source", async () => {
    const root = process.cwd()
    const forbidden = ["public", "images"].join("/")
    const roots = [
      "app",
      "components",
      "convex",
      "lib",
      "scripts",
      "docs",
      "tests",
      "README.md",
      "proxy.ts",
      "AGENTS.md",
    ]
    const extensions = new Set([
      ".ts",
      ".tsx",
      ".js",
      ".mjs",
      ".md",
      ".json",
      ".css",
      ".yml",
      ".yaml",
    ])
    const skip = new Set(["node_modules", ".git", ".next", "coverage"])

    async function walk(target: string): Promise<string[]> {
      const info = await stat(target)
      if (info.isFile()) return [target]
      const entries = await readdir(target, { withFileTypes: true })
      const files: string[] = []
      for (const entry of entries) {
        if (skip.has(entry.name)) continue
        files.push(...(await walk(path.join(target, entry.name))))
      }
      return files
    }

    const files = (
      await Promise.all(roots.map((entry) => walk(path.join(root, entry))))
    ).flat()
    const offenders: string[] = []
    for (const file of files) {
      if (!extensions.has(path.extname(file))) continue
      const text = await readFile(file, "utf8")
      if (text.includes(forbidden)) offenders.push(path.relative(root, file))
    }

    expect(offenders).toEqual([])
    await expect(stat(path.join(root, "public", "images"))).rejects.toThrow()
    await expect(stat(path.join(root, "seed", "images"))).resolves.toBeTruthy()
  })
})
