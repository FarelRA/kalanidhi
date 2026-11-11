import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export const catalogStatus = v.union(
  v.literal("Terbuka"),
  v.literal("Sedang dipetakan"),
  v.literal("Direncanakan"),
)

export default defineSchema({
  siteContent: defineTable({
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  catalogFields: defineTable({
    order: v.number(),
    name: v.string(),
    region: v.string(),
    status: catalogStatus,
    note: v.string(),
  }).index("by_order", ["order"]),

  paths: defineTable({
    order: v.number(),
    slug: v.string(),
    code: v.string(),
    title: v.string(),
    subtitle: v.string(),
    teacher: v.string(),
    teacherRole: v.string(),
    region: v.string(),
    level: v.string(),
    modules: v.number(),
    weeks: v.number(),
    tasks: v.number(),
    price: v.union(v.number(), v.null()),
    priceLabel: v.optional(v.string()),
    image: v.string(),
    tags: v.array(v.string()),
    outcome: v.string(),
    includes: v.array(v.string()),
    comingSoon: v.optional(v.boolean()),
  })
    .index("by_order", ["order"])
    .index("by_slug", ["slug"]),

  teachers: defineTable({
    order: v.number(),
    slug: v.string(),
    name: v.string(),
    initials: v.string(),
    specialty: v.string(),
    region: v.string(),
    experience: v.string(),
    quote: v.string(),
    focus: v.string(),
    path: v.string(),
    community: v.string(),
    image: v.string(),
    verified: v.boolean(),
  })
    .index("by_order", ["order"])
    .index("by_slug", ["slug"]),

  works: defineTable({
    order: v.number(),
    slug: v.string(),
    title: v.string(),
    category: v.union(v.literal("batik"), v.literal("layanan")),
    kind: v.union(v.literal("product"), v.literal("service")),
    maker: v.string(),
    makerRole: v.string(),
    teacher: v.string(),
    region: v.string(),
    price: v.number(),
    priceLabel: v.optional(v.string()),
    unit: v.string(),
    technique: v.string(),
    techniqueNote: v.string(),
    workCard: v.string(),
    description: v.string(),
    image: v.string(),
  })
    .index("by_order", ["order"])
    .index("by_slug", ["slug"]),

  testimonials: defineTable({
    order: v.number(),
    quote: v.string(),
    name: v.string(),
    role: v.string(),
    city: v.string(),
    initials: v.string(),
  }).index("by_order", ["order"]),

  faqs: defineTable({
    order: v.number(),
    question: v.string(),
    answer: v.string(),
  }).index("by_order", ["order"]),

  leads: defineTable({
    intent: v.union(
      v.literal("student"),
      v.literal("institution"),
      v.literal("consultation"),
      v.literal("notify"),
    ),
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
    status: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("closed"),
    ),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_email", ["email"])
    .index("by_intent", ["intent"]),
})
