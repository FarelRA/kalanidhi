import { ConvexError, v } from "convex/values"

import type {
  ContentAdminState,
  ContentLockView,
  ContentPreviewPayload,
  ContentRevisionStatus,
  ContentRevisionSummary,
} from "../lib/admin/types"
import type {
  ContentDocument,
  FeaturedSelection,
  HeroWorkCard,
  LearningPath,
  PublicPathDetail,
  PublicTeacherDetail,
  SeoOverride,
  SiteData,
  Teacher,
  Work,
} from "../lib/content/types"
import {
  contentDocumentSchema,
  validateContentDocument,
} from "../lib/validation/content"
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

export type StoredContentValue = Omit<ContentDocument, "hero" | "metadata"> & {
  hero: Omit<ContentDocument["hero"], "plate"> & {
    plate: Omit<ContentDocument["hero"]["plate"], "image"> & {
      imageAssetId: Id<"mediaAssets">
    }
  }
  metadata: Omit<ContentDocument["metadata"], "image"> & {
    image: Omit<ContentDocument["metadata"]["image"], "url"> & {
      imageAssetId: Id<"mediaAssets">
    }
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

/** Entity cards omit themselves instead of rendering a broken image. */
async function optionalAssetUrl(
  ctx: AnyCtx,
  id: Id<"mediaAssets"> | undefined,
  cache: AssetUrlCache,
): Promise<string | null> {
  if (!id) return null
  try {
    return await assetUrl(ctx, id, cache)
  } catch {
    return null
  }
}

function emptyFeatured(): FeaturedSelection {
  return {
    pathSlugs: [],
    teacherSlugs: [],
    workSlugs: [],
    testimonialIds: [],
    catalogFieldKeys: [],
    faqKeys: [],
    heroWorkSlug: null,
  }
}

async function resolveStoredCopy(
  ctx: AnyCtx,
  stored: StoredContentValue,
  cache: AssetUrlCache,
): Promise<ContentDocument> {
  const base = normalizeContentDocument(stored)
  const { imageAssetId: heroImageId, ...plate } = stored.hero.plate
  const { imageAssetId: metadataImageId, ...metadataImage } = stored.metadata.image
  return {
    ...base,
    hero: {
      ...base.hero,
      plate: { ...plate, image: await assetUrl(ctx, heroImageId, cache) },
    },
    metadata: {
      ...base.metadata,
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

async function toStoredContent(
  ctx: AnyCtx,
  data: ContentDocument,
): Promise<StoredContentValue> {
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
  }
}

/** Reads the published copy and selection. Entity tables are not copied. */
export async function assemblePublishedContent(
  ctx: AnyCtx,
): Promise<ContentDocument | null> {
  const site = await ctx.db
    .query("siteContent")
    .withIndex("by_key", (q) => q.eq("key", CONTENT_KEY))
    .unique()
  if (!site) return null
  return await resolveStoredCopy(
    ctx,
    site.value as StoredContentValue,
    new Map(),
  )
}

/** Reads the landing selection from `siteContent.value`. */
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
  const heroWorkSlug =
    typeof record.heroWorkSlug === "string" ? record.heroWorkSlug : null
  return {
    pathSlugs: list("pathSlugs"),
    teacherSlugs: list("teacherSlugs"),
    workSlugs: list("workSlugs"),
    testimonialIds: list("testimonialIds"),
    catalogFieldKeys: list("catalogFieldKeys"),
    faqKeys: list("faqKeys"),
    heroWorkSlug,
  }
}

function normalizeContentDocument(value: unknown): ContentDocument {
  const raw = (
    value && typeof value === "object" ? value : {}
  ) as ContentDocument
  return {
    hero: raw.hero,
    traction: raw.traction,
    loop: raw.loop,
    catalog: raw.catalog
      ? {
          label: raw.catalog.label,
          title: raw.catalog.title,
          description: raw.catalog.description,
          cta: raw.catalog.cta,
          groups: raw.catalog.groups,
        }
      : raw.catalog,
    mangsa: raw.mangsa,
    ethics: raw.ethics,
    institution: raw.institution,
    sections: raw.sections,
    footer: raw.footer,
    navigation: raw.navigation,
    overlays: raw.overlays,
    header: raw.header,
    search: raw.search,
    mobileCta: raw.mobileCta,
    leadDialogs: raw.leadDialogs,
    metadata: raw.metadata,
    featured: featuredSelection(value) ?? emptyFeatured(),
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

type PathSnapshot = {
  modules: Doc<"pathModules">[]
  lessons: Doc<"lessons">[]
  cohorts: Doc<"cohorts">[]
}

async function pathSnapshot(
  ctx: AnyCtx,
  slug: string,
): Promise<PathSnapshot> {
  const [modules, lessons, cohorts] = await Promise.all([
    ctx.db
      .query("pathModules")
      .withIndex("by_path_order", (q) => q.eq("pathId", slug))
      .collect(),
    ctx.db
      .query("lessons")
      .withIndex("by_path", (q) => q.eq("pathId", slug))
      .collect(),
    ctx.db
      .query("cohorts")
      .withIndex("by_pathId", (q) => q.eq("pathId", slug))
      .collect(),
  ])
  return {
    modules: modules
      .filter((module) => module.status === "published")
      .sort((a, b) => a.order - b.order),
    lessons: lessons
      .filter((lesson) => lesson.status === "published")
      .sort((a, b) => a.order - b.order),
    cohorts: cohorts.sort((a, b) => a.startDate - b.startDate),
  }
}

async function resolveLearningPath(
  ctx: AnyCtx,
  path: Doc<"paths">,
  cache: AssetUrlCache,
  teacherByUserId: Map<string, Doc<"teachers">>,
  snapshot?: PathSnapshot,
): Promise<LearningPath | null> {
  if (path.status === "archived") return null

  const image = await optionalAssetUrl(ctx, path.imageAssetId, cache)
  if (!image) return null

  const facts = snapshot ?? (await pathSnapshot(ctx, path.slug))
  if (
    !path.comingSoon &&
    (facts.modules.length === 0 ||
      facts.lessons.length === 0 ||
      facts.cohorts.length === 0)
  ) {
    return null
  }

  const profile = path.teacherId
    ? teacherByUserId.get(path.teacherId)
    : undefined
  return {
    slug: path.slug,
    code: path.code,
    title: path.title,
    subtitle: path.subtitle,
    teacher: profile?.name ?? path.teacher,
    teacherRole: path.teacherRole || profile?.specialty || "Pengajar",
    teacherId: path.teacherId,
    region: path.region,
    level: path.level,
    modules: facts.modules.length,
    weeks: path.weeks,
    tasks: path.tasks,
    price: path.price,
    priceLabel: path.priceLabel,
    image,
    tags: path.tags,
    outcome: path.outcome,
    includes: path.includes,
    comingSoon: path.comingSoon,
  }
}

async function resolveTeacher(
  ctx: AnyCtx,
  teacher: Doc<"teachers">,
  cache: AssetUrlCache,
): Promise<Teacher | null> {
  if (!teacher.userId) return null
  const user = await ctx.db.get(teacher.userId)
  if (!user) return null
  const image = await optionalAssetUrl(ctx, teacher.imageAssetId, cache)
  return {
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
    image: image ?? "",
    verified: teacher.verified,
  }
}

async function resolveWork(
  ctx: AnyCtx,
  work: Doc<"works">,
  pathBySlug: Map<string, Doc<"paths">>,
  teacherByUserId: Map<string, Doc<"teachers">>,
  cache: AssetUrlCache,
): Promise<Work | null> {
  if (work.status !== "published") return null
  if (!work.makerId || !work.pathId || !work.certificateId) return null

  const [card, maker, certificate] = await Promise.all([
    ctx.db
      .query("workCards")
      .withIndex("by_workId", (q) => q.eq("workId", work._id))
      .unique(),
    ctx.db.get(work.makerId),
    ctx.db.get(work.certificateId),
  ])
  const path = work.pathId ? pathBySlug.get(work.pathId) : undefined
  if (!card || !maker || !path || !certificate) return null
  if (card.status !== "published" || certificate.status !== "issued") {
    return null
  }
  const image = await optionalAssetUrl(ctx, work.imageAssetId, cache)
  if (!image) return null

  const profile = path.teacherId
    ? teacherByUserId.get(path.teacherId)
    : undefined
  return {
    slug: work.slug,
    title: work.title,
    category: work.category,
    kind: work.kind,
    maker: maker.name,
    makerRole: work.makerRole,
    teacher: profile?.name ?? path.teacher,
    region: work.region,
    price: work.price,
    priceLabel: work.priceLabel,
    unit: work.unit,
    technique: work.technique,
    techniqueNote: work.techniqueNote,
    workCard: card.serial,
    permission: card.permission,
    provenance: card.provenance,
    materials: card.materials,
    certificateSerial: certificate.serial,
    pathSlug: path.slug,
    description: work.description,
    image,
  }
}

function isPublishedTeacher(teacher: Doc<"teachers">): boolean {
  return (
    teacher.published === true &&
    teacher.status !== "review" &&
    teacher.status !== "suspended"
  )
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
    site.value as StoredContentValue,
    cache,
  )

  const teacherByUserId = new Map(
    teachers
      .filter((teacher) => teacher.userId)
      .map((teacher) => [teacher.userId as string, teacher] as const),
  )
  const pathBySlug = new Map(paths.map((path) => [path.slug, path] as const))

  const publishedPaths = paths.filter((path) => path.status !== "archived")
  const publishedTeachers = teachers.filter(isPublishedTeacher)
  const publishedWorks = works.filter((work) => work.status === "published")

  const selectedPaths = featured
    ? orderByKeys(publishedPaths, featured.pathSlugs, (path) => path.slug)
    : publishedPaths
  const selectedTeachers = featured
    ? orderByKeys(
        publishedTeachers,
        featured.teacherSlugs,
        (teacher) => teacher.slug,
      )
    : publishedTeachers
  const workKeys = featured
    ? Array.from(
        new Set([
          ...featured.workSlugs,
          ...(featured.heroWorkSlug ? [featured.heroWorkSlug] : []),
        ]),
      )
    : undefined
  const selectedWorks = orderByKeys(
    publishedWorks,
    workKeys,
    (work) => work.slug,
  )
  const selectedTestimonials = featured
    ? orderByKeys(
        testimonials,
        featured.testimonialIds,
        (testimonial) => testimonial._id,
      )
    : testimonials
  const selectedFields = featured
    ? orderByKeys(
        catalogFields,
        featured.catalogFieldKeys,
        (field) => field.name,
      )
    : catalogFields
  const selectedFaqs = featured
    ? orderByKeys(faqs, featured.faqKeys, (faq) => faq._id)
    : faqs

  const resolvedPaths = (
    await Promise.all(
      selectedPaths.map((path) =>
        resolveLearningPath(ctx, path, cache, teacherByUserId),
      ),
    )
  ).filter((path): path is LearningPath => path !== null)
  const resolvedTeachers = (
    await Promise.all(
      selectedTeachers.map((teacher) => resolveTeacher(ctx, teacher, cache)),
    )
  ).filter((teacher): teacher is Teacher => teacher !== null)
  const resolvedWorks = (
    await Promise.all(
      selectedWorks.map((work) =>
        resolveWork(ctx, work, pathBySlug, teacherByUserId, cache),
      ),
    )
  ).filter((work): work is Work => work !== null)

  const displayWorks = featured
    ? orderByKeys(
        resolvedWorks,
        featured.workSlugs,
        (work) => work.slug,
      )
    : resolvedWorks
  const heroWork = featured?.heroWorkSlug
    ? resolvedWorks.find((work) => work.slug === featured.heroWorkSlug)
    : undefined
  const heroWorkCard: HeroWorkCard | null = heroWork
    ? {
        slug: heroWork.slug,
        serial: heroWork.workCard,
        work: heroWork.title,
        maker: heroWork.maker,
        teacher: heroWork.teacher,
      }
    : null

  return {
    ...copy,
    catalog: {
      ...copy.catalog,
      fields: selectedFields.map((field) => ({
        name: field.name,
        region: field.region,
        status: field.status,
        note: field.note,
      })),
    },
    heroWorkCard,
    paths: resolvedPaths,
    teachers: resolvedTeachers,
    works: displayWorks,
    testimonials: selectedTestimonials.map((testimonial) => ({
      quote: testimonial.quote,
      name: testimonial.name,
      role: testimonial.role,
      city: testimonial.city,
      initials: testimonial.initials,
    })),
    faqs: selectedFaqs.map((faq) => ({
      question: faq.question,
      answer: faq.answer,
    })),
  }
}

export const getSite = query({
  args: {},
  handler: async (ctx): Promise<SiteData | null> => {
    return await assemblePublishedSite(ctx)
  },
})

/** Every published path, independent of the landing selection. */
export const listPublicPaths = query({
  args: {},
  handler: async (ctx): Promise<LearningPath[]> => {
    const [paths, teachers] = await Promise.all([
      ctx.db.query("paths").withIndex("by_order").collect(),
      ctx.db.query("teachers").collect(),
    ])
    const teacherByUserId = new Map(
      teachers
        .filter((teacher) => teacher.userId)
        .map((teacher) => [teacher.userId as string, teacher] as const),
    )
    const cache: AssetUrlCache = new Map()
    const resolved = await Promise.all(
      paths
        .filter((path) => path.status !== "archived")
        .map((path) =>
          resolveLearningPath(ctx, path, cache, teacherByUserId),
        ),
    )
    return resolved.filter((path): path is LearningPath => path !== null)
  },
})

/** One published path with its published modules, lessons, and cohorts. */
export const getPublicPath = query({
  args: { slug: v.string() },
  handler: async (ctx, args): Promise<PublicPathDetail | null> => {
    const path = await ctx.db
      .query("paths")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique()
    if (!path || path.status === "archived") return null

    const [teachers, snapshot] = await Promise.all([
      ctx.db.query("teachers").collect(),
      pathSnapshot(ctx, path.slug),
    ])
    const teacherByUserId = new Map(
      teachers
        .filter((teacher) => teacher.userId)
        .map((teacher) => [teacher.userId as string, teacher] as const),
    )
    const cache: AssetUrlCache = new Map()
    const summary = await resolveLearningPath(
      ctx,
      path,
      cache,
      teacherByUserId,
      snapshot,
    )
    if (!summary) return null

    return {
      ...summary,
      lessons: snapshot.lessons.length,
      curriculum: snapshot.modules.map((module) => ({
        title: module.title,
        summary: module.summary,
        estimatedMinutes: module.estimatedMinutes,
        lessons: snapshot.lessons
          .filter(
            (lesson) =>
              lesson.moduleId === module._id && lesson.pathId === path.slug,
          )
          .map((lesson) => ({
            title: lesson.title,
            kind: lesson.kind,
            estimatedMinutes: lesson.estimatedMinutes,
            accessLevel: lesson.accessLevel,
          })),
      })),
      cohorts: snapshot.cohorts.map((cohort) => ({
        code: cohort.code,
        title: cohort.title,
        startDate: cohort.startDate,
        endDate: cohort.endDate,
        capacity: cohort.capacity,
        timezone: cohort.timezone,
        status: cohort.status,
      })),
    }
  },
})

/** Every published teacher, independent of the landing selection. */
export const listPublicTeachers = query({
  args: {},
  handler: async (ctx): Promise<Teacher[]> => {
    const teachers = await ctx.db.query("teachers").withIndex("by_order").collect()
    const cache: AssetUrlCache = new Map()
    const resolved = await Promise.all(
      teachers
        .filter(isPublishedTeacher)
        .map((teacher) => resolveTeacher(ctx, teacher, cache)),
    )
    return resolved.filter((teacher): teacher is Teacher => teacher !== null)
  },
})

/** One published teacher plus the paths and works they are linked to. */
export const getPublicTeacher = query({
  args: { slug: v.string() },
  handler: async (ctx, args): Promise<PublicTeacherDetail | null> => {
    const teacher = await ctx.db
      .query("teachers")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique()
    if (!teacher || !isPublishedTeacher(teacher)) return null

    const [paths, works, teachers] = await Promise.all([
      ctx.db.query("paths").withIndex("by_order").collect(),
      ctx.db.query("works").withIndex("by_order").collect(),
      ctx.db.query("teachers").collect(),
    ])
    const teacherByUserId = new Map(
      teachers
        .filter((item) => item.userId)
        .map((item) => [item.userId as string, item] as const),
    )
    const cache: AssetUrlCache = new Map()
    const profile = await resolveTeacher(ctx, teacher, cache)
    if (!profile) return null

    const assigned = new Set(teacher.pathIds ?? [])
    if (teacher.userId) {
      for (const path of paths) {
        if (path.teacherId === teacher.userId) assigned.add(path.slug)
      }
    }

    const pathBySlug = new Map(paths.map((path) => [path.slug, path] as const))
    const resolvedPaths = await Promise.all(
      paths
        .filter((path) => assigned.has(path.slug))
        .map((path) => resolveLearningPath(ctx, path, cache, teacherByUserId)),
    )
    const visiblePaths = resolvedPaths.filter(
      (path): path is LearningPath => path !== null,
    )

    const resolvedWorks = await Promise.all(
      works
        .filter(
          (work) =>
            work.status === "published" &&
            work.pathId !== undefined &&
            assigned.has(work.pathId),
        )
        .map((work) =>
          resolveWork(ctx, work, pathBySlug, teacherByUserId, cache),
        ),
    )

    return {
      ...profile,
      paths: visiblePaths.map((path) => ({
        slug: path.slug,
        code: path.code,
        title: path.title,
        level: path.level,
        region: path.region,
        price: path.price,
        priceLabel: path.priceLabel,
        comingSoon: path.comingSoon,
      })),
      works: resolvedWorks
        .filter((work): work is Work => work !== null)
        .map((work) => ({
          slug: work.slug,
          title: work.title,
          kind: work.kind,
          price: work.price,
          priceLabel: work.priceLabel,
          image: work.image,
        })),
    }
  },
})

/** Public FAQ list for the standalone FAQ page. */
export const listPublicFaqs = query({
  args: {},
  handler: async (ctx) => {
    const faqs = await ctx.db.query("faqs").withIndex("by_order").collect()
    return faqs.map((faq) => ({
      question: faq.question,
      answer: faq.answer,
    }))
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
    let draftValue: ContentDocument | null = null

    if (draft) {
      const document = await ctx.db
        .query("contentRevisions")
        .withIndex("by_key_version", (q) =>
          q.eq("key", CONTENT_KEY).eq("version", draft.version),
        )
        .unique()
      draftValue = document?.value ? normalizeContentDocument(document.value) : null
    } else {
      draftValue = await assemblePublishedContent(ctx)
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
      value: normalizeContentDocument(document.value),
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
    const validation = validateContentDocument(normalizeContentDocument(args.value))
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

/**
 * Writes editorial copy and the landing selection. Entity tables are owned by
 * their own domains and are never rewritten from a content revision.
 */
async function applyContentDocument(
  ctx: MutationCtx,
  data: ContentDocument,
): Promise<void> {
  const site = await ctx.db
    .query("siteContent")
    .withIndex("by_key", (q) => q.eq("key", CONTENT_KEY))
    .unique()
  // Selection is managed by `setFeatured`; publishing copy must not revert it.
  const liveFeatured = site ? featuredSelection(site.value) : null
  const stored = await toStoredContent(ctx, {
    ...data,
    featured: liveFeatured ?? data.featured,
  })
  const timestamp = now()

  if (site) {
    await ctx.db.patch(site._id, { value: stored, updatedAt: timestamp })
  } else {
    await ctx.db.insert("siteContent", {
      key: CONTENT_KEY,
      value: stored,
      updatedAt: timestamp,
    })
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

    const validation = validateContentDocument(normalizeContentDocument(revision.value))
    if (!validation.ok || !validation.data) {
      throw new ConvexError({
        code: "CONTENT_INVALID",
        message: "Konten belum lolos validasi.",
        issues: validation.issues,
      })
    }

    const published = await assemblePublishedContent(ctx)
    if (published) {
      const normalisedPublished = validateContentDocument(normalizeContentDocument(published))
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

    await applyContentDocument(ctx, validation.data)
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

    const validation = validateContentDocument(normalizeContentDocument(source.value))
    if (!validation.ok || !validation.data) {
      throw new ConvexError({
        code: "CONTENT_INVALID",
        message: "Revisi lama tidak lagi lolos validasi.",
        issues: validation.issues,
      })
    }

    const version = (await latestVersion(ctx)) + 1
    const timestamp = now()
    await applyContentDocument(ctx, validation.data)
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
      const validation = validateContentDocument(normalizeContentDocument(revision.value))
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

      await applyContentDocument(ctx, validation.data)
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
    const validation = validateContentDocument(normalizeContentDocument(revision.value))
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
      value: normalizeContentDocument(revision.value),
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
    const result = validateContentDocument(normalizeContentDocument(revision.value))
    return {
      ok: result.ok,
      issues: result.issues,
      parsed: result.data ? contentDocumentSchema.safeParse(result.data).success : false,
    }
  },
})

/** Published entities the admin can choose from for the landing page. */
export const getFeaturedOptions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx, "content.publish")
    const [site, paths, teachers, works, testimonials, catalogFields, faqs] =
      await Promise.all([
        ctx.db
          .query("siteContent")
          .withIndex("by_key", (q) => q.eq("key", CONTENT_KEY))
          .unique(),
        ctx.db.query("paths").withIndex("by_order").collect(),
        ctx.db.query("teachers").withIndex("by_order").collect(),
        ctx.db.query("works").withIndex("by_order").collect(),
        ctx.db.query("testimonials").withIndex("by_order").collect(),
        ctx.db.query("catalogFields").withIndex("by_order").collect(),
        ctx.db.query("faqs").withIndex("by_order").collect(),
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
        .filter((work) => work.status === "published")
        .map((work) => ({ slug: work.slug, title: work.title })),
      testimonials: testimonials.map((testimonial) => ({
        id: testimonial._id,
        quote: testimonial.quote,
        name: testimonial.name,
      })),
      catalogFields: catalogFields.map((field) => ({
        key: field.name,
        name: field.name,
        region: field.region,
        status: field.status,
      })),
      faqs: faqs.map((faq) => ({
        key: faq._id as string,
        question: faq.question,
      })),
      featured: featuredSelection(site?.value),
    }
  },
})

/**
 * Stores the landing selection. The admin chooses existing published records;
 * no catalog, teacher, work, testimonial, field, or FAQ copy is typed here.
 */
export const setFeatured = mutation({
  args: {
    pathSlugs: v.array(v.string()),
    teacherSlugs: v.array(v.string()),
    workSlugs: v.array(v.string()),
    testimonialIds: v.array(v.string()),
    catalogFieldKeys: v.array(v.string()),
    faqKeys: v.array(v.string()),
    heroWorkSlug: v.union(v.string(), v.null()),
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

    const [paths, teachers, works, testimonials, catalogFields, faqs] =
      await Promise.all([
        ctx.db.query("paths").withIndex("by_order").collect(),
        ctx.db.query("teachers").withIndex("by_order").collect(),
        ctx.db.query("works").withIndex("by_order").collect(),
        ctx.db.query("testimonials").withIndex("by_order").collect(),
        ctx.db.query("catalogFields").withIndex("by_order").collect(),
        ctx.db.query("faqs").withIndex("by_order").collect(),
      ])

    const unique = (values: string[]) => Array.from(new Set(values))
    const pathSlugs = unique(args.pathSlugs)
    const teacherSlugs = unique(args.teacherSlugs)
    const workSlugs = unique(args.workSlugs)
    const testimonialIds = unique(args.testimonialIds)
    const catalogFieldKeys = unique(args.catalogFieldKeys)
    const faqKeys = unique(args.faqKeys)
    const heroWorkSlug = args.heroWorkSlug

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
        .filter((work) => work.status === "published")
        .map((work) => work.slug),
    )
    const validTestimonials = new Set(
      testimonials.map((testimonial) => testimonial._id as string),
    )
    const validCatalogFields = new Set(
      catalogFields.map((field) => field.name),
    )
    const validFaqs = new Set(faqs.map((faq) => faq._id as string))

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
    if (catalogFieldKeys.some((key) => !validCatalogFields.has(key))) {
      throw new ConvexError({
        code: "INVALID_CATALOG_FIELD",
        message: "Ada bidang katalog yang tidak tersedia untuk landing.",
      })
    }
    if (faqKeys.some((key) => !validFaqs.has(key))) {
      throw new ConvexError({
        code: "INVALID_FAQ",
        message: "Ada pertanyaan umum yang tidak tersedia untuk landing.",
      })
    }
    if (heroWorkSlug !== null && !validWorks.has(heroWorkSlug)) {
      throw new ConvexError({
        code: "INVALID_HERO_WORK",
        message: "Karya untuk Kartu Karya hero tidak tersedia.",
      })
    }

    const featured: FeaturedSelection = {
      pathSlugs,
      teacherSlugs,
      workSlugs,
      testimonialIds,
      catalogFieldKeys,
      faqKeys,
      heroWorkSlug,
    }
    const value = {
      ...(site.value as Record<string, unknown>),
      featured,
    }
    await ctx.db.patch(site._id, { value, updatedAt: now() })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "content.featured.update",
      entityType: "siteContent",
      entityId: site._id,
      reason,
      after: featured,
    })
    return null
  },
})
