import { v } from "convex/values"

import { mutation } from "./_generated/server"

const leadIntent = v.union(
  v.literal("student"),
  v.literal("institution"),
  v.literal("consultation"),
  v.literal("notify"),
)

export const create = mutation({
  args: {
    intent: leadIntent,
    name: v.optional(v.string()),
    email: v.string(),
    whatsapp: v.optional(v.string()),
    institution: v.optional(v.string()),
    institutionType: v.optional(v.string()),
    participants: v.optional(v.number()),
    interest: v.optional(v.string()),
    message: v.optional(v.string()),
    source: v.optional(v.string()),
    consent: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("leads", {
      ...args,
      status: "new" as const,
      createdAt: Date.now(),
    })
  },
})
