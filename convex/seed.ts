import { internalMutation, type MutationCtx } from "./_generated/server"
import {
  catalogFieldsSeed,
  faqsSeed,
  pathsSeed,
  siteSeed,
  teachersSeed,
  testimonialsSeed,
  worksSeed,
} from "./seedData"

async function clearContent(ctx: MutationCtx) {
  for (const table of [
    "siteContent",
    "catalogFields",
    "paths",
    "teachers",
    "works",
    "testimonials",
    "faqs",
  ] as const) {
    const documents = await ctx.db.query(table).collect()
    for (const document of documents) {
      await ctx.db.delete(table, document._id)
    }
  }
}

async function seedAll(ctx: MutationCtx) {
  await clearContent(ctx)

  await ctx.db.insert("siteContent", {
    key: "site",
    value: siteSeed,
    updatedAt: Date.now(),
  })

  for (const [order, field] of catalogFieldsSeed.entries()) {
    await ctx.db.insert("catalogFields", { order, ...field })
  }

  for (const [order, path] of pathsSeed.entries()) {
    await ctx.db.insert("paths", { order, ...path })
  }

  for (const [order, teacher] of teachersSeed.entries()) {
    await ctx.db.insert("teachers", { order, ...teacher })
  }

  for (const [order, work] of worksSeed.entries()) {
    await ctx.db.insert("works", { order, ...work })
  }

  for (const [order, testimonial] of testimonialsSeed.entries()) {
    await ctx.db.insert("testimonials", { order, ...testimonial })
  }

  for (const [order, faq] of faqsSeed.entries()) {
    await ctx.db.insert("faqs", { order, ...faq })
  }

  return {
    seeded: true,
    fields: catalogFieldsSeed.length,
    paths: pathsSeed.length,
    teachers: teachersSeed.length,
    works: worksSeed.length,
    testimonials: testimonialsSeed.length,
    faqs: faqsSeed.length,
  }
}

export const run = internalMutation({
  args: {},
  handler: async (ctx) => await seedAll(ctx),
})

export const runIfEmpty = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("siteContent")
      .withIndex("by_key", (q) => q.eq("key", "site"))
      .unique()

    if (existing) return { seeded: false as const }
    return await seedAll(ctx)
  },
})
