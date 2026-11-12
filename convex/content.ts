import { ConvexError, v } from "convex/values"

import type {
  ContentAdminState,
  ContentLockView,
  ContentPreviewPayload,
  ContentRevisionStatus,
  ContentRevisionSummary,
} from "../lib/admin/types"
import type { SiteCopy, SiteData } from "../lib/content/types"
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

function toCopy(data: SiteData): SiteCopy {
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

/** Reads the currently published content from the public tables. */
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

  const copy = site.value as SiteCopy
  return {
    ...copy,
    catalog: {
      ...copy.catalog,
      fields: catalogFields.map(withoutSystemFields),
    },
    paths: paths
      .filter((path) => path.status !== "archived")
      .map(withoutSystemFields),
    teachers: teachers
      .filter(
        (teacher) =>
          teacher.published !== false &&
          teacher.status !== "review" &&
          teacher.status !== "suspended",
      )
      .map(withoutSystemFields),
    works: works
      .filter(
        (work) =>
          work.status === undefined || work.status === "published",
      )
      .map(withoutSystemFields),
    testimonials: testimonials.map(withoutSystemFields),
    faqs: faqs.map(withoutSystemFields),
  } as SiteData
}

export const getSite = query({
  args: {},
  handler: async (ctx): Promise<SiteData | null> => {
    return await assemblePublishedSite(ctx)
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
  const timestamp = now()
  const site = await ctx.db
    .query("siteContent")
    .withIndex("by_key", (q) => q.eq("key", CONTENT_KEY))
    .unique()

  if (site) {
    await ctx.db.patch(site._id, {
      value: toCopy(data),
      updatedAt: timestamp,
    })
  } else {
    await ctx.db.insert("siteContent", {
      key: CONTENT_KEY,
      value: toCopy(data),
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
      image: path.image,
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
      image: teacher.image,
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
      image: work.image,
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
