import { defineTable } from "convex/server"
import { v } from "convex/values"

import { jsonBagValidator } from "./common"

export const catalogStatus = v.union(
  v.literal("Terbuka"),
  v.literal("Sedang dipetakan"),
  v.literal("Direncanakan"),
)

const pathStatus = v.union(
  v.literal("open"),
  v.literal("mapping"),
  v.literal("planned"),
  v.literal("archived"),
)

const publicationStatus = v.union(
  v.literal("draft"),
  v.literal("in_review"),
  v.literal("scheduled"),
  v.literal("published"),
  v.literal("archived"),
)

export const contentTables = {
  siteContent: defineTable({
    key: v.string(),
    /** JSON bag: the landing content object is validated by lib/content/types.ts. */
    value: jsonBagValidator,
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  contentRevisions: defineTable({
    key: v.string(),
    version: v.number(),
    /** JSON bag: a complete snapshot of the content object at this version. */
    value: jsonBagValidator,
    status: publicationStatus,
    authorId: v.string(),
    note: v.string(),
    basedOnVersion: v.optional(v.number()),
    createdAt: v.number(),
    publishedAt: v.optional(v.number()),
    scheduledFor: v.optional(v.number()),
  })
    .index("by_key", ["key"])
    .index("by_key_version", ["key", "version"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  mediaAssets: defineTable({
    kind: v.union(
      v.literal("image"),
      v.literal("audio"),
      v.literal("video"),
      v.literal("document"),
    ),
    storageId: v.optional(v.id("_storage")),
    externalUrl: v.optional(v.string()),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    alt: v.string(),
    caption: v.optional(v.string()),
    credit: v.optional(v.string()),
    permission: v.optional(v.string()),
    focalX: v.optional(v.number()),
    focalY: v.optional(v.number()),
    variants: v.optional(
      v.array(
        v.object({
          label: v.string(),
          url: v.string(),
          width: v.number(),
          height: v.number(),
        }),
      ),
    ),
    status: v.union(v.literal("active"), v.literal("archived")),
    uploadedBy: v.string(),
    replacedBy: v.optional(v.id("mediaAssets")),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_kind", ["kind"])
    .index("by_uploadedBy", ["uploadedBy"]),

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
    imageAssetId: v.optional(v.id("mediaAssets")),
    tags: v.array(v.string()),
    outcome: v.string(),
    includes: v.array(v.string()),
    comingSoon: v.optional(v.boolean()),
    teacherId: v.optional(v.string()),
    status: v.optional(pathStatus),
    createdAt: v.optional(v.number()),
  })
    .index("by_order", ["order"])
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_teacherId", ["teacherId"]),

  pathModules: defineTable({
    order: v.number(),
    pathId: v.string(),
    title: v.string(),
    summary: v.string(),
    estimatedMinutes: v.number(),
    status: v.union(v.literal("draft"), v.literal("published")),
    createdAt: v.number(),
  })
    .index("by_path_order", ["pathId", "order"])
    .index("by_path_status", ["pathId", "status"]),

  lessons: defineTable({
    order: v.number(),
    moduleId: v.id("pathModules"),
    pathId: v.string(),
    title: v.string(),
    kind: v.union(
      v.literal("text"),
      v.literal("video"),
      v.literal("audio"),
      v.literal("file"),
      v.literal("practice"),
    ),
    body: v.string(),
    mediaAssetIds: v.array(v.id("mediaAssets")),
    estimatedMinutes: v.number(),
    accessLevel: v.union(
      v.literal("public"),
      v.literal("enrolled"),
      v.literal("certified"),
    ),
    status: v.union(v.literal("draft"), v.literal("published")),
    createdAt: v.number(),
  })
    .index("by_module_order", ["moduleId", "order"])
    .index("by_path", ["pathId"]),

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
    imageAssetId: v.optional(v.id("mediaAssets")),
    verified: v.boolean(),
    userId: v.optional(v.id("users")),
    pathIds: v.optional(v.array(v.string())),
    status: v.optional(
      v.union(
        v.literal("review"),
        v.literal("active"),
        v.literal("suspended"),
      ),
    ),
    /** Phase 1 verification dossier projection. */
    verificationStatus: v.optional(
      v.union(
        v.literal("submitted"),
        v.literal("under_review"),
        v.literal("verified"),
        v.literal("rejected"),
        v.literal("suspended"),
      ),
    ),
    applicationNote: v.optional(v.string()),
    verifiedBy: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    published: v.optional(v.boolean()),
    publishedAt: v.optional(v.number()),
  })
    .index("by_order", ["order"])
    .index("by_slug", ["slug"])
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_published", ["published"]),

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
    imageAssetId: v.optional(v.id("mediaAssets")),
    makerId: v.optional(v.id("users")),
    pathId: v.optional(v.string()),
    certificateId: v.optional(v.id("certificates")),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("review"),
        v.literal("published"),
        v.literal("paused"),
        v.literal("sold_out"),
      ),
    ),
    permission: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  })
    .index("by_order", ["order"])
    .index("by_slug", ["slug"])
    .index("by_makerId", ["makerId"])
    .index("by_pathId", ["pathId"])
    .index("by_status", ["status"]),

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

  seoOverrides: defineTable({
    route: v.string(),
    title: v.string(),
    description: v.string(),
    ogTitle: v.optional(v.string()),
    ogDescription: v.optional(v.string()),
    canonical: v.optional(v.string()),
    keywords: v.optional(v.array(v.string())),
    robots: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_route", ["route"]),

  /** Phase 1: one scoped, expiring preview token per content revision. */
  contentPreviews: defineTable({
    contentKey: v.string(),
    version: v.number(),
    tokenHash: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_tokenHash", ["tokenHash"])
    .index("by_createdAt", ["createdAt"]),
}
