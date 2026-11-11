import type { SiteCopy, SiteData } from "../lib/content/types"
import { query } from "./_generated/server"

function withoutSystemFields<T extends { _id: unknown; _creationTime: number; order: number }>(
  document: T,
) {
  const { _id, _creationTime, order, ...rest } = document
  void _id
  void _creationTime
  void order
  return rest
}

export const getSite = query({
  args: {},
  handler: async (ctx): Promise<SiteData | null> => {
    const site = await ctx.db
      .query("siteContent")
      .withIndex("by_key", (q) => q.eq("key", "site"))
      .unique()

    if (!site) return null

    const [catalogFields, paths, teachers, works, testimonials, faqs] =
      await Promise.all([
        ctx.db.query("catalogFields").withIndex("by_order").collect(),
        ctx.db.query("paths").withIndex("by_order").collect(),
        ctx.db.query("teachers").withIndex("by_order").collect(),
        ctx.db.query("works").withIndex("by_order").collect(),
        ctx.db.query("testimonials").withIndex("by_order").collect(),
        ctx.db.query("faqs").withIndex("by_order").collect(),
      ])

    const copy = site.value as SiteCopy

    return {
      ...copy,
      catalog: {
        ...copy.catalog,
        fields: catalogFields.map(withoutSystemFields),
      },
      paths: paths.map(withoutSystemFields),
      teachers: teachers.map(withoutSystemFields),
      works: works.map(withoutSystemFields),
      testimonials: testimonials.map(withoutSystemFields),
      faqs: faqs.map(withoutSystemFields),
    }
  },
})
