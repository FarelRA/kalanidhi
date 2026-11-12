import { ConvexError, v } from "convex/values"

import type {
  ContentAdminState,
  ContentLockView,
  ContentPreviewPayload,
  ContentRevisionStatus,
  ContentRevisionSummary,
} from "../lib/admin/types"
import type {
  CatalogField,
  Faq,
  LearningPath,
  SeoOverride,
  SiteCopy,
  SiteData,
  Teacher,
  Testimonial,
  Work,
} from "../lib/content/types"
import { siteDataSchema, validateSiteData } from "../lib/validation/content"
import { now, requireAdmin, requireReason } from "./admin_context"
import { appendAudit } from "./audit"
import type { Doc, Id } from "./_generated/dataModel"
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"

const CONTENT_KEY = "site"
const LOCK_TTL_MS = 15 * 60 * 1_000
const PREVIEW_TTL_MS = 60 * 60 * 1_000

function withoutSystemFields<T extends { _id: unknown; _creationTime: number }>(
  document: T,
) {
  const { _id, _creationTime, ...rest } = document
  void _id
  void _creationTime
  return rest
}

type StoredLearningPath = Omit<LearningPath, "image"> & {
  imageAssetId: Id<"mediaAssets">
}
type StoredTeacher = Omit<Teacher, "image"> & {
  imageAssetId: Id<"mediaAssets">
}
type StoredWork = Omit<Work, "image"> & {
  imageAssetId: Id<"mediaAssets">
}

type StoredSiteCopy = Omit<SiteCopy, "hero" | "metadata"> & {
  hero: Omit<SiteCopy["hero"], "plate"> & {
    plate: Omit<SiteCopy["hero"]["plate"], "image"> & {
      imageAssetId: Id<"mediaAssets">
    }
  }
  metadata: Omit<SiteCopy["metadata"], "image"> & {
    image: Omit<SiteCopy["metadata"]["image"], "url"> & {
      imageAssetId: Id<"mediaAssets">
    }
  }
}

export type StoredSiteData = StoredSiteCopy & {
  catalog: SiteCopy["catalog"] & { fields: CatalogField[] }
  paths: StoredLearningPath[]
  teachers: StoredTeacher[]
  works: StoredWork[]
  testimonials: Testimonial[]
  faqs: Faq[]
}

export function toStoredCopy(data: StoredSiteData): StoredSiteCopy {
  return {
    hero: data.hero,
    traction: data.traction,
    loop: data.loop,
    catalog: {
      label: data.catalog.label,
      title: data.catalog.title,
      description: data.catalog.description,
      cta: data.catalog.cta,
      groups: data.catalog.groups,
    },
    mangsa: data.mangsa,
    ethics: data.ethics,
    institution: data.institution,
    sections: data.sections,
    footer: data.footer,
    navigation: data.navigation,
    overlays: data.overlays,
    header: data.header,
    search: data.search,
    mobileCta: data.mobileCta,
    leadDialogs: data.leadDialogs,
    metadata: data.metadata,
  }
}

type AnyCtx = QueryCtx | MutationCtx

type AssetUrlCache = Map<string, string | null>

async function assetUrl(
  ctx: AnyCtx,
  id: Id<"mediaAssets">,
  cache: AssetUrlCache,
): Promise<string> {
  const key = id as string
  if (cache.has(key)) {
    const cached = cache.get(key)
    if (!cached) {
      throw new ConvexError({
        code: "MEDIA_MISSING",
        message: `Aset gambar ${id} tidak ditemukan di penyimpanan.`,
      })
    }
    return cached
  }
  const asset = await ctx.db.get(id)
  const url = asset
    ? asset.storageId
      ? await ctx.storage.getUrl(asset.storageId)
      : (asset.externalUrl ?? null)
    : null
  cache.set(key, url)
  if (!url) {
    throw new ConvexError({
      code: "MEDIA_MISSING",
      message: `Aset gambar ${id} tidak ditemukan di penyimpanan.`,
    })
  }
  return url
}

async function resolveStoredCopy(
  ctx: AnyCtx,
  stored: StoredSiteCopy,
  cache: AssetUrlCache,
): Promise<SiteCopy> {
  const { imageAssetId: heroImageId, ...plate } = stored.hero.plate
  const { imageAssetId: metadataImageId, ...metadataImage } = stored.metadata.image
  return {
    ...stored,
    hero: {
      ...stored.hero,
      plate: { ...plate, image: await assetUrl(ctx, heroImageId, cache) },
    },
    metadata: {
      ...stored.metadata,
      image: {
        ...metadataImage,
        url: await assetUrl(ctx, metadataImageId, cache),
      },
    },
  }
}

async function assetIdForUrl(
  ctx: AnyCtx,
  url: string,
  cache: Map<string, Id<"mediaAssets">>,
): Promise<Id<"mediaAssets">> {
  const trimmed = url.trim()
  if (!trimmed) {
    throw new ConvexError({
      code: "MEDIA_REQUIRED",
      message: "Setiap gambar wajib merujuk aset media.",
    })
  }
  const cached = cache.get(trimmed)
  if (cached) return cached

  const assets = await ctx.db.query("mediaAssets").collect()
  for (const asset of assets) {
    const candidate = asset.storageId
      ? await ctx.storage.getUrl(asset.storageId)
      : asset.externalUrl
    if (candidate && candidate === trimmed) {
      cache.set(trimmed, asset._id)
      return asset._id
    }
  }
  throw new ConvexError({
    code: "MEDIA_NOT_FOUND",
    message: `Gambar ${trimmed} tidak ada di penyimpanan Convex.`,
  })
}

async function toStoredSiteData(
  ctx: AnyCtx,
  data: SiteData,
): Promise<StoredSiteData> {
  const cache = new Map<string, Id<"mediaAssets">>()
  return {
    ...data,
    hero: {
      ...data.hero,
      plate: {
        alt: data.hero.plate.alt,
        caption: data.hero.plate.caption,
        note: data.hero.plate.note,
        imageAssetId: await assetIdForUrl(ctx, data.hero.plate.image, cache),
      },
    },
    metadata: {
      ...data.metadata,
      image: {
        width: data.metadata.image.width,
        height: data.metadata.image.height,
        alt: data.metadata.image.alt,
        imageAssetId: await assetIdForUrl(ctx, data.metadata.image.url, cache),
      },
    },
    paths: await Promise.all(
      data.paths.map(async ({ image, ...rest }) => ({
        ...rest,
        imageAssetId: await assetIdForUrl(ctx, image, cache),
      })),
    ),
    teachers: await Promise.all(
      data.teachers.map(async ({ image, ...rest }) => ({
        ...rest,
        imageAssetId: await assetIdForUrl(ctx, image, cache),
      })),
    ),
    works: await Promise.all(
      data.works.map(async ({ image, ...rest }) => ({
        ...rest,
        imageAssetId: await assetIdForUrl(ctx, image, cache),
      })),
    ),
  }
}

/** Reads the currently published content from the public tables. */
type FeaturedSelection = {
  pathSlugs: string[]
  teacherSlugs: string[]
  workSlugs: string[]
  testimonialIds: string[]
}

function featuredSelection(value: unknown): FeaturedSelection | null {
  if (!value || typeof value !== "object") return null
  const raw = (value as { featured?: unknown }).featured
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  const list = (key: string): string[] =>
    Array.isArray(record[key])
      ? (record[key] as unknown[]).filter(
          (item): item is string => typeof item === "string",
        )
      : []
  return {
    pathSlugs: list("pathSlugs"),
    teacherSlugs: list("teacherSlugs"),
    workSlugs: list("workSlugs"),
    testimonialIds: list("testimonialIds"),
  }
}

function orderByKeys<T>(
  items: T[],
  keys: string[] | undefined,
  keyOf: (item: T) => string,
): T[] {
  if (!keys) return items
  const byKey = new Map(items.map((item) => [keyOf(item), item] as const))
  return keys
    .map((key) => byKey.get(key))
    .filter((item): item is T => item !== undefined)
}

export async function assemblePublishedSite(
  ctx: AnyCtx,
): Promise<SiteData | null> {
  const site = await ctx.db
    .query("siteContent")
    .withIndex("by_key", (q) => q.eq("key", CONTENT_KEY))
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

  const featured = featuredSelection(site.value)
  const cache: AssetUrlCache = new Map()
  const copy = await resolveStoredCopy(
    ctx,
    site.value as StoredSiteCopy,
    cache,
  )

  const resolveEntity = async <
    T extends {
      _id: unknown
      _creationTime: number
      imageAssetId?: Id<"mediaAssets">
    },
  >(
    document: T,
  ) => {
    const { imageAssetId, ...rest } = withoutSystemFields(document)
    return {
      ...rest,
      image: imageAssetId ? await assetUrl(ctx, imageAssetId, cache) : "",
    }
  }

  const teacherByUserId = new Map(
    teachers
      .filter((teacher) => teacher.userId)
      .map((teacher) => [teacher.userId as string, teacher] as const),
  )

  const resolvePath = async (path: Doc<"paths">) => {
    const resolved = await resolveEntity(path)
    if (!path.teacherId) return resolved
    const profile = teacherByUserId.get(path.teacherId)
    let teacherName = profile?.name
    if (!teacherName) {
      try {
        const user = await ctx.db.get(path.teacherId as Id<"users">)
        teacherName = user?.name
      } catch {
        teacherName = undefined
      }
    }
    if (!teacherName) return resolved
    return {
      ...resolved,
      teacher: teacherName,
      teacherRole:
        path.teacherRole || profile?.specialty || resolved.teacherRole,
    }
  }

  return {
    ...copy,
    catalog: {
      ...copy.catalog,
      fields: catalogFields.map(withoutSystemFields),
    },
    paths: await Promise.all(
      orderByKeys(
        paths.filter((path) => path.status !== "archived"),
        featured?.pathSlugs,
        (path) => path.slug,
      ).map((path) => resolvePath(path)),
    ),
    teachers: await Promise.all(
      orderByKeys(
        teachers.filter(
          (teacher) =>
            teacher.published === true &&
            teacher.status !== "review" &&
            teacher.status !== "suspended",
        ),
        featured?.teacherSlugs,
        (teacher) => teacher.slug,
      ).map((teacher) => resolveEntity(teacher)),
    ),
    works: await Promise.all(
      orderByKeys(
        works.filter(
          (work) =>
            work.status === "published",
        ),
        featured?.workSlugs,
        (work) => work.slug,
      ).map((work) => resolveEntity(work)),
    ),
    testimonials: orderByKeys(
      testimonials,
      featured?.testimonialIds,
      (testimonial) => testimonial._id,
    ).map(withoutSystemFields),
    faqs: faqs.map(withoutSystemFields),
  } as SiteData
}

export const getSite = query({
  args: {},
  handler: async (ctx): Promise<SiteData | null> => {
    return await assemblePublishedSite(ctx)
  },
})

/**
 * Per-route SEO override. Returns null when the route has no override so the
 * caller can fall back to the content defaults.
 */
export const getSeoOverride = query({
  args: { route: v.string() },
  handler: async (ctx, args): Promise<SeoOverride | null> => {
    const route = args.route.trim()
    if (!route) return null
    const override = await ctx.db
      .query("seoOverrides")
      .withIndex("by_route", (q) => q.eq("route", route))
      .unique()
    if (!override) return null
    return {
      route: override.route,
      title: override.title,
      description: override.description,
      ogTitle: override.ogTitle ?? null,
      ogDescription: override.ogDescription ?? null,
      canonical: override.canonical ?? null,
      keywords: override.keywords ?? null,
      robots: override.robots ?? null,
      updatedAt: override.updatedAt,
    }
  },
})

function authorName(user: Doc<"users"> | null, fallback: string): string {
  return user?.name ?? fallback
}

async function revisionSummaries(
  ctx: AnyCtx,
): Promise<ContentRevisionSummary[]> {
  const revisions = await ctx.db
    .query("contentRevisions")
    .withIndex("by_key", (q) => q.eq("key", CONTENT_KEY))
    .collect()

  const authorIds = Array.from(new Set(revisions.map((item) => item.authorId)))
  const users = await Promise.all(
    authorIds.map(async (id) => {
      try {
        return await ctx.db.get(id as Id<"users">)
      } catch {
        return null
      }
    }),
  )
  const nameById = new Map<string, string>()
  users.forEach((user, index) => {
    nameById.set(authorIds[index], user?.name ?? authorIds[index])
  })

  return revisions
    .sort((a, b) => b.version - a.version)
    .map((item) => ({
      id: item._id,
      version: item.version,
      status: item.status as ContentRevisionStatus,
      authorId: item.authorId,
      authorName: authorName(
        users.find((user) => user?._id === item.authorId) ?? null,
        nameById.get(item.authorId) ?? item.authorId,
      ),
      note: item.note,
      basedOnVersion: item.basedOnVersion ?? null,
      createdAt: item.createdAt,
      publishedAt: item.publishedAt ?? null,
      scheduledFor: item.scheduledFor ?? null,
    }))
}

async function currentLock(ctx: AnyCtx): Promise<ContentLockView | null> {
  const locks = await ctx.db
    .query("contentLocks")
    .withIndex("by_contentKey", (q) => q.eq("contentKey", CONTENT_KEY))
    .collect()
  const timestamp = now()
  const active = locks.find((lock) => lock.expiresAt > timestamp)
  if (!active) return null
  const holder = await ctx.db.get(active.holderId)
  return {
    holderId: active.holderId,
    holderName: holder?.name ?? "Pengelola",
    acquiredAt: active.acquiredAt,
    expiresAt: active.expiresAt,
    mine: false,
  }
}

export const getAdminState = query({
  args: {},
  handler: async (ctx): Promise<ContentAdminState> => {
    const { viewer } = await requireAdmin(ctx, "content.publish")
    const [revisions, site] = await Promise.all([
      revisionSummaries(ctx),
      ctx.db
        .query("siteContent")
        .withIndex("by_key", (q) => q.eq("key", CONTENT_KEY))
        .unique(),
    ])

    const draft = revisions.find((item) => item.status === "draft") ?? null
    const published = revisions.find((item) => item.status === "published") ?? null
    let draftValue: SiteData | null = null

    if (draft) {
      const document = await ctx.db
        .query("contentRevisions")
        .withIndex("by_key_version", (q) =>
          q.eq("key", CONTENT_KEY).eq("version", draft.version),
        )
        .unique()
      draftValue = (document?.value as SiteData | undefined) ?? null
    } else {
      draftValue = await assemblePublishedSite(ctx)
    }

    const lock = await currentLock(ctx)
    return {
      publishedAt: site?.updatedAt ?? null,
      publishedVersion: published?.version ?? null,
      draft,
      draftValue,
      revisions,
      lock: lock ? { ...lock, mine: lock.holderId === viewer.userId } : null,
    }
  },
})

export const getRevision = query({
  args: { version: v.number() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "content.publish")
    const document = await ctx.db
      .query("contentRevisions")
      .withIndex("by_key_version", (q) =>
        q.eq("key", CONTENT_KEY).eq("version", args.version),
      )
      .unique()
    if (!document) return null
    return {
      id: document._id,
      version: document.version,
      status: document.status,
      note: document.note,
      authorId: document.authorId,
      createdAt: document.createdAt,
      publishedAt: document.publishedAt ?? null,
      value: document.value as SiteData,
    }
  },
})

export const saveDraft = mutation({
  args: {
    value: v.any(),
    note: v.string(),
    baseVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "content.publish")
    const note = requireReason(args.note, 3)
    const validation = validateSiteData(args.value)
    if (!validation.ok || !validation.data) {
      throw new ConvexError({
        code: "CONTENT_INVALID",
        message: "Draf belum lolos validasi.",
        issues: validation.issues,
      })
    }

    const revisions = await revisionSummaries(ctx)
    const draft = revisions.find((item) => item.status === "draft") ?? null
    const latest = revisions[0] ?? null

    if (args.baseVersion !== undefined && draft) {
      if (draft.version !== args.baseVersion) {
        throw new ConvexError({
          code: "STALE_VERSION",
          message:
            "Draf sudah berubah sejak dibuka. Muat ulang sebelum menyimpan.",
          currentVersion: draft.version,
        })
      }
    }
    if (draft && args.baseVersion === undefined) {
      throw new ConvexError({
        code: "STALE_VERSION",
        message:
          "Draf sudah ada. Sertakan versi dasar agar perubahan tidak saling menimpa.",
        currentVersion: draft.version,
      })
    }
    if (!draft && latest) {
      const stageable = ["published", "archived", "scheduled"].includes(
        latest.status,
      )
      if (!stageable) {
        throw new ConvexError({
          code: "STALE_VERSION",
          message: "Versi dasar tidak dapat dipakai.",
        })
      }
    }

    if (draft) {
      await ctx.db.patch(draft.id as Id<"contentRevisions">, {
        status: "archived",
      })
    }

    const version = (latest?.version ?? 0) + 1
    const revisionId = await ctx.db.insert("contentRevisions", {
      key: CONTENT_KEY,
      version,
      value: validation.data,
      status: "draft",
      authorId: viewer.userId,
      note,
      basedOnVersion: args.baseVersion,
      createdAt: now(),
    })

    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "content.saveDraft",
      entityType: "contentRevisions",
      entityId: revisionId,
      reason: note,
      after: { version, basedOnVersion: args.baseVersion ?? null },
    })

    return { version, revisionId }
  },
})

type DiffEntry = { path: string; before: unknown; after: unknown }

function diffValues(
  before: unknown,
  after: unknown,
  path = "",
  output: DiffEntry[] = [],
): DiffEntry[] {
  if (before === after) return output
  if (JSON.stringify(before) === JSON.stringify(after)) return output

  if (Array.isArray(before) || Array.isArray(after)) {
    if (!Array.isArray(before) || !Array.isArray(after)) {
      output.push({ path, before, after })
      return output
    }
    const length = Math.max(before.length, after.length)
    for (let index = 0; index < length; index += 1) {
      diffValues(before[index], after[index], `${path}.${index}`, output)
    }
    return output
  }

  if (
    typeof before !== "object" ||
    typeof after !== "object" ||
    before === null ||
    after === null
  ) {
    output.push({ path, before, after })
    return output
  }

  const keys = new Set([
    ...Object.keys(before as Record<string, unknown>),
    ...Object.keys(after as Record<string, unknown>),
  ])
  for (const key of keys) {
    diffValues(
      (before as Record<string, unknown>)[key],
      (after as Record<string, unknown>)[key],
      path ? `${path}.${key}` : key,
      output,
    )
  }
  return output
}

const SENSITIVE_PREFIXES = [
  "ethics.share",
  "footer.certificateNote",
  "metadata.",
  "hero.workCard",
  "paths",
  "works",
]

function sensitivePaths(diff: DiffEntry[]): string[] {
  return diff
    .map((entry) => entry.path)
    .filter((path) =>
      SENSITIVE_PREFIXES.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}.`),
      ),
    )
}

async function applySiteData(
  ctx: MutationCtx,
  data: SiteData,
): Promise<void> {
  const stored = await toStoredSiteData(ctx, data)
  const timestamp = now()
  const site = await ctx.db
    .query("siteContent")
    .withIndex("by_key", (q) => q.eq("key", CONTENT_KEY))
    .unique()

  if (site) {
    await ctx.db.patch(site._id, {
      value: toStoredCopy(stored),
      updatedAt: timestamp,
    })
  } else {
    await ctx.db.insert("siteContent", {
      key: CONTENT_KEY,
      value: toStoredCopy(stored),
      updatedAt: timestamp,
    })
  }

  const existingFields = await ctx.db.query("catalogFields").collect()
  for (const field of existingFields) {
    await ctx.db.delete(field._id)
  }
  for (const [index, field] of data.catalog.fields.entries()) {
    await ctx.db.insert("catalogFields", {
      order: index,
      name: field.name,
      region: field.region,
      status: field.status,
      note: field.note,
    })
  }

  const existingPaths = await ctx.db.query("paths").collect()
  const pathsBySlug = new Map(existingPaths.map((item) => [item.slug, item]))
  const pathSlugs = new Set(data.paths.map((item) => item.slug))
  for (const [index, path] of data.paths.entries()) {
    const existing = pathsBySlug.get(path.slug)
    const record = {
      order: index,
      slug: path.slug,
      code: path.code,
      title: path.title,
      subtitle: path.subtitle,
      teacher: path.teacher,
      teacherRole: path.teacherRole,
      region: path.region,
      level: path.level,
      modules: path.modules,
      weeks: path.weeks,
      tasks: path.tasks,
      price: path.price,
      priceLabel: path.priceLabel,
      imageAssetId: stored.paths[index].imageAssetId,
      tags: path.tags,
      outcome: path.outcome,
      includes: path.includes,
      comingSoon: path.comingSoon,
    }
    if (existing) {
      await ctx.db.patch(existing._id, record)
    } else {
      await ctx.db.insert("paths", {
        ...record,
        status: path.comingSoon ? "mapping" : "open",
        createdAt: timestamp,
      })
    }
  }
  for (const existing of existingPaths) {
    if (!pathSlugs.has(existing.slug) && existing.status !== "archived") {
      await ctx.db.patch(existing._id, { status: "archived" })
    }
  }

  const existingTeachers = await ctx.db.query("teachers").collect()
  const teachersBySlug = new Map(
    existingTeachers.map((item) => [item.slug, item]),
  )
  const teacherSlugs = new Set(data.teachers.map((item) => item.slug))
  for (const [index, teacher] of data.teachers.entries()) {
    const existing = teachersBySlug.get(teacher.slug)
    const record = {
      order: index,
      slug: teacher.slug,
      name: teacher.name,
      initials: teacher.initials,
      specialty: teacher.specialty,
      region: teacher.region,
      experience: teacher.experience,
      quote: teacher.quote,
      focus: teacher.focus,
      path: teacher.path,
      community: teacher.community,
      imageAssetId: stored.teachers[index].imageAssetId,
    }
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...record,
        verified: existing.verified || teacher.verified,
        published: existing.published ?? teacher.verified,
      })
    } else {
      await ctx.db.insert("teachers", {
        ...record,
        verified: teacher.verified,
        status: teacher.verified ? "active" : "review",
        published: teacher.verified,
      })
    }
  }
  for (const existing of existingTeachers) {
    if (teacherSlugs.has(existing.slug)) continue
    if (existing.userId) {
      await ctx.db.patch(existing._id, { published: false })
    } else {
      await ctx.db.delete(existing._id)
    }
  }

  const existingWorks = await ctx.db.query("works").collect()
  const worksBySlug = new Map(existingWorks.map((item) => [item.slug, item]))
  const workSlugs = new Set(data.works.map((item) => item.slug))
  for (const [index, work] of data.works.entries()) {
    const existing = worksBySlug.get(work.slug)
    const record = {
      order: index,
      slug: work.slug,
      title: work.title,
      category: work.category,
      kind: work.kind,
      maker: work.maker,
      makerRole: work.makerRole,
      teacher: work.teacher,
      region: work.region,
      price: work.price,
      priceLabel: work.priceLabel,
      unit: work.unit,
      technique: work.technique,
      techniqueNote: work.techniqueNote,
      workCard: work.workCard,
      description: work.description,
      imageAssetId: stored.works[index].imageAssetId,
    }
    if (existing) {
      await ctx.db.patch(existing._id, record)
    } else {
      await ctx.db.insert("works", {
        ...record,
        status: "published",
        createdAt: timestamp,
      })
    }
  }
  for (const existing of existingWorks) {
    if (!workSlugs.has(existing.slug) && existing.status !== "paused") {
      await ctx.db.patch(existing._id, { status: "paused" })
    }
  }

  const existingTestimonials = await ctx.db.query("testimonials").collect()
  for (const item of existingTestimonials) await ctx.db.delete(item._id)
  for (const [index, item] of data.testimonials.entries()) {
    await ctx.db.insert("testimonials", { order: index, ...item })
  }

  const existingFaqs = await ctx.db.query("faqs").collect()
  for (const item of existingFaqs) await ctx.db.delete(item._id)
  for (const [index, item] of data.faqs.entries()) {
    await ctx.db.insert("faqs", { order: index, ...item })
  }
}

async function latestVersion(ctx: AnyCtx): Promise<number> {
  const revisions = await ctx.db
    .query("contentRevisions")
    .withIndex("by_key", (q) => q.eq("key", CONTENT_KEY))
    .collect()
  return revisions.reduce((max, item) => Math.max(max, item.version), 0)
}

export const publish = mutation({
  args: {
    version: v.number(),
    note: v.string(),
    scheduledFor: v.optional(v.number()),
    confirmSensitive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "content.publish")
    const note = requireReason(args.note, 3)
    const revision = await ctx.db
      .query("contentRevisions")
      .withIndex("by_key_version", (q) =>
        q.eq("key", CONTENT_KEY).eq("version", args.version),
      )
      .unique()
    if (!revision) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Revisi tidak ada." })
    }
    if (!["draft", "scheduled"].includes(revision.status)) {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: "Hanya draf atau revisi terjadwal yang bisa diterbitkan.",
      })
    }

    const validation = validateSiteData(revision.value)
    if (!validation.ok || !validation.data) {
      throw new ConvexError({
        code: "CONTENT_INVALID",
        message: "Konten belum lolos validasi.",
        issues: validation.issues,
      })
    }

    const published = await assemblePublishedSite(ctx)
    if (published) {
      const normalisedPublished = validateSiteData(published)
      const diff =
        normalisedPublished.ok && normalisedPublished.data
          ? diffValues(normalisedPublished.data, validation.data)
          : []
      const sensitive = sensitivePaths(diff)
      if (sensitive.length > 0 && !args.confirmSensitive) {
        throw new ConvexError({
          code: "SENSITIVE_CHANGE",
          message:
            "Perubahan ini menyentuh harga, bagi hasil, metadata, atau sertifikat. Konfirmasi diperlukan.",
          paths: sensitive.slice(0, 12),
        })
      }
    }

    const timestamp = now()
    if (args.scheduledFor && args.scheduledFor > timestamp) {      await ctx.db.patch(revision._id, {
        status: "scheduled",
        scheduledFor: args.scheduledFor,
        note,
      })
      await appendAudit(ctx, {
        actorId: viewer.userId,
        actorRole: viewer.roleLabel,
        action: "content.schedule",
        entityType: "contentRevisions",
        entityId: revision._id,
        reason: note,
        after: { version: revision.version, scheduledFor: args.scheduledFor },
      })
      return { status: "scheduled" as const, version: revision.version }
    }

    await applySiteData(ctx, validation.data)
    await ctx.db.patch(revision._id, {
      status: "published",
      publishedAt: timestamp,
      scheduledFor: undefined,
      note,
    })
    const others = await ctx.db
      .query("contentRevisions")
      .withIndex("by_key", (q) => q.eq("key", CONTENT_KEY))
      .collect()
    for (const item of others) {
      if (item._id !== revision._id && item.status === "draft") {
        await ctx.db.patch(item._id, { status: "archived" })
      }
    }

    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "content.publish",
      entityType: "content",
      entityId: CONTENT_KEY,
      reason: note,
      before: { publishedAt: published ? timestamp : null },
      after: { version: revision.version, note },
    })

    return { status: "published" as const, version: revision.version }
  },
})

export const rollback = mutation({
  args: { version: v.number(), note: v.string() },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "content.publish")
    const note = requireReason(args.note, 3)
    const source = await ctx.db
      .query("contentRevisions")
      .withIndex("by_key_version", (q) =>
        q.eq("key", CONTENT_KEY).eq("version", args.version),
      )
      .unique()
    if (!source) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Revisi tidak ada." })
    }

    const validation = validateSiteData(source.value)
    if (!validation.ok || !validation.data) {
      throw new ConvexError({
        code: "CONTENT_INVALID",
        message: "Revisi lama tidak lagi lolos validasi.",
        issues: validation.issues,
      })
    }

    const version = (await latestVersion(ctx)) + 1
    const timestamp = now()
    await applySiteData(ctx, validation.data)
    const revisionId = await ctx.db.insert("contentRevisions", {
      key: CONTENT_KEY,
      version,
      value: validation.data,
      status: "published",
      authorId: viewer.userId,
      note,
      basedOnVersion: args.version,
      createdAt: timestamp,
      publishedAt: timestamp,
    })

    const others = await ctx.db
      .query("contentRevisions")
      .withIndex("by_key", (q) => q.eq("key", CONTENT_KEY))
      .collect()
    for (const item of others) {
      if (item._id !== revisionId && item.status === "draft") {
        await ctx.db.patch(item._id, { status: "archived" })
      }
    }

    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "content.rollback",
      entityType: "contentRevisions",
      entityId: revisionId,
      reason: note,
      before: { version: args.version },
      after: { version },
    })

    return { version }
  },
})

/** System entry point for scheduled publishes. */
export const runScheduledPublish = internalMutation({
  args: {},
  handler: async (ctx) => {
    const timestamp = now()
    const revisions = await ctx.db
      .query("contentRevisions")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .collect()
    const due = revisions.filter(
      (item) => item.scheduledFor !== undefined && item.scheduledFor <= timestamp,
    )
    const published: number[] = []
    const failed: number[] = []

    for (const revision of due) {
      const validation = validateSiteData(revision.value)
      if (!validation.ok || !validation.data) {
        failed.push(revision.version)
        await ctx.db.patch(revision._id, {
          status: "draft",
          scheduledFor: undefined,
        })
        await appendAudit(ctx, {
          actorId: "system",
          actorRole: "system",
          action: "content.scheduledPublishFailed",
          entityType: "contentRevisions",
          entityId: revision._id,
          reason: "Validasi gagal saat terbit terjadwal.",
          severity: "error",
          after: { version: revision.version },
        })
        continue
      }

      await applySiteData(ctx, validation.data)
      await ctx.db.patch(revision._id, {
        status: "published",
        publishedAt: timestamp,
        scheduledFor: undefined,
      })
      published.push(revision.version)
      await appendAudit(ctx, {
        actorId: "system",
        actorRole: "system",
        action: "content.scheduledPublish",
        entityType: "contentRevisions",
        entityId: revision._id,
        reason: revision.note,
        after: { version: revision.version },
      })
    }

    return { published, failed }
  },
})

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export const createPreview = mutation({
  args: { version: v.number() },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "content.publish")
    const revision = await ctx.db
      .query("contentRevisions")
      .withIndex("by_key_version", (q) =>
        q.eq("key", CONTENT_KEY).eq("version", args.version),
      )
      .unique()
    if (!revision) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Revisi tidak ada." })
    }
    const validation = validateSiteData(revision.value)
    if (!validation.ok) {
      throw new ConvexError({
        code: "CONTENT_INVALID",
        message: "Pratinjau hanya untuk revisi yang valid.",
        issues: validation.issues,
      })
    }

    const token = randomToken()
    const tokenHash = await sha256Hex(token)
    const timestamp = now()
    const expiresAt = timestamp + PREVIEW_TTL_MS
    await ctx.db.insert("contentPreviews", {
      contentKey: CONTENT_KEY,
      version: revision.version,
      tokenHash,
      createdBy: viewer.userId,
      createdAt: timestamp,
      expiresAt,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "content.createPreview",
      entityType: "contentRevisions",
      entityId: revision._id,
      reason: "Pratinjau draf",
      after: { version: revision.version, expiresAt },
    })
    return { token, expiresAt }
  },
})

/**
 * Public bearer-token preview. It is scoped to one revision, expires, and is
 * never cached as the public landing page.
 */
export const getPreview = query({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<ContentPreviewPayload | null> => {
    const tokenHash = await sha256Hex(args.token)
    const preview = await ctx.db
      .query("contentPreviews")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .unique()
    if (!preview) return null
    if (preview.expiresAt <= now()) return null

    const revision = await ctx.db
      .query("contentRevisions")
      .withIndex("by_key_version", (q) =>
        q.eq("key", preview.contentKey).eq("version", preview.version),
      )
      .unique()
    if (!revision) return null

    return {
      key: preview.contentKey,
      version: preview.version,
      value: revision.value as SiteData,
      expiresAt: preview.expiresAt,
    }
  },
})

export const acquireLock = mutation({
  args: {},
  handler: async (ctx) => {
    const { viewer } = await requireAdmin(ctx, "content.publish")
    const timestamp = now()
    const locks = await ctx.db
      .query("contentLocks")
      .withIndex("by_contentKey", (q) => q.eq("contentKey", CONTENT_KEY))
      .collect()

    const active = locks.find((lock) => lock.expiresAt > timestamp)
    if (active && active.holderId !== viewer.userId) {
      const holder = await ctx.db.get(active.holderId)
      return {
        acquired: false as const,
        lock: {
          holderId: active.holderId,
          holderName: holder?.name ?? "Pengelola",
          acquiredAt: active.acquiredAt,
          expiresAt: active.expiresAt,
          mine: false,
        } satisfies ContentLockView,
      }
    }

    const expiresAt = timestamp + LOCK_TTL_MS
    if (active) {
      await ctx.db.patch(active._id, { acquiredAt: timestamp, expiresAt })
    } else {
      for (const lock of locks) await ctx.db.delete(lock._id)
      await ctx.db.insert("contentLocks", {
        contentKey: CONTENT_KEY,
        holderId: viewer.userId as Id<"users">,
        acquiredAt: timestamp,
        expiresAt,
      })
    }

    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "content.acquireLock",
      entityType: "contentLocks",
      entityId: CONTENT_KEY,
      reason: "Membuka editor konten",
      after: { expiresAt },
    })

    return {
      acquired: true as const,
      lock: {
        holderId: viewer.userId as Id<"users">,
        holderName: viewer.name,
        acquiredAt: timestamp,
        expiresAt,
        mine: true,
      } satisfies ContentLockView,
    }
  },
})

export const releaseLock = mutation({
  args: {},
  handler: async (ctx) => {
    const { viewer } = await requireAdmin(ctx, "content.publish")
    const locks = await ctx.db
      .query("contentLocks")
      .withIndex("by_contentKey", (q) => q.eq("contentKey", CONTENT_KEY))
      .collect()
    for (const lock of locks) {
      if (lock.holderId === viewer.userId) await ctx.db.delete(lock._id)
    }
    return null
  },
})

export const getLock = query({
  args: {},
  handler: async (ctx): Promise<ContentLockView | null> => {
    const { viewer } = await requireAdmin(ctx, "content.publish")
    const lock = await currentLock(ctx)
    return lock ? { ...lock, mine: lock.holderId === viewer.userId } : null
  },
})

export const validateDraft = query({
  args: { version: v.number() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, "content.publish")
    const revision = await ctx.db
      .query("contentRevisions")
      .withIndex("by_key_version", (q) =>
        q.eq("key", CONTENT_KEY).eq("version", args.version),
      )
      .unique()
    if (!revision) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Revisi tidak ada." })
    }
    const result = validateSiteData(revision.value)
    return {
      ok: result.ok,
      issues: result.issues,
      parsed: result.data ? siteDataSchema.safeParse(result.data).success : false,
    }
  },
})

/** Published entities the admin can choose from for the landing page. */
export const getFeaturedOptions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx, "content.publish")
    const [site, paths, teachers, works, testimonials] = await Promise.all([
      ctx.db
        .query("siteContent")
        .withIndex("by_key", (q) => q.eq("key", CONTENT_KEY))
        .unique(),
      ctx.db.query("paths").withIndex("by_order").collect(),
      ctx.db.query("teachers").withIndex("by_order").collect(),
      ctx.db.query("works").withIndex("by_order").collect(),
      ctx.db.query("testimonials").withIndex("by_order").collect(),
    ])

    return {
      paths: paths
        .filter((path) => path.status !== "archived")
        .map((path) => ({ slug: path.slug, title: path.title })),
      teachers: teachers
        .filter(
          (teacher) =>
            teacher.published === true &&
            teacher.status !== "review" &&
            teacher.status !== "suspended",
        )
        .map((teacher) => ({ slug: teacher.slug, name: teacher.name })),
      works: works
        .filter(
          (work) =>
            work.status === "published",
        )
        .map((work) => ({ slug: work.slug, title: work.title })),
      testimonials: testimonials.map((testimonial) => ({
        id: testimonial._id,
        quote: testimonial.quote,
        name: testimonial.name,
      })),
      featured: featuredSelection(site?.value),
    }
  },
})

/**
 * Stores the landing selection. The admin chooses existing published records;
 * no catalog, teacher, work, or testimonial copy is typed here.
 */
export const setFeatured = mutation({
  args: {
    pathSlugs: v.array(v.string()),
    teacherSlugs: v.array(v.string()),
    workSlugs: v.array(v.string()),
    testimonialIds: v.array(v.string()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "content.publish")
    const reason = requireReason(args.reason)
    const site = await ctx.db
      .query("siteContent")
      .withIndex("by_key", (q) => q.eq("key", CONTENT_KEY))
      .unique()
    if (!site) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Konten landing belum tersedia.",
      })
    }

    const [paths, teachers, works, testimonials] = await Promise.all([
      ctx.db.query("paths").withIndex("by_order").collect(),
      ctx.db.query("teachers").withIndex("by_order").collect(),
      ctx.db.query("works").withIndex("by_order").collect(),
      ctx.db.query("testimonials").withIndex("by_order").collect(),
    ])

    const unique = (values: string[]) => Array.from(new Set(values))
    const pathSlugs = unique(args.pathSlugs)
    const teacherSlugs = unique(args.teacherSlugs)
    const workSlugs = unique(args.workSlugs)
    const testimonialIds = unique(args.testimonialIds)

    const validPaths = new Set(
      paths
        .filter((path) => path.status !== "archived")
        .map((path) => path.slug),
    )
    const validTeachers = new Set(
      teachers
        .filter(
          (teacher) =>
            teacher.published === true &&
            teacher.status !== "review" &&
            teacher.status !== "suspended",
        )
        .map((teacher) => teacher.slug),
    )
    const validWorks = new Set(
      works
        .filter(
          (work) =>
            work.status === "published",
        )
        .map((work) => work.slug),
    )
    const validTestimonials = new Set(
      testimonials.map((testimonial) => testimonial._id as string),
    )

    if (pathSlugs.some((slug) => !validPaths.has(slug))) {
      throw new ConvexError({
        code: "INVALID_PATH",
        message: "Ada jalur yang tidak tersedia untuk landing.",
      })
    }
    if (teacherSlugs.some((slug) => !validTeachers.has(slug))) {
      throw new ConvexError({
        code: "INVALID_TEACHER",
        message: "Ada pengajar yang tidak tersedia untuk landing.",
      })
    }
    if (workSlugs.some((slug) => !validWorks.has(slug))) {
      throw new ConvexError({
        code: "INVALID_WORK",
        message: "Ada karya yang tidak tersedia untuk landing.",
      })
    }
    if (testimonialIds.some((id) => !validTestimonials.has(id))) {
      throw new ConvexError({
        code: "INVALID_TESTIMONIAL",
        message: "Ada testimoni yang tidak tersedia untuk landing.",
      })
    }

    const value = {
      ...(site.value as Record<string, unknown>),
      featured: { pathSlugs, teacherSlugs, workSlugs, testimonialIds },
    }
    await ctx.db.patch(site._id, { value, updatedAt: now() })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "content.featured.update",
      entityType: "siteContent",
      entityId: site._id,
      reason,
      after: { pathSlugs, teacherSlugs, workSlugs, testimonialIds },
    })
    return null
  },
})
